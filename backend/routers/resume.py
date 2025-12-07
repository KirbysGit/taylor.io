# routers/resume.py

# resume generation routes.

# current:
# - generate_resume_docx           -      generates a DOCX resume for the current user.
# - generate_resume_pdf_from_docx -      generates a PDF from DOCX template (for preview).
# - list_templates                 -      lists available templates.

# imports.
from io import BytesIO
from datetime import datetime
from typing import Optional
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
    template: str = "main",
    name: Optional[str] = None,
    email: Optional[str] = None,
    github: Optional[str] = None,
    linkedin: Optional[str] = None,
    portfolio: Optional[str] = None,
    phone: Optional[str] = None,
    location: Optional[str] = None,
    margin_top: Optional[float] = None,
    margin_bottom: Optional[float] = None,
    margin_left: Optional[float] = None,
    margin_right: Optional[float] = None,
    header_order: Optional[str] = None,  # comma-separated keys
    header_align: Optional[str] = None,  # left | center | right
    font_family: Optional[str] = None,
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
        
        overrides = {
            k: v
            for k, v in {
                "name": name,
                "email": email,
                "github": github,
                "linkedin": linkedin,
                "portfolio": portfolio,
                "phone": phone,
                "location": location,
                "font_family": font_family,
            }.items()
            if v is not None
        }

        margin_overrides = {
            k: v
            for k, v in {
                "margin_top": margin_top,
                "margin_bottom": margin_bottom,
                "margin_left": margin_left,
                "margin_right": margin_right,
            }.items()
            if v is not None
        }

        # build header_line if header_order provided
        header_line = None
        if header_order:
            order_list = [item.strip() for item in header_order.split(",") if item.strip()]

            def _get_val(key: str):
                k = key.lower()
                if k == "name":
                    return overrides.get("name", getattr(user, "name", "")) if overrides else getattr(user, "name", "")
                if k == "email":
                    val = overrides.get("email", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "email", None) or getattr(user, "email", "")
                    return val
                if k == "github":
                    val = overrides.get("github", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "github", None)
                    return val
                if k == "linkedin":
                    val = overrides.get("linkedin", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "linkedin", None)
                    return val
                if k == "portfolio":
                    val = overrides.get("portfolio", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "portfolio", None)
                    return val
                if k in {"phone", "phone_number"}:
                    val = overrides.get("phone", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "phone", None)
                    return val
                if k == "location":
                    val = overrides.get("location", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "location", None) or getattr(user, "location", None)
                    return val
                return None

            values = []
            for key in order_list:
                val = _get_val(key)
                if val:
                    values.append(val)
            header_line = " | ".join(values)

        # generate DOCX resume.
        docx_bytes = generate_resume_docx(
            user,
            template=template,
            overrides=overrides or None,
            margin_overrides=margin_overrides or None,
            header_line=header_line,
            header_alignment=header_align,
            font_family=font_family,
        )
        
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
    preview: bool = False,
    name: Optional[str] = None,
    email: Optional[str] = None,
    github: Optional[str] = None,
    linkedin: Optional[str] = None,
    portfolio: Optional[str] = None,
    phone: Optional[str] = None,
    location: Optional[str] = None,
    margin_top: Optional[float] = None,
    margin_bottom: Optional[float] = None,
    margin_left: Optional[float] = None,
    margin_right: Optional[float] = None,
    header_order: Optional[str] = None,  # comma-separated keys
    header_align: Optional[str] = None,  # left | center | right
    font_family: Optional[str] = None,
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
        
        overrides = {
            k: v
            for k, v in {
                "name": name,
                "email": email,
                "github": github,
                "linkedin": linkedin,
                "portfolio": portfolio,
                "phone": phone,
                "location": location,
                "font_family": font_family,
            }.items()
            if v is not None
        }

        margin_overrides = {
            k: v
            for k, v in {
                "margin_top": margin_top,
                "margin_bottom": margin_bottom,
                "margin_left": margin_left,
                "margin_right": margin_right,
            }.items()
            if v is not None
        }

        # build header_line if header_order provided
        header_line = None
        if header_order:
            order_list = [item.strip() for item in header_order.split(",") if item.strip()]

            def _get_val(key: str):
                k = key.lower()
                if k == "name":
                    return overrides.get("name", getattr(user, "name", "")) if overrides else getattr(user, "name", "")
                if k == "email":
                    val = overrides.get("email", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "email", None) or getattr(user, "email", "")
                    return val
                if k == "github":
                    val = overrides.get("github", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "github", None)
                    return val
                if k == "linkedin":
                    val = overrides.get("linkedin", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "linkedin", None)
                    return val
                if k == "portfolio":
                    val = overrides.get("portfolio", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "portfolio", None)
                    return val
                if k in {"phone", "phone_number"}:
                    val = overrides.get("phone", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "phone", None)
                    return val
                if k == "location":
                    val = overrides.get("location", None) if overrides else None
                    if val is None:
                        contact = getattr(user, "contact", None)
                        val = getattr(contact, "location", None) or getattr(user, "location", None)
                    return val
                return None

            values = []
            for key in order_list:
                val = _get_val(key)
                if val:
                    values.append(val)
            header_line = " | ".join(values)
        
        # generate PDF from DOCX template.
        pdf_bytes = generate_resume_pdf_from_docx(
            user,
            template=template,
            overrides=overrides or None,
            margin_overrides=margin_overrides or None,
            header_line=header_line,
            header_alignment=header_align,
            font_family=font_family,
        )
        
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

