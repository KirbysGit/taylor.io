# pipeline.py

# resume parsing pipeline.

# imports.
import re
import logging
from typing import Dict

# import pipeline modules.
from .Aextractor import extract_pdf, extract_docx
# from .Bcleaner import clean_text_regex.py, openai_cleaner.py
from .Csegmenter import split_into_sections
# from .Dnlp import nlp_utils.py, normalizer.py, skill_matcher.py, spacy_loader.py
from .Eparsers import parse_contact, parse_education, parse_experience, parse_skills, parse_projects, parse_summary

# create logger.
logger = logging.getLogger(__name__)

def minimal_clean(text: str) -> str:
    # normalize bullet characters to consistent format (•).
    text = re.sub(r'^[\s]*[-*•∙▪▫]\s*', '• ', text, flags=re.MULTILINE)
    
    # remove excessive newlines (3+ → 2).
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # return the cleaned text.
    return text.strip()

def parse_resume_file(file_bytes: bytes, filename: str) -> Dict:
    
    # create a dictionary to store the results.
    result = {
        "contact_info": {},
        "education": [],
        "experiences": [],
        "skills": [],
        "projects": [],
        "summary": "",
        "warnings": []
    }

    try:
        # --------- 1. extract raw text ---------
        if filename.lower().endswith(".pdf"):
            raw_text = extract_pdf(file_bytes)
        elif filename.lower().endswith(".docx"):
            raw_text = extract_docx(file_bytes)
        else:
            raise ValueError("unsupported file type (PDF/DOCX only).")

        # write pre-pipeline text to file.
        try:
            with open("debug_pre_pipeline.txt", "w", encoding="utf-8") as f:
                f.write("=== PRE-PIPELINE (RAW EXTRACTED TEXT) ===\n\n")
                f.write(raw_text)
        except Exception:
            pass

        # --------- 2. minimal clean (bullets + newlines only) ---------
        text = minimal_clean(raw_text)
        
        # write after minimal cleaning to file.
        try:
            with open("debug_after_minimal_clean.txt", "w", encoding="utf-8") as f:
                f.write("=== AFTER MINIMAL_CLEAN ===\n\n")
                f.write(text)
        except Exception:
            pass

        # --------- 3. split into sections (keyword-based) ---------
        sections = split_into_sections(text)

        # --------- 4. parse contact (use full text, pass sections to exclude project/experience urls) ---------
        result["contact_info"] = parse_contact(text, sections=sections)

        # --------- 5. parse structured sections ---------
        result["education"] = parse_education(sections.get("education", ""))
        result["experiences"] = parse_experience(sections.get("experience", ""))
        result["skills"] = parse_skills(sections.get("skills", ""))
        result["projects"] = parse_projects(sections.get("projects", ""))
        result["summary"] = parse_summary(sections.get("summary", ""))

    except Exception as e:
        logger.error(f"Error parsing resume: {e}")
        result["warnings"].append(f"Pipeline failed: {str(e)}")

    # return the results.
    return result
