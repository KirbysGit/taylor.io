# pipeline.py

# Main resume parsing pipeline.

import logging
from typing import Dict

from .Aextractor import extract_pdf, extract_docx
from .Bcleaner import clean_text_regex, clean_with_openai
from .Csegmenter import split_into_sections
from .Dparsers import (
    parse_contact,
    parse_education,
    parse_experience,
    parse_skills,
    parse_projects
)

logger = logging.getLogger(__name__)


def parse_resume_file(file_bytes: bytes, filename: str) -> Dict:
    """Parse resume file (PDF or DOCX) and return structured data.
    
    Pipeline: Extract → Clean (regex) → Clean (OpenAI if enabled) → Segment → Parse
    """
    result = {
        "experiences": [],
        "education": [],
        "skills": [],
        "projects": [],
        "contact_info": {},
        "warnings": [],
    }
    
    try:
        # 1. Extract text from file
        logger.info(f"Starting extraction for file: {filename}")
        if filename.lower().endswith('.pdf'):
            raw_text = extract_pdf(file_bytes)
        elif filename.lower().endswith(('.docx', '.doc')):
            raw_text = extract_docx(file_bytes)
        else:
            raise ValueError(f"Unsupported file type: {filename}. Only PDF and DOCX are supported.")
        
        logger.info("=" * 80)
        logger.info("RAW EXTRACTED TEXT (before cleaning):")
        logger.info("=" * 80)
        logger.info(f"Length: {len(raw_text)} characters")
        logger.info(f"First 2000 characters:\n{raw_text[:2000]}")
        if len(raw_text) > 2000:
            logger.info(f"... (truncated, showing first 2000 of {len(raw_text)} total chars)")
        logger.info("=" * 80)
        
        # 2. Clean text (regex first)
        text = clean_text_regex(raw_text)
        
        logger.info("=" * 80)
        logger.info("TEXT AFTER REGEX CLEANING:")
        logger.info("=" * 80)
        logger.info(f"Length: {len(text)} characters")
        logger.info(f"First 2000 characters:\n{text[:2000]}")
        if len(text) > 2000:
            logger.info(f"... (truncated, showing first 2000 of {len(text)} total chars)")
        logger.info("=" * 80)
        
        # 3. Optional: Clean with OpenAI if enabled
        text = clean_with_openai(text)
        
        # 4. Segment into sections
        sections = split_into_sections(text)
        
        logger.info("=" * 80)
        logger.info("SECTION BREAKDOWN:")
        logger.info("=" * 80)
        for section_name, section_text in sections.items():
            logger.info(f"\n[{section_name.upper()} SECTION]")
            logger.info(f"Length: {len(section_text)} characters")
            logger.info(f"Content (first 500 chars):\n{section_text[:500]}")
            if len(section_text) > 500:
                logger.info(f"... (truncated, total: {len(section_text)} chars)")
        logger.info("=" * 80)
        
        # 5. Parse each section
        try:
            result["contact_info"] = parse_contact(text)  # Contact info from full text
        except Exception as e:
            logger.warning(f"Could not extract contact info: {str(e)}")
            result["warnings"].append(f"Could not extract contact info: {str(e)}")
        
        try:
            education_text = sections.get("education", "")
            result["education"] = parse_education(education_text) if education_text else []
        except Exception as e:
            logger.warning(f"Could not extract education: {str(e)}")
            result["warnings"].append(f"Could not extract education: {str(e)}")
        
        try:
            experience_text = sections.get("experience", "")
            result["experiences"] = parse_experience(experience_text) if experience_text else []
        except Exception as e:
            logger.warning(f"Could not extract experiences: {str(e)}")
            result["warnings"].append(f"Could not extract experiences: {str(e)}")
        
        try:
            skills_text = sections.get("skills", "")
            result["skills"] = parse_skills(skills_text) if skills_text else []
        except Exception as e:
            logger.warning(f"Could not extract skills: {str(e)}")
            result["warnings"].append(f"Could not extract skills: {str(e)}")
        
        try:
            projects_text = sections.get("projects", "")
            result["projects"] = parse_projects(projects_text) if projects_text else []
        except Exception as e:
            logger.warning(f"Could not extract projects: {str(e)}")
            result["warnings"].append(f"Could not extract projects: {str(e)}")
        
    except Exception as e:
        logger.error(f"Error parsing resume: {str(e)}")
        result["warnings"].append(f"Error parsing resume: {str(e)}")
    
    return result

