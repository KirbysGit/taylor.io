from typing import Dict, Optional

from docx import Document

from ..context import ResumeRenderContext, build_resume_render_context
from .common import (
    apply_margins,
    detect_header_paragraphs,
    apply_alignment_to_paragraphs,
    apply_font_family,
)
from .header import render_header
from .education import render_education
from .experience import render_experience
from .projects import render_projects
from .skills import render_skills


def build_docx(
    user,
    template_path: str,
    overrides: Optional[Dict[str, str]] = None,
    margin_overrides: Optional[Dict[str, float]] = None,
    header_line: Optional[str] = None,
    header_alignment: Optional[str] = None,
    font_family: Optional[str] = None,
) -> Document:
    doc = Document(template_path)

    apply_margins(doc, margin_overrides)

    ctx: ResumeRenderContext = build_resume_render_context(user)

    if overrides:
        for key, value in overrides.items():
            if hasattr(ctx, key):
                setattr(ctx, key, value)

    if header_line is not None:
        ctx.header_line = header_line

    header_paragraphs = detect_header_paragraphs(doc)

    render_header(doc, ctx)

    # future sections (currently stubs)
    render_education(doc, ctx)
    render_experience(doc, ctx)
    render_projects(doc, ctx)
    render_skills(doc, ctx)

    if font_family:
        apply_font_family(doc, font_family)

    if header_alignment:
        apply_alignment_to_paragraphs(header_paragraphs, header_alignment)

    return doc


__all__ = ["build_docx"]

