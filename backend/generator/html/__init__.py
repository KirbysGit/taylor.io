# Resume HTML fragments for preview and PDF (Playwright).

from __future__ import annotations

from .description import format_description

from .header import (
    build_contact_rail_html,
    build_header,
    format_contact_field_display,
    resolve_contact_url_display,
)

from .sidebar_rail import build_education_entry_rail, build_skill_entry_rail

from .single_column import (
    build_education_entry,
    build_experience_entry,
    build_project_entry,
    build_skill_entry,
)

from ..shared.tagline import parse_tagline_runs

from .tagline import build_tagline_block

__all__ = [
    "build_contact_rail_html",
    "build_education_entry",
    "build_education_entry_rail",
    "build_experience_entry",
    "build_header",
    "build_project_entry",
    "build_skill_entry",
    "build_skill_entry_rail",
    "build_tagline_block",
    "format_contact_field_display",
    "format_description",
    "parse_tagline_runs",
    "resolve_contact_url_display",
]
