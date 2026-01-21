# generator / templates.py

import os
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api/templates", tags=["templates"])

# get abs path to templates directory.
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

@router.get("/list")
# list all template folders in TEMPLATES_DIR.
async def list_templates():
    templates = []

    if not TEMPLATES_DIR.exists():
        return {"templates": []}

    templates = [item.name for item in TEMPLATES_DIR.iterdir() if item.is_dir()]

    return {"templates": sorted(templates)}