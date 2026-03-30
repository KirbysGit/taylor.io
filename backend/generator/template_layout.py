"""
Layout profile for a template slug: which HTML/DOCX engine implementation to use.

Skins live in per-slug folders (tokens + CSS); multiple slugs may share one profile.
See meta.json keys layoutProfile, family, variantLabel (API / gallery).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from .template_slug import PRIMARY_TEMPLATE_SLUG, normalize_template_slug, resolve_template_folder

DEFAULT_LAYOUT_PROFILE = "classic_single_column"

# Second HTML/PDF structure: narrow aside (identity + skills) + main column (summary, jobs, etc.).
# Word export does not implement this yet; see docx_export_template_slug().
LAYOUT_SIDEBAR_SPLIT = "sidebar_split"

# DOCX (and future HTML branches) only implement these for now.
SUPPORTED_DOCX_PROFILES = frozenset({DEFAULT_LAYOUT_PROFILE})


def load_layout_profile(template_name: Optional[str]) -> str:
    """Read layoutProfile from templates/<slug>/meta.json, else default."""
    folder = resolve_template_folder(template_name)
    path: Path = folder / "meta.json"
    if not path.is_file():
        return DEFAULT_LAYOUT_PROFILE
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, json.JSONDecodeError, TypeError):
        return DEFAULT_LAYOUT_PROFILE
    if not isinstance(raw, dict):
        return DEFAULT_LAYOUT_PROFILE
    lp = raw.get("layoutProfile")
    if isinstance(lp, str) and lp.strip():
        return lp.strip()
    return DEFAULT_LAYOUT_PROFILE


def resolve_docx_layout_profile(template_name: Optional[str]) -> str:
    """Layout profile for Word output; fall back to default if unsupported."""
    prof = load_layout_profile(template_name)
    if prof not in SUPPORTED_DOCX_PROFILES:
        return DEFAULT_LAYOUT_PROFILE
    return prof


def docx_export_template_slug(template_name: Optional[str]) -> str:
    """
    Folder slug used for Word generation.

    PDF/HTML may use a template whose layoutProfile is not implemented in docx_builder yet.
    In that case export uses the primary single-column template so users still get a usable .docx.
    """
    slug = normalize_template_slug(template_name)
    if load_layout_profile(slug) not in SUPPORTED_DOCX_PROFILES:
        return PRIMARY_TEMPLATE_SLUG
    return slug
