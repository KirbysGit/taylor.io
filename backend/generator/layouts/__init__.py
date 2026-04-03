# Layout profiles: registry (meta.json layoutProfile) and per-profile behavior packages.

from __future__ import annotations

from .common import DEFAULT_SECTION_ORDER, raw_body_order
from .registry import (
    DEFAULT_LAYOUT_PROFILE,
    LAYOUT_SIDEBAR_SPLIT,
    SUPPORTED_DOCX_PROFILES,
    docx_export_template_slug,
    load_layout_profile,
    resolve_docx_layout_profile,
    resolve_docx_max_pages,
)

__all__ = [
    "DEFAULT_LAYOUT_PROFILE",
    "DEFAULT_SECTION_ORDER",
    "LAYOUT_SIDEBAR_SPLIT",
    "SUPPORTED_DOCX_PROFILES",
    "docx_export_template_slug",
    "load_layout_profile",
    "raw_body_order",
    "resolve_docx_layout_profile",
    "resolve_docx_max_pages",
]
