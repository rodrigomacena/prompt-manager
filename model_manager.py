"""Model Manager backend: browse, move, delete and download models.

Everything is confined to ComfyUI's ``models`` directory; every path coming
from the frontend is resolved and rejected if it escapes that directory.
"""

import asyncio
import os
import re
import time
import uuid
from typing import Any, Dict, List, Optional

import aiohttp
from aiohttp import web
from server import PromptServer

import folder_paths

from . import storage

MODELS_DIR = os.path.normpath(os.path.abspath(folder_paths.models_dir))
MAX_FOLDER_DEPTH = 3
CIVITAI_URL = "https://civitai.com/api/download/models/{model_id}"

_downloads: Dict[str, Dict[str, Any]] = {}
_tasks: Dict[str, "asyncio.Task"] = {}


class ModelManagerError(Exception):
    pass


def _resolve(rel: str) -> str:
    rel = (rel or "").replace("\\", "/").strip("/")
    full = os.path.normpath(os.path.join(MODELS_DIR, rel))
    if os.path.commonpath([full, MODELS_DIR]) != MODELS_DIR:
        raise ModelManagerError("Path is outside the models folder")
    return full


def _rel(full: str) -> str:
    return "" if full == MODELS_DIR else os.path.relpath(full, MODELS_DIR).replace("\\", "/")


def list_dir(rel: str) -> Dict[str, Any]:
    full = _resolve(rel)
    if not os.path.isdir(full):
        raise ModelManagerError("Folder not found")
    folders: List[Dict[str, Any]] = []
    files: List[Dict[str, Any]] = []
    with os.scandir(full) as it:
        for entry in it:
            try:
                if entry.is_dir():
                    folders.append({"name": entry.name})
                elif entry.is_file():
                    st = entry.stat()
                    files.append({"name": entry.name, "size": st.st_size, "mtime": st.st_mtime})
            except OSError:
                continue
    folders.sort(key=lambda f: f["name"].lower())
    files.sort(key=lambda f: f["name"].lower())
    return {"path": _rel(full), "folders": folders, "files": files}


def all_folders() -> List[str]:
    result: List[str] = [""]
    for root, dirs, _files in os.walk(MODELS_DIR):
        depth = 0 if root == MODELS_DIR else len(os.path.relpath(root, MODELS_DIR).split(os.sep))
        dirs.sort(key=str.lower)
        if depth >= MAX_FOLDER_DEPTH:
            dirs[:] = []
        for d in dirs:
            result.append(os.path.relpath(os.path.join(root, d), MODELS_DIR).replace("\\", "/"))
    result.sort(key=str.lower)
    return result


def delete_file(rel: str) -> None:
    full = _resolve(rel)
    if not os.path.isfile(full):
        raise ModelManagerError("File not found")
    os.remove(full)


def move_file(rel: str, dest_dir: str) -> str:
    src = _resolve(rel)
    dest_folder = _resolve(dest_dir)
    if not os.path.isfile(src):
        raise ModelManagerError("File not found")
    if not os.path.isdir(dest_folder):
        raise ModelManagerError("Destination folder not found")
    dest = os.path.join(dest_folder, os.path.basename(src))
    if os.path.exists(dest):
        raise ModelManagerError("A file with that name already exists in the destination")
    os.replace(src, dest)
    return _rel(dest)


def rename_file(rel: str, new_name: str) -> str:
    src = _resolve(rel)
    if not os.path.isfile(src):
        raise ModelManagerError("File not found")
    new_name = (new_name or "").strip()
    if not new_name or new_name in (".", ".."):
        raise ModelManagerError("Enter a file name")
    if "/" in new_name or "\\" in new_name or re.search(r'[<>:"|?*\x00-\x1f]', new_name) or new_name.endswith((".", " ")):
        raise ModelManagerError("The name contains characters that are not allowed")
    dest = os.path.join(os.path.dirname(src), new_name)
    if new_name == os.path.basename(src):
        raise ModelManagerError("That is already the file name")
    only_case_change = new_name.lower() == os.path.basename(src).lower()
    if os.path.exists(dest) and not only_case_change:
        raise ModelManagerError("A file with that name already exists in this folder")
    os.replace(src, dest)
    return _rel(dest)


def _safe_filename(name: str) -> str:
    name = os.path.basename(name.replace("\\", "/"))
    name = re.sub(r'[<>:"|?*\x00-\x1f]', "_", name).strip(". ")
    return name or "model.bin"


def _public(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if not k.startswith("_")}


