# builder/docx_builder.py

"""
Simple, template-driven DOCX resume builder.

- Templates own all visual styling (lines, fonts, spacing).
- Builder ONLY:
    * fills simple placeholders ({NAME}, {EMAIL}, etc.)
    * replaces section placeholders with generated content
- No paragraph reordering, no complex element shuffling.


TAILOR DOCX TEMPLATE PLACEHOLDER LANGUAGE
========================================

We support two main kinds of placeholders:

1) {FIELD} / {field}
   - Simple inline replacement.
   - Example: {NAME}, {EMAIL}, {DEGREE}, {DATE}, {SKILLS}

2) {?field}
   - Conditional paragraph marker.
   - If the corresponding field is empty/falsey in the render context:
       -> the entire paragraph is removed.
     Else:
       -> the `{?field}` token is removed, and the rest of the paragraph stays.
   - Example: `{?gpa} GPA {gpa}`, `{?skills} {skills}`

Special case: Skills
--------------------
We don't render each skill category separately. Instead, the backend builds a
single multiline string `skills`, for example:

    Languages: Python, C++, JavaScript
    Frameworks: Django, React
    Tools: Excel, PowerBI

Template usage:

    {?skills}
    {skills}

If `skills` is empty in the render context, the whole Skills block disappears.
"""

import os
import re
import logging
from typing import Dict, List, Optional

from docx import Document
from docx.shared import Pt, RGBColor

from ..formatter.formatters import format_date, clean_text_for_docx

logger = logging.getLogger(__name__)


# ========= PUBLIC ENTRY POINT =========

def build_docx(user, template_path: str) -> Document:
    """
    Build DOCX resume from template and user data.

    Args:
        user: User model instance with .experiences, .projects, .skills, .education, .contact
        template_path: Path to .docx template

    Returns:
        python-docx Document
    """
    template_exists = os.path.exists(template_path)
    logger.info(f"[DOCX BUILDER] template_exists={template_exists}, path={template_path}")

    if template_exists:
        doc = Document(template_path)
    else:
        doc = Document()
        _apply_minimal_defaults(doc)

    # ---------- 1. Simple text placeholders ----------
    contact = getattr(user, "contact", None)
    email = getattr(contact, "email", None) or getattr(user, "email", "")
    phone = getattr(contact, "phone", None)
    github = getattr(contact, "github", None)
    linkedin = getattr(contact, "linkedin", None)
    portfolio = getattr(contact, "portfolio", None)

    replace_map: Dict[str, str] = {
        "{NAME}": user.name or "",
        "{EMAIL}": email or "",
        "{PHONE}": phone or "",
        "{GITHUB}": github or "",
        "{LINKEDIN}": linkedin or "",
        "{PORTFOLIO}": portfolio or "",
    }
    _replace_simple_placeholders(doc, replace_map)

    # ---------- 2. Section placeholders ----------
    experiences = list(getattr(user, "experiences", []) or [])
    projects = list(getattr(user, "projects", []) or [])
    skills = list(getattr(user, "skills", []) or [])
    education = list(getattr(user, "education", []) or [])

    logger.info(
        f"[DOCX BUILDER] counts -> "
        f"exp={len(experiences)}, proj={len(projects)}, skills={len(skills)}, edu={len(education)}"
    )

    # find placeholders
    exp_para = _find_placeholder_paragraph(doc, "{EXPERIENCES_SECTION}") \
        or _find_placeholder_paragraph(doc, "{EXPERIENCE_SECTION}")
    proj_para = _find_placeholder_paragraph(doc, "{PROJECTS_SECTION}") \
        or _find_placeholder_paragraph(doc, "{PROJECTS}")
    skills_para = _find_placeholder_paragraph(doc, "{SKILLS_SECTION}") \
        or _find_placeholder_paragraph(doc, "{SKILLS}")
    edu_para = _find_placeholder_paragraph(doc, "{EDUCATION_SECTION}") \
        or _find_placeholder_paragraph(doc, "{EDUCATION}")

    # replace / insert in place
    if exp_para and experiences:
        _replace_paragraph_with_experience_section(doc, exp_para, experiences)
    if proj_para and projects:
        _replace_paragraph_with_projects_section(doc, proj_para, projects)
    if skills_para and skills:
        _replace_paragraph_with_skills_section(doc, skills_para, skills)
    if edu_para and education:
        _replace_paragraph_with_education_section(doc, edu_para, education)

    # ---------- 3. Fallback: append sections if template has no placeholder ----------
    if experiences and not exp_para:
        _append_experience_section(doc, experiences)

    if projects and not proj_para:
        _append_projects_section(doc, projects)

    if skills and not skills_para:
        _append_skills_section(doc, skills)

    if education and not edu_para:
        _append_education_section(doc, education)

    return doc


# ========= BASIC TEMPLATE SUPPORT =========

