# parsers/skills_parser.py

# Skills extraction.

import re
from typing import Dict, List


SKILL_STOPWORDS_RE = re.compile(r"(?i)^(and|or|the|a|an|with|using)$")
CATEGORY_PATTERN = re.compile(r"^([A-Z][A-Za-z0-9\s/&+\-.]+?)\s*:\s*(.+)$")
BULLET_SPLIT_RE = re.compile(r"[•â€¢Ã¢â‚¬Â¢\*]")


def _clean_category(category_name: str) -> str:
    return re.sub(r"\s+", " ", category_name or "").strip(" -")


def _append_skill(skills: List[Dict[str, str]], skill: str, category: str | None = None) -> None:
    skill = (skill or "").strip()
    if not skill or len(skill) >= 50:
        return
    if len(skill) == 1 and skill != "C":
        return
    if SKILL_STOPWORDS_RE.match(skill):
        return
    entry = {"name": skill}
    if category:
        entry["category"] = category
    skills.append(entry)


def _split_skill_items(text: str) -> List[str]:
    items = []
    current = []
    paren_depth = 0

    for char in text or "":
        if char == "(":
            paren_depth += 1
            current.append(char)
            continue
        if char == ")":
            paren_depth = max(0, paren_depth - 1)
            current.append(char)
            continue
        if char in {",", ";"} and paren_depth == 0:
            item = "".join(current).strip()
            if item:
                items.append(item)
            current = []
            continue
        current.append(char)

    item = "".join(current).strip()
    if item:
        items.append(item)
    return items


def parse_skills(section_text: str) -> List[Dict[str, str]]:
    """Extract skills from skills section text, preserving category groupings if present."""
    if not section_text or not section_text.strip():
        return []

    skills = []
    lines = [line.strip() for line in section_text.split("\n") if line.strip()]
    current_category = None

    for line in lines:
        category_match = CATEGORY_PATTERN.match(line)
        if category_match:
            current_category = _clean_category(category_match.group(1))
            for skill in _split_skill_items(category_match.group(2)):
                _append_skill(skills, skill, current_category)
            continue

        if current_category:
            for skill in _split_skill_items(line):
                _append_skill(skills, skill, current_category)
            continue

        line_cleaned = BULLET_SPLIT_RE.sub(",", line)
        for skill in _split_skill_items(line_cleaned):
            _append_skill(skills, skill)

    if any(skill.get("category") for skill in skills):
        return skills

    skills_text_cleaned = re.sub(r"\s*\n\s*", " ", section_text)
    skills_text_cleaned = BULLET_SPLIT_RE.sub(",", skills_text_cleaned)

    fallback_skills = []
    for skill in _split_skill_items(skills_text_cleaned):
        _append_skill(fallback_skills, skill)
    return fallback_skills
