# generator.py

# main generator for resume, it has endpoints for listing the templates and 

# list_available_templates -> lists all of the templates in that directory.
# generate_resume_docx -> generates a DOCX resume from the user data and template.

# imports.
import os
from io import BytesIO

# local imports.
from models import User
from .builder import build_docx

def list_available_templates() -> list[str]:
    # grabs template directory.
    template_dir = os.path.join(os.path.dirname(__file__), "templates")

    # initialize empty list for templates.
    templates = []
    
    # if template directory exists, list all files in it.
    if os.path.exists(template_dir):
        # list all files in template directory.
        for filename in os.listdir(template_dir):
            # only include .docx files.
            if filename.endswith('.docx') and not filename.startswith('~$'):
                # remove .docx extension.
                template_name = filename[:-5]
                templates.append(template_name)
    
    # return sorted list of templates.
    return sorted(templates)


def generate_resume_docx(user: User, template: str = "main", overrides: dict | None = None, margin_overrides: dict | None = None, header_line: str | None = None, header_alignment: str | None = None, font_family: str | None = None) -> bytes:

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
    
    # save to bytes buffer and return.
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    # return the bytes buffer.
    return buffer.getvalue()


# export all generators for use in routes.
__all__ = [
    "generate_resume_docx",
    "list_available_templates"
]
