# resume_parser/Dnlp/spacy_loader.py

import logging

logger = logging.getLogger(__name__)

_nlp = None

def get_nlp():
    """Load lightweight spaCy model (en_core_web_sm).
    Returns None if model is missing (pipeline should still continue).
    """
    global _nlp

    if _nlp is not None:
        return _nlp

    try:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
        logger.info("spaCy model loaded successfully.")
        return _nlp
    except Exception as e:
        logger.warning(
            f"spaCy model not available. Install with: python -m spacy download en_core_web_sm. Error: {e}"
        )
        _nlp = None
        return None
