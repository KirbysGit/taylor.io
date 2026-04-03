# Layout profile registry: telling the engine which HTML/DOCX engine a template slug uses.

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

from ..shared.template_slug import PRIMARY_TEMPLATE_SLUG, normalize_template_slug, resolve_template_folder

DEFAULT_LAYOUT_PROFILE = "classic_single_column"

LAYOUT_SIDEBAR_SPLIT = "sidebar_split"

SUPPORTED_DOCX_PROFILES = frozenset({DEFAULT_LAYOUT_PROFILE, LAYOUT_SIDEBAR_SPLIT})

# --- Layout Profile Loading ---

# In : Template Name
# Out : Layout Profile.
def load_layout_profile(template_name: Optional[str]) -> str:
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

# In : Template Name
# Out : Layout Profile for Word.
def resolve_docx_layout_profile(template_name: Optional[str]) -> str:
    prof = load_layout_profile(template_name)
    if prof not in SUPPORTED_DOCX_PROFILES:
        return DEFAULT_LAYOUT_PROFILE
    return prof

# In : Template Name, Resume Data
# Out : Maximum # Pages for Word.
def resolve_docx_max_pages(template_name: Optional[str], resume_data: Optional[Dict[str, Any]] = None) -> Optional[int]:
    
    # If Resume Data has a docxMaxPages and its greater than or equal to 1, return it.
    if resume_data and isinstance(resume_data.get("docxMaxPages"), int):
        v = resume_data["docxMaxPages"]
        if v >= 1:
            return v

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


# In : Template Name
# Out : Folder Slug for Word.
def docx_export_template_slug(template_name: Optional[str]) -> str:
    """
    Folder slug for Word: matches the selected template when layoutProfile is implemented
    (e.g. ``sidebar`` for ``sidebar_split``). Unsupported profiles fall back to ``classic``.
    """
    slug = normalize_template_slug(template_name)
    if load_layout_profile(slug) not in SUPPORTED_DOCX_PROFILES:
        return PRIMARY_TEMPLATE_SLUG
    return slug
