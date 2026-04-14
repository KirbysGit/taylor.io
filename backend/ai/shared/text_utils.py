from __future__ import annotations

import re
from typing import Any

from ..extraction.lexicon import globalStopWords


conceptStopwords = set(globalStopWords) | {"team", "work", "skills", "experience"}


def contains_term(text: str, term: str) -> bool:
    t = str(term or "").strip().lower()
    if not t:
        return False
    hay = str(text or "").lower()
    if " " in t:
        return t in hay
    pattern = r"(?<![a-z0-9])" + re.escape(t) + r"(?![a-z0-9])"
    return bool(re.search(pattern, hay))


def tokenize(value: str) -> set[str]:
    ignored = set(globalStopWords) | {"your", "our", "you"}
    return {
        tok
        for tok in re.findall(r"[a-z0-9+#./-]{2,}", str(value or "").lower())
        if tok not in ignored
    }


def normalize_concept_token(token: str) -> str:
    t = str(token or "").strip().lower()
    t = re.sub(r"[^a-z0-9+#./-]+", "", t)
    for suffix in ("ization", "ational", "ing", "ed", "ion", "ions", "ment", "ments", "ers", "er", "s"):
        if len(t) > 5 and t.endswith(suffix):
            t = t[: -len(suffix)]
            break
    return t


def concept_tokens(concept: str) -> set[str]:
    raw = re.findall(r"[a-z0-9+#./-]{2,}", str(concept or "").lower())
    out = set()
    for tok in raw:
        norm = normalize_concept_token(tok)
        if norm and len(norm) >= 3 and norm not in conceptStopwords:
            out.add(norm)
    return out


def safe_float(value: Any) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0
