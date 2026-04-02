"""
Shared HTML helpers for resume body fragments.

Sections (in order):
  - Dates — month/year parsing; entry date ranges (e.g. Present)
  - Descriptions — bullets vs paragraphs HTML
  - Skill grouping — category order + uncategorized

"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# --- Dates ---

# One date string (usually YYYY-MM or YYYY-MM-DD) → readable "Month YYYY". If parsing fails, returns the input unchanged.
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


# Formats the date range for an entry: if both start and end exist, "Start - End". If only one exists, that single label.
# If current is True, shows Present instead of an end date (or just "Present" when there is no start).
def format_date_range(start_raw, end_raw, current: bool) -> str:
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


# --- Descriptions ---

# Multiline text → HTML: lines starting with • become a bullet list; other lines become paragraphs (see description-* classes).
def format_description(description: str) -> str:
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


# --- Skill grouping ---

# Skills → list of (category name or None, names in that bucket). Optional category_order list runs first; rest alpha; uncategorized last.
def skills_group_ordered(
    skills: list,
    category_order: Optional[list] = None,
) -> List[Tuple[Optional[str], List[str]]]:
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