def _apply_minimal_defaults(doc: Document) -> None:
    """Only used when no template is present."""
    for section in doc.sections:
        section.top_margin = Pt(36)
        section.bottom_margin = Pt(36)
        section.left_margin = Pt(36)
        section.right_margin = Pt(36)

    style = doc.styles["Normal"]
    style.font.size = Pt(11)
    style.font.color.rgb = RGBColor(0, 0, 0)


def _replace_simple_placeholders(doc: Document, replace_map: Dict[str, str]) -> None:
    """
    Replace {NAME}, {EMAIL}, etc. in both paragraphs and table cells.
    Preserves existing formatting of the first run in each paragraph.
    """
    def _replace_in_paragraph(paragraph):
        full_text = "".join(run.text for run in paragraph.runs) if paragraph.runs else paragraph.text
        if not full_text:
            return

        new_text = full_text
        changed = False
        for key, value in replace_map.items():
            if key in new_text:
                new_text = new_text.replace(key, value or "")
                changed = True

        if not changed:
            return

        # preserve formatting of first run
        first_run_fmt = None
        if paragraph.runs:
            fr = paragraph.runs[0]
            first_run_fmt = {
                "size": fr.font.size,
                "bold": fr.font.bold,
                "italic": fr.font.italic,
                "color": fr.font.color.rgb if fr.font.color else None,
            }

        paragraph.clear()
        run = paragraph.add_run(new_text)
        if first_run_fmt:
            if first_run_fmt["size"]:
                run.font.size = first_run_fmt["size"]
            run.font.bold = first_run_fmt["bold"]
            run.font.italic = first_run_fmt["italic"]
            if first_run_fmt["color"]:
                run.font.color.rgb = first_run_fmt["color"]

    # paragraphs
    for para in doc.paragraphs:
        _replace_in_paragraph(para)

    # tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    _replace_in_paragraph(para)


def _find_placeholder_paragraph(doc: Document, placeholder: str):
    """Return the paragraph object whose text contains the placeholder, else None."""
    # paragraphs
    for para in doc.paragraphs:
        text = "".join(run.text for run in para.runs) if para.runs else para.text
        if placeholder in text:
            logger.debug(f"Found placeholder {placeholder} in paragraph: '{text.strip()}'")
            return para

    # tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    text = "".join(run.text for run in para.runs) if para.runs else para.text
                    if placeholder in text:
                        logger.debug(f"Found placeholder {placeholder} in table cell.")
                        return para

    return None


def _replace_paragraph_with_lines(doc: Document, placeholder_para, lines: List[str]) -> None:
    """
    Replace a single placeholder paragraph with one paragraph per line,
    inserted in the same position. Paragraph style is copied from the placeholder.
    """
    if placeholder_para is None:
        return

    parent = placeholder_para._element.getparent()
    if parent is None:
        return

    style = placeholder_para.style

    # We'll insert new paragraphs *after* the placeholder, then remove the placeholder.
    anchor = placeholder_para._element
    for line in lines:
        para = doc.add_paragraph(line)
        para.style = style
        anchor.addnext(para._element)
        anchor = para._element  # next insertion goes after the one we just added

    # remove placeholder element
    parent.remove(placeholder_para._element)


# ========= SECTION BUILDERS (TEXT → LINES) =========

def _experience_lines(experiences) -> List[str]:
    lines: List[str] = []
    for exp in experiences:
        # Header line: "Title, Company (Date Range)"
        title_parts = []
        if getattr(exp, "title", None):
            title_parts.append(exp.title)
        if getattr(exp, "company", None):
            title_parts.append(exp.company)

        start = format_date(getattr(exp, "start_date", None)) if getattr(exp, "start_date", None) else ""
        end = format_date(getattr(exp, "end_date", None)) if getattr(exp, "end_date", None) else ""
        if not end and getattr(exp, "current", False):
            end = "Present"
        date_range = ""
        if start and end:
            date_range = f"{start} – {end}"
        elif start or end:
            date_range = start or end

        header = ", ".join(title_parts) if title_parts else "Experience"
        if date_range:
            header += f" ({date_range})"
        lines.append(header)

        # description bullets
        desc = getattr(exp, "description", "") or ""
        if desc:
            cleaned = clean_text_for_docx(desc)
            for raw_line in cleaned.split("\n"):
                line = raw_line.strip()
                if not line:
                    continue
                # strip any existing bullet chars to avoid '• •'
                line = re.sub(r'^[\s•\-\*]+', '', line).strip()
                lines.append(f"• {line}")

        # blank line between jobs
        lines.append("")
    return [ln for ln in lines if ln != "" or len(lines) == 1]  # keep single blank if only one


