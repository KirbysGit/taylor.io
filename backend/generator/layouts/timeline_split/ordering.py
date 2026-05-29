# Timeline split: fixed left info rail; right column keeps the narrative flow.

from __future__ import annotations

from typing import Any, Dict, List

from ..common import raw_body_order


_TIMELINE_MAIN_PRIORITY = ["summary", "experience", "projects", "education"]


def timeline_main_column_order(resume_data: Dict[str, Any]) -> List[str]:
    raw_order = raw_body_order(resume_data)
    seen = set()
    ordered: List[str] = []

    for key in _TIMELINE_MAIN_PRIORITY:
        if key in raw_order and key not in seen:
            ordered.append(key)
            seen.add(key)

    for key in raw_order:
        if key not in seen and key in _TIMELINE_MAIN_PRIORITY:
            ordered.append(key)
            seen.add(key)

    return ordered
