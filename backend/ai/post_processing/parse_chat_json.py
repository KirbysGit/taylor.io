# --- model reply -> dict; anything unusable -> {}. --- #
import json
import re

trailingCommaBeforeClose = re.compile(r",(\s*[}\]])")


def repair_trailing_commas(s):
    # LLMs often emit trailing commas; stdlib json rejects them.
    t = s.lstrip("\ufeff")
    prev = None
    while prev != t:
        prev = t
        t = trailingCommaBeforeClose.sub(r"\1", t)
    return t


def decode_first_dict(s):
    # First {...} only — model may append extra `{}` or text after the main object.
    i = s.find("{")
    if i == -1:
        return None
    try:
        obj, _end = json.JSONDecoder().raw_decode(s, idx=i)
    except json.JSONDecodeError:
        return None
    return obj if isinstance(obj, dict) else None


def parse_chat_json(raw):
    if isinstance(raw, dict):
        return raw
    if raw is None or not isinstance(raw, str):
        return {}

    s = raw.strip()
    if not s:
        return {}

    if s.startswith("```"):
        s = s.removeprefix("```").strip()
        if s.lower().startswith("json"):
            s = s[4:].lstrip()
        if s.endswith("```"):
            s = s[:-3].strip()

    if s.find("{") == -1:
        return {}

    out = decode_first_dict(s)
    if out is not None:
        return out

    start = s.find("{")
    out = decode_first_dict(repair_trailing_commas(s[start:]))
    if out is not None:
        return out

    return {}
