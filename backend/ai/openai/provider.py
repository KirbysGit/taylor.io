from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional


def is_openai_configured() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))


def get_openai_model() -> str:
    return (os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()


def is_openai_enabled() -> bool:
    flag = (os.getenv("AI_USE_OPENAI") or "").strip().lower()
    if flag in {"1", "true", "yes", "on"}:
        return is_openai_configured()
    return False


def build_chat_messages(*, system_prompt: str, user_prompt: str) -> List[Dict[str, str]]:
    return [
        {"role": "system", "content": str(system_prompt or "")},
        {"role": "user", "content": str(user_prompt or "")},
    ]


def build_openai_request_payload(
    *,
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
) -> Dict[str, Any]:
    """
    Build provider payload for chat-style OpenAI calls.
    This is scaffolding only; network execution is wired later.
    """
    payload: Dict[str, Any] = {
        "model": model,
        "messages": build_chat_messages(system_prompt=system_prompt, user_prompt=user_prompt),
    }
    # Some reasoning models (e.g. o4-mini) only support the default temperature.
    model_name = str(model or "").strip().lower()
    if not model_name.startswith("o"):
        payload["temperature"] = float(temperature)
    return payload


def _try_parse_json(text: str) -> Optional[Dict[str, Any]]:
    raw = str(text or "").strip()
    if not raw:
        return None
    # Common fallback: model wraps JSON in markdown fences.
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        raw = fenced.group(1).strip()
    try:
        obj = json.loads(raw)
    except Exception:
        # Last resort: attempt to parse first JSON-looking object.
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                obj = json.loads(raw[start : end + 1])
            except Exception:
                return None
        else:
            return None
    return obj if isinstance(obj, dict) else None


def request_chat_completion(
    *,
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
) -> Dict[str, Any]:
    """
    Execute a chat completion and return normalized debug-friendly output.
    """
    try:
        from openai import OpenAI
    except Exception as exc:
        raise RuntimeError("openai package is not installed in the active environment") from exc

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    payload = build_openai_request_payload(
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=temperature,
    )
    response = client.chat.completions.create(**payload)
    message = (response.choices[0].message.content or "") if response.choices else ""
    text = message if isinstance(message, str) else str(message)
    usage = getattr(response, "usage", None)
    return {
        "model": getattr(response, "model", model),
        "finish_reason": (response.choices[0].finish_reason if response.choices else None),
        "content": text,
        "parsed_json": _try_parse_json(text),
        "usage": {
            "input_tokens": getattr(usage, "prompt_tokens", None) if usage else None,
            "output_tokens": getattr(usage, "completion_tokens", None) if usage else None,
            "total_tokens": getattr(usage, "total_tokens", None) if usage else None,
        },
    }
