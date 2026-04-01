"""
Classic single-column HTML: education, experience, projects, skills (inline row).
"""

from __future__ import annotations

from typing import Dict, Any, List

from .common import format_date_range, format_description, skills_group_ordered


def build_education_entry(edu: Dict[str, Any]) -> str:
    degree = edu.get("degree", "")
    discipline = edu.get("discipline", "")
    minor = edu.get("minor", "")

    degree_text = f"{degree} in {discipline}"
    if minor:
        degree_text += f", Minor in {minor}"

    start_raw = edu.get("start_date") or edu.get("startDate") or ""
    end_raw = edu.get("end_date") or edu.get("endDate") or ""
    current = edu.get("current", False)
    date_range = format_date_range(start_raw, end_raw, current)

    gpa = edu.get("gpa", "")
    gpa_text = f"(GPA: {gpa})" if gpa else ""

    highlights_lines = []
    for title, content in edu.get("subsections", {}).items():
        highlights_lines.append(
            f'''<div class='highlight-line'>
                <div class='highlight-title'>{title}: </div>
                <div class='highlight-content'>{content}</div>
            </div>'''
        )
    highlights_lines = "\n".join(highlights_lines)

    return f'''
    <div class="education-entry">
        <div class="school-line">
            <div class="school-gpa-line">
                <div class="school-name">{edu.get('school', '')}</div>
                <div class="school-gpa">{gpa_text}</div>
            </div>
            <div class="school-dates">{date_range}</div>
        </div>
        <div class="degree-line">
            <div class="degree-type">{degree_text}</div>
            <div class="school-location">{edu.get('location', '')}</div>
        </div>
        <div class="highlights-lines">
            {highlights_lines}
        </div>
    </div>
    '''


def build_experience_entry(exp: Dict[str, Any]) -> str:
    start_raw = exp.get("start_date") or exp.get("startDate") or ""
    end_raw = exp.get("end_date") or exp.get("endDate") or ""
    current = exp.get("current", False)
    date_range = format_date_range(start_raw, end_raw, current)

    company = exp.get("company", "")
    skills = exp.get("skills", "")
    location = exp.get("location", "")

    company_skills_html = f'<div class="company-name">{company}</div>'
    if skills:
        company_skills_html += (
            f'<span class="company-separator"> | </span><div class="company-skills">{skills}</div>'
        )

    description = format_description(exp.get("description", ""))

    return f'''
    <div class="experience-entry">
        <div class="experience-line">
            <div class="experience-title">{exp.get('title', '')}</div>
            <div class="experience-dates">{date_range}</div>
        </div>
        <div class="company-line">
            <div class="company-skills-group">{company_skills_html}</div>
            <div class="company-location">{location}</div>
        </div>
        <div class="description-line">
            <div class="description-content">{description}</div>
        </div>
    </div>
    '''


def build_project_entry(proj: Dict[str, Any], *, variant: str = "default") -> str:
    title = proj.get("title", "")

    tech_stack = proj.get("tech_stack") or proj.get("techStack") or []
    tech_stack_str = ", ".join(tech_stack) if isinstance(tech_stack, list) else (tech_stack or "")

    url = proj.get("url", "")

    description = format_description(proj.get("description", ""))

    # Sidebar main column: title row, then tech (left) and URL (right), no pipe dividers.
    if variant == "sidebar_main":
        meta_parts: List[str] = []
        if tech_stack_str:
            meta_parts.append(f'<span class="project-tech">{tech_stack_str}</span>')
        if url:
            meta_parts.append(f'<span class="project-url">{url}</span>')
        meta_row = (
            f'<div class="project-meta-row">{"".join(meta_parts)}</div>'
            if meta_parts
            else ""
        )
        return f'''
    <div class="project-entry project-entry--sidebar-main">
        <div class="project-line">
            <div class="project-title project-title--sidebar-main">
                <span class="project-title-text">{title}</span>
                {meta_row}
            </div>
        </div>
        <div class="description-line">
            <div class="description-content">{description}</div>
        </div>
    </div>
    '''

    title_html = f'<span class="project-title-text">{title}</span>'

    if tech_stack_str:
        title_html += f'<span class="project-separator">|</span><span class="project-tech">{tech_stack_str}</span>'

    if url:
        title_html += f'<span class="project-separator">|</span><span class="project-url">{url}</span>'

    return f'''
    <div class="project-entry">
        <div class="project-line">
            <div class="project-title">{title_html}</div>
        </div>
        <div class="description-line">
            <div class="description-content">{description}</div>
        </div>
    </div>
    '''


def build_skill_entry(skills: list, category_order: list = None) -> str:
    groups = skills_group_ordered(skills, category_order)
    if not groups:
        return ""

    skill_lines: List[str] = []
    for category, names in groups:
        skill_names = ", ".join(names)
        if category:
            skill_lines.append(
                f'<div class="skill-line">'
                f'<span class="skill-category">{category}:</span> '
                f'<span class="skill-names">{skill_names}</span>'
                f"</div>"
            )
        else:
            skill_lines.append(
                f'<div class="skill-line">'
                f'<span class="skill-names">{skill_names}</span>'
                f"</div>"
            )

    return "\n".join(skill_lines)
