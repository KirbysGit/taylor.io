# convert our chat completion text into a dict.

import json


def parse_chat_json(raw):
    # if the raw is already a dict, return it.
    if isinstance(raw, dict):
        return raw

    # if the raw is missing or not a string, return empty dict (e.g. OpenAI disabled or no content).
    if raw is None or not isinstance(raw, str):
        return {}

    s = raw.strip()
    if not s:
        return {}

    # strip optional ```json ... ``` wrapper from the model.
    if s.startswith("```"):
        s = s.removeprefix("```").strip()
        if s.lower().startswith("json"):
            s = s[4:].lstrip()
        if s.endswith("```"):
            s = s[:-3].strip()

    try:
        parsed = json.loads(s)
    except json.JSONDecodeError:
        return {}

    return parsed if isinstance(parsed, dict) else {}
