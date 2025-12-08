"""
Render-time data structures and helpers for template-driven DOCX generation.

This module defines the "render context" that the DOCX builder operates on.
The builder should only depend on these models and the placeholder language:

    - Simple placeholders:  {field}
    - Conditional markers:  {?field}

See `builder/docx_builder.py` for details on how placeholders are applied.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel

from .formatter.formatters import format_date


class EducationEntryContext(BaseModel):
    """Single education entry flattened into template-friendly fields."""

    name: str  # university / school
    degree: str  # full degree text
    loc: Optional[str] = None
    gpa: Optional[str] = None
    date: Optional[str] = None  # e.g. "Aug 2021 – May 2025"
    honors: Optional[str] = None
    clubs: Optional[str] = None
    coursework: Optional[str] = None


class ExperienceEntryContext(BaseModel):
    """Single experience entry used by the template/builder."""

    role: str
    company: str
    date: Optional[str] = None
    loc: Optional[str] = None
    stack: Optional[str] = None
    bullet: Optional[str] = None  # primary bullet / summary line


class ProjectEntryContext(BaseModel):
    """Single project entry used by the template/builder."""

    title: str
    stack: Optional[str] = None
    link: Optional[str] = None
    bullet: Optional[str] = None


class ResumeRenderContext(BaseModel):
    """
    Flattened, template-friendly view of a user's resume.

    The DOCX builder should consume ONLY this structure plus the
    {field}/{?field} placeholder language. It should NOT reach directly into
    SQLAlchemy models.
    """

    # header/contact
    name: str
    email: str
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    header_line: Optional[str] = None

    # sections (full collections)
    education: List[EducationEntryContext] = []
    experiences: List[ExperienceEntryContext] = []
    projects: List[ProjectEntryContext] = []

    # pre-rendered multiline skills block used by {skills}/{?skills}
    skills: Optional[str] = None

    # --------- primary entry shortcuts (for single-entry templates) ---------
    # education (first entry)
    edu_name: Optional[str] = None
    edu_degree: Optional[str] = None
    edu_minor: Optional[str] = None
    edu_location: Optional[str] = None
    edu_gpa: Optional[str] = None
    edu_date: Optional[str] = None
    edu_honors: Optional[str] = None
    edu_clubs: Optional[str] = None
    edu_coursework: Optional[str] = None

    # experience (first entry)
    exp_role: Optional[str] = None
    exp_company: Optional[str] = None
    exp_loc: Optional[str] = None
    exp_stack: Optional[str] = None
    exp_date: Optional[str] = None
    exp_bullet: Optional[str] = None

    # projects (first entry)
    proj_title: Optional[str] = None
    proj_stack: Optional[str] = None
    proj_link: Optional[str] = None
    proj_bullet: Optional[str] = None


def _format_date_range(start, end, current: bool) -> str:
    """
    Convert DB dates -> 'Aug 2021 – May 2025' or 'Aug 2021 – Present'.

    Returns an empty string if there is no usable data so that any {date}
    placeholders simply become empty.
    """
    start_text = format_date(start) if start else ""
    end_text = format_date(end) if end else ""

    if not end_text and current:
        end_text = "Present"

    if start_text and end_text:
        return f"{start_text} – {end_text}"
    if start_text or end_text:
        return start_text or end_text
    return ""


def _join_tech_stack(stack) -> str:
    """
    Accepts list[str] or a comma-separated string and returns a clean
    'Python, Django, React' style text, or an empty string if no data.
    """
    if not stack:
        return ""

    if isinstance(stack, list):
        items = [str(s).strip() for s in stack if str(s).strip()]
    else:
        # assume comma-separated or generic string
        items = [part.strip() for part in str(stack).split(",") if part.strip()]

    return ", ".join(items)


def _pick_main_bullet(description: Optional[str]) -> str:
    """
    Take the first bullet or first non-empty line from a multi-line
    description. Later we can expand this into multiple bullets/loop blocks.
    """
    if not description:
        return ""

    for raw_line in str(description).splitlines():
        line = raw_line.strip()
        if not line:
            continue
        # strip any leading bullet characters so we don't double up
        if line[0] in {"•", "-", "*"}:
            line = line[1:].strip()
        return line

    return ""


def build_skills_block(skills) -> str:
    """
    Skills -> multiline string for the {skills} placeholder.

    We assume `skills` is an iterable of Skill-like objects with at least
    a `.name` attribute and, optionally, a `.category` attribute.

    Behaviour:
      1) If categories are present, group by category:
             Category: item1, item2
         and join lines with '\\n'.
      2) If there are no categories, return a simple
             "item1, item2, item3"
         string so the template can render it beneath a "Skills" heading.
    """
    if not skills:
        return ""

    from collections import defaultdict

    grouped = defaultdict(list)
    has_category = False

    for s in skills:
        name = (getattr(s, "name", "") or "").strip()
        if not name:
            continue
        category = getattr(s, "category", None)
        if category:
            has_category = True
            grouped[(category or "Other").strip()].append(name)
        else:
            grouped[""].append(name)

    if not grouped:
        return ""

    # If we have at least one real category, emit one line per category.
    if has_category:
        lines: List[str] = []
        for category, names in grouped.items():
            if not names:
                continue
            label = category or "Skills"
            lines.append(f"{label}: {', '.join(names)}")
        return "\n".join(lines)

    # No categories: flatten all names into a single comma-separated line.
    flat_names: List[str] = []
    for names in grouped.values():
        flat_names.extend(names)

    return ", ".join(flat_names)


def build_resume_render_context(user) -> ResumeRenderContext:
    """
    Map DB user + related models -> ResumeRenderContext.

    This is where we:
      - format dates into human-readable 'date' strings
      - join tech stacks into 'stack' strings
      - assemble the multiline `skills` block
    """
    contact = getattr(user, "contact", None)
    email = getattr(contact, "email", None) or getattr(user, "email", "") or ""
    github = getattr(contact, "github", None)
    linkedin = getattr(contact, "linkedin", None)
    portfolio = getattr(contact, "portfolio", None)
    phone = getattr(contact, "phone", None)
    location = getattr(contact, "location", None) or getattr(user, "location", None)

    # education
    edu_entries: List[EducationEntryContext] = []
    for edu in getattr(user, "education", []) or []:
        degree_parts: List[str] = []
        if getattr(edu, "degree", None):
            degree_parts.append(str(edu.degree))
        if getattr(edu, "field", None):
            degree_parts.append(str(edu.field))
        degree_text = " ".join(degree_parts)

        edu_entries.append(
            EducationEntryContext(
                name=(getattr(edu, "school", "") or ""),
                degree=degree_text or "",
                loc=getattr(edu, "location", None) or None,
                gpa=(str(getattr(edu, "gpa")) if getattr(edu, "gpa", None) else None),
                date=_format_date_range(
                    getattr(edu, "start_date", None),
                    getattr(edu, "end_date", None),
                    bool(getattr(edu, "current", False)),
                ),
                honors=getattr(edu, "honors_awards", None) or None,
                clubs=getattr(edu, "clubs_extracurriculars", None) or None,
                coursework=getattr(edu, "relevant_coursework", None) or None,
            )
        )

    # experiences
    exp_entries: List[ExperienceEntryContext] = []
    for exp in getattr(user, "experiences", []) or []:
        exp_entries.append(
            ExperienceEntryContext(
                role=(getattr(exp, "title", "") or ""),
                company=(getattr(exp, "company", "") or ""),
                date=_format_date_range(
                    getattr(exp, "start_date", None),
                    getattr(exp, "end_date", None),
                    bool(getattr(exp, "current", False)),
                ),
                loc=getattr(exp, "location", None) or None,
                # Experience model currently has no tech_stack column;
                # keep this for future extension.
                stack=None,
                bullet=_pick_main_bullet(getattr(exp, "description", None)),
            )
        )

    # projects
    proj_entries: List[ProjectEntryContext] = []
    for proj in getattr(user, "projects", []) or []:
        proj_entries.append(
            ProjectEntryContext(
                title=(getattr(proj, "title", "") or ""),
                stack=_join_tech_stack(getattr(proj, "tech_stack", None)),
                link=getattr(proj, "url", None) or None,
                bullet=_pick_main_bullet(getattr(proj, "description", None)),
            )
        )

    # skills block (single placeholder-friendly blob)
    skills_block = build_skills_block(getattr(user, "skills", None))

    # primary entries for single-entry templates (use first item if present)
    primary_edu = edu_entries[0] if edu_entries else None
    primary_exp = exp_entries[0] if exp_entries else None
    primary_proj = proj_entries[0] if proj_entries else None

    return ResumeRenderContext(
        name=getattr(user, "name", "") or "",
        email=email,
        github=github,
        linkedin=linkedin,
        portfolio=portfolio,
        phone=phone,
        location=location,
        education=edu_entries,
        experiences=exp_entries,
        projects=proj_entries,
        skills=skills_block or None,
        # education shortcuts
        edu_name=(primary_edu.name if primary_edu else None),
        edu_degree=(primary_edu.degree if primary_edu else None),
        edu_minor=None,  # current model has no minor; override-driven
        edu_location=(primary_edu.loc if primary_edu else None),
        edu_gpa=(primary_edu.gpa if primary_edu else None),
        edu_date=(primary_edu.date if primary_edu else None),
        edu_honors=(primary_edu.honors if primary_edu else None),
        edu_clubs=(primary_edu.clubs if primary_edu else None),
        edu_coursework=(primary_edu.coursework if primary_edu else None),
        # experience shortcuts
        exp_role=(primary_exp.role if primary_exp else None),
        exp_company=(primary_exp.company if primary_exp else None),
        exp_loc=(primary_exp.loc if primary_exp else None),
        exp_stack=(primary_exp.stack if primary_exp else None),
        exp_date=(primary_exp.date if primary_exp else None),
        exp_bullet=(primary_exp.bullet if primary_exp else None),
        # project shortcuts
        proj_title=(primary_proj.title if primary_proj else None),
        proj_stack=(primary_proj.stack if primary_proj else None),
        proj_link=(primary_proj.link if primary_proj else None),
        proj_bullet=(primary_proj.bullet if primary_proj else None),
    )


__all__ = [
    "EducationEntryContext",
    "ExperienceEntryContext",
    "ProjectEntryContext",
    "ResumeRenderContext",
    "build_resume_render_context",
    "build_skills_block",
]


