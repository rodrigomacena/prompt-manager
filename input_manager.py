"""Input Manager backend: image gallery over folders inside ComfyUI's base dir.

Every path coming from the frontend is resolved and rejected if it escapes the
ComfyUI base directory or doesn't point at an image file.
"""

import asyncio
import hashlib
import os
import re
import uuid
from typing import Any, Dict, List

from aiohttp import web
from PIL import Image, ImageOps
from server import PromptServer

import folder_paths

BASE_DIR = os.path.normpath(os.path.abspath(folder_paths.base_path))
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
SKIP_DIRS = {"models", "custom_nodes", "__pycache__", "node_modules", "venv", "site-packages"}
MAX_DIR_DEPTH = 3
MAX_IMAGES = 3000
THUMB_SIZE = 320

try:
    _THUMB_DIR = os.path.join(folder_paths.get_user_directory(), "InputManager", "thumbs")
except Exception:
    _THUMB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "thumbs")
os.makedirs(_THUMB_DIR, exist_ok=True)

_MASK_DIR = os.path.join(os.path.dirname(_THUMB_DIR), "masks")
os.makedirs(_MASK_DIR, exist_ok=True)
_MASK_ID_RE = re.compile(r"[0-9a-f]{8,64}")

_thumb_slots = asyncio.Semaphore(4)


def mask_path(mask_id: str) -> str:
    if not _MASK_ID_RE.fullmatch(mask_id or ""):
        raise InputManagerError("Invalid mask id")
    return os.path.join(_MASK_DIR, mask_id + ".png")


def load_painted_mask(mask_id: str, width: int, height: int):
    """Mask drawn in the gallery preview (painted = 1.0), or None if there isn't one."""
    import numpy as np
    import torch

    try:
        path = mask_path(mask_id)
    except InputManagerError:
        return None
    if not os.path.isfile(path):
        return None
    with Image.open(path) as m:
        alpha = m.convert("RGBA").getchannel("A")
    if alpha.size != (width, height):
        alpha = alpha.resize((width, height), Image.BILINEAR)
    return torch.from_numpy(np.array(alpha).astype(np.float32) / 255.0).unsqueeze(0)


class InputManagerError(Exception):
    pass


def resolve(rel: str) -> str:
    rel = (rel or "").replace("\\", "/").strip("/")
    full = os.path.normpath(os.path.join(BASE_DIR, rel))
    if os.path.commonpath([full, BASE_DIR]) != BASE_DIR:
        raise InputManagerError("Path is outside the ComfyUI folder")
    return full


def rel_of(full: str) -> str:
    return "" if full == BASE_DIR else os.path.relpath(full, BASE_DIR).replace("\\", "/")


def resolve_image(rel: str) -> str:
    full = resolve(rel)
    if os.path.splitext(full)[1].lower() not in IMAGE_EXTS:
        raise InputManagerError("Not an image file")
    if not os.path.isfile(full):
        raise InputManagerError("Image not found")
    return full


def all_dirs() -> List[str]:
    result: List[str] = []
    for root, dirs, _files in os.walk(BASE_DIR):
        depth = 0 if root == BASE_DIR else len(os.path.relpath(root, BASE_DIR).split(os.sep))
        dirs[:] = sorted((d for d in dirs if not d.startswith(".") and d.lower() not in SKIP_DIRS), key=str.lower)
        if depth >= MAX_DIR_DEPTH:
            dirs[:] = []
        for d in dirs:
            result.append(os.path.relpath(os.path.join(root, d), BASE_DIR).replace("\\", "/"))
    result.sort(key=str.lower)
    return result


def list_images(rel_dir: str) -> Dict[str, Any]:
    full = resolve(rel_dir)
    if not os.path.isdir(full):
        raise InputManagerError("Folder not found")
    images: List[Dict[str, Any]] = []
    with os.scandir(full) as it:
        for entry in it:
            try:
                if entry.is_file() and os.path.splitext(entry.name)[1].lower() in IMAGE_EXTS:
                    st = entry.stat()
                    images.append({"name": entry.name, "size": st.st_size, "mtime": st.st_mtime})
            except OSError:
                continue
    images.sort(key=lambda i: i["mtime"], reverse=True)
    truncated = len(images) > MAX_IMAGES
    return {"dir": rel_of(full), "images": images[:MAX_IMAGES], "total": len(images), "truncated": truncated}


def load_image_tensor(full_path: str):
    import numpy as np
    import torch

    img = Image.open(full_path)
    img = ImageOps.exif_transpose(img)
    if img.mode == "I":
        img = img.point(lambda i: i * (1 / 255))
    rgb = img.convert("RGB")
    image = torch.from_numpy(np.array(rgb).astype(np.float32) / 255.0)[None,]
    if "A" in img.getbands():
        mask = 1.0 - torch.from_numpy(np.array(img.getchannel("A")).astype(np.float32) / 255.0)
    else:
        mask = torch.zeros((rgb.height, rgb.width), dtype=torch.float32)
    return image, mask.unsqueeze(0)


def _make_thumb(src: str, dest: str) -> None:
    with Image.open(src) as img:
        img.draft("RGB", (THUMB_SIZE * 2, THUMB_SIZE * 2))
        img = ImageOps.exif_transpose(img)
        img.thumbnail((THUMB_SIZE, THUMB_SIZE))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
        tmp = dest + ".tmp"
        img.save(tmp, "WEBP", quality=80)
        os.replace(tmp, dest)


