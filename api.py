"""HTTP API used by the Prompt Manager frontend widget."""

from aiohttp import web
from server import PromptServer

from . import storage


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
            return _err("JSON inválido")
        name = (data.get("name") or "").strip()
        if not name:
            return _err("Nome do grupo é obrigatório")
        return web.json_response(storage.create_group(name))

    @routes.put("/prompt_manager/groups/{group_id}")
    async def pm_rename_group(request):
        data = await _json_body(request)
        if data is None:
            return _err("JSON inválido")
        name = (data.get("name") or "").strip()
        if not name:
            return _err("Nome do grupo é obrigatório")
        group = storage.rename_group(request.match_info["group_id"], name)
        if group is None:
            return _err("Grupo não encontrado", 404)
        return web.json_response(group)

    @routes.delete("/prompt_manager/groups/{group_id}")
    async def pm_delete_group(request):
        ok = storage.delete_group(request.match_info["group_id"])
        if not ok:
            return _err("Grupo não encontrado", 404)
        return web.json_response({"ok": True})

    @routes.post("/prompt_manager/groups/{group_id}/prompts")
    async def pm_add_prompt(request):
        data = await _json_body(request)
        if data is None:
            return _err("JSON inválido")
        text = (data.get("text") or "").strip()
        if not text:
            return _err("Texto do prompt é obrigatório")
        prompt = storage.add_prompt(request.match_info["group_id"], text, data.get("rating", 0))
        if prompt is None:
            return _err("Grupo não encontrado", 404)
        return web.json_response(prompt)

    @routes.put("/prompt_manager/groups/{group_id}/prompts/{prompt_id}")
    async def pm_update_prompt(request):
        data = await _json_body(request)
        if data is None:
            return _err("JSON inválido")
        prompt = storage.update_prompt(
            request.match_info["group_id"],
            request.match_info["prompt_id"],
            text=data.get("text"),
            rating=data.get("rating"),
        )
        if prompt is None:
            return _err("Prompt não encontrado", 404)
        return web.json_response(prompt)

    @routes.delete("/prompt_manager/groups/{group_id}/prompts/{prompt_id}")
    async def pm_delete_prompt(request):
        ok = storage.delete_prompt(request.match_info["group_id"], request.match_info["prompt_id"])
        if not ok:
            return _err("Prompt não encontrado", 404)
        return web.json_response({"ok": True})

    @routes.get("/prompt_manager/groups/{group_id}/backup")
    async def pm_backup_group(request):
        db = storage.load_db()
        group = storage.get_group(db, request.match_info["group_id"])
        if group is None:
            return _err("Grupo não encontrado", 404)
        payload = {
            "name": group["name"],
            "prompts": [{"text": p["text"], "rating": p["rating"]} for p in group["prompts"]],
        }
        safe_name = "".join(c for c in group["name"] if c.isalnum() or c in " -_").strip() or "grupo"
        response = web.json_response(payload)
        response.headers["Content-Disposition"] = f'attachment; filename="{safe_name}.promptgroup.json"'
        return response

    @routes.post("/prompt_manager/groups/restore")
    async def pm_restore_group(request):
        data = await _json_body(request)
        if data is None or "prompts" not in data:
            return _err("Arquivo de backup inválido")
        group = storage.restore_group(data, overwrite=bool(data.get("overwrite", False)))
        return web.json_response(group)
