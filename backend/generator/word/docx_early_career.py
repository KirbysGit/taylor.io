# Early-career layout: education and projects are promoted above experience.

from __future__ import annotations

from io import BytesIO

from docx import Document
from docx.shared import Inches

from ..layouts.early_career import early_career_body_order
from .docx_header import _add_header
from .docx_sections import (
    _render_docx_education_section,
    _render_docx_experience_section,
    _render_docx_projects_section,
    _render_docx_skills_section,
    _render_docx_summary_section,
)


def build_docx_early_career_document(resumeData, style, stylePreferences=None, templateSlug="early-career", docxMaxPages=None):
    # Initialize Docx.
    doc = Document()

    # Set page margins from the active template tokens.
    sect = doc.sections[0]
    sect.top_margin = Inches(style.margin_top_in)
    sect.bottom_margin = Inches(style.margin_bottom_in)
    sect.left_margin = Inches(style.margin_left_in)
    sect.right_margin = Inches(style.margin_right_in)

    # Add header first; early-career templates keep the normal header controls.
    _add_header(doc, resumeData, style, stylePreferences)

    sectionLabels = resumeData.get("sectionLabels", {})
    defaults = {
        "summary": "Professional Summary",
        "education": "Education",
        "experience": "Experience",
        "projects": "Projects",
        "skills": "Skills",
    }
    indent = style.section_content_indent_pt

    # Education and projects come before experience for internships, students, and entry-level resumes.
    for sectionKey in early_career_body_order(resumeData):
        if sectionKey == "summary":
            _render_docx_summary_section(doc, resumeData, style, indent, sectionLabels, defaults)
        elif sectionKey == "education":
            _render_docx_education_section(doc, resumeData, style, indent, sectionLabels, defaults)
        elif sectionKey == "projects":
            _render_docx_projects_section(doc, resumeData, style, indent, sectionLabels, defaults)
        elif sectionKey == "experience":
            _render_docx_experience_section(doc, resumeData, style, indent, sectionLabels, defaults)
        elif sectionKey == "skills":
            _render_docx_skills_section(doc, resumeData, style, indent, sectionLabels, defaults)

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()
