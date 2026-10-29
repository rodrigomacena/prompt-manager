"""Pose Builder: pick poses from a catalog and turn them into a prompt sentence.

Same idea as the outfit builder: the catalog (editable) and the saved pose presets live in a
JSON file next to the Prompt Manager database, and the node only needs the selection the
frontend stores in a widget (each entry carries its own text).

Every pose text starts with a gerund or a participle so that several can be chained after
"She is": "She is standing with her hands on her hips, looking over her shoulder and smiling."
The token ``{poss}`` becomes her / his / their depending on the pronoun.
"""

import json
import os
import random
import re
import threading
import uuid
from typing import Any, Dict, List, Optional

from aiohttp import web
from server import PromptServer

from . import storage
from .outfit_builder import MODES, PRONOUNS, SEPARATORS

DATA_PATH = os.path.join(storage._BASE_DIR, "pose_builder.json")
DEFAULT_CATALOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pose_default_catalog.json")

_lock = threading.Lock()

# Order inside the sentence: the posture first, then the setting, the hands, the gaze and the camera view.
CATEGORY_ORDER = [
    "Standing", "Sitting", "Lying Down", "Kneeling", "Crouching & Squatting", "Leaning", "Walking & Motion", "Dancing",
    "Yoga & Stretching", "Action & Sports", "Sensual - Standing", "Sensual - Sitting", "Sensual - Lying",
    "Sensual - Kneeling & Crawling", "Pin-Up & Boudoir", "Bedroom & Bed", "Sofa & Chairs", "Beach & Pool", "Urban & Street",
    "Home & Windows", "Hands & Arms", "Sensual - Teasing Gestures", "Head & Gaze", "View & Angle",
]
_UNKNOWN_RANK = CATEGORY_ORDER.index("Home & Windows") + 0.5

POSSESSIVE = {"She": "her", "He": "his", "They": "their"}
MAX_ENTRIES = 100


# ---- catalog ------------------------------------------------------------------


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _item(name: str, category: str, text: Optional[str] = None, item_id: Optional[str] = None) -> Dict[str, Any]:
    name = (name or "").strip()
    return {
        "id": item_id or uuid.uuid4().hex,
        "name": name,
        "category": (category or "").strip() or "Other",
        "text": (text or "").strip() or name.lower(),
    }


_defaults_cache: Dict[str, Any] = {"mtime": None, "items": []}


def default_items() -> List[Dict[str, Any]]:
    mtime = os.path.getmtime(DEFAULT_CATALOG_PATH)
    if _defaults_cache["mtime"] != mtime:
        with open(DEFAULT_CATALOG_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)
        items = []
        for category, pairs in raw.items():
            for name, text in pairs:
                items.append(_item(name, category, text, item_id=f"{slugify(category)}-{slugify(name)}"))
        _defaults_cache["items"] = items
        _defaults_cache["mtime"] = mtime
    return [dict(i) for i in _defaults_cache["items"]]


def _merge_new_defaults(data: Dict[str, Any]) -> bool:
    """Add shipped poses this file has never seen (a pose you deleted is remembered and not added back)."""
    defaults = default_items()
    have = {i["id"] for i in data["items"]}
    seen = set(data["seen"]) if isinstance(data.get("seen"), list) else set(have)
    new = [d for d in defaults if d["id"] not in seen and d["id"] not in have]
    seen_after = seen | {d["id"] for d in defaults}
    changed = bool(new) or not isinstance(data.get("seen"), list) or len(seen_after) != len(data.get("seen", []))
    if changed:
        data["items"].extend(new)
        data["seen"] = sorted(seen_after)
    return changed


def _read() -> Dict[str, Any]:
    data = None
    if os.path.exists(DATA_PATH):
        try:
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            data = None
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        data = {"items": default_items(), "presets": data.get("presets", []) if isinstance(data, dict) else []}
        data["seen"] = sorted(i["id"] for i in data["items"])
        _write(data)
    data.setdefault("presets", [])
    if _merge_new_defaults(data):
        _write(data)
    return data


def _write(data: Dict[str, Any]) -> None:
    tmp = DATA_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, DATA_PATH)


def list_items() -> List[Dict[str, Any]]:
    with _lock:
        return _read()["items"]


def add_item(name: str, category: str, text: str = "") -> Optional[Dict[str, Any]]:
    if not (name or "").strip():
        return None
    with _lock:
        data = _read()
        item = _item(name, category, text)
        data["items"].append(item)
        _write(data)
        return item


