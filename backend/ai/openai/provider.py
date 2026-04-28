from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

from openai import OpenAI

def get_openai_model():
    return (os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()


def completion_usage_to_dict(usage) -> Optional[dict]:
    """Serialize OpenAI CompletionUsage (or dict) for JSON debug / cost logs."""
    if usage is None:
        return None
    if isinstance(usage, dict):
        return dict(usage)
    m = getattr(usage, "model_dump", None)
    if callable(m):
        try:
            return m()
        except (TypeError, ValueError):
            pass
    out = {}
    for k in (
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "input_tokens",
        "output_tokens",
    ):
        if hasattr(usage, k):
            try:
                out[k] = int(getattr(usage, k))
            except (TypeError, ValueError):
                out[k] = getattr(usage, k)
    return out if out else None


def usage_tokens_compact(usage) -> Optional[dict]:
    """One line per call: input / output / total token counts (maps API field names)."""
    d = completion_usage_to_dict(usage)
    if not isinstance(d, dict) or not d:
        return None
    inp = d.get("prompt_tokens")
    if inp is None:
        inp = d.get("input_tokens")
    out_t = d.get("completion_tokens")
    if out_t is None:
        out_t = d.get("output_tokens")
    tot = d.get("total_tokens")

    def as_int(x):
        if x is None:
            return 0
        try:
            return int(x)
        except (TypeError, ValueError):
            return 0

    ii, oo = as_int(inp), as_int(out_t)
    tt = as_int(tot) if tot is not None else ii + oo
    return {"input": ii, "output": oo, "total": tt}


def is_openai_enabled():
    flag = (os.getenv("AI_USE_OPENAI") or "").strip().lower()
    if flag:
        return True
    return False



def build_openai_request_payload(
    *,
    model,
    system_prompt,
    user_prompt,
    temperature: float = 0.2,
    max_tokens: Optional[int] = None,
):

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    # some reasoning models (e.g. o4-mini) only support the default temperature.
    model_name = str(model or "").strip().lower()

    # if the model supports temperature, set it.
    if not model_name.startswith("o"):
        payload["temperature"] = float(temperature)

    if max_tokens is not None:
        try:
            mt = int(max_tokens)
            if mt > 0:
                payload["max_tokens"] = mt
        except (TypeError, ValueError):
            pass

    return payload



def ai_chat_completion(*, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: Optional[int] = None):

    # check if openai is enabled.
    if not is_openai_enabled():
        return None, None
    
    # get the model.
    model = get_openai_model()

    # initialize client w/ openai key.
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # build the request payload.

    payload = build_openai_request_payload(
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    # request chat completion.
    response = client.chat.completions.create(**payload)

    # get the message.
    message = (response.choices[0].message.content or "") if response.choices else ""

    # get the usage.
    text = message if isinstance(message, str) else str(message)

    # get the usage.
    usage = getattr(response, "usage", None)

    # return the response.
    return text, usage
