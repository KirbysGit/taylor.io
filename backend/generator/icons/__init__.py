"""
Contact rail icons: SVG markup for HTML/PDF, PNG loading for Word.

- ``contact_rail_svg`` — inline ``<svg>`` strings and ``contact_rail_svg_for_field``.
- ``docx_rail_png`` — paths/bytes under ``templates/<slug>/docx_icons/*.png``.
"""

from __future__ import annotations

from .contact_rail_svg import (
    contact_rail_icon_kind,
    contact_rail_svg_for_field,
)
from .docx_rail_png import (
    CONTACT_RAIL_ICON_FIELDS,
    clear_contact_icon_cache,
    contact_rail_icon_png_bytes,
    contact_rail_icon_png_path,
)

__all__ = [
    "CONTACT_RAIL_ICON_FIELDS",
    "clear_contact_icon_cache",
    "contact_rail_icon_kind",
    "contact_rail_icon_png_bytes",
    "contact_rail_icon_png_path",
    "contact_rail_svg_for_field",
]
