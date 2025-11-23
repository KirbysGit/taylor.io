# generator.py

# Public interface for resume generation - used by FastAPI routes.

# imports.
from io import BytesIO
import os
from models import User
from .builder.docx_builder import build_docx


def generate_resume_docx(user: User, template: str = "modern") -> bytes:
    """
    Generate a DOCX resume for a user.
    
    Args:
        user: User model instance with all relationships loaded
        template: Template name (default: "modern")
                 Looks for templates in resume_generator/templates/{template}.docx
    
    Returns:
        bytes: Raw .docx file bytes ready for download
    """
    # construct template path.
    template_dir = os.path.join(os.path.dirname(__file__), "templates")
    template_path = os.path.join(template_dir, f"{template}.docx")
    
    # build the document.
    doc = build_docx(user, template_path)
    
    # save to bytes buffer.
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return buffer.getvalue()

