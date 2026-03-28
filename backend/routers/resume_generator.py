# routers/resume.py

# resume generation routes.

# planning out how we want to generate a resume especially w/ diff templates and file type.

# idea right now is to move our generation from the word doc placeholder set up to 
# using html templates, which then allows us to map to pdf way easier, and allows
# for more flexibility with docx as we move forward as its already a more visual 
# language.

# imports.
from fastapi import APIRouter, Response

# create router.
router = APIRouter(prefix="/api/resume/generator", tags=["generator"])

from generator.pipeline import generate_resume, generate_pdf, generate_docx

# ------------------- routes -------------------

def _style_from_payload(payload: dict) -> dict:
    """User style preferences: marginPreset, lineSpacingPreset, etc."""
    raw = payload.get("style")
    return raw if isinstance(raw, dict) else {}


# generate resume preview.
@router.post("/preview")
async def generate_resume_preview(payload: dict):

    # grab template and resume data from payload.
    template = payload.get("template")
    resume_data = payload.get("resume_data")
    style = _style_from_payload(payload)

    # generate resume.
    html_content = generate_resume(template, resume_data, style)

    # return response with html content.
    return Response(content=html_content, media_type="text/html")

# generate resume PDF.
@router.post("/pdf")
async def generate_resume_pdf(payload: dict):

    # grab template and resume data from payload.
    template = payload.get("template")
    resume_data = payload.get("resume_data")
    style = _style_from_payload(payload)

    # generate resume.
    pdf_content = await generate_pdf(template, resume_data, style)

    # return response with pdf content.
    return Response(content=pdf_content, media_type="application/pdf")


# generate resume Word document.
@router.post("/docx")
async def generate_resume_docx(payload: dict):

    # grab template and resume data from payload (template reserved for future styling).
    template = payload.get("template")
    resume_data = payload.get("resume_data")
    style = _style_from_payload(payload)

    docx_content = generate_docx(template or "classic", resume_data, style)

    # return response with docx content.
    return Response(
        content=docx_content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

