"""
Canonical template folder slugs and legacy aliases.

Primary resume template folder: ``classic`` (single-column serif / token-driven).
API and DB may still send ``default`` from older clients; normalize to ``classic``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

# Folder name under backend/templates/ (lowercase slug).
PRIMARY_TEMPLATE_SLUG = "classic"

_TEMPLATE_ALIASES = {
    "default": PRIMARY_TEMPLATE_SLUG,
}


def normalize_template_slug(name: Optional[str]) -> str:
    """Return canonical folder slug. Maps legacy ``default`` → ``classic``."""
    raw = (name or "").strip()
    if not raw:
        return PRIMARY_TEMPLATE_SLUG
    key = raw.lower()
    return _TEMPLATE_ALIASES.get(key, raw)


def resolve_template_folder(name: Optional[str]) -> Path:
    """Path to template directory (HTML, CSS, tokens). Falls back to primary if slug missing."""
    slug = normalize_template_slug(name)
    d = TEMPLATES_DIR / slug
    if d.is_dir():
        return d
    primary = TEMPLATES_DIR / PRIMARY_TEMPLATE_SLUG
    if primary.is_dir():
        return primary
    return d
