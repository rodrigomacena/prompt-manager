"""Minimal client for the OpenRouter chat completions and models APIs."""

import time

import aiohttp

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
_MODELS_CACHE_TTL = 3600

_SYSTEM_PROMPT = (
    "You are an expert prompt engineer for AI image generation. Rewrite the user's "
    "prompt into a richer, more vivid version: add concrete visual detail (lighting, "
    "composition, camera/lens, style, textures, mood) while preserving its original "
    "subject and intent. Keep it as a single comma-separated prompt suitable for an "
    "image model. Respond with ONLY the improved prompt text, no explanations, no "
    "quotes, no markdown."
)


class OpenRouterError(Exception):
    pass


_models_cache = {"models": None, "fetched_at": 0.0}


async def list_models() -> list:
    """Return every model OpenRouter currently offers, ``[{"id", "name"}]``, cached for an hour."""
    now = time.time()
    if _models_cache["models"] is not None and now - _models_cache["fetched_at"] < _MODELS_CACHE_TTL:
        return _models_cache["models"]

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                OPENROUTER_MODELS_URL,
                timeout=aiohttp.ClientTimeout(total=20),
            ) as resp:
                data = await resp.json(content_type=None)
                if resp.status != 200:
                    raise OpenRouterError(f"HTTP {resp.status}")
        except aiohttp.ClientError as e:
            raise OpenRouterError(f"Falha de conexão com o OpenRouter: {e}")

    models = [
        {"id": m["id"], "name": m.get("name") or m["id"]}
        for m in (data or {}).get("data", [])
        if m.get("id")
    ]
    models.sort(key=lambda m: m["name"].lower())
    _models_cache["models"] = models
    _models_cache["fetched_at"] = now
    return models


async def enrich_prompt(api_key: str, model: str, text: str) -> str:
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": text},
                    ],
                },
                timeout=aiohttp.ClientTimeout(total=60),
            ) as resp:
                data = await resp.json(content_type=None)
                if resp.status != 200:
                    message = (data or {}).get("error", {}).get("message") or f"HTTP {resp.status}"
                    raise OpenRouterError(message)
                try:
                    return data["choices"][0]["message"]["content"].strip()
                except (KeyError, IndexError, TypeError):
                    raise OpenRouterError("Resposta inesperada do OpenRouter.")
        except aiohttp.ClientError as e:
            raise OpenRouterError(f"Falha de conexão com o OpenRouter: {e}")
