"""Outfit Builder: pick clothing items from a catalog and turn them into a prompt sentence.

The catalog (editable) and the saved outfit presets live in a JSON file next to the
Prompt Manager database. The node itself only needs the selection that the frontend
stores in a widget (each entry carries its own text), so a server whose catalog
differs still produces the same sentence.
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

DATA_PATH = os.path.join(storage._BASE_DIR, "outfit_builder.json")
DEFAULT_CATALOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outfit_default_catalog.json")

_lock = threading.Lock()

# Order the pieces appear in the sentence: body first, then layers, shoes and accessories.
CATEGORY_ORDER = [
    "Swimwear",
    "Dresses",
    "One-Pieces",
    "Tops",
    "Bottoms",
    "Activewear",
    "Lingerie",
    "Sleepwear",
    "Sexy Costumes",
    "Outerwear",
    "Shoes",
    "Accessories",
]
_UNKNOWN_RANK = CATEGORY_ORDER.index("Sexy Costumes") + 0.5

PLURAL_WORDS = {
    "jeans", "shorts", "pants", "leggings", "trousers", "overalls", "dungarees", "panties", "boyshorts",
    "joggers", "sweatpants", "culottes", "heels", "pumps", "boots", "sandals", "mules", "flats", "loafers",
    "oxfords", "sneakers", "wedges", "espadrilles", "flip-flops", "slides", "janes", "earrings", "gloves",
    "stockings", "pantyhose", "aviators", "sunglasses", "briefs", "shawls", "shoes",
}

PRONOUNS = ["She", "He", "They", "(none)"]
MODES = ["fixed", "random"]
SEPARATORS = ["space", "new paragraph"]

MAX_ENTRIES = 100


# ---- catalog ------------------------------------------------------------------


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def derive_text(name: str) -> str:
    text = re.sub(r"\s*\(.*?\)", "", name or "").strip().lower()
    return text or (name or "").strip().lower()


def derive_plural(text: str) -> bool:
    words = (text or "").lower().split()
    return bool(words) and words[-1] in PLURAL_WORDS


def _item(name: str, category: str, text: Optional[str] = None, plural: Optional[bool] = None, item_id: Optional[str] = None):
    name = (name or "").strip()
    category = (category or "").strip() or "Other"
    text = (text or "").strip() or derive_text(name)
    return {
        "id": item_id or uuid.uuid4().hex,
        "name": name,
        "category": category,
        "text": text,
        "plural": derive_plural(text) if plural is None else bool(plural),
    }


def default_items() -> List[Dict[str, Any]]:
    with open(DEFAULT_CATALOG_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    items = []
    for category, names in raw.items():
        for name in names:
            items.append(_item(name, category, item_id=f"{slugify(category)}-{slugify(name)}"))
    return items


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
        _write(data)
    data.setdefault("presets", [])
    return data


def _write(data: Dict[str, Any]) -> None:
    tmp = DATA_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, DATA_PATH)


def list_items() -> List[Dict[str, Any]]:
    with _lock:
        return _read()["items"]


def add_item(name: str, category: str, text: str = "", plural: Optional[bool] = None) -> Optional[Dict[str, Any]]:
    if not (name or "").strip():
        return None
    with _lock:
        data = _read()
        item = _item(name, category, text, plural)
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
                item["text"] = str(fields["text"]).strip() or derive_text(item["name"])
            if "plural" in fields:
                item["plural"] = derive_plural(item["text"]) if fields["plural"] is None else bool(fields["plural"])
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
    """Add back any shipped item that is missing (never touches your own items or edits)."""
    with _lock:
        data = _read()
        have = {i["id"] for i in data["items"]}
        missing = [i for i in default_items() if i["id"] not in have]
        data["items"].extend(missing)
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
        text = str(entry.get("text", "")).strip()[:120]
        if not text:
            continue
        entries.append(
            {
                "id": str(entry.get("id", ""))[:80],
                "name": str(entry.get("name", text))[:120],
                "text": text,
                "plural": bool(entry.get("plural", False)),
                "category": str(entry.get("category", "")).strip()[:60],
                "color": str(entry.get("color", "")).strip()[:60],
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


def _article(phrase: str) -> str:
    word = phrase.split()[0].lower() if phrase.split() else ""
    if word.startswith(("hour", "honest", "heir")):
        return "an"
    if word.startswith(("uni", "use", "one", "eu")):
        return "a"
    return "an" if word[:1] in ("a", "e", "i", "o", "u") else "a"


def _phrase(entry: Dict[str, Any]) -> str:
    color = entry["color"]
    phrase = f"{color} {entry['text']}" if color else entry["text"]
    if entry["plural"]:
        return phrase
    return f"{_article(phrase)} {phrase}"


def _join(parts: List[str]) -> str:
    if len(parts) <= 1:
        return "".join(parts)
    return ", ".join(parts[:-1]) + " and " + parts[-1]


def _rank(category: str) -> float:
    return float(CATEGORY_ORDER.index(category)) if category in CATEGORY_ORDER else _UNKNOWN_RANK


def pick_entries(entries: List[Dict[str, Any]], mode: str, first_only: bool = False) -> List[Dict[str, Any]]:
    """Random mode: pinned pieces always stay; each category contributes one of its unpinned pieces."""
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


def build_outfit(selection: Any, mode: str = "fixed", pronoun: str = "She", lead: str = "", first_only: bool = False) -> str:
    entries = pick_entries(clean_selection(selection), mode, first_only)
    if not entries:
        return ""
    entries.sort(key=lambda e: _rank(e["category"]))
    items = _join([_phrase(e) for e in entries])
    lead = (lead or "").strip()
    if not lead:
        lead = {"She": "She is wearing", "He": "He is wearing", "They": "They are wearing"}.get(pronoun, "Wearing")
    return f"{lead} {items}."


def combine(prompt: Optional[str], outfit: str, separator: str = "space") -> str:
    prompt = (prompt or "").strip()
    if not outfit:
        return prompt
    if not prompt:
        return outfit
    if separator == "new paragraph":
        return f"{prompt}\n\n{outfit}"
    if prompt[-1] not in ".!?,;:":
        prompt += "."
    return f"{prompt} {outfit}"


# ---- routes -------------------------------------------------------------------


def setup_outfit_routes():
    routes = PromptServer.instance.routes

    def _err(message, status=400):
        return web.json_response({"error": message}, status=status)

    async def _json(request):
        try:
            data = await request.json()
        except Exception:
            return None
        return data if isinstance(data, dict) else None

    @routes.get("/outfit_builder/catalog")
    async def ob_catalog(request):
        return web.json_response({"items": list_items()})

    @routes.post("/outfit_builder/items")
    async def ob_add_item(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        item = add_item(str(data.get("name", "")), str(data.get("category", "")), str(data.get("text", "")), data.get("plural"))
        if item is None:
            return _err("Name is required")
        return web.json_response(item)

    @routes.put("/outfit_builder/items/{item_id}")
    async def ob_update_item(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        item = update_item(request.match_info["item_id"], data)
        return web.json_response(item) if item else _err("Item not found", 404)

    @routes.delete("/outfit_builder/items/{item_id}")
    async def ob_delete_item(request):
        if not delete_item(request.match_info["item_id"]):
            return _err("Item not found", 404)
        return web.json_response({"ok": True})

    @routes.post("/outfit_builder/restore")
    async def ob_restore(request):
        added = restore_defaults()
        return web.json_response({"added": added, "items": list_items()})

    @routes.get("/outfit_builder/presets")
    async def ob_presets(request):
        return web.json_response(list_presets())

    @routes.post("/outfit_builder/presets")
    async def ob_add_preset(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        preset = add_preset(str(data.get("title", "")), data.get("selection"))
        if preset is None:
            return _err("A title and at least one piece are required")
        return web.json_response(preset)

    @routes.put("/outfit_builder/presets/{preset_id}")
    async def ob_update_preset(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        title = data.get("title")
        preset = update_preset(request.match_info["preset_id"], str(title) if title is not None else None, data.get("selection"))
        return web.json_response(preset) if preset else _err("Preset not found", 404)

    @routes.delete("/outfit_builder/presets/{preset_id}")
    async def ob_delete_preset(request):
        if not delete_preset(request.match_info["preset_id"]):
            return _err("Preset not found", 404)
        return web.json_response({"ok": True})

    @routes.post("/outfit_builder/preview")
    async def ob_preview(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        mode = data.get("mode") if data.get("mode") in MODES else "fixed"
        pronoun = data.get("pronoun") if data.get("pronoun") in PRONOUNS else "She"
        outfit = build_outfit(data.get("selection"), mode, pronoun, str(data.get("lead", "")), first_only=True)
        return web.json_response({"outfit": outfit})
