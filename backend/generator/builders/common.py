"""
Shared HTML helpers: dates, descriptions, taglines, skill grouping.

Layout-specific markup lives in header.py, single_column.py, sidebar_rail.py.
"""

from __future__ import annotations

import html
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# Middle dot for tagline separators; single * in user input becomes this after **bold** parsing.
TAGLINE_INTERPUNCT = "\u00b7"


def format_date_month_year(date: str) -> str:
    if not date:
        return ""

    try:
        date_str = date[:10] if len(date) >= 10 else date

        if len(date_str) == 7:
            dt = datetime.strptime(date_str, "%Y-%m")
        elif len(date_str) == 10:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
        else:
            return date

        return dt.strftime("%B %Y")
    except Exception:
        return date


def format_description(description: str) -> str:
    """Format description text, converting bullet points to HTML list."""
    if not description:
        return ""

    lines = description.split("\n")
    bullet_items: List[Tuple[str, str]] = []
    non_bullet_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if stripped.startswith("•"):
            if non_bullet_lines:
                bullet_items.append(("paragraph", "\n".join(non_bullet_lines)))
                non_bullet_lines = []
            bullet_text = re.sub(r"^•\s+", "", stripped)
            if bullet_text:
                bullet_items.append(("bullet", bullet_text))
        else:
            non_bullet_lines.append(stripped)

    if non_bullet_lines:
        bullet_items.append(("paragraph", "\n".join(non_bullet_lines)))

    if bullet_items and any(item[0] == "bullet" for item in bullet_items):
        html_parts: List[str] = []
        current_bullets: List[str] = []

        for item_type, content in bullet_items:
            if item_type == "bullet":
                current_bullets.append(content)
            else:
                if current_bullets:
                    list_items = "".join([f"<li>{bullet}</li>" for bullet in current_bullets])
                    html_parts.append(f'<ul class="description-bullets">{list_items}</ul>')
                    current_bullets = []
                html_parts.append(f'<p class="description-paragraph">{content}</p>')

        if current_bullets:
            list_items = "".join([f"<li>{bullet}</li>" for bullet in current_bullets])
            html_parts.append(f'<ul class="description-bullets">{list_items}</ul>')

        return "".join(html_parts)
    return f'<p class="description-paragraph">{description}</p>'


def format_date_range(start_raw, end_raw, current: bool) -> str:
    """Format date range with conditional dash. No dash when only one date or none."""
    start_val = str(start_raw) if start_raw else ""
    end_val = str(end_raw) if end_raw else ""
    start_date = format_date_month_year(start_val) if start_val else ""
    end_date = format_date_month_year(end_val) if end_val else ""

    if current and start_date:
        return f"{start_date} - Present"
    if current and not start_date:
        return "Present"
    if start_date and end_date:
        return f"{start_date} - {end_date}"
    if start_date:
        return start_date
    if end_date:
        return end_date
    return ""


def _tagline_outer_italic_segments(raw: str) -> List[Tuple[bool, str]]:
    out: List[Tuple[bool, str]] = []
    i = 0
    n = len(raw)
    while i < n:
        if raw[i] == "_":
            j = raw.find("_", i + 1)
            if j != -1 and j > i + 1:
                out.append((True, raw[i + 1 : j]))
                i = j + 1
            else:
                start = i
                i += 1
                while i < n and raw[i] != "_":
                    i += 1
                out.append((False, raw[start:i]))
        else:
            start = i
            while i < n and raw[i] != "_":
                i += 1
            out.append((False, raw[start:i]))
    return out


def _tagline_apply_bold_and_dots(text: str, italic: bool) -> List[Tuple[str, bool, bool]]:
    parts = text.split("**")
    if len(parts) % 2 == 0:
        t = text.replace("*", TAGLINE_INTERPUNCT)
        return [(t, False, italic)] if t else []
    runs: List[Tuple[str, bool, bool]] = []
    for idx, p in enumerate(parts):
        bold = idx % 2 == 1
        t = p.replace("*", TAGLINE_INTERPUNCT)
        if t:
            runs.append((t, bold, italic))
    return runs


