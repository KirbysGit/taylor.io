# routers/resume.py

# resume generation routes.

# current:
# - generate_resume_pdf            -      generates a PDF resume for the current user.
# - generate_resume_html_preview   -      generates an HTML resume for preview.

# imports.
from io import BytesIO
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, status

# local imports.
from models import User
from database import get_db
from .auth import get_current_user_from_token
from .resume_generator import generate_resume_html, html_to_pdf

# create router.
router = APIRouter(prefix="/api/resume", tags=["resume"])

# ------------------- routes -------------------

# generate resume as PDF.
@router.get("/pdf")
async def generate_resume_pdf(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # generate a PDF resume for the current user.
    try:
        # generate HTML resume.
        html_content = generate_resume_html(current_user)
        
        # convert HTML to PDF.
        pdf_bytes = html_to_pdf(html_content)
        
        # return PDF as response.
        # clean filename - remove special characters and ensure .pdf extension.
        safe_name = "".join(c for c in current_user.name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_name = safe_name.replace(' ', '_')
        filename = f"{safe_name}_Resume.pdf"
        
        # return the PDF as a response.
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
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


# generate resume as HTML (for preview).
@router.get("/html")
async def generate_resume_html_preview(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # generate an HTML resume for preview.
    try:
        html_content = generate_resume_html(current_user)
        
        # return the HTML as a response.
        return Response(
            content=html_content,
            media_type="text/html"
        )
    except Exception as e:
        # if an error occurs, raise an error.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating resume: {str(e)}"
        )

