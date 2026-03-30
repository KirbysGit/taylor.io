"""
Header/contact HTML: single-line (classic) and stacked contact rail (sidebar).
"""

from __future__ import annotations

import html
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

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


def resolve_contact_url_display(preferences: Optional[Dict[str, Any]]) -> str:
    """
    How URL-like contact fields appear in PDF/HTML/Word (href stays full).
    Set from global ``style.contactUrlDisplay`` / ``contact_url_display`` — not template meta.

    ``full`` — show stored text as-is. ``strip_protocol`` — drop leading http:// or https:// for display.
    """
    if not preferences:
        return "full"
    raw = preferences.get("contactUrlDisplay") or preferences.get("contact_url_display")
    if isinstance(raw, str) and raw.strip().lower() in ("strip_protocol", "strip"):
        return "strip_protocol"
    return "full"


def format_contact_field_display(
    field_key: str,
    raw: str,
    *,
    contact_url_display: str = "full",
) -> str:
    """Visible contact text; does not change hyperlink targets."""
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


def _iter_visible_contact_fields(header: Dict[str, Any]) -> List[Tuple[str, str]]:
    """(field_key, value) in contact order; respects visibility and non-empty values."""
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


def build_header(
    header: Dict[str, Any],
    style_preferences: Optional[Dict[str, Any]] = None,
) -> str:
    mode = resolve_contact_url_display(style_preferences)
    parts = [
        format_contact_field_display(k, v, contact_url_display=mode)
        for k, v in _iter_visible_contact_fields(header)
    ]
    return " | ".join(parts)


def _contact_rail_icon_kind(field_key: str) -> str:
    if field_key == "email":
        return "mail"
    if field_key == "phone":
        return "phone"
    if field_key == "location":
        return "map"
    if field_key == "linkedin":
        return "linkedin"
    if field_key == "github":
        return "github"
    if field_key == "portfolio":
        return "globe"
    return "globe"


def _contact_rail_href(field_key: str, raw: str) -> Optional[str]:
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


_SVG_MAIL = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" '
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">'
    '<rect width="20" height="16" x="2" y="4" rx="2"/>'
    '<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'
    "</svg>"
)
_SVG_PHONE = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" '
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">'
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.46 2.1l-1.27 1.27a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.1-.48c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92z"/>'
    "</svg>"
)
_SVG_MAP = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" '
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">'
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>'
    '<circle cx="12" cy="10" r="3"/>'
    "</svg>"
)
_SVG_GITHUB = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" '
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">'
    '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>'
    '<path d="M9 18c-4.51 2-5-2-7-2"/>'
    "</svg>"
)
_SVG_LINKEDIN = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" focusable="false">'
    '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>'
    "</svg>"
)
_SVG_GLOBE = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" '
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">'
    '<circle cx="12" cy="12" r="10"/>'
    '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
    '<path d="M2 12h20"/>'
    "</svg>"
)

_SVG_BY_KIND = {
    "mail": _SVG_MAIL,
    "phone": _SVG_PHONE,
    "map": _SVG_MAP,
    "github": _SVG_GITHUB,
    "linkedin": _SVG_LINKEDIN,
    "globe": _SVG_GLOBE,
}


def build_contact_rail_html(
    header: Dict[str, Any],
    style_preferences: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Stacked contact rows (icon + value) for sidebar / two-column rail layouts.
    Reuses the same field order and visibility as build_header.
    """
    mode = resolve_contact_url_display(style_preferences)
    rows: List[str] = []
    for field_key, value in _iter_visible_contact_fields(header):
        kind = _contact_rail_icon_kind(field_key)
        svg = _SVG_BY_KIND.get(kind, _SVG_GLOBE)
        href = _contact_rail_href(field_key, value)
        disp = format_contact_field_display(
            field_key, value, contact_url_display=mode
        )
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
