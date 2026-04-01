"""
Layout profile for a template slug: which HTML/DOCX engine implementation to use.

Skins live in per-slug folders (tokens + CSS); multiple slugs may share one profile.
See meta.json keys layoutProfile, family, variantLabel (API / gallery).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

from .template_slug import PRIMARY_TEMPLATE_SLUG, normalize_template_slug, resolve_template_folder

DEFAULT_LAYOUT_PROFILE = "classic_single_column"

# Second HTML/PDF structure: narrow aside + main column; same profile drives Word when supported.
LAYOUT_SIDEBAR_SPLIT = "sidebar_split"

# DOCX: classic single-column + sidebar two-column (table layout; tokens from templates/<slug>/).
SUPPORTED_DOCX_PROFILES = frozenset({DEFAULT_LAYOUT_PROFILE, LAYOUT_SIDEBAR_SPLIT})


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


def load_docx_max_pages(template_name: Optional[str]) -> Optional[int]:
    """
    Optional templates/<slug>/meta.json ``docxMaxPages`` (int >= 1).
    When ``1``, sidebar Word export always stretches the layout table row toward the
    bottom of the page (see docx_builder); overflow may still span pages in Word.
    """
    folder = resolve_template_folder(template_name)
    path: Path = folder / "meta.json"
    if not path.is_file():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, json.JSONDecodeError, TypeError):
        return None
    if not isinstance(raw, dict):
        return None
    v = raw.get("docxMaxPages")
    if isinstance(v, int) and v >= 1:
        return v
    if isinstance(v, str) and v.strip().isdigit():
        i = int(v.strip())
        if i >= 1:
            return i
    return None


def resolve_docx_max_pages(
    template_name: Optional[str],
    resume_data: Optional[Dict[str, Any]] = None,
) -> Optional[int]:
    """Per-resume ``docxMaxPages`` in payload overrides template meta when set."""
    if resume_data and isinstance(resume_data.get("docxMaxPages"), int):
        v = resume_data["docxMaxPages"]
        if v >= 1:
            return v
    return load_docx_max_pages(template_name)


def docx_export_template_slug(template_name: Optional[str]) -> str:
    """
    Folder slug for Word: matches the selected template when layoutProfile is implemented
    (e.g. ``sidebar`` for ``sidebar_split``). Unsupported profiles fall back to ``classic``.
    """
    slug = normalize_template_slug(template_name)
    if load_layout_profile(slug) not in SUPPORTED_DOCX_PROFILES:
        return PRIMARY_TEMPLATE_SLUG
    return slug
