"""Minimal client for enriching a prompt via the OpenRouter chat completions API."""

import aiohttp

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

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
