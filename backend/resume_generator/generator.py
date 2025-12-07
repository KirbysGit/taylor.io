# generator.py

# main generator for resume, it has endpoints for listing the templates and 

# imports.
from io import BytesIO
import os
from models import User
from .builder import build_docx


def list_available_templates() -> list[str]:
    """
    List all available template names (without .docx extension).
    
    Returns:
        list[str]: List of template names (e.g., ['main', 'modern', 'classic'])
    """
    template_dir = os.path.join(os.path.dirname(__file__), "templates")
    templates = []
    
    if os.path.exists(template_dir):
        for filename in os.listdir(template_dir):
            # only include .docx files, ignore temp files
            if filename.endswith('.docx') and not filename.startswith('~$'):
                # remove .docx extension
                template_name = filename[:-5]
                templates.append(template_name)
    
    return sorted(templates)


def generate_resume_docx(
    user: User,
    template: str = "main",
    overrides: dict | None = None,
    margin_overrides: dict | None = None,
    header_line: str | None = None,
    header_alignment: str | None = None,
    font_family: str | None = None,
) -> bytes:
    """
    Generate DOCX resume from user data and template.
    
    Args:
        user: User model instance with all relationships loaded
        template: Template name (default: "main")
                 Looks for templates in resume_generator/templates/{template}.docx
    
    Returns:
        bytes: Raw .docx file bytes ready for download
    """
    # construct template path.
    template_dir = os.path.join(os.path.dirname(__file__), "templates")
    template_path = os.path.join(template_dir, f"{template}.docx")
    
    # build the document.
    doc = build_docx(
        user,
        template_path,
        overrides=overrides,
        margin_overrides=margin_overrides,
        header_line=header_line,
        header_alignment=header_alignment,
        font_family=font_family,
    )
    
    # save to bytes buffer.
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return buffer.getvalue()


# export all generators for use in routes.
__all__ = [
    "generate_resume_docx",
    "list_available_templates"
]
