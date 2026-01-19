# generator / templates.py

import os
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api/templates", tags=["templates"])

# get abs path to templates directory.
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

@router.get("/list")
# list all of templates in TEMPLATES_DIR if .docx files.
async def list_templates():
    templates = []

    if not TEMPLATES_DIR.exists():
        return {"templates": []}

    templates = [item.stem for item in TEMPLATES_DIR.iterdir() if item.is_file() and item.suffix == ".docx"]

    return {"templates": sorted(templates)}