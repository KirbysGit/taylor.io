# pipeline.py

# resume parsing pipeline.

import json
from datetime import datetime, timezone
from pathlib import Path
import re
import logging
from typing import Dict

from .Aextractor import extract_pdf, extract_docx
from .Csegmenter import split_into_sections
from .Eparsers import (
    parse_contact,
    parse_education,
    parse_experience,
    parse_skills,
    parse_projects_with_debug,
    parse_summary,
)

logger = logging.getLogger(__name__)
DEBUG_DIR = Path(__file__).resolve().parent / "debug_out"
EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
DEGREE_RE = re.compile(r'(?i)\b(bachelor|master|mba|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?)\b')
SCHOOL_RE = re.compile(r'(?i)\b(university|college|institute|school)\b')
SKILL_LIST_RE = re.compile(
    r'(?i)\b(strategy|communications?|marketing|media relations|content|analytics|project management|graphic design|'
    r'brand management|public relations|cross-functional|email marketing|social media)\b'
)

MOJIBAKE_REPLACEMENTS = {
    "â€¢": "•",
    "â€“": "–",
    "â€”": "—",
    "â€˜": "'",
    "â€™": "'",
    "â€œ": '"',
    "â€": '"',
    "â€¦": "...",
    "Â": "",
}


TYPOGRAPHIC_REPLACEMENTS = {
    "“": '"',
    "”": '"',
    "‘": "'",
    "’": "'",
}


def minimal_clean(text: str) -> str:
    if not text:
        return ""

    for broken, fixed in MOJIBAKE_REPLACEMENTS.items():
        text = text.replace(broken, fixed)

    for typographic, fixed in TYPOGRAPHIC_REPLACEMENTS.items():
        text = text.replace(typographic, fixed)

    # Merge PDF line wraps that split a hyphenated word.
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1-\2", text)

    # Normalize bullet characters to a consistent format.
    text = re.sub(r"^[\s]*[-*•∙▪▫âˆ™â–ªâ–«]\s*", "• ", text, flags=re.MULTILINE)

    # Remove excessive newlines.
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def _looks_like_skills_blob(text: str) -> bool:
    text = text or ""
    separators = len(re.findall(r"[•;]|â€¢", text))
    return separators >= 4 and bool(SKILL_LIST_RE.search(text)) and not DEGREE_RE.search(text)


def _repair_misplaced_sections(sections: Dict[str, str]) -> Dict[str, str]:
    """Repair common PDF extraction order issues from designed/sidebar resumes."""
    repaired = dict(sections)

    education_text = repaired.get("education", "")
    if not repaired.get("skills") and _looks_like_skills_blob(education_text):
        cleaned_skills = re.sub(r"(?im)^\s*key competencies\s*:?\s*$", "", education_text).strip()
        repaired["skills"] = cleaned_skills
        repaired.pop("education", None)

    experience_text = repaired.get("experience", "")
    if experience_text:
        lines = [line.strip() for line in experience_text.splitlines() if line.strip()]
        tail_start = None
        for index, line in enumerate(lines):
            if EMAIL_RE.search(line) and any(
                DEGREE_RE.search(candidate) or SCHOOL_RE.search(candidate)
                for candidate in lines[index + 1:index + 5]
            ):
                tail_start = index
                break

        if tail_start is not None:
            experience_lines = lines[:tail_start]
            tail_lines = lines[tail_start:]
            repaired["experience"] = "\n".join(experience_lines).strip()
            education_lines = [
                line for line in tail_lines
                if not EMAIL_RE.search(line)
                and not re.search(r"\b\d{3}\D{0,3}\d{3}\D{0,3}\d{4}\b", line)
                and not re.match(r"(?i)^website$", line.strip())
            ]
            first_education_idx = next(
                (
                    index for index, line in enumerate(education_lines)
                    if SCHOOL_RE.search(line) or DEGREE_RE.search(line)
                ),
                0,
            )
            education_lines = education_lines[first_education_idx:]
            education_blob = "\n".join(education_lines).strip()
            if education_blob and (not repaired.get("education") or not DEGREE_RE.search(repaired.get("education", ""))):
                repaired["education"] = education_blob

    return repaired


