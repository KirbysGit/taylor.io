# Dnlp/normalizer.py
# Light spaCy-based normalization for Phase-1

import re
import spacy
from functools import lru_cache

# Load once using LRU cache so spaCy doesn't reload on every request
@lru_cache(maxsize=1)
def load_model():
    try:
        return spacy.load("en_core_web_sm")
    except Exception:
        return None  # Fail gracefully if spaCy isn't installed


def normalize_with_spacy(text: str) -> str:
    """
    Minimal normalization:
    - Fix spacing around newlines and bullets
    - DON'T touch dashes at all - preserve exactly as-is
    - DON'T change casing
    """
    nlp = load_model()
    if nlp is None:
        # Without spaCy: just fix basic spacing, don't touch dashes
        cleaned = text.replace(" \n", "\n")
        cleaned = cleaned.replace("\n ", "\n")
        cleaned = cleaned.replace("•  ", "• ")
        return cleaned.strip()

    # Process with spaCy but preserve dashes exactly
    doc = nlp(text)
    tokens = []
    for token in doc:
        if token.text == "\n":
            tokens.append("\n")
            continue
        # Use original text - preserve everything including dashes and casing
        tokens.append(token.text)

    # Join tokens with spaces
    cleaned = " ".join(tokens)

    # Only fix spacing around newlines and bullets - DON'T touch dashes
    cleaned = cleaned.replace(" \n", "\n")
    cleaned = cleaned.replace("\n ", "\n")
    cleaned = cleaned.replace("•  ", "• ")
    
    # Collapse only excessive spaces (3+), but don't touch spaces around dashes
    cleaned = re.sub(r' {3,}', ' ', cleaned)

    return cleaned.strip()
