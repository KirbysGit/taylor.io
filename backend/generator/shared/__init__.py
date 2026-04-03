# Cross-format helpers. 

# Data formatting, style merging, and template-agnostic helpers.

from __future__ import annotations

from .dates import format_date_month_year, format_date_range

from .skills import skills_group_ordered

from .resume_tokens import (
    TOKEN_FILENAME,
    apply_resume_tokens_to_docx_config,
    build_resume_tokens_css,
    load_resume_token_dict,

)

from .style_presets import merge_resume_token_overrides, user_style_to_token_overrides

from .styles import get_styles

from .tagline import TAGLINE_INTERPUNCT, parse_tagline_runs

from .template_slug import (
    PRIMARY_TEMPLATE_SLUG,
    TEMPLATES_DIR,
    normalize_template_slug,
    resolve_template_folder,
)

__all__ = [
    "PRIMARY_TEMPLATE_SLUG",
    "TEMPLATES_DIR",
    "TOKEN_FILENAME",
    "format_date_month_year",
    "format_date_range",
    "skills_group_ordered",
    "apply_resume_tokens_to_docx_config",
    "build_resume_tokens_css",
    "get_styles",
    "load_resume_token_dict",
    "merge_resume_token_overrides",
    "normalize_template_slug",
    "resolve_template_folder",
    "TAGLINE_INTERPUNCT",
    "parse_tagline_runs",
    "user_style_to_token_overrides",
]
