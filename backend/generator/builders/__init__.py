"""
Resume HTML fragment builders.

- ``common`` — dates, descriptions, skill grouping (shared).
- ``tagline`` — mini-markup for header tagline (HTML + Word run lists).
- ``header`` — contact line and sidebar contact rail.
- ``single_column`` — classic template body entries.
- ``sidebar_rail`` — narrow-column variants for ``layoutProfile=sidebar_split``.

Import from ``generator.builders`` (this package) as before; e.g. ``build_education_entry``, ``build_contact_rail_html``.
"""

from __future__ import annotations

from .common import (
    format_date_month_year,
    format_description,
    format_date_range,
    skills_group_ordered,
)
from .tagline import build_tagline_block, parse_tagline_runs

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

__all__ = [
    "build_contact_rail_html",
    "format_contact_field_display",
    "resolve_contact_url_display",
    "build_education_entry",
    "build_education_entry_rail",
    "build_experience_entry",
    "build_header",
    "build_project_entry",
    "build_skill_entry",
    "build_skill_entry_rail",
    "build_tagline_block",
    "format_date_month_year",
    "format_date_range",
    "format_description",
    "parse_tagline_runs",
    "skills_group_ordered",
]
