# routers/resume.py

# resume generation routes.

# current:
# - generate_resume_docx           -      generates a DOCX resume for the current user.
# - generate_resume_pdf_from_docx -      generates a PDF from DOCX template (for preview).
# - list_templates                 -      lists available templates.

# imports.
from io import BytesIO
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, status

# local imports.
from models import User
from database import get_db
from .auth import get_current_user_from_token
from resume_generator import (
    generate_resume_docx,
    generate_resume_pdf_from_docx,
    list_available_templates
)

# create router.
router = APIRouter(prefix="/api/resume", tags=["resume"])

# ------------------- routes -------------------

# list available templates.
@router.get("/templates")
async def list_templates():
    """List all available resume templates."""
    try:
        templates = list_available_templates()
        return {"templates": templates}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing templates: {str(e)}"
        )


# generate resume as DOCX.
@router.get("/docx")
async def generate_resume_docx_endpoint(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    template: str = "main"
):
    # generate a DOCX resume for the current user.
    try:
        # load user with all relationships.
        user = db.query(User).options(
            joinedload(User.experiences),
            joinedload(User.projects),
            joinedload(User.skills),
            joinedload(User.education),
            joinedload(User.contact)
        ).filter(User.id == current_user.id).first()
        
        # generate DOCX resume.
        docx_bytes = generate_resume_docx(user, template=template)
        
        # clean filename - remove special characters and ensure .docx extension.
        safe_name = "".join(c for c in current_user.name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_name = safe_name.replace(' ', '_')
        filename = f"{safe_name}_Resume.docx"
        
        # return the DOCX as a response.
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"; filename*=UTF-8\'\'{filename}'
            }
        )
    except Exception as e:
        # if an error occurs, raise an error.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating resume: {str(e)}"
        )


# generate PDF from DOCX template (for preview/download).
@router.get("/pdf")
async def generate_resume_pdf(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    template: str = "main",
    preview: bool = False
):
    """Generate PDF from DOCX template (same styling as Word doc)."""
    try:
        # load user with all relationships.
        user = db.query(User).options(
            joinedload(User.experiences),
            joinedload(User.projects),
            joinedload(User.skills),
            joinedload(User.education),
            joinedload(User.contact)
        ).filter(User.id == current_user.id).first()
        
        # generate PDF from DOCX template.
        pdf_bytes = generate_resume_pdf_from_docx(user, template=template)
        
        # clean filename.
        safe_name = "".join(c for c in current_user.name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_name = safe_name.replace(' ', '_')
        filename = f"{safe_name}_Resume.pdf"
        
        # determine content disposition.
        disposition = "inline" if preview else "attachment"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'{disposition}; filename="{filename}"; filename*=UTF-8\'\'{filename}'
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating PDF: {str(e)}"
        )

