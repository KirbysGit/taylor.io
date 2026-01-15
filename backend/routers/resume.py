# routers/resume.py

# resume generation routes.

# current:
# - generate_resume_docx           -      generates a DOCX resume for the current user.
# - generate_resume_pdf_from_docx -      generates a PDF from DOCX template (for preview).
# - list_templates                 -      lists available templates.

# imports.
from io import BytesIO
from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session, joinedload
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

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

class ResumeGenerateRequest(BaseModel):
    template: str = "main"
    preview: bool = False
    overrides: Optional[Dict[str, Any]] = None


def _load_user_with_resume_relationships(db: Session, user_id: int) -> Optional[User]:
    return (
        db.query(User)
        .options(
            joinedload(User.experiences),
            joinedload(User.projects),
            joinedload(User.skills),
            joinedload(User.education),
            joinedload(User.contact),
        )
        .filter(User.id == user_id)
        .first()
    )


def _build_header_line(user: User, overrides: Optional[Dict[str, Any]], header_order: Optional[str]) -> Optional[str]:
    if not header_order:
        return None

    order_list = [item.strip() for item in header_order.split(",") if item.strip()]

    def _get_val(key: str):
        k = key.lower()
        if k == "name":
            return (overrides or {}).get("name", getattr(user, "name", ""))
        if k == "email":
            val = (overrides or {}).get("email", None)
            if val is None:
                contact = getattr(user, "contact", None)
                val = getattr(contact, "email", None) or getattr(user, "email", "")
            return val
        if k == "github":
            val = (overrides or {}).get("github", None)
            if val is None:
                contact = getattr(user, "contact", None)
                val = getattr(contact, "github", None)
            return val
        if k == "linkedin":
            val = (overrides or {}).get("linkedin", None)
            if val is None:
                contact = getattr(user, "contact", None)
                val = getattr(contact, "linkedin", None)
            return val
        if k == "portfolio":
            val = (overrides or {}).get("portfolio", None)
            if val is None:
                contact = getattr(user, "contact", None)
                val = getattr(contact, "portfolio", None)
            return val
        if k in {"phone", "phone_number"}:
            val = (overrides or {}).get("phone", None)
            if val is None:
                contact = getattr(user, "contact", None)
                val = getattr(contact, "phone", None)
            return val
        if k == "location":
            val = (overrides or {}).get("location", None)
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
    return " | ".join(values)


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
    # education overrides (single-entry templates)
    edu_name: Optional[str] = None,
    edu_degree: Optional[str] = None,
    edu_minor: Optional[str] = None,
    edu_location: Optional[str] = None,
    edu_gpa: Optional[str] = None,
    edu_date: Optional[str] = None,
    edu_honors: Optional[str] = None,
    edu_clubs: Optional[str] = None,
    edu_coursework: Optional[str] = None,
):
    # generate a DOCX resume for the current user.
    try:
        # load user with all relationships.
        user = _load_user_with_resume_relationships(db, current_user.id)
        
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
                # education (single-entry)
                "edu_name": edu_name,
                "edu_degree": edu_degree,
                "edu_minor": edu_minor,
                "edu_location": edu_location,
                "edu_gpa": edu_gpa,
                "edu_date": edu_date,
                "edu_honors": edu_honors,
                "edu_clubs": edu_clubs,
                "edu_coursework": edu_coursework,
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
        header_line = _build_header_line(user, overrides or None, header_order)

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


# generate resume as DOCX (POST body, avoids huge query strings).
@router.post("/docx")
async def generate_resume_docx_post(
    payload: ResumeGenerateRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    try:
        user = _load_user_with_resume_relationships(db, current_user.id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        overrides_in = payload.overrides or {}
        # allow either header_alignment or header_align for frontend convenience
        header_order = overrides_in.get("header_order")
        header_align = overrides_in.get("header_align", overrides_in.get("header_alignment"))
        font_family = overrides_in.get("font_family")

        # extract margins into margin_overrides if present
        margin_overrides = {}
        for k in ["margin_top", "margin_bottom", "margin_left", "margin_right"]:
            if k in overrides_in and overrides_in[k] is not None:
                margin_overrides[k] = overrides_in[k]

        header_line = _build_header_line(user, overrides_in, header_order)

        docx_bytes = generate_resume_docx(
            user,
            template=payload.template,
            overrides=overrides_in or None,
            margin_overrides=margin_overrides or None,
            header_line=header_line,
            header_alignment=header_align,
            font_family=font_family,
        )

        safe_name = "".join(c for c in current_user.name if c.isalnum() or c in (" ", "-", "_")).strip()
        safe_name = safe_name.replace(" ", "_")
        filename = f"{safe_name}_Resume.docx"

        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"; filename*=UTF-8\'\'{filename}'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating resume: {str(e)}",
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
    # education overrides (single-entry templates)
    edu_name: Optional[str] = None,
    edu_degree: Optional[str] = None,
    edu_minor: Optional[str] = None,
    edu_location: Optional[str] = None,
    edu_gpa: Optional[str] = None,
    edu_date: Optional[str] = None,
    edu_honors: Optional[str] = None,
    edu_clubs: Optional[str] = None,
    edu_coursework: Optional[str] = None,
):
    """Generate PDF from DOCX template (same styling as Word doc)."""
    try:
        # load user with all relationships.
        user = _load_user_with_resume_relationships(db, current_user.id)
        
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
                # education (single-entry)
                "edu_name": edu_name,
                "edu_degree": edu_degree,
                "edu_minor": edu_minor,
                "edu_location": edu_location,
                "edu_gpa": edu_gpa,
                "edu_date": edu_date,
                "edu_honors": edu_honors,
                "edu_clubs": edu_clubs,
                "edu_coursework": edu_coursework,
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
        header_line = _build_header_line(user, overrides or None, header_order)
        
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


# generate PDF from DOCX template (POST body, avoids huge query strings).
@router.post("/pdf")
async def generate_resume_pdf_post(
    payload: ResumeGenerateRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Generate PDF from DOCX template using JSON body instead of query params."""
    try:
        user = _load_user_with_resume_relationships(db, current_user.id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        overrides_in = payload.overrides or {}
        header_order = overrides_in.get("header_order")
        header_align = overrides_in.get("header_align", overrides_in.get("header_alignment"))
        font_family = overrides_in.get("font_family")

        margin_overrides = {}
        for k in ["margin_top", "margin_bottom", "margin_left", "margin_right"]:
            if k in overrides_in and overrides_in[k] is not None:
                margin_overrides[k] = overrides_in[k]

        header_line = _build_header_line(user, overrides_in, header_order)

        pdf_bytes = generate_resume_pdf_from_docx(
            user,
            template=payload.template,
            overrides=overrides_in or None,
            margin_overrides=margin_overrides or None,
            header_line=header_line,
            header_alignment=header_align,
            font_family=font_family,
        )

        safe_name = "".join(c for c in current_user.name if c.isalnum() or c in (" ", "-", "_")).strip()
        safe_name = safe_name.replace(" ", "_")
        filename = f"{safe_name}_Resume.pdf"

        disposition = "inline" if payload.preview else "attachment"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'{disposition}; filename="{filename}"; filename*=UTF-8\'\'{filename}'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating PDF: {str(e)}",
        )

