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

from generator.pipeline import generate_resume, generate_pdf

# ------------------- routes -------------------

# generate resume preview.
@router.post("/preview")
async def generate_resume_preview(payload: dict):

    # grab template and resume data from payload.
    template = payload.get("template")
    resume_data = payload.get("resume_data")

    # generate resume.
    html_content = generate_resume(template, resume_data)

    # return response with html content.
    return Response(content=html_content, media_type="text/html")

# generate resume PDF.
@router.post("/pdf")
async def generate_resume_pdf(payload: dict):

    # grab template and resume data from payload.
    template = payload.get("template")
    resume_data = payload.get("resume_data")

    # generate resume.
    pdf_content = await generate_pdf(template, resume_data)

    # return response with pdf content.
    return Response(content=pdf_content, media_type="application/pdf")

