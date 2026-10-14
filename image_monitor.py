"""Image Monitor: send generated images to a always-open viewer window on another screen.

The node saves each image it receives into a per-channel history folder and
broadcasts an event over ComfyUI's websocket; the viewer page (served by
``/image_monitor/viewer``) listens for that event and swaps the picture.
"""

import os
import re
import time
from typing import Any, Dict, List

from aiohttp import web
from PIL import Image
from server import PromptServer

import folder_paths

EVENT = "image_monitor.update"
CHANNEL_RE = re.compile(r"[A-Za-z0-9_-]{1,40}")
NAME_RE = re.compile(r"[0-9]{10,16}_[0-9]{1,3}\.png")
MAX_KEEP = 500

try:
    _BASE_DIR = os.path.join(folder_paths.get_user_directory(), "ImageMonitor")
except Exception:
    _BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "monitor")
os.makedirs(_BASE_DIR, exist_ok=True)

_VIEWER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "image_monitor_viewer.html")


def clean_channel(value: str) -> str:
    value = (value or "").strip()
    return value if CHANNEL_RE.fullmatch(value) else "main"


def channel_dir(channel: str) -> str:
    path = os.path.join(_BASE_DIR, clean_channel(channel))
    os.makedirs(path, exist_ok=True)
    return path


def list_items(channel: str, limit: int = 100) -> List[Dict[str, Any]]:
    folder = channel_dir(channel)
    names = sorted(n for n in os.listdir(folder) if NAME_RE.fullmatch(n))[-limit:]
    items = []
    for name in names:
        try:
            with Image.open(os.path.join(folder, name)) as im:
                width, height = im.size
        except Exception:
            continue
        items.append({"name": name, "width": width, "height": height, "ts": int(name.split("_")[0])})
    return items


def _prune(folder: str, keep: int) -> None:
    names = sorted(n for n in os.listdir(folder) if NAME_RE.fullmatch(n))
    for name in names[: max(0, len(names) - keep)]:
        try:
            os.remove(os.path.join(folder, name))
        except OSError:
            pass


def push_images(channel: str, tensors, max_side: int, keep: int) -> List[Dict[str, Any]]:
    import numpy as np

    channel = clean_channel(channel)
    folder = channel_dir(channel)
    stamp = int(time.time() * 1000)
    saved: List[Dict[str, Any]] = []
    for index, tensor in enumerate(tensors):
        array = np.clip(255.0 * tensor.cpu().numpy(), 0, 255).astype(np.uint8)
        image = Image.fromarray(array)
        if max_side and max(image.size) > max_side:
            image.thumbnail((max_side, max_side), Image.LANCZOS)
        name = f"{stamp}_{index}.png"
        image.save(os.path.join(folder, name), compress_level=1)
        saved.append({"name": name, "width": image.width, "height": image.height, "ts": stamp})
    _prune(folder, max(1, min(int(keep), MAX_KEEP)))
    PromptServer.instance.send_sync(EVENT, {"channel": channel, "images": saved, "ts": stamp})
    return saved


def setup_monitor_routes():
    routes = PromptServer.instance.routes

    @routes.get("/image_monitor/viewer")
    async def im_viewer(request):
        try:
            with open(_VIEWER_PATH, "r", encoding="utf-8") as f:
                html = f.read()
        except OSError:
            return web.Response(text="Viewer page not found", status=404)
        return web.Response(text=html, content_type="text/html", headers={"Cache-Control": "no-store"})

    @routes.get("/image_monitor/list")
    async def im_list(request):
        channel = clean_channel(request.query.get("channel", "main"))
        return web.json_response({"channel": channel, "items": list_items(channel)})

    @routes.get("/image_monitor/image")
    async def im_image(request):
        channel = clean_channel(request.query.get("channel", "main"))
        name = request.query.get("name", "")
        if not NAME_RE.fullmatch(name):
            return web.Response(status=404)
        path = os.path.join(channel_dir(channel), name)
        if not os.path.isfile(path):
            return web.Response(status=404)
        return web.FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})

    @routes.post("/image_monitor/clear")
    async def im_clear(request):
        try:
            data = await request.json()
        except Exception:
            data = {}
        folder = channel_dir((data or {}).get("channel", "main"))
        for name in os.listdir(folder):
            if NAME_RE.fullmatch(name):
                try:
                    os.remove(os.path.join(folder, name))
                except OSError:
                    pass
        PromptServer.instance.send_sync(EVENT, {"channel": clean_channel((data or {}).get("channel", "main")), "images": [], "cleared": True})
        return web.json_response({"ok": True})
