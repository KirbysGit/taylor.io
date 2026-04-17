from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

from openai import OpenAI

def get_openai_model():
    return (os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()


def is_openai_enabled():
    flag = (os.getenv("AI_USE_OPENAI") or "").strip().lower()
    if flag:
        return True
    return False



def build_openai_request_payload(*, model, system_prompt, user_prompt, temperature: float = 0.2):

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

    return payload



def ai_chat_completion(*, system_prompt: str, user_prompt: str, temperature: float = 0.2):

    # check if openai is enabled.
    if not is_openai_enabled():
        return None, None
    
    # get the model.
    model = get_openai_model()

    # initialize client w/ openai key.
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # build the request payload.

    payload = build_openai_request_payload(model=model, system_prompt=system_prompt, user_prompt=user_prompt, temperature=temperature)

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
