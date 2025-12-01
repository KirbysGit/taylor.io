# resume_generator/__init__.py

# Main export for resume generator package.
from .generator import (
    generate_resume_docx,
    list_available_templates
)
from .pdf_generator import generate_resume_pdf_from_docx

__all__ = [
    "generate_resume_docx",
    "generate_resume_pdf_from_docx",
    "list_available_templates"
]