async def _run_download(dl_id: str, model_id: str, folder: str, token: str) -> None:
    dl = _downloads[dl_id]
    part_path: Optional[str] = None
    try:
        target_dir = _resolve(folder)
        os.makedirs(target_dir, exist_ok=True)
        url = CIVITAI_URL.format(model_id=model_id)
        if token:
            url += f"?token={token}"
        timeout = aiohttp.ClientTimeout(total=None, connect=30, sock_read=120)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, allow_redirects=True) as resp:
                if resp.status in (401, 403):
                    raise ModelManagerError("Civitai refused the download (check the API token or the model's access rules)")
                if resp.status == 404:
                    raise ModelManagerError("Model version not found on Civitai")
                if resp.status != 200:
                    raise ModelManagerError(f"Civitai returned HTTP {resp.status}")
                cd = resp.content_disposition
                filename = _safe_filename(cd.filename) if cd and cd.filename else f"civitai_{model_id}.safetensors"
                dest = os.path.join(target_dir, filename)
                if os.path.exists(dest):
                    raise ModelManagerError(f"{filename} already exists in that folder")
                dl["filename"] = filename
                dl["total"] = resp.content_length or 0
                dl["status"] = "downloading"
                part_path = dest + ".part"
                started = time.monotonic()
                with open(part_path, "wb") as f:
                    async for chunk in resp.content.iter_chunked(1024 * 1024):
                        f.write(chunk)
                        dl["downloaded"] += len(chunk)
                        elapsed = max(time.monotonic() - started, 0.001)
                        dl["speed"] = dl["downloaded"] / elapsed
        os.replace(part_path, dest)
        part_path = None
        dl["status"] = "done"
    except asyncio.CancelledError:
        dl["status"] = "cancelled"
        raise
    except ModelManagerError as e:
        dl["status"] = "error"
        dl["error"] = str(e)
    except aiohttp.ClientError as e:
        dl["status"] = "error"
        dl["error"] = f"Network error: {type(e).__name__}"
    except OSError as e:
        dl["status"] = "error"
        dl["error"] = f"Disk error: {e.strerror or type(e).__name__}"
    finally:
        if part_path and os.path.exists(part_path):
            try:
                os.remove(part_path)
            except OSError:
                pass
        _tasks.pop(dl_id, None)


def _err(message: str, status: int = 400):
    return web.json_response({"error": message}, status=status)


async def _json(request):
    try:
        return await request.json()
    except Exception:
        return None


def setup_model_routes():
    routes = PromptServer.instance.routes

    @routes.get("/model_manager/list")
    async def mm_list(request):
        try:
            return web.json_response(list_dir(request.query.get("path", "")))
        except ModelManagerError as e:
            return _err(str(e), 404)

    @routes.get("/model_manager/folders")
    async def mm_folders(request):
        return web.json_response({"folders": all_folders()})

    @routes.post("/model_manager/delete")
    async def mm_delete(request):
        data = await _json(request)
        if not data:
            return _err("Invalid JSON")
        try:
            delete_file(data.get("path", ""))
        except ModelManagerError as e:
            return _err(str(e))
        except OSError as e:
            return _err(f"Could not delete: {e.strerror}")
        return web.json_response({"ok": True})

    @routes.post("/model_manager/move")
    async def mm_move(request):
        data = await _json(request)
        if not data:
            return _err("Invalid JSON")
        try:
            new_path = move_file(data.get("path", ""), data.get("dest", ""))
        except ModelManagerError as e:
            return _err(str(e))
        except OSError as e:
            return _err(f"Could not move: {e.strerror}")
        return web.json_response({"ok": True, "path": new_path})

    @routes.post("/model_manager/rename")
    async def mm_rename(request):
        data = await _json(request)
        if not data:
            return _err("Invalid JSON")
        try:
            new_path = rename_file(data.get("path", ""), data.get("name", ""))
        except ModelManagerError as e:
            return _err(str(e))
        except OSError as e:
            return _err(f"Could not rename: {e.strerror}")
        return web.json_response({"ok": True, "path": new_path})

    @routes.get("/model_manager/settings")
    async def mm_get_settings(request):
        return web.json_response({"has_token": bool(storage.get_settings().get("civitai_token"))})

    @routes.post("/model_manager/settings")
    async def mm_save_settings(request):
        data = await _json(request)
        if data is None:
            return _err("Invalid JSON")
        settings = storage.save_settings(civitai_token=data.get("civitai_token", ""))
        return web.json_response({"has_token": bool(settings.get("civitai_token"))})

    @routes.post("/model_manager/download")
    async def mm_download(request):
        data = await _json(request)
        if not data:
            return _err("Invalid JSON")
        model_id = str(data.get("model_id", "")).strip()
        if not model_id.isdigit():
            return _err("Enter the numeric Civitai model version ID")
        folder = data.get("folder", "")
        try:
            target = _resolve(folder)
        except ModelManagerError as e:
            return _err(str(e))
        if os.path.exists(target) and not os.path.isdir(target):
            return _err("Destination is not a folder")
        token = storage.get_settings().get("civitai_token", "")
        dl_id = uuid.uuid4().hex
        _downloads[dl_id] = {
            "id": dl_id,
            "model_id": model_id,
            "folder": _rel(target),
            "filename": "",
            "status": "starting",
            "downloaded": 0,
            "total": 0,
            "speed": 0,
            "error": "",
        }
        _tasks[dl_id] = asyncio.get_running_loop().create_task(_run_download(dl_id, model_id, folder, token))
        return web.json_response(_public(_downloads[dl_id]))

    @routes.get("/model_manager/downloads")
    async def mm_downloads(request):
        return web.json_response({"downloads": [_public(d) for d in _downloads.values()]})

    @routes.post("/model_manager/download/cancel")
    async def mm_cancel(request):
        data = await _json(request)
        task = _tasks.get((data or {}).get("id", ""))
        if task:
            task.cancel()
        return web.json_response({"ok": True})

    @routes.post("/model_manager/download/clear")
    async def mm_clear(request):
        for dl_id in [i for i, d in _downloads.items() if d["status"] in ("done", "error", "cancelled")]:
            _downloads.pop(dl_id, None)
        return web.json_response({"ok": True})