def _project_lines(projects) -> List[str]:
    lines: List[str] = []
    for proj in projects:
        header_parts = []
        if getattr(proj, "title", None):
            header_parts.append(proj.title)
        if getattr(proj, "url", None):
            header_parts.append(f"({proj.url})")
        header = " ".join(header_parts) if header_parts else "Project"
        lines.append(header)

        desc = getattr(proj, "description", "") or ""
        if desc:
            cleaned = clean_text_for_docx(desc)
            for raw_line in cleaned.split("\n"):
                line = raw_line.strip()
                if not line:
                    continue
                line = re.sub(r'^[\s•\-\*]+', '', line).strip()
                lines.append(f"• {line}")

        tech_stack = getattr(proj, "tech_stack", None)
        if tech_stack:
            if isinstance(tech_stack, list):
                tech_text = ", ".join(tech_stack)
            else:
                tech_text = str(tech_stack)
            lines.append(f"Tech Stack: {tech_text}")

        lines.append("")
    return [ln for ln in lines if ln != "" or len(lines) == 1]


def _skills_lines(skills) -> List[str]:
    names = [s.name for s in skills if getattr(s, "name", None)]
    if not names:
        return []
    return [", ".join(names)]


def _education_lines(education_list) -> List[str]:
    lines: List[str] = []
    for edu in education_list:
        school_text = getattr(edu, "school", "") or ""
        gpa = getattr(edu, "gpa", None)
        if gpa:
            school_text += f" (GPA {gpa})"

        start = format_date(getattr(edu, "start_date", None)) if getattr(edu, "start_date", None) else ""
        end = format_date(getattr(edu, "end_date", None)) if getattr(edu, "end_date", None) else ""
        if not end and getattr(edu, "current", False):
            end = "Present"

        date_range = ""
        if start and end:
            date_range = f"{start} – {end}"
        elif start or end:
            date_range = start or end

        header = school_text or "Education"
        if date_range:
            header += f"\t{date_range}"
        lines.append(header)

        # degree / field / location
        degree_parts = []
        if getattr(edu, "degree", None):
            degree_parts.append(edu.degree)
        if getattr(edu, "field", None):
            degree_parts.append(edu.field)
        degree_line = " ".join(degree_parts)
        location = getattr(edu, "location", None)
        if location:
            if degree_line:
                degree_line += f"\t{location}"
            else:
                degree_line = location
        if degree_line:
            lines.append(degree_line)

        if getattr(edu, "honors_awards", None):
            lines.append(f"Honors & Awards: {edu.honors_awards}")
        if getattr(edu, "clubs_extracurriculars", None):
            lines.append(f"Clubs & Extracurriculars: {edu.clubs_extracurriculars}")
        if getattr(edu, "relevant_coursework", None):
            lines.append(f"Relevant Coursework: {edu.relevant_coursework}")

        lines.append("")
    return [ln for ln in lines if ln != "" or len(lines) == 1]


# ========= IN-PLACE REPLACERS =========

def _replace_paragraph_with_experience_section(doc: Document, placeholder_para, experiences) -> None:
    lines = _experience_lines(experiences)
    _replace_paragraph_with_lines(doc, placeholder_para, lines)


def _replace_paragraph_with_projects_section(doc: Document, placeholder_para, projects) -> None:
    lines = _project_lines(projects)
    _replace_paragraph_with_lines(doc, placeholder_para, lines)


def _replace_paragraph_with_skills_section(doc: Document, placeholder_para, skills) -> None:
    lines = _skills_lines(skills)
    _replace_paragraph_with_lines(doc, placeholder_para, lines)


def _replace_paragraph_with_education_section(doc: Document, placeholder_para, education_list) -> None:
    lines = _education_lines(education_list)
    _replace_paragraph_with_lines(doc, placeholder_para, lines)


# ========= FALLBACK APPENDERS (NO PLACEHOLDER IN TEMPLATE) =========

def _append_experience_section(doc: Document, experiences) -> None:
    if not experiences:
        return
    doc.add_paragraph("")  # spacing
    heading = doc.add_paragraph("Experience")
    if heading.runs:
        heading.runs[0].font.bold = True
        heading.runs[0].font.size = Pt(14)
    for line in _experience_lines(experiences):
        if line.startswith("• "):
            para = doc.add_paragraph()
            para.add_run(line)
        else:
            doc.add_paragraph(line)


def _append_projects_section(doc: Document, projects) -> None:
    if not projects:
        return
    doc.add_paragraph("")
    heading = doc.add_paragraph("Projects")
    if heading.runs:
        heading.runs[0].font.bold = True
        heading.runs[0].font.size = Pt(14)
    for line in _project_lines(projects):
        doc.add_paragraph(line)


def _append_skills_section(doc: Document, skills) -> None:
    if not skills:
        return
    doc.add_paragraph("")
    heading = doc.add_paragraph("Skills")
    if heading.runs:
        heading.runs[0].font.bold = True
        heading.runs[0].font.size = Pt(14)
    for line in _skills_lines(skills):
        doc.add_paragraph(line)


def _append_education_section(doc: Document, education_list) -> None:
    if not education_list:
        return
    doc.add_paragraph("")
    heading = doc.add_paragraph("Education")
    if heading.runs:
        heading.runs[0].font.bold = True
        heading.runs[0].font.size = Pt(14)
    for line in _education_lines(education_list):
        doc.add_paragraph(line)
