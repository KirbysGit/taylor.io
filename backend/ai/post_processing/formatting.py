from __future__ import annotations

import re
from typing import List


def looks_bulleted(text: str) -> bool:
    lines = [ln.strip() for ln in str(text or "").splitlines() if ln.strip()]
    if not lines:
        return False
    bullet_lines = sum(1 for ln in lines if re.match(r"^[\-\*\u2022]\s+", ln))
    return bullet_lines >= 1


def detect_bullet_prefix(text: str) -> str:
    for ln in str(text or "").splitlines():
        stripped = ln.strip()
        m = re.match(r"^([\-\*\u2022])\s+", stripped)
        if m:
            return f"{m.group(1)} "
    return "\u2022 "


def split_paragraph_to_points(text: str) -> List[str]:
    raw = str(text or "").strip()
    if not raw:
        return []
    if "\n" in raw:
        parts = [p.strip(" \t-*•") for p in raw.splitlines() if p.strip()]
        if parts:
            return parts
    if ";" in raw:
        parts = [p.strip(" \t-*•.;") for p in raw.split(";") if p.strip()]
        if len(parts) >= 2:
            return parts
    parts = [p.strip(" \t-*•.") for p in re.split(r"(?<=[.!?])\s+", raw) if p.strip()]
    return parts if parts else [raw]


def preserve_description_format(before_text: str, after_text: str) -> str:
    before = str(before_text or "").strip()
    after = str(after_text or "").strip()
    if not after:
        return after
    if not looks_bulleted(before):
        return after
    if looks_bulleted(after):
        return after
    prefix = detect_bullet_prefix(before)
    points = split_paragraph_to_points(after)
    if not points:
        return after
    return "\n".join(f"{prefix}{pt}" for pt in points if pt)
