# pipeline.py

import logging
import re
from typing import Dict

from .Aextractor import extract_pdf, extract_docx
from .Csegmenter import split_into_sections
from .Eparsers import (
    parse_contact,
    parse_education,
    parse_experience,
    parse_skills,
    parse_projects
)

logger = logging.getLogger(__name__)


def minimal_clean(text: str) -> str:
    """
    Minimal text cleaning that preserves dashes, casing, and spacing.
    Only normalizes bullets and removes excessive newlines.
    """
    # Normalize bullet characters to consistent format (•)
    text = re.sub(r'^[\s]*[-*•∙▪▫]\s*', '• ', text, flags=re.MULTILINE)
    
    # Remove excessive newlines (3+ → 2)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()


def parse_resume_file(file_bytes: bytes, filename: str) -> Dict:
    """
    Simplified Resume Parsing Pipeline:
        1. Extract text
        2. Minimal clean (bullets + newlines only)
        3. Section segmentation (keyword-based)
        4. Parse each section
    """

    result = {
        "contact_info": {},
        "education": [],
        "experiences": [],
        "skills": [],
        "projects": [],
        "warnings": []
    }

    try:
        # -------------------------
        # 1. Extract raw text
        # -------------------------
        if filename.lower().endswith(".pdf"):
            raw_text = extract_pdf(file_bytes)
        elif filename.lower().endswith(".docx"):
            raw_text = extract_docx(file_bytes)
        else:
            raise ValueError("Unsupported file type (PDF/DOCX only)")

        # DEBUG: Write pre-pipeline text
        try:
            with open("debug_pre_pipeline.txt", "w", encoding="utf-8") as f:
                f.write("=== PRE-PIPELINE (RAW EXTRACTED TEXT) ===\n\n")
                f.write(raw_text)
        except Exception:
            pass

        # -------------------------
        # 2. Minimal clean (bullets + newlines only)
        # -------------------------
        text = minimal_clean(raw_text)
        
        # DEBUG: Write after minimal cleaning
        try:
            with open("debug_after_minimal_clean.txt", "w", encoding="utf-8") as f:
                f.write("=== AFTER MINIMAL_CLEAN ===\n\n")
                f.write(text)
        except Exception:
            pass

        # -------------------------
        # 3. Split into sections (keyword-based)
        # -------------------------
        sections = split_into_sections(text)

        # -------------------------
        # 4. Parse contact (use full text, pass sections to exclude project/experience URLs)
        # -------------------------
        result["contact_info"] = parse_contact(text, sections=sections)

        # -------------------------
        # 5. Parse structured sections
        # -------------------------
        result["education"] = parse_education(sections.get("education", ""))
        result["experiences"] = parse_experience(sections.get("experience", ""))
        result["skills"] = parse_skills(sections.get("skills", ""))
        result["projects"] = parse_projects(sections.get("projects", ""))

    except Exception as e:
        logger.error(f"Error parsing resume: {e}")
        result["warnings"].append(f"Pipeline failed: {str(e)}")

    return result
