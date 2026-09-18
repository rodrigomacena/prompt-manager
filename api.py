"""HTTP API used by the Prompt Manager frontend widget."""

from aiohttp import web
from server import PromptServer

from . import storage
from .openrouter import OpenRouterError, describe_image, enrich_prompt, list_models


def _err(message: str, status: int = 400):
    return web.json_response({"error": message}, status=status)


async def _json_body(request):
    try:
        return await request.json()
    except Exception:
        return None


def setup_routes():
    routes = PromptServer.instance.routes

    @routes.get("/prompt_manager/groups")
    async def pm_list_groups(request):
        return web.json_response(storage.list_groups())

    @routes.post("/prompt_manager/groups")
    async def pm_create_group(request):
        data = await _json_body(request)
        if data is None:
            return _err("Invalid JSON")
        name = (data.get("name") or "").strip()
        if not name:
            return _err("Group name is required")
        return web.json_response(storage.create_group(name))

    @routes.put("/prompt_manager/groups/{group_id}")
    async def pm_rename_group(request):
        data = await _json_body(request)
        if data is None:
            return _err("Invalid JSON")
        name = (data.get("name") or "").strip()
        if not name:
            return _err("Group name is required")
        group = storage.rename_group(request.match_info["group_id"], name)
        if group is None:
            return _err("Group not found", 404)
        return web.json_response(group)

    @routes.delete("/prompt_manager/groups/{group_id}")
    async def pm_delete_group(request):
        ok = storage.delete_group(request.match_info["group_id"])
        if not ok:
            return _err("Group not found", 404)
        return web.json_response({"ok": True})

    @routes.post("/prompt_manager/groups/{group_id}/prompts")
    async def pm_add_prompt(request):
        data = await _json_body(request)
        if data is None:
            return _err("Invalid JSON")
        text = (data.get("text") or "").strip()
        if not text:
            return _err("Prompt text is required")
        prompt = storage.add_prompt(
            request.match_info["group_id"], text, data.get("rating", 0), data.get("title", "")
        )
        if prompt is None:
            return _err("Group not found", 404)
        return web.json_response(prompt)

    @routes.put("/prompt_manager/groups/{group_id}/prompts/{prompt_id}")
    async def pm_update_prompt(request):
        data = await _json_body(request)
        if data is None:
            return _err("Invalid JSON")
        prompt = storage.update_prompt(
            request.match_info["group_id"],
            request.match_info["prompt_id"],
            text=data.get("text"),
            rating=data.get("rating"),
            title=data.get("title") if "title" in data else None,
        )
        if prompt is None:
            return _err("Prompt not found", 404)
        return web.json_response(prompt)

    @routes.delete("/prompt_manager/groups/{group_id}/prompts/{prompt_id}")
    async def pm_delete_prompt(request):
        ok = storage.delete_prompt(request.match_info["group_id"], request.match_info["prompt_id"])
        if not ok:
            return _err("Prompt not found", 404)
        return web.json_response({"ok": True})

    @routes.get("/prompt_manager/backup")
    async def pm_backup_all(request):
        payload = storage.backup_all()
        response = web.json_response(payload)
        response.headers["Content-Disposition"] = 'attachment; filename="prompt_manager_backup.json"'
        return response

    @routes.post("/prompt_manager/restore")
    async def pm_restore_all(request):
        data = await _json_body(request)
        if data is None or "groups" not in data:
            return _err("Invalid backup file")
        groups = storage.restore_all(data, overwrite=bool(data.get("overwrite", False)))
        return web.json_response(groups)

    @routes.get("/prompt_manager/settings")
    async def pm_get_settings(request):
        settings = storage.get_settings()
        return web.json_response({
            "has_api_key": bool(settings.get("api_key")),
            "model": settings.get("model", storage.DEFAULT_MODEL),
        })

    @routes.post("/prompt_manager/settings")
    async def pm_save_settings(request):
        data = await _json_body(request)
        if data is None:
            return _err("Invalid JSON")
        settings = storage.save_settings(
            api_key=data.get("api_key") if "api_key" in data else None,
            model=data.get("model") if "model" in data else None,
        )
        return web.json_response({
            "has_api_key": bool(settings.get("api_key")),
            "model": settings.get("model", storage.DEFAULT_MODEL),
        })

    @routes.get("/prompt_manager/models")
    async def pm_list_models(request):
        try:
            models = await list_models()
        except OpenRouterError as e:
            return _err(str(e), 502)
        return web.json_response({"models": models})

    @routes.post("/prompt_manager/enrich")
    async def pm_enrich(request):
        data = await _json_body(request)
        if data is None:
            return _err("Invalid JSON")
        text = (data.get("text") or "").strip()
        if not text:
            return _err("Prompt text is required")
        instructions = data.get("instructions") or ""
        settings = storage.get_settings()
        api_key = settings.get("api_key")
        if not api_key:
            return _err("Set your OpenRouter API key in settings before enriching.", 400)
        model = (data.get("model") or "").strip() or settings.get("model") or storage.DEFAULT_MODEL
        try:
            enriched = await enrich_prompt(api_key, model, text, instructions)
        except OpenRouterError as e:
            return _err(str(e), 502)
        return web.json_response({"text": enriched})

    @routes.post("/prompt_manager/image-to-prompt")
    async def pm_image_to_prompt(request):
        data = await _json_body(request)
        if data is None:
            return _err("Invalid JSON")
        image = data.get("image") or ""
        if not image.startswith("data:image/"):
            return _err("A valid image is required")
        instructions = data.get("instructions") or ""
        settings = storage.get_settings()
        api_key = settings.get("api_key")
        if not api_key:
            return _err("Set your OpenRouter API key in settings before using this feature.", 400)
        model = (data.get("model") or "").strip() or storage.DEFAULT_MODEL
        try:
            text = await describe_image(api_key, model, image, instructions)
        except OpenRouterError as e:
            return _err(str(e), 502)
        return web.json_response({"text": text})
