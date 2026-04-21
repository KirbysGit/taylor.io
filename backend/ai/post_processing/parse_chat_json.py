# convert our chat completion text into a dict.

import json

def parse_chat_json(raw):
    # if the raw is already a dict, return it.
    if isinstance(raw, dict):
        return raw

    # if the raw is a string, strip it and load it as json.
    if isinstance(raw, str):
        s = raw.strip()
        return json.loads(s) if s else {}

    # if the raw is not a string or dict, return an empty dict.
    return {}