def _write_debug_file(name: str, content: str) -> None:
    try:
        DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        (DEBUG_DIR / name).write_text(content, encoding="utf-8")
    except Exception:
        logger.debug("Could not write resume parser debug file %s", name, exc_info=True)


def _write_debug_json(name: str, payload: Dict) -> None:
    try:
        DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        (DEBUG_DIR / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    except Exception:
        logger.debug("Could not write resume parser debug json %s", name, exc_info=True)


def parse_resume_file(file_bytes: bytes, filename: str) -> Dict:
    result = {
        "contact_info": {},
        "education": [],
        "experiences": [],
        "skills": [],
        "projects": [],
        "summary": "",
        "warnings": [],
        "debug": {},
    }

    try:
        if filename.lower().endswith(".pdf"):
            raw_text = extract_pdf(file_bytes)
        elif filename.lower().endswith(".docx"):
            raw_text = extract_docx(file_bytes)
        else:
            raise ValueError("unsupported file type (PDF/DOCX only).")

        _write_debug_file("01_raw_extracted_text.txt", raw_text)

        text = minimal_clean(raw_text)
        _write_debug_file("02_cleaned_text.txt", text)

        sections = _repair_misplaced_sections(split_into_sections(text))

        result["contact_info"] = parse_contact(text, sections=sections)
        result["education"] = parse_education(sections.get("education", ""))
        result["experiences"] = parse_experience(sections.get("experience", ""))
        result["skills"] = parse_skills(sections.get("skills", ""))
        result["projects"], project_parser_debug = parse_projects_with_debug(sections.get("projects", ""))
        result["summary"] = parse_summary(sections.get("summary", ""))

        result["debug"] = {
            "filename": filename,
            "debugDir": str(DEBUG_DIR),
            "rawTextLength": len(raw_text or ""),
            "cleanedTextLength": len(text or ""),
            "rawTextPreview": (raw_text or "")[:1200],
            "cleanedTextPreview": (text or "")[:1200],
            "sectionNames": list(sections.keys()),
            "sectionLengths": {name: len(value or "") for name, value in sections.items()},
            "sectionPreviews": {name: (value or "")[:700] for name, value in sections.items()},
            "parserDebug": {
                "projects": project_parser_debug,
            },
            "parsedCounts": {
                "contactFields": len([value for value in result["contact_info"].values() if value]),
                "education": len(result["education"]),
                "experiences": len(result["experiences"]),
                "skills": len(result["skills"]),
                "projects": len(result["projects"]),
                "summary": 1 if result["summary"] else 0,
            },
        }

        debug_snapshot = {
            "createdAtUtc": datetime.now(timezone.utc).isoformat(),
            "filename": filename,
            "stage01_rawText": {
                "length": len(raw_text or ""),
                "text": raw_text,
            },
            "stage02_cleanedText": {
                "length": len(text or ""),
                "text": text,
            },
            "stage03_sections": {
                "names": list(sections.keys()),
                "lengths": {name: len(value or "") for name, value in sections.items()},
                "content": sections,
            },
            "stage04_parsedData": {
                "contact_info": result["contact_info"],
                "education": result["education"],
                "experiences": result["experiences"],
                "skills": result["skills"],
                "projects": result["projects"],
                "summary": result["summary"],
                "warnings": result["warnings"],
                "parserDebug": {
                    "projects": project_parser_debug,
                },
            },
        }
        _write_debug_json("03_parse_snapshot.json", debug_snapshot)
        _write_debug_file("04_sections.txt", "\n\n".join(
            f"=== {name.upper()} ===\n{content}" for name, content in sections.items()
        ))

    except Exception as e:
        logger.error("Error parsing resume: %s", e)
        result["warnings"].append(f"Pipeline failed: {str(e)}")
        _write_debug_json("03_parse_snapshot.json", {
            "createdAtUtc": datetime.now(timezone.utc).isoformat(),
            "filename": filename,
            "error": str(e),
            "result": result,
        })

    return result
