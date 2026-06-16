from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def is_llm_configured() -> bool:
    return bool(settings.llm_api_key.strip())


def llm_status() -> dict[str, Any]:
    return {
        "configured": is_llm_configured(),
        "apiBase": settings.llm_api_base,
        "model": settings.llm_model,
    }


def chat_completion(
    *,
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float = 0.2,
    response_format: dict[str, Any] | None = None,
    timeout: float | None = None,
) -> str:
    if not is_llm_configured():
        raise RuntimeError("未配置 LLM_API_KEY，请在 media-worker/.env 中设置通义 API Key")

    payload: dict[str, Any] = {
        "model": model or settings.llm_model,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format:
        payload["response_format"] = response_format

    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }
    api_base = settings.llm_api_base.rstrip("/")

    with httpx.Client(timeout=timeout or settings.llm_timeout) as client:
        response = client.post(
            f"{api_base}/chat/completions",
            headers=headers,
            json=payload,
        )
        if response.status_code >= 400:
            detail = response.text[:500]
            raise RuntimeError(f"LLM 请求失败 ({response.status_code}): {detail}")

        data = response.json()
        return data["choices"][0]["message"]["content"]


def chat_json(
    *,
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float = 0.2,
    timeout: float | None = None,
) -> Any:
    content = chat_completion(
        messages=messages,
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        timeout=timeout,
    )
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"LLM 返回非 JSON: {content[:200]}") from exc
