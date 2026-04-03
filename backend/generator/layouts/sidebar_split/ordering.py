# Defines the ordering of sections in the sidebar split layout.

from __future__ import annotations

from typing import Any, Dict, List

from ..common import raw_body_order

_SIDEBAR_RAIL_KEY_SET = frozenset({"skills", "education"})
_SIDEBAR_MAIN_KEYS = frozenset({"summary", "experience", "projects"})

# Determines order of Skills vs Education in the sidebar rail.
def sidebar_rail_section_order(resume_data: Dict[str, Any]) -> List[str]:
    raw = raw_body_order(resume_data)
    ordered: List[str] = []
    seen: set = set()
    for k in raw:
        if k in _SIDEBAR_RAIL_KEY_SET and k not in seen:
            ordered.append(k)
            seen.add(k)
    for k in ("skills", "education"):
        if k not in seen:
            ordered.append(k)
            seen.add(k)
    return ordered

# Determines order of Summary, Experience, Projects in the main column.
def sidebar_main_column_order(resume_data: Dict[str, Any]) -> List[str]:
    return [k for k in raw_body_order(resume_data) if k in _SIDEBAR_MAIN_KEYS]
