"""Minimal client for the OpenRouter chat completions and models APIs."""

import time

import aiohttp

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
_MODELS_CACHE_TTL = 3600

_ENRICH_SYSTEM_PROMPT = (
    "You are an expert prompt engineer for AI image generation. Rewrite the user's "
    "prompt into a richer, more detailed version: add concrete visual detail (lighting, "
    "composition, camera/lens, style, textures, mood, environment) while preserving its "
    "original subject and intent. If the user provides additional instructions (about "
    "length, structure, focus, etc.), follow them exactly, even if that means deviating "
    "from the default single-line, comma-separated style. Respond with ONLY the "
    "improved prompt text, no explanations, no quotes, no markdown."
)

_IMAGE_SYSTEM_PROMPT = (
    "You are an expert at writing prompts for AI image generation from a reference "
    "image. Describe the image as a single, richly detailed prompt suitable for "
    "feeding into an image generation model: subject, composition, lighting, style, "
    "colors and mood. Follow any additional instructions the user gives about what to "
    "focus on, include or leave out. Respond with ONLY the prompt text, no "
    "explanations, no quotes, no markdown."
)


class OpenRouterError(Exception):
    pass


async def _chat_completion(api_key: str, model: str, messages: list, timeout: int = 60) -> str:
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": model, "messages": messages},
                timeout=aiohttp.ClientTimeout(total=timeout),
            ) as resp:
                data = await resp.json(content_type=None)
                if resp.status != 200:
                    message = (data or {}).get("error", {}).get("message") or f"HTTP {resp.status}"
                    raise OpenRouterError(message)
                try:
                    return data["choices"][0]["message"]["content"].strip()
                except (KeyError, IndexError, TypeError):
                    raise OpenRouterError("Unexpected response from OpenRouter.")
        except aiohttp.ClientError as e:
            raise OpenRouterError(f"Failed to connect to OpenRouter: {e}")


async def enrich_prompt(api_key: str, model: str, text: str, instructions: str = "") -> str:
    user_content = text
    if instructions.strip():
        user_content = f"Additional instructions: {instructions.strip()}\n\nOriginal prompt: {text}"
    messages = [
        {"role": "system", "content": _ENRICH_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
    return await _chat_completion(api_key, model, messages)


async def describe_image(api_key: str, model: str, image_data_url: str, instructions: str = "") -> str:
    text_prompt = instructions.strip() or "Describe this image as a single image-generation prompt."
    messages = [
        {"role": "system", "content": _IMAGE_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": text_prompt},
                {"type": "image_url", "image_url": {"url": image_data_url}},
            ],
        },
    ]
    return await _chat_completion(api_key, model, messages, timeout=90)


_models_cache = {"models": None, "fetched_at": 0.0}


def _format_price(token_price) -> str:
    try:
        per_million = float(token_price or 0) * 1_000_000
    except (TypeError, ValueError):
        return "$?"
    if per_million == 0:
        return "$0"
    if per_million < 0.01:
        return f"${per_million:.4f}"
    if per_million < 1:
        return f"${per_million:.3f}"
    return f"${per_million:.2f}"


def _price_label(pricing: dict) -> str:
    prompt_price = pricing.get("prompt")
    completion_price = pricing.get("completion")
    if prompt_price in (None, "0") and completion_price in (None, "0"):
        return "Free"
    return f"{_format_price(prompt_price)}/M in · {_format_price(completion_price)}/M out"


async def list_models() -> list:
    """Return every model OpenRouter currently offers, ``[{"id", "name", "price", "vision"}]``, cached for an hour."""
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
            raise OpenRouterError(f"Failed to connect to OpenRouter: {e}")

    models = [
        {
            "id": m["id"],
            "name": m.get("name") or m["id"],
            "price": _price_label(m.get("pricing") or {}),
            "vision": "image" in ((m.get("architecture") or {}).get("input_modalities") or []),
        }
        for m in (data or {}).get("data", [])
        if m.get("id")
    ]
    models.sort(key=lambda m: m["name"].lower())
    _models_cache["models"] = models
    _models_cache["fetched_at"] = now
    return models
