"""Image Monitor: send generated images to a always-open viewer window on another screen.

The node saves each image it receives into a per-channel history folder and
broadcasts an event over ComfyUI's websocket; the viewer page (served by
``/image_monitor/viewer``) listens for that event and swaps the picture.
"""

import hashlib
import hmac
import os
import re
import secrets
import time
from typing import Any, Dict, List, Optional

from aiohttp import web
from PIL import Image
from server import PromptServer

import folder_paths

from . import storage

EVENT = "image_monitor.update"
CHANNEL_RE = re.compile(r"[A-Za-z0-9_-]{1,40}")
NAME_RE = re.compile(r"[0-9]{10,16}_[0-9]{1,3}\.png")
MAX_KEEP = 500
PBKDF2_ROUNDS = 200_000
TOKEN_DAYS = 30
MAX_FAILURES = 8
FAILURE_WINDOW = 300

_failures: Dict[str, List[float]] = {}

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


# ---- password protection (per channel) ----------------------------------------


def _hash(password: str, salt_hex: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), PBKDF2_ROUNDS).hex()


def _entry(channel: str) -> Optional[Dict[str, str]]:
    passwords = storage.get_settings().get("monitor_passwords", {})
    entry = passwords.get(clean_channel(channel)) if isinstance(passwords, dict) else None
    return entry if isinstance(entry, dict) and "salt" in entry and "hash" in entry else None


def is_protected(channel: str) -> bool:
    return _entry(channel) is not None


def verify_password(channel: str, password: str) -> bool:
    entry = _entry(channel)
    if entry is None:
        return True
    return hmac.compare_digest(_hash(password or "", entry["salt"]), entry["hash"])


def set_password(channel: str, password: str) -> None:
    """Empty password removes the protection; the same password keeps everything as it is."""
    channel = clean_channel(channel)
    password = password or ""
    entry = _entry(channel)
    if not password:
        if entry is not None:
            passwords = dict(storage.get_settings().get("monitor_passwords", {}))
            passwords.pop(channel, None)
            storage.save_settings(monitor_passwords=passwords)
        return
    if entry is not None and verify_password(channel, password):
        return
    salt = secrets.token_hex(16)
    passwords = dict(storage.get_settings().get("monitor_passwords", {}))
    passwords[channel] = {"salt": salt, "hash": _hash(password, salt)}
    storage.save_settings(monitor_passwords=passwords)


def _secret() -> str:
    secret = storage.get_settings().get("monitor_secret")
    if not secret:
        secret = secrets.token_hex(32)
        storage.save_settings(monitor_secret=secret)
    return secret


def _sign(channel: str, expires: int) -> str:
    entry = _entry(channel)
    key = (_secret() + (entry["hash"] if entry else "")).encode("utf-8")
    return hmac.new(key, f"{clean_channel(channel)}:{expires}".encode("utf-8"), hashlib.sha256).hexdigest()


def make_token(channel: str) -> str:
    expires = int(time.time()) + TOKEN_DAYS * 86400
    return f"{expires}.{_sign(channel, expires)}"


def token_ok(channel: str, token: str) -> bool:
    try:
        expires_text, signature = (token or "").split(".", 1)
        expires = int(expires_text)
    except ValueError:
        return False
    return expires > time.time() and hmac.compare_digest(signature, _sign(channel, expires))


def cookie_name(channel: str) -> str:
    return "im_auth_" + clean_channel(channel)


def authorized(request, channel: str) -> bool:
    if not is_protected(channel):
        return True
    return token_ok(channel, request.cookies.get(cookie_name(channel), ""))


def _client(request) -> str:
    return request.remote or "unknown"


def _too_many_failures(request) -> bool:
    now = time.time()
    recent = [t for t in _failures.get(_client(request), []) if now - t < FAILURE_WINDOW]
    _failures[_client(request)] = recent
    return len(recent) >= MAX_FAILURES


def push_images(
    channel: str, tensors, max_side: int, keep: int, password: str = ""
) -> List[Dict[str, Any]]:
    import numpy as np

    channel = clean_channel(channel)
    set_password(channel, password)
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
    PromptServer.instance.send_sync(EVENT, {"channel": channel, "ts": stamp})
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

    def _locked(channel):
        return web.json_response({"error": "Password required", "protected": True}, status=401)

    @routes.get("/image_monitor/list")
    async def im_list(request):
        channel = clean_channel(request.query.get("channel", "main"))
        if not authorized(request, channel):
            return _locked(channel)
        return web.json_response({"channel": channel, "protected": is_protected(channel), "items": list_items(channel)})

    @routes.get("/image_monitor/status")
    async def im_status(request):
        channel = clean_channel(request.query.get("channel", "main"))
        return web.json_response({"protected": is_protected(channel), "authorized": authorized(request, channel)})

    @routes.post("/image_monitor/auth")
    async def im_auth(request):
        try:
            data = await request.json()
        except Exception:
            data = {}
        channel = clean_channel((data or {}).get("channel", "main"))
        if not is_protected(channel):
            return web.json_response({"ok": True, "protected": False})
        if _too_many_failures(request):
            return web.json_response({"error": "Too many attempts. Try again in a few minutes."}, status=429)
        if not verify_password(channel, str((data or {}).get("password", ""))):
            _failures.setdefault(_client(request), []).append(time.time())
            return web.json_response({"error": "Wrong password"}, status=401)
        response = web.json_response({"ok": True, "protected": True})
        response.set_cookie(
            cookie_name(channel),
            make_token(channel),
            max_age=TOKEN_DAYS * 86400,
            httponly=True,
            samesite="Lax",
            secure=request.scheme == "https",
            path="/",
        )
        return response

    @routes.post("/image_monitor/logout")
    async def im_logout(request):
        try:
            data = await request.json()
        except Exception:
            data = {}
        channel = clean_channel((data or {}).get("channel", "main"))
        response = web.json_response({"ok": True})
        response.del_cookie(cookie_name(channel), path="/")
        return response

    @routes.post("/image_monitor/password")
    async def im_password(request):
        try:
            data = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON"}, status=400)
        channel = clean_channel((data or {}).get("channel", "main"))
        set_password(channel, str((data or {}).get("password", "")))
        return web.json_response({"ok": True, "protected": is_protected(channel)})

    @routes.get("/image_monitor/image")
    async def im_image(request):
        channel = clean_channel(request.query.get("channel", "main"))
        if not authorized(request, channel):
            return web.Response(status=401)
        name = request.query.get("name", "")
        if not NAME_RE.fullmatch(name):
            return web.Response(status=404)
        path = os.path.join(channel_dir(channel), name)
        if not os.path.isfile(path):
            return web.Response(status=404)
        return web.FileResponse(path, headers={"Cache-Control": "private, max-age=31536000, immutable"})

    @routes.post("/image_monitor/clear")
    async def im_clear(request):
        try:
            data = await request.json()
        except Exception:
            data = {}
        channel = clean_channel((data or {}).get("channel", "main"))
        if not authorized(request, channel):
            return _locked(channel)
        folder = channel_dir(channel)
        for name in os.listdir(folder):
            if NAME_RE.fullmatch(name):
                try:
                    os.remove(os.path.join(folder, name))
                except OSError:
                    pass
        PromptServer.instance.send_sync(EVENT, {"channel": channel, "cleared": True})
        return web.json_response({"ok": True})
