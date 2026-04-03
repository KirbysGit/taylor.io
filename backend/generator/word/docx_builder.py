# Main Word Docx Builder.

from __future__ import annotations

from io import BytesIO
from typing import Any, Dict

from docx import Document
from docx.shared import Inches

from ..layouts.registry import (
    LAYOUT_SIDEBAR_SPLIT,
    load_layout_profile,
    resolve_docx_max_pages,
)
from ..shared.styles import get_styles
from ..shared.template_slug import normalize_template_slug
from .docx_header import _add_header
from .docx_sections import (
    _normalize_docx_section_order,
    _render_docx_education_section,
    _render_docx_experience_section,
    _render_docx_projects_section,
    _render_docx_skills_section,
    _render_docx_summary_section,
)
from .docx_sidebar_split import _build_docx_sidebar_split_document


# Main Docx Orchestration Function.
def build_docx(resume_data: Dict[str, Any], template_name: str = "classic", style_preferences: dict | None = None) -> bytes:
    
    # Normalize template name.
    name = normalize_template_slug(template_name)

    # Get styles.
    style = get_styles(name, style_preferences)

    # Check if other layout.
    if load_layout_profile(name) == LAYOUT_SIDEBAR_SPLIT:
        return _build_docx_sidebar_split_document(
            resume_data,
            style,
            style_preferences,
            template_slug=name,
            docx_max_pages=resolve_docx_max_pages(name, resume_data),
        )

    # Initialize Docx.
    doc = Document()

    # Set page margins (match .resume padding).
    sect = doc.sections[0]
    sect.top_margin = Inches(style.margin_top_in)
    sect.bottom_margin = Inches(style.margin_bottom_in)
    sect.left_margin = Inches(style.margin_left_in)
    sect.right_margin = Inches(style.margin_right_in)

    # Add header (always first).
    _add_header(doc, resume_data, style, style_preferences)

    # Get section labels.
    section_labels = resume_data.get("sectionLabels", {})

    # Get default section labels.
    defaults = {
        "summary": "Professional Summary",
        "education": "Education",
        "experience": "Experience",
        "projects": "Projects",
        "skills": "Skills",
    }

    # Get section content indent.
    indent = style.section_content_indent_pt

    # Get section order.
    section_order = _normalize_docx_section_order(resume_data.get("sectionOrder"))

    # Get renderers.
    renderers = {
        "summary": _render_docx_summary_section,
        "education": _render_docx_education_section,
        "experience": _render_docx_experience_section,
        "projects": _render_docx_projects_section,
        "skills": _render_docx_skills_section,
    }

    # Render sections.
    for section_key in section_order:
        fn = renderers.get(section_key)
        if fn:
            fn(doc, resume_data, style, indent, section_labels, defaults)

    # Save document.
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()
