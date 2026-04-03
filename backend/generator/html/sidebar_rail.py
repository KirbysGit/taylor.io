# Builds more compact education and stacked skill categories to fit the sidebar rail.

from __future__ import annotations

import html
from typing import Any, Dict, List, Optional

from ..shared.dates import format_date_range
from ..shared.skills import skills_group_ordered


# --- Education Rail ---

# Takes in Education Data Dict and build Education Entry Rail HTML.
def build_education_entry_rail(edu: Dict[str, Any]) -> str:

    # Get All Relevant Edu Data.
    school_raw = (edu.get("school") or "").strip()
    degree = (edu.get("degree") or "").strip()
    discipline = (edu.get("discipline") or "").strip()
    minor = (edu.get("minor") or "").strip()
    location = (edu.get("location") or "").strip()
    gpa = (edu.get("gpa") or "").strip()
    start_raw = edu.get("start_date") or edu.get("startDate") or ""
    end_raw = edu.get("end_date") or edu.get("endDate") or ""
    current = edu.get("current", False)
    date_range = format_date_range(start_raw, end_raw, current)
    minor_line = f"Minor in {minor}" if minor else ""
    has_major = bool(degree or discipline)
    has_body = bool(school_raw or date_range or location or has_major or minor_line or gpa)
    subs = edu.get("subsections") or {}
    if isinstance(subs, dict) and subs:
        has_body = True

    if not has_body:
        return ""

    # User text → safe HTML (escape HTML entities).
    school_e = html.escape(school_raw, quote=True)
    dates_e = html.escape(date_range, quote=True)
    loc_e = html.escape(location, quote=True)
    minor_e = html.escape(minor_line, quote=True)

    # Initialize the major HTML.
    major_html = ""

    # If there is both degree and discipline, build the major HTML.
    if degree and discipline:
        de = html.escape(degree, quote=True)
        di = html.escape(discipline, quote=True)
        major_html = (
            f'<div class="education-entry--rail__major">'
            f'<span class="education-entry--rail__major-preamble">{de} in {di}</span>'
            f"</div>"
        )
    elif degree:
        major_html = (
            f'<div class="education-entry--rail__major">'
            f'<span class="education-entry--rail__major-preamble">{html.escape(degree, quote=True)}</span>'
            f"</div>"
        )
    elif discipline:
        major_html = (
            f'<div class="education-entry--rail__major">'
            f'<span class="education-entry--rail__major-preamble">{html.escape(discipline, quote=True)}</span>'
            f"</div>"
        )

    # Initialize the blocks list.
    blocks: List[str] = []

    # Handles optional fields and their corresponding HTML blocks.
    if school_raw:
        blocks.append(f'<div class="education-entry--rail__school">{school_e}</div>')
    if date_range:
        blocks.append(f'<div class="education-entry--rail__dates">{dates_e}</div>')
    if location:
        blocks.append(f'<div class="education-entry--rail__location">{loc_e}</div>')
    if major_html:
        blocks.append(major_html)
    if minor_line:
        blocks.append(f'<div class="education-entry--rail__minor">{minor_e}</div>')
    if gpa:
        blocks.append(
            f'<div class="education-entry--rail__gpa">{html.escape(f"GPA: {gpa}", quote=True)}</div>'
        )

    # Arbitrary title + body pairs (e.g. coursework, honors) → HTML blocks.
    hl_parts: List[str] = []
    if isinstance(subs, dict):
        for title, content in subs.items():
            t = str(title).strip() if title is not None else ""
            c = str(content).strip() if content is not None else ""
            if not t and not c:
                continue
            te = html.escape(t, quote=True) if t else ""
            ce = html.escape(c, quote=True) if c else ""
            inner_parts: List[str] = []
            if te:
                inner_parts.append(
                    f'<div class="education-entry--rail__hl-title">{te}</div>'
                )
            if ce:
                inner_parts.append(
                    f'<div class="education-entry--rail__hl-text">{ce}</div>'
                )
            if inner_parts:
                hl_parts.append(
                    f'<div class="education-entry--rail__hl">{"".join(inner_parts)}</div>'
                )

    highlights_html = ""
    if hl_parts:
        highlights_html = (
            f'<div class="education-entry--rail__highlights">{"".join(hl_parts)}</div>'
        )

    core = "\n".join(blocks)
    return f'''<div class="education-entry education-entry--rail">
{core}{highlights_html}
</div>'''


# --- Skills Rail ---

# Takes in Skills Data List & Category Order and builds stacked Skills Rail HTML.
def build_skill_entry_rail(skills: list, category_order: Optional[list] = None) -> str:

    # Group skills by category and order them.
    groups = skills_group_ordered(skills, category_order)
    if not groups:
        return ""

    # Initialize the blocks list.
    blocks: List[str] = []

    # Build HTML blocks per category and skills.
    for category, names in groups:
        if not names:
            continue
        names_e = ", ".join(html.escape(n, quote=True) for n in names)
        if category:
            cat_e = html.escape(str(category), quote=True)
            blocks.append(
                f'<div class="skill-rail-group">'
                f'<div class="skill-rail__title">{cat_e}</div>'
                f'<div class="skill-rail__names">{names_e}</div>'
                f"</div>"
            )
        else:
            # No category label (e.g. uncategorized bucket).
            blocks.append(
                f'<div class="skill-rail-group skill-rail-group--solo">'
                f'<div class="skill-rail__names">{names_e}</div>'
                f"</div>"
            )

    return "\n".join(blocks)
