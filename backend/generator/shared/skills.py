# Skill list → ordered groups for HTML and Word.

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

# In : Skills List, Category Order
# Out : Ordered Groups of Skills.
def skills_group_ordered(skills: list, category_order: Optional[list] = None) -> List[Tuple[Optional[str], List[str]]]:
    skills_by_category: Dict[str, List[str]] = {}
    uncategorized: List[str] = []

    # Group the skills by category and order them.
    for skill in skills:
        if isinstance(skill, dict):
            category = skill.get("category") or skill.get("Category")
            name = skill.get("name") or skill.get("Name", "")
        else:
            category = None
            name = str(skill)

        # If the skill name is empty, continue.
        if not name:
            continue
        name = str(name).strip()
        if not name:
            continue

        # If the skill has a category, add it to the skills by category dictionary.
        if category:
            c = str(category).strip()
            if c not in skills_by_category:
                skills_by_category[c] = []
            skills_by_category[c].append(name)
        else:
            # If the skill has no category, add it to the uncategorized list.
            uncategorized.append(name)

    # Initialize the output list.
    out: List[Tuple[Optional[str], List[str]]] = []

    # If the category order is provided, order the categories accordingly.
    if category_order:
        ordered = [c for c in category_order if c in skills_by_category]
        # Sort the categories alphabetically.
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