def update_item(item_id: str, fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    with _lock:
        data = _read()
        for item in data["items"]:
            if item["id"] != item_id:
                continue
            if "name" in fields and str(fields["name"]).strip():
                item["name"] = str(fields["name"]).strip()
            if "category" in fields and str(fields["category"]).strip():
                item["category"] = str(fields["category"]).strip()
            if "text" in fields:
                item["text"] = str(fields["text"]).strip() or item["name"].lower()
            _write(data)
            return item
    return None


def delete_item(item_id: str) -> bool:
    with _lock:
        data = _read()
        kept = [i for i in data["items"] if i["id"] != item_id]
        if len(kept) == len(data["items"]):
            return False
        data["items"] = kept
        _write(data)
        return True


def restore_defaults() -> int:
    """Add back any shipped pose that is missing (never touches your own poses or edits)."""
    with _lock:
        data = _read()
        have = {i["id"] for i in data["items"]}
        missing = [i for i in default_items() if i["id"] not in have]
        data["items"].extend(missing)
        data["seen"] = sorted(set(data.get("seen", [])) | {i["id"] for i in default_items()})
        _write(data)
        return len(missing)


# ---- presets ------------------------------------------------------------------


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


def list_presets() -> List[Dict[str, Any]]:
    with _lock:
        return _read()["presets"]


def add_preset(title: str, selection: Any) -> Optional[Dict[str, Any]]:
    title = (title or "").strip()
    entries = clean_selection(selection)
    if not title or not entries:
        return None
    with _lock:
        data = _read()
        preset = {"id": uuid.uuid4().hex, "title": title, "selection": entries}
        data["presets"].append(preset)
        _write(data)
        return preset


def update_preset(preset_id: str, title: Optional[str], selection: Any) -> Optional[Dict[str, Any]]:
    with _lock:
        data = _read()
        for preset in data["presets"]:
            if preset["id"] != preset_id:
                continue
            if title is not None and title.strip():
                preset["title"] = title.strip()
            if selection is not None:
                entries = clean_selection(selection)
                if entries:
                    preset["selection"] = entries
            _write(data)
            return preset
    return None


def delete_preset(preset_id: str) -> bool:
    with _lock:
        data = _read()
        kept = [p for p in data["presets"] if p["id"] != preset_id]
        if len(kept) == len(data["presets"]):
            return False
        data["presets"] = kept
        _write(data)
        return True


# ---- the sentence -------------------------------------------------------------


def _rank(category: str) -> float:
    return float(CATEGORY_ORDER.index(category)) if category in CATEGORY_ORDER else _UNKNOWN_RANK


def _join(parts: List[str]) -> str:
    if len(parts) <= 1:
        return "".join(parts)
    return ", ".join(parts[:-1]) + " and " + parts[-1]


def pick_entries(entries: List[Dict[str, Any]], mode: str, first_only: bool = False) -> List[Dict[str, Any]]:
    """Random mode: pinned poses always stay; each category contributes one of its unpinned poses."""
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


def build_pose(selection: Any, mode: str = "fixed", pronoun: str = "She", lead: str = "", first_only: bool = False) -> str:
    entries = pick_entries(clean_selection(selection), mode, first_only)
    if not entries:
        return ""
    entries.sort(key=lambda e: _rank(e["category"]))
    poss = POSSESSIVE.get(pronoun, "the")
    parts = [e["text"].replace("{poss}", poss) for e in entries]
    joined = _join(parts)
    lead = (lead or "").strip()
    if not lead:
        lead = {"She": "She is", "He": "He is", "They": "They are"}.get(pronoun, "")
    if lead:
        return f"{lead} {joined}."
    return f"{joined[:1].upper()}{joined[1:]}."


# ---- routes -------------------------------------------------------------------


def setup_pose_routes():
    routes = PromptServer.instance.routes

    def _err(message, status=400):
        return web.json_response({"error": message}, status=status)

    async def _json(request):
        try:
            data = await request.json()
        except Exception:
            return None
        return data if isinstance(data, dict) else None

    @routes.get("/pose_builder/catalog")
    async def pb_catalog(request):
        return web.json_response({"items": list_items()})

    @routes.post("/pose_builder/items")
    async def pb_add_item(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        item = add_item(str(data.get("name", "")), str(data.get("category", "")), str(data.get("text", "")))
        if item is None:
            return _err("Name is required")
        return web.json_response(item)

    @routes.put("/pose_builder/items/{item_id}")
    async def pb_update_item(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        item = update_item(request.match_info["item_id"], data)
        return web.json_response(item) if item else _err("Pose not found", 404)

    @routes.delete("/pose_builder/items/{item_id}")
    async def pb_delete_item(request):
        if not delete_item(request.match_info["item_id"]):
            return _err("Pose not found", 404)
        return web.json_response({"ok": True})

    @routes.post("/pose_builder/restore")
    async def pb_restore(request):
        added = restore_defaults()
        return web.json_response({"added": added, "items": list_items()})

    @routes.get("/pose_builder/presets")
    async def pb_presets(request):
        return web.json_response(list_presets())

    @routes.post("/pose_builder/presets")
    async def pb_add_preset(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        preset = add_preset(str(data.get("title", "")), data.get("selection"))
        if preset is None:
            return _err("A title and at least one pose are required")
        return web.json_response(preset)

    @routes.put("/pose_builder/presets/{preset_id}")
    async def pb_update_preset(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        title = data.get("title")
        preset = update_preset(request.match_info["preset_id"], str(title) if title is not None else None, data.get("selection"))
        return web.json_response(preset) if preset else _err("Preset not found", 404)

    @routes.delete("/pose_builder/presets/{preset_id}")
    async def pb_delete_preset(request):
        if not delete_preset(request.match_info["preset_id"]):
            return _err("Preset not found", 404)
        return web.json_response({"ok": True})

    @routes.post("/pose_builder/preview")
    async def pb_preview(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        mode = data.get("mode") if data.get("mode") in MODES else "fixed"
        pronoun = data.get("pronoun") if data.get("pronoun") in PRONOUNS else "She"
        pose = build_pose(data.get("selection"), mode, pronoun, str(data.get("lead", "")), first_only=True)
        return web.json_response({"outfit": pose, "pose": pose})
