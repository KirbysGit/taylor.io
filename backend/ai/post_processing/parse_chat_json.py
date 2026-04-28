# --- model reply -> dict; anything unusable -> {}. --- #
import json
import re

trailingCommaBeforeClose = re.compile(r",(\s*[}\]])")


def _strip_markdown_fence(s):
    if not isinstance(s, str):
        return s
    t = s.strip()
    if not t.startswith("```"):
        return t
    t = t.removeprefix("```").strip()
    if t.lower().startswith("json"):
        t = t[4:].lstrip()
    if t.endswith("```"):
        t = t[:-3].strip()
    return t


def parse_json_object_from_message(text):
    # --- Strip fences → json.loads(full string), then trailing-comma repair, then first `{…}` decode. --- #
    if isinstance(text, dict):
        return text
    if text is None or not isinstance(text, str):
        return {}
    s = _strip_markdown_fence(text).strip()
    if not s:
        return {}
    for candidate in (s, repair_trailing_commas(s)):
        try:
            obj = json.loads(candidate)
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            continue
    i = s.find("{")
    if i < 0:
        return {}
    try:
        obj, _end = json.JSONDecoder().raw_decode(repair_trailing_commas(s), idx=i)
        return obj if isinstance(obj, dict) else {}
    except json.JSONDecodeError:
        return {}


def wrap_edits_if_top_level_skills(obj):
    # --- Tailor completions sometimes omit `edits`; normalize so downstream always sees edits.skills . --- #
    if not isinstance(obj, dict):
        return obj
    if isinstance(obj.get("edits"), dict):
        return obj
    rows = obj.get("skills")
    if isinstance(rows, list):
        return {"edits": {"skills": rows}}
    return obj


def _expand_pass_b_tail_fixes(fragment):
    # --- Plain try, comma repair, extra closing `}`, and `}}]`→`}]` plus a missing root `}` when the model drops it. --- #
    tc = repair_trailing_commas(fragment.lstrip("\ufeff"))
    for body in set((fragment.lstrip("\ufeff"), tc)):
        for closed in set((body, body + "}")):
            yield closed


def _pass_b_json_string_variants(s):
    # --- Typical bad tail: trailing `}}]}` (`}}]` plus one close) instead of `}]}}`; we delete one `}` before `]`,
    # then sometimes append one `}` so edits + root both close. rfind avoids breaking `[{\"nested\":{}}]`. --- #
    seeds = []
    if isinstance(s, str) and s:
        seeds.append(s.lstrip("\ufeff"))
        tco = repair_trailing_commas(seeds[0])
        if tco != seeds[0]:
            seeds.append(tco)
    seen = set()
    out = []
    for seed in seeds:
        u = seed
        for _step in range(64):
            for variant in _expand_pass_b_tail_fixes(u):
                if variant not in seen:
                    seen.add(variant)
                    out.append(variant)
            idx = u.rfind("}}]")
            if idx < 0:
                break
            nu = u[:idx] + "}]" + u[idx + 3 :]
            if nu == u:
                break
            u = nu
    return out


def parse_json_pass_b_blob(text):
    if isinstance(text, dict):
        return wrap_edits_if_top_level_skills(text)
    if text is None or not isinstance(text, str):
        return {}
    s = _strip_markdown_fence(text).strip()
    if not s:
        return {}
    for candidate in _pass_b_json_string_variants(s):
        try:
            obj = json.loads(candidate)
            if isinstance(obj, dict):
                return wrap_edits_if_top_level_skills(obj)
        except json.JSONDecodeError:
            continue
    i = s.find("{")
    if i < 0:
        return {}
    for candidate in _pass_b_json_string_variants(s):
        j = candidate.find("{")
        if j < 0:
            continue
        try:
            obj, _end = json.JSONDecoder().raw_decode(candidate, idx=j)
            if isinstance(obj, dict):
                return wrap_edits_if_top_level_skills(obj)
        except (json.JSONDecodeError, ValueError):
            continue
    return {}


def parse_pass_b_completion(raw_text):
    return parse_json_pass_b_blob(raw_text)


def repair_trailing_commas(s):
    # LLMs often emit trailing commas; stdlib json rejects them.
    t = s.lstrip("\ufeff")
    prev = None
    while prev != t:
        prev = t
        t = trailingCommaBeforeClose.sub(r"\1", t)
    return t


def parse_chat_json(raw):
    # --- Stage A / narrative — same decoder as Pass B minus skills-only wrapper. --- #
    if isinstance(raw, dict):
        return raw
    if raw is None or not isinstance(raw, str):
        return {}
    return parse_json_object_from_message(raw)
