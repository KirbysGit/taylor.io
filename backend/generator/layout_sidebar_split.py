"""
sidebar_split section ordering shared by HTML/PDF (pipeline) and Word (docx_builder).

Kept separate from pipeline.py so docx_builder does not import Playwright-backed modules.
"""

from __future__ import annotations

from typing import Any, Dict, List

_DEFAULT_SECTION_ORDER = [
    "header",
    "summary",
    "education",
    "experience",
    "projects",
    "skills",
]

_SIDEBAR_RAIL_KEY_SET = frozenset({"skills", "education"})
_SIDEBAR_MAIN_KEYS = frozenset({"summary", "experience", "projects"})


def raw_body_order(resume_data: Dict[str, Any]) -> List[str]:
    """Section keys from payload order, excluding header only (no summary-first normalization)."""
    section_order = resume_data.get("sectionOrder", list(_DEFAULT_SECTION_ORDER))
    return [k for k in section_order if k != "header"]


def sidebar_rail_section_order(resume_data: Dict[str, Any]) -> List[str]:
    """
    Skills vs education order follows resume_data.sectionOrder (same source as the Organize UI).
    Keys omitted from sectionOrder default to skills, then education.
    """
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


def sidebar_main_column_order(resume_data: Dict[str, Any]) -> List[str]:
    """
    Respect sectionOrder only among summary / experience / projects.
    Education is rail-only; skills are rail-only.
    """
    return [k for k in raw_body_order(resume_data) if k in _SIDEBAR_MAIN_KEYS]
