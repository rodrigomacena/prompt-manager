"""Shared engine for the catalog columns of the Prompt Manager (poses, environments, lighting...).

A catalog is a list of items (name, category, text) that you can edit, plus saved presets, stored in a JSON
file next to the Prompt Manager database. A shipped default list (``{category: [[name, text], ...]}``) is merged
in: pieces added by an update appear by themselves, pieces you deleted stay deleted.

The node only needs the *selection* that the frontend keeps in a widget (every entry carries its own text), so a
server whose catalog differs still produces the same sentence. Each catalog supplies a ``sentence`` function
that turns the (ordered) entries into the final text.
"""

import json
import os
import random
import re
import threading
import uuid
from typing import Any, Callable, Dict, List, Optional

from aiohttp import web
from server import PromptServer

from . import storage

PRONOUNS = ["She", "He", "They", "(none)"]
MODES = ["fixed", "random"]
SEPARATORS = ["space", "new paragraph"]
MAX_ENTRIES = 100


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def join_list(parts: List[str]) -> str:
    if len(parts) <= 1:
        return "".join(parts)
    return ", ".join(parts[:-1]) + " and " + parts[-1]


class Catalog:
    def __init__(
        self,
        key: str,
        route_base: str,
        data_filename: str,
        default_filename: str,
        category_order: List[str],
        unknown_after: str,
        sentence: Callable[[List[Dict[str, Any]], str, str], str],
        noun: str,
    ):
        self.key = key
        self.base = route_base
        self.data_path = os.path.join(storage._BASE_DIR, data_filename)
        self.default_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), default_filename)
        self.order = category_order
        self.unknown_rank = category_order.index(unknown_after) + 0.5
        self.sentence = sentence
        self.noun = noun
        self._lock = threading.Lock()
        self._defaults_cache: Dict[str, Any] = {"mtime": None, "items": []}

    # ---- catalog ------------------------------------------------------------

    @staticmethod
    def _item(name: str, category: str, text: Optional[str] = None, item_id: Optional[str] = None) -> Dict[str, Any]:
        name = (name or "").strip()
        return {
            "id": item_id or uuid.uuid4().hex,
            "name": name,
            "category": (category or "").strip() or "Other",
            "text": (text or "").strip() or name.lower(),
        }

    def default_items(self) -> List[Dict[str, Any]]:
        mtime = os.path.getmtime(self.default_path)
        if self._defaults_cache["mtime"] != mtime:
            with open(self.default_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
            items = []
            for category, pairs in raw.items():
                for name, text in pairs:
                    items.append(self._item(name, category, text, item_id=f"{slugify(category)}-{slugify(name)}"))
            self._defaults_cache["items"] = items
            self._defaults_cache["mtime"] = mtime
        return [dict(i) for i in self._defaults_cache["items"]]

    def _merge_new_defaults(self, data: Dict[str, Any]) -> bool:
        defaults = self.default_items()
        have = {i["id"] for i in data["items"]}
        seen = set(data["seen"]) if isinstance(data.get("seen"), list) else set(have)
        new = [d for d in defaults if d["id"] not in seen and d["id"] not in have]
        seen_after = seen | {d["id"] for d in defaults}
        changed = bool(new) or not isinstance(data.get("seen"), list) or len(seen_after) != len(data.get("seen", []))
        if changed:
            data["items"].extend(new)
            data["seen"] = sorted(seen_after)
        return changed

    def _write(self, data: Dict[str, Any]) -> None:
        tmp = self.data_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, self.data_path)

    def _read(self) -> Dict[str, Any]:
        data = None
        if os.path.exists(self.data_path):
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except (OSError, json.JSONDecodeError):
                data = None
        if not isinstance(data, dict) or not isinstance(data.get("items"), list):
            data = {"items": self.default_items(), "presets": data.get("presets", []) if isinstance(data, dict) else []}
            data["seen"] = sorted(i["id"] for i in data["items"])
            self._write(data)
        data.setdefault("presets", [])
        if self._merge_new_defaults(data):
            self._write(data)
        return data

    def list_items(self) -> List[Dict[str, Any]]:
        with self._lock:
            return self._read()["items"]

    def add_item(self, name: str, category: str, text: str = "") -> Optional[Dict[str, Any]]:
        if not (name or "").strip():
            return None
        with self._lock:
            data = self._read()
            item = self._item(name, category, text)
            data["items"].append(item)
            self._write(data)
            return item

    def update_item(self, item_id: str, fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._lock:
            data = self._read()
            for item in data["items"]:
                if item["id"] != item_id:
                    continue
                if "name" in fields and str(fields["name"]).strip():
                    item["name"] = str(fields["name"]).strip()
                if "category" in fields and str(fields["category"]).strip():
                    item["category"] = str(fields["category"]).strip()
                if "text" in fields:
                    item["text"] = str(fields["text"]).strip() or item["name"].lower()
                self._write(data)
                return item
        return None

    def delete_item(self, item_id: str) -> bool:
        with self._lock:
            data = self._read()
            kept = [i for i in data["items"] if i["id"] != item_id]
            if len(kept) == len(data["items"]):
                return False
            data["items"] = kept
            self._write(data)
            return True

    def restore_defaults(self) -> int:
        """Add back any shipped item that is missing (never touches your own items or edits)."""
        with self._lock:
            data = self._read()
            have = {i["id"] for i in data["items"]}
            missing = [i for i in self.default_items() if i["id"] not in have]
            data["items"].extend(missing)
            data["seen"] = sorted(set(data.get("seen", [])) | {i["id"] for i in self.default_items()})
            self._write(data)
            return len(missing)

    # ---- presets ------------------------------------------------------------

    @staticmethod
    def clean_selection(raw: Any) -> List[Dict[str, Any]]:
        if isinstance(raw, str):
            try:
                raw = json.loads(raw) if raw.strip() else []
            except json.JSONDecodeError:
                raw = []
        entries: List[Dict[str, Any]] = []
        if not isinstance(raw, list):
            return entries
        for entry in raw[:MAX_ENTRIES]:
            if not isinstance(entry, dict):
                continue
            text = str(entry.get("text", "")).strip()[:200]
            if not text:
                continue
            entries.append(
                {
                    "id": str(entry.get("id", ""))[:80],
                    "name": str(entry.get("name", text))[:120],
                    "text": text,
                    "category": str(entry.get("category", "")).strip()[:60],
                    "pin": bool(entry.get("pin", False)),
                }
            )
        return entries

    def list_presets(self) -> List[Dict[str, Any]]:
        with self._lock:
            return self._read()["presets"]

    def add_preset(self, title: str, selection: Any) -> Optional[Dict[str, Any]]:
        title = (title or "").strip()
        entries = self.clean_selection(selection)
        if not title or not entries:
            return None
        with self._lock:
            data = self._read()
            preset = {"id": uuid.uuid4().hex, "title": title, "selection": entries}
            data["presets"].append(preset)
            self._write(data)
            return preset

    def update_preset(self, preset_id: str, title: Optional[str], selection: Any) -> Optional[Dict[str, Any]]:
        with self._lock:
            data = self._read()
            for preset in data["presets"]:
                if preset["id"] != preset_id:
                    continue
                if title is not None and title.strip():
                    preset["title"] = title.strip()
                if selection is not None:
                    entries = self.clean_selection(selection)
                    if entries:
                        preset["selection"] = entries
                self._write(data)
                return preset
        return None

    def delete_preset(self, preset_id: str) -> bool:
        with self._lock:
            data = self._read()
            kept = [p for p in data["presets"] if p["id"] != preset_id]
            if len(kept) == len(data["presets"]):
                return False
            data["presets"] = kept
            self._write(data)
            return True

    # ---- the sentence -------------------------------------------------------

    def rank(self, category: str) -> float:
        return float(self.order.index(category)) if category in self.order else self.unknown_rank

    @staticmethod
    def pick_entries(entries: List[Dict[str, Any]], mode: str, first_only: bool = False) -> List[Dict[str, Any]]:
        """Random mode: pinned entries always stay; each category contributes one of its unpinned entries."""
        if mode != "random":
            return list(entries)
        chosen = [e for e in entries if e["pin"]]
        pools: Dict[str, List[Dict[str, Any]]] = {}
        for entry in entries:
            if not entry["pin"]:
                pools.setdefault(entry["category"], []).append(entry)
        for pool in pools.values():
            chosen.append(pool[0] if first_only else random.choice(pool))
        return chosen

    def build(self, selection: Any, mode: str = "fixed", pronoun: str = "She", lead: str = "", first_only: bool = False) -> str:
        entries = self.pick_entries(self.clean_selection(selection), mode, first_only)
        if not entries:
            return ""
        entries.sort(key=lambda e: self.rank(e["category"]))
        return self.sentence(entries, pronoun, (lead or "").strip())

    # ---- routes -------------------------------------------------------------

    def setup_routes(self):
        routes = PromptServer.instance.routes
        base = self.base
        noun = self.noun

        def _err(message, status=400):
            return web.json_response({"error": message}, status=status)

        async def _json(request):
            try:
                data = await request.json()
            except Exception:
                return None
            return data if isinstance(data, dict) else None

        @routes.get(f"{base}/catalog")
        async def catalog_get(request):
            return web.json_response({"items": self.list_items()})

        @routes.post(f"{base}/items")
        async def item_add(request):
            data = await _json(request)
            if data is None:
                return _err("Invalid JSON")
            item = self.add_item(str(data.get("name", "")), str(data.get("category", "")), str(data.get("text", "")))
            if item is None:
                return _err("Name is required")
            return web.json_response(item)

        @routes.put(f"{base}/items/{{item_id}}")
        async def item_update(request):
            data = await _json(request)
            if data is None:
                return _err("Invalid JSON")
            item = self.update_item(request.match_info["item_id"], data)
            return web.json_response(item) if item else _err(f"{noun} not found", 404)

        @routes.delete(f"{base}/items/{{item_id}}")
        async def item_delete(request):
            if not self.delete_item(request.match_info["item_id"]):
                return _err(f"{noun} not found", 404)
            return web.json_response({"ok": True})

        @routes.post(f"{base}/restore")
        async def restore(request):
            added = self.restore_defaults()
            return web.json_response({"added": added, "items": self.list_items()})

        @routes.get(f"{base}/presets")
        async def presets_get(request):
            return web.json_response(self.list_presets())

        @routes.post(f"{base}/presets")
        async def preset_add(request):
            data = await _json(request)
            if data is None:
                return _err("Invalid JSON")
            preset = self.add_preset(str(data.get("title", "")), data.get("selection"))
            if preset is None:
                return _err(f"A title and at least one {noun} are required")
            return web.json_response(preset)

        @routes.put(f"{base}/presets/{{preset_id}}")
        async def preset_update(request):
            data = await _json(request)
            if data is None:
                return _err("Invalid JSON")
            title = data.get("title")
            preset = self.update_preset(request.match_info["preset_id"], str(title) if title is not None else None, data.get("selection"))
            return web.json_response(preset) if preset else _err("Preset not found", 404)

        @routes.delete(f"{base}/presets/{{preset_id}}")
        async def preset_delete(request):
            if not self.delete_preset(request.match_info["preset_id"]):
                return _err("Preset not found", 404)
            return web.json_response({"ok": True})

        @routes.post(f"{base}/preview")
        async def preview(request):
            data = await _json(request)
            if data is None:
                return _err("Invalid JSON")
            mode = data.get("mode") if data.get("mode") in MODES else "fixed"
            pronoun = data.get("pronoun") if data.get("pronoun") in PRONOUNS else "She"
            text = self.build(data.get("selection"), mode, pronoun, str(data.get("lead", "")), first_only=True)
            return web.json_response({"outfit": text, "text": text})
