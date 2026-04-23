# convert our chat completion text into a dict.

import json


def parse_chat_json(raw):

    raw = raw.strip()

    # if the raw is already a dict, return it.
    if isinstance(raw, dict):
        print("hey in here 1!")
        return raw

    # if the raw is missing or not a string, return empty dict (e.g. OpenAI disabled or no content).
    if raw is None or not isinstance(raw, str):
        print("hey in here 2!")
        return {}

    s = raw.strip()
    if not s:
        print("hey in here 3!")
        return {}

    # Models sometimes append a second JSON value (e.g. `{}`) or trailing text after the main object.
    # json.loads rejects that ("Extra data"); decode only the first top-level object instead.
    start = s.find("{")
    if start == -1:
        print("hey in here 4!")
        return {}

    try:
        parsed, _end = json.JSONDecoder().raw_decode(s, idx=start)
    except json.JSONDecodeError:
        print("hey in here 5!")
        return {}
        
    print("hey in here 6!")
    return parsed if isinstance(parsed, dict) else {}