def _merge_bold_italic_runs(runs: List[Tuple[str, bool, bool]]) -> List[Tuple[str, bool, bool]]:
    merged: List[Tuple[str, bool, bool]] = []
    for text_p, b, it in runs:
        if not text_p:
            continue
        if merged and merged[-1][1] == b and merged[-1][2] == it:
            merged[-1] = (merged[-1][0] + text_p, b, it)
        else:
            merged.append((text_p, b, it))
    return merged


def _parse_tagline_runs_bold_italic_only(text: str) -> List[Tuple[str, bool, bool]]:
    all_runs: List[Tuple[str, bool, bool]] = []
    for is_italic, seg in _tagline_outer_italic_segments(text):
        all_runs.extend(_tagline_apply_bold_and_dots(seg, is_italic))
    return _merge_bold_italic_runs(all_runs)


def parse_tagline_runs(raw: str) -> List[Tuple[str, bool, bool, bool]]:
    """
    Tagline mini-markup (HTML preview/PDF and Word):
    - ==text== — underline (parsed outermost)
    - **text** — bold
    - _text_ — italic
    - Every * outside of ** pairs becomes a middle dot (·)
    """
    raw = (raw or "").strip()
    if not raw:
        return []
    parts = raw.split("==")
    if len(parts) % 2 == 0:
        merged_three = _parse_tagline_runs_bold_italic_only(raw)
        return [(t, b, it, False) for t, b, it in merged_three]
    merged_four: List[Tuple[str, bool, bool, bool]] = []
    for idx, p in enumerate(parts):
        underline = idx % 2 == 1
        for t, b, it in _parse_tagline_runs_bold_italic_only(p):
            merged_four.append((t, b, it, underline))
    out: List[Tuple[str, bool, bool, bool]] = []
    for text_p, b, it, u in merged_four:
        if not text_p:
            continue
        if out and out[-1][1] == b and out[-1][2] == it and out[-1][3] == u:
            out[-1] = (out[-1][0] + text_p, b, it, u)
        else:
            out.append((text_p, b, it, u))
    return out


def _tagline_runs_to_html(runs: List[Tuple[str, bool, bool, bool]]) -> str:
    out: List[str] = []
    for text_p, bold, italic, underline in runs:
        esc = html.escape(text_p, quote=True)
        chunk = esc
        if italic:
            chunk = f"<em>{chunk}</em>"
        if bold:
            chunk = f"<strong>{chunk}</strong>"
        if underline:
            chunk = f"<u>{chunk}</u>"
        out.append(chunk)
    return "".join(out)


def build_tagline_block(header: Dict[str, Any]) -> str:
    """HTML fragment for optional tagline: ==underline==, **bold**, _italic_, * -> ·."""
    visibility = header.get("visibility", {})
    if visibility.get("showTagline") is False:
        return ""
    raw = (header.get("tagline") or "").strip()
    if not raw:
        return ""
    inner = _tagline_runs_to_html(parse_tagline_runs(raw))
    return f'<p class="tagline">{inner}</p>'


def skills_group_ordered(
    skills: list,
    category_order: Optional[list] = None,
) -> List[Tuple[Optional[str], List[str]]]:
    """
    Ordered list  of (category_name | None for uncategorized, [skill names]).
    Used by single-column and sidebar rail skill renderers.
    """
    skills_by_category: Dict[str, List[str]] = {}
    uncategorized: List[str] = []

    for skill in skills:
        if isinstance(skill, dict):
            category = skill.get("category") or skill.get("Category")
            name = skill.get("name") or skill.get("Name", "")
        else:
            category = None
            name = str(skill)

        if not name:
            continue
        name = str(name).strip()
        if not name:
            continue

        if category:
            c = str(category).strip()
            if c not in skills_by_category:
                skills_by_category[c] = []
            skills_by_category[c].append(name)
        else:
            uncategorized.append(name)

    out: List[Tuple[Optional[str], List[str]]] = []
    if category_order:
        ordered = [c for c in category_order if c in skills_by_category]
        for c in sorted(skills_by_category.keys()):
            if c not in ordered:
                ordered.append(c)
        category_iter = ordered
    else:
        category_iter = sorted(skills_by_category.keys())

    for category in category_iter:
        out.append((category, skills_by_category[category]))

    if uncategorized:
        out.append((None, uncategorized))

    return out
