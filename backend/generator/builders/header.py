"""
Header and contact HTML: classic one-line contact, sidebar stacked contact rail.

Sections (in order):
  - Constants — visibility keys, field order, URL-like contact keys
  - URL display preference — how link fields show text (full vs strip protocol)
  - Contact display text — strip protocol for display only (href unchanged)
  - Visible fields — ordered (key, value) list respecting visibility
  - Classic header — single line, pipe-separated
  - Contact rail — href builder per field; stacked ``<ul class="contact-rail">`` HTML

Icons handled in our /icons folder.
"""

from __future__ import annotations

import html
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

from ..icons.contact_rail_svg import contact_rail_svg_for_field

# --- Constants ---

_VISIBILITY_MAP = {
    "email": "showEmail",
    "phone": "showPhone",
    "location": "showLocation",
    "linkedin": "showLinkedin",
    "github": "showGithub",
    "portfolio": "showPortfolio",
}

_FIELD_MAP_KEYS = ("email", "phone", "location", "linkedin", "github", "portfolio")

_URLISH_CONTACT_KEYS = frozenset({"linkedin", "github", "portfolio"})


# --- URL Display Preference ---

# Determines if link shows "https://" or not, returns preference to parent function.
def resolve_contact_url_display(preferences: Optional[Dict[str, Any]]) -> str:
    if not preferences:
        return "full"

    raw = preferences.get("contactUrlDisplay") or preferences.get("contact_url_display")
    
    if isinstance(raw, str) and raw.strip().lower() in ("strip_protocol", "strip"):
        return "strip_protocol"

    return "full"


# --- Contact Display Text ---

# Strips "https://" or "http://" from link if preference is strip_protocol.
def format_contact_field_display(field_key: str, raw: str, *, contact_url_display: str = "full") -> str:
    v = (raw or "").strip()
    if not v or contact_url_display != "strip_protocol":
        return v
    if field_key not in _URLISH_CONTACT_KEYS:
        return v
    low = v.lower()
    if low.startswith("https://"):
        return v[8:]
    if low.startswith("http://"):
        return v[7:]
    return v


# --- Visible Fields ---

# (field_key, value) in header contactOrder. Skips any hidden or empty fields.
def iter_visible_contact_fields(header: Dict[str, Any]) -> List[Tuple[str, str]]:
    contact_order = header.get(
        "contactOrder",
        ["email", "phone", "location", "linkedin", "github", "portfolio"],
    )
    field_map = {k: header.get(k, "") for k in _FIELD_MAP_KEYS}
    visibility = header.get("visibility", {})
    out: List[Tuple[str, str]] = []
    for field_key in contact_order:
        if field_key not in field_map:
            continue
        field_value = field_map[field_key]
        vk = _VISIBILITY_MAP.get(field_key)
        is_visible = visibility.get(vk, True) if vk else True
        if field_value and str(field_value).strip() and is_visible:
            out.append((field_key, str(field_value).strip()))
    return out


# --- Classic Header ---

# Builds contact line, w/ " | " between fields.
def build_header(header: Dict[str, Any], style_preferences: Optional[Dict[str, Any]] = None) -> str:
    mode = resolve_contact_url_display(style_preferences)
    parts = [
        format_contact_field_display(k, v, contact_url_display=mode)
        for k, v in iter_visible_contact_fields(header)
    ]
    return " | ".join(parts)


# --- Contact Rail ---

# Builds Sidebar Rail HREFs. Returns None if the value should stay plain text.
def contact_rail_href(field_key: str, raw: str) -> Optional[str]:
    v = raw.strip()
    if not v:
        return None
    if field_key == "email":
        return f"mailto:{quote(v)}"
    if field_key == "phone":
        digits = re.sub(r"[^\d+]", "", v)
        return f"tel:{digits}" if digits else None
    low = v.lower()
    if low.startswith(("http://", "https://")):
        return v
    if field_key == "linkedin":
        if "linkedin.com" in low:
            return f"https://{v}" if "://" not in v else v
        slug = v.strip("/").split("/")[-1]
        return f"https://www.linkedin.com/in/{quote(slug, safe='')}"
    if field_key == "github":
        slug = v.strip("/").split("/")[-1]
        return f"https://github.com/{quote(slug, safe='')}"
    if field_key == "portfolio":
        return v if "://" in v else f"https://{v.lstrip('/')}"
    return None


# Builds Sidebar Rail HTML. Same fields/visibility as build_header.
def build_contact_rail_html(header: Dict[str, Any], style_preferences: Optional[Dict[str, Any]] = None) -> str:

    mode = resolve_contact_url_display(style_preferences)
    rows: List[str] = []

    for field_key, value in iter_visible_contact_fields(header):
        svg = contact_rail_svg_for_field(field_key)
        href = contact_rail_href(field_key, value)
        disp = format_contact_field_display(field_key, value, contact_url_display=mode)
        safe_disp = html.escape(disp, quote=True)
        if href:
            safe_href = html.escape(href, quote=True)
            inner = f'<a class="contact-rail__link" href="{safe_href}">{safe_disp}</a>'
        else:
            inner = safe_disp
        
        rows.append(
            f'<li class="contact-rail__row">'
            f'<span class="contact-rail__icon" aria-hidden="true">{svg}</span>'
            f'<span class="contact-rail__value">{inner}</span>'
            f"</li>"
        )
    if not rows:
        return ""
    return '<ul class="contact-rail">\n' + "\n".join(rows) + "\n</ul>"
