# Builds classic single-column HTML: education, experience, projects, skills (inline row).

from __future__ import annotations

from typing import Dict, Any, List

from ..shared.dates import format_date_range
from ..shared.skills import skills_group_ordered
from .description import format_description


# --- Education ---

def build_education_entry(edu: Dict[str, Any]) -> str:

    # Get All Relevant Edu Data.
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

    # Initialize the highlights lines list.
    highlights_lines: List[str] = []

    # Iterate over each subsection and build the highlights lines.
    for title, content in edu.get("subsections", {}).items():
        highlights_lines.append(
            f'''<div class='highlight-line'>
                <div class='highlight-title'>{title}: </div>
                <div class='highlight-content'>{content}</div>
            </div>'''
        )
    highlights_lines = "\n".join(highlights_lines)

    # Build the Education Entry HTML based on available data.
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


# --- Experience ---

def build_experience_entry(exp: Dict[str, Any]) -> str:

    # Get All Relevant Exp Data.
    start_raw = exp.get("start_date") or exp.get("startDate") or ""
    end_raw = exp.get("end_date") or exp.get("endDate") or ""
    current = exp.get("current", False)
    date_range = format_date_range(start_raw, end_raw, current)

    company = exp.get("company", "")
    skills = exp.get("skills", "")
    location = exp.get("location", "")

    # Handles optional skills per experience entry.
    company_skills_html = f'<div class="company-name">{company}</div>'
    if skills:
        company_skills_html += (
            f'<span class="company-separator"> | </span><div class="company-skills">{skills}</div>'
        )

    # Format description per entry.
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


# --- Projects ---

def build_project_entry(proj: Dict[str, Any], *, variant: str = "default") -> str:

    # Get All Relevant Proj Data.
    title = proj.get("title", "")

    tech_stack = proj.get("tech_stack") or proj.get("techStack") or []
    tech_stack_str = ", ".join(tech_stack) if isinstance(tech_stack, list) else (tech_stack or "")

    url = proj.get("url", "")

    description = format_description(proj.get("description", ""))

    # If 'Sidebar' layout, no '|' separators. Info moved below title block. (Keeping it here while file is small... :) )
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

    # Classic: title, tech, URL inline with pipe separators.
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


# --- Skills ---

def build_skill_entry(skills: list, category_order: list = None) -> str:

    # Group skills by category and order them.
    groups = skills_group_ordered(skills, category_order)
    if not groups:
        return ""

    # Initialize the skill lines list.
    skill_lines: List[str] = []
    for category, names in groups:
        # Join skill names by comma.
        skill_names = ", ".join(names)
        # If there is a category, build the skill line with the category.
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