def _unique_path(folder: str, filename: str) -> str:
    name = re.sub(r'[<>:"|?*\x00-\x1f]', "_", os.path.basename(filename.replace("\\", "/"))).strip(". ")
    stem, ext = os.path.splitext(name or "image.png")
    if ext.lower() not in IMAGE_EXTS:
        raise InputManagerError(f"{name or 'File'} is not a supported image")
    candidate = os.path.join(folder, stem + ext)
    n = 1
    while os.path.exists(candidate):
        candidate = os.path.join(folder, f"{stem}_{n}{ext}")
        n += 1
    return candidate


def _err(message: str, status: int = 400):
    return web.json_response({"error": message}, status=status)


def setup_input_routes():
    routes = PromptServer.instance.routes

    @routes.get("/input_manager/dirs")
    async def im_dirs(request):
        return web.json_response({"dirs": all_dirs()})

    @routes.get("/input_manager/list")
    async def im_list(request):
        try:
            return web.json_response(list_images(request.query.get("dir", "")))
        except InputManagerError as e:
            return _err(str(e), 404)

    @routes.get("/input_manager/thumb")
    async def im_thumb(request):
        try:
            src = resolve_image(request.query.get("path", ""))
        except InputManagerError as e:
            return _err(str(e), 404)
        st = os.stat(src)
        key = hashlib.sha1(f"{src}|{st.st_mtime_ns}|{st.st_size}".encode("utf-8")).hexdigest()
        dest = os.path.join(_THUMB_DIR, key + ".webp")
        if not os.path.exists(dest):
            async with _thumb_slots:
                if not os.path.exists(dest):
                    try:
                        await asyncio.get_running_loop().run_in_executor(None, _make_thumb, src, dest)
                    except Exception:
                        return _err("Could not read this image", 415)
        return web.FileResponse(dest, headers={"Cache-Control": "public, max-age=86400"})

    @routes.get("/input_manager/image")
    async def im_image(request):
        try:
            src = resolve_image(request.query.get("path", ""))
        except InputManagerError as e:
            return _err(str(e), 404)
        return web.FileResponse(src, headers={"Cache-Control": "no-cache"})

    @routes.post("/input_manager/upload")
    async def im_upload(request):
        saved: List[str] = []
        errors: List[str] = []
        folder = ""
        try:
            reader = await request.multipart()
            while True:
                part = await reader.next()
                if part is None:
                    break
                if part.name == "dir":
                    folder = (await part.text()).strip()
                    continue
                if part.name != "file" or not part.filename:
                    continue
                try:
                    target_dir = resolve(folder)
                    if not os.path.isdir(target_dir):
                        raise InputManagerError("Folder not found")
                    dest = _unique_path(target_dir, part.filename)
                except InputManagerError as e:
                    errors.append(str(e))
                    while await part.read_chunk():
                        pass
                    continue
                tmp = os.path.join(target_dir, f".upload_{uuid.uuid4().hex}.tmp")
                try:
                    with open(tmp, "wb") as f:
                        while True:
                            chunk = await part.read_chunk(1024 * 1024)
                            if not chunk:
                                break
                            f.write(chunk)
                    with Image.open(tmp) as probe:
                        probe.verify()
                    os.replace(tmp, dest)
                    saved.append(rel_of(dest))
                except Exception:
                    errors.append(f"{part.filename} is not a valid image")
                finally:
                    if os.path.exists(tmp):
                        os.remove(tmp)
        except Exception:
            return _err("Upload failed")
        if not saved and errors:
            return _err(errors[0])
        return web.json_response({"saved": saved, "errors": errors})

    @routes.post("/input_manager/mask")
    async def im_mask_save(request):
        mask_id = ""
        data = b""
        clear = False
        try:
            reader = await request.multipart()
            while True:
                part = await reader.next()
                if part is None:
                    break
                if part.name == "id":
                    mask_id = (await part.text()).strip()
                elif part.name == "clear":
                    clear = (await part.text()).strip() == "1"
                elif part.name == "file":
                    data = await part.read(decode=False)
        except Exception:
            return _err("Upload failed")
        try:
            path = mask_path(mask_id)
        except InputManagerError as e:
            return _err(str(e))
        if clear:
            if os.path.exists(path):
                os.remove(path)
            return web.json_response({"ok": True})
        tmp = path + f".{uuid.uuid4().hex}.tmp"
        try:
            with open(tmp, "wb") as f:
                f.write(data)
            with Image.open(tmp) as probe:
                probe.verify()
            os.replace(tmp, path)
        except Exception:
            return _err("That is not a valid mask image")
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)
        return web.json_response({"ok": True})

    @routes.get("/input_manager/mask")
    async def im_mask_get(request):
        try:
            path = mask_path(request.query.get("id", ""))
        except InputManagerError as e:
            return _err(str(e))
        if not os.path.isfile(path):
            return _err("No mask", 404)
        return web.FileResponse(path, headers={"Cache-Control": "no-cache"})

    @routes.post("/input_manager/delete")
    async def im_delete(request):
        try:
            data = await request.json()
        except Exception:
            return _err("Invalid JSON")
        try:
            src = resolve_image((data or {}).get("path", ""))
            os.remove(src)
        except InputManagerError as e:
            return _err(str(e))
        except OSError as e:
            return _err(f"Could not delete: {e.strerror}")
        return web.json_response({"ok": True})
