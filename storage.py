"""Persistence layer for Prompt Manager.

Stores groups and prompts as JSON under ComfyUI's per-user data directory
(falls back to a local ``data`` folder when ``folder_paths`` isn't available,
e.g. when this module is imported outside of a running ComfyUI instance).
"""

import json
import os
import threading
import uuid
from typing import Any, Dict, List, Optional

try:
    import folder_paths

    _BASE_DIR = os.path.join(folder_paths.get_user_directory(), "PromptManager")
except Exception:
    _BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

os.makedirs(_BASE_DIR, exist_ok=True)
DB_PATH = os.path.join(_BASE_DIR, "prompt_manager_db.json")

_lock = threading.Lock()
_DEFAULT_DB: Dict[str, Any] = {"groups": []}

DEFAULT_MODEL = "openai/gpt-4o-mini"
_DEFAULT_SETTINGS: Dict[str, Any] = {"api_key": "", "model": DEFAULT_MODEL}


def _read_raw() -> Dict[str, Any]:
    if not os.path.exists(DB_PATH):
        return {"groups": [], "settings": dict(_DEFAULT_SETTINGS)}
    with open(DB_PATH, "r", encoding="utf-8") as f:
        try:
            db = json.load(f)
        except json.JSONDecodeError:
            return {"groups": [], "settings": dict(_DEFAULT_SETTINGS)}
    db.setdefault("groups", [])
    db.setdefault("settings", dict(_DEFAULT_SETTINGS))
    return db


def _write_raw(db: Dict[str, Any]) -> None:
    tmp_path = DB_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, DB_PATH)


def load_db() -> Dict[str, Any]:
    with _lock:
        return _read_raw()


def get_group(db: Dict[str, Any], group_id: str) -> Optional[Dict[str, Any]]:
    for g in db["groups"]:
        if g["id"] == group_id:
            return g
    return None


def list_groups() -> List[Dict[str, Any]]:
    return load_db()["groups"]


def create_group(name: str) -> Dict[str, Any]:
    with _lock:
        db = _read_raw()
        group = {"id": uuid.uuid4().hex, "name": name, "sequential_index": 0, "prompts": []}
        db["groups"].append(group)
        _write_raw(db)
        return group


def rename_group(group_id: str, name: str) -> Optional[Dict[str, Any]]:
    with _lock:
        db = _read_raw()
        group = get_group(db, group_id)
        if group is None:
            return None
        group["name"] = name
        _write_raw(db)
        return group


def delete_group(group_id: str) -> bool:
    with _lock:
        db = _read_raw()
        before = len(db["groups"])
        db["groups"] = [g for g in db["groups"] if g["id"] != group_id]
        changed = len(db["groups"]) != before
        if changed:
            _write_raw(db)
        return changed


def add_prompt(group_id: str, text: str, rating: int = 0) -> Optional[Dict[str, Any]]:
    with _lock:
        db = _read_raw()
        group = get_group(db, group_id)
        if group is None:
            return None
        prompt = {"id": uuid.uuid4().hex, "text": text, "rating": max(0, min(5, int(rating)))}
        group["prompts"].append(prompt)
        _write_raw(db)
        return prompt


def update_prompt(
    group_id: str,
    prompt_id: str,
    text: Optional[str] = None,
    rating: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    with _lock:
        db = _read_raw()
        group = get_group(db, group_id)
        if group is None:
            return None
        for p in group["prompts"]:
            if p["id"] == prompt_id:
                if text is not None:
                    p["text"] = text
                if rating is not None:
                    p["rating"] = max(0, min(5, int(rating)))
                _write_raw(db)
                return p
        return None


def delete_prompt(group_id: str, prompt_id: str) -> bool:
    with _lock:
        db = _read_raw()
        group = get_group(db, group_id)
        if group is None:
            return False
        before = len(group["prompts"])
        group["prompts"] = [p for p in group["prompts"] if p["id"] != prompt_id]
        changed = len(group["prompts"]) != before
        if changed:
            _write_raw(db)
        return changed


def get_next_sequential(group_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        db = _read_raw()
        group = get_group(db, group_id)
        if not group or not group["prompts"]:
            return None
        idx = group.get("sequential_index", 0) % len(group["prompts"])
        prompt = group["prompts"][idx]
        group["sequential_index"] = (idx + 1) % len(group["prompts"])
        _write_raw(db)
        return prompt


def _import_group(db: Dict[str, Any], data: Dict[str, Any], overwrite: bool) -> Dict[str, Any]:
    """Merge a single group backup ``{"name", "prompts": [{"text", "rating"}]}`` into ``db`` in place."""
    name = (data.get("name") or "Restored group").strip() or "Restored group"
    prompts_in = data.get("prompts", [])
    imported_prompts = [
        {
            "id": uuid.uuid4().hex,
            "text": p.get("text", ""),
            "rating": max(0, min(5, int(p.get("rating", 0) or 0))),
        }
        for p in prompts_in
    ]

    existing = next((g for g in db["groups"] if g["name"] == name), None)
    if existing and overwrite:
        existing["prompts"] = imported_prompts
        existing["sequential_index"] = 0
        return existing

    if existing:
        name = f"{name} (restored)"
    group = {
        "id": uuid.uuid4().hex,
        "name": name,
        "sequential_index": 0,
        "prompts": imported_prompts,
    }
    db["groups"].append(group)
    return group


def backup_all() -> Dict[str, Any]:
    """Export every group as ``{"groups": [{"name", "prompts": [{"text", "rating"}]}]}``."""
    db = load_db()
    return {
        "groups": [
            {
                "name": g["name"],
                "prompts": [{"text": p["text"], "rating": p["rating"]} for p in g["prompts"]],
            }
            for g in db["groups"]
        ]
    }


def restore_all(data: Dict[str, Any], overwrite: bool = False) -> List[Dict[str, Any]]:
    """Import every group from a full backup ``{"groups": [...]}``."""
    with _lock:
        db = _read_raw()
        groups = [_import_group(db, group_data, overwrite) for group_data in data.get("groups", [])]
        _write_raw(db)
        return groups


def get_settings() -> Dict[str, Any]:
    return load_db()["settings"]


def save_settings(api_key: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    with _lock:
        db = _read_raw()
        settings = db["settings"]
        if api_key is not None:
            settings["api_key"] = api_key
        if model is not None:
            settings["model"] = model.strip() or DEFAULT_MODEL
        _write_raw(db)
        return settings
