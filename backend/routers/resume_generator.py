# routers/resume.py

# resume generation routes.

# imports.
from fastapi import APIRouter

# create router.
router = APIRouter(prefix="/api/resume/generator", tags=["generator"])

from .generator.pipeline import generate_resume

# ------------------- routes -------------------

# generate resume preview.
@router.post("/preview")
async def generate_resume_preview(payload: dict):

    template = payload.get("template")
    resume_data = payload.get("resume_data")

    document = generate_resume(template, resume_data)

    print(f"Generating resume preview for template: {template}")
    print(f"Resume data: {resume_data}")

    return {"message": "Resume preview generated successfully"}

