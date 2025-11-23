# resume_parser/Dnlp/nlp_utils.py

import re
from typing import List, Dict, Optional
from .spacy_loader import get_nlp


def extract_entities(text: str) -> Dict[str, List[str]]:
    """Extract ORG, DATE, GPE, PERSON using spaCy if available."""
    nlp = get_nlp()
    if not nlp:
        return {"ORG": [], "DATE": [], "GPE": [], "PERSON": []}

    doc = nlp(text)

    entities = {"ORG": [], "DATE": [], "GPE": [], "PERSON": []}

    for ent in doc.ents:
        if ent.label_ in entities:
            entities[ent.label_].append(ent.text)

    return entities


def detect_job_titles(text: str) -> List[str]:
    """Naive title detection + spaCy enhanced title detection."""
    nlp = get_nlp()
    titles = []

    title_patterns = [
        r"\bSoftware Engineer\b",
        r"\bData Scientist\b",
        r"\bMachine Learning Engineer\b",
        r"\bBackend Engineer\b",
        r"\bFrontend Engineer\b",
        r"\bFull[- ]?Stack Developer\b",
        r"\bIntern\b",
        r"\bResearch Assistant\b"
    ]

    for pat in title_patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            titles.append(m.group())

    # If spaCy available, also grab nouns with title-like POS tags
    if nlp:
        doc = nlp(text)
        for chunk in doc.noun_chunks:
            if any(word.lower_ in ["engineer", "developer", "scientist"] for word in chunk):
                titles.append(chunk.text)

    return list(set(titles))


def extract_dates(text: str) -> List[str]:
    """Identify date strings like 'May 2023 – Present', '2021-2024', 'Aug 2022'."""
    patterns = [
        r"[A-Z][a-z]+ \d{4}",
        r"\d{4}\s*[-–—]\s*\d{4}",
        r"[A-Z][a-z]+ \d{4}\s*[-–—]\s*(Present|Current|\d{4})"
    ]

    dates = []
    for pat in patterns:
        for m in re.finditer(pat, text):
            dates.append(m.group())

    return list(set(dates))
