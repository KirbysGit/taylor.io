"""
PNG icons for sidebar contact rail in Word (templates/<slug>/docx_icons/<field>.png).

PDF continues to use inline SVG in HTML; these files are optional Word-only assets.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from .template_slug import normalize_template_slug, resolve_template_folder

CONTACT_RAIL_ICON_FIELDS = frozenset(
    ("email", "phone", "location", "linkedin", "github", "portfolio")
)


def contact_rail_icon_png_path(template_name: Optional[str], field_key: str) -> Optional[Path]:
    if field_key not in CONTACT_RAIL_ICON_FIELDS:
        return None
    slug = normalize_template_slug(template_name)
    base = resolve_template_folder(slug) / "docx_icons"
    for name in (f"{field_key}.png", f"{field_key.upper()}.png", f"{field_key}.PNG"):
        p = base / name
        if p.is_file():
            return p
    return None


@lru_cache(maxsize=64)
def contact_rail_icon_png_bytes(template_name: Optional[str], field_key: str) -> Optional[bytes]:
    path = contact_rail_icon_png_path(template_name, field_key)
    if not path:
        return None
    try:
        return path.read_bytes()
    except OSError:
        return None


def clear_contact_icon_cache() -> None:
    contact_rail_icon_png_bytes.cache_clear()
