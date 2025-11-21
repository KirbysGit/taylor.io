# cleaner/clean_text_regex.py

# Modular regex-only text cleaning.

import re


# -----------------------------
# 1. Fix Common Word Splits
# -----------------------------
def fix_common_splits(text: str) -> str:
    """Fix common split words like 'De sign' -> 'Design'."""
    patterns = {
        r'\bDe\s+sign\b': 'Design',
        r'\bDe\s+velopment\b': 'Development',
        r'\bPro\s+gramming\b': 'Programming',
        r'\bDe\s+ploy\b': 'Deploy',
        r'\bRe\s+act\b': 'React',
        r'\bEx\s+perience\b': 'Experience',
        r'decision\s*-\s*making': 'decision-making',
        r'pixel\s*-\s*perfect': 'pixel-perfect',
        r'real\s*-\s*time': 'real-time',
        r'cross\s*-\s*functionally': 'cross-functionally',
    }

    for pattern, replacement in patterns.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    return text


# -----------------------------
# 2. Fix Merged Words (common glue words)
# -----------------------------
def fix_merged_words(text: str) -> str:
    """Fix merged words like 'builtand' -> 'built and'.
    
    NOTE: This is currently DISABLED because it's too aggressive and splits
    words incorrectly (e.g., 'enhancing' -> 'enhanc in g'). The raw PDF extraction
    is already good enough that we don't need this aggressive merging.
    """
    # DISABLED - too aggressive, causes more problems than it solves
    # The raw extraction from pdfplumber is already good enough
    return text
    
    # Original rules (commented out for reference):
    # rules = [
    #     (r'([a-z])and([a-z])', r'\1 and \2'),
    #     (r'([a-z])with([a-z])', r'\1 with \2'),
    #     (r'([a-z])for([a-z])', r'\1 for \2'),
    #     (r'([a-z])in([a-z])', r'\1 in \2'),
    #     (r'([a-z])to([a-z])', r'\1 to \2'),
    #     (r'([a-z])of([a-z])', r'\1 of \2'),
    # ]


# -----------------------------
# 3. Fix CamelCase Merges
# -----------------------------
def fix_camel_case(text: str) -> str:
    """Turns 'BuiltAndShipped' -> 'Built And Shipped'. Does not modify acronyms (API, UI, ML)."""
    def _split_camel(match):
        word = match.group(0)
        if word.isupper():
            return word
        return re.sub(r'([a-z])([A-Z])', r'\1 \2', word)

    return re.sub(r'\b([a-z]+[A-Z][A-Za-z]+)\b', _split_camel, text)


# -----------------------------
# 4. Normalize spacing
# -----------------------------
def normalize_spacing(text: str) -> str:
    """Normalize whitespace while preserving line breaks."""
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r' *\n *', '\n', text)
    text = re.sub(r'\n{2,}', '\n\n', text)
    return text.strip()


# -----------------------------
# 5. Bullet cleanup
# -----------------------------
def clean_bullets(text: str) -> str:
    """Ensure all bullets start with '• ' and sit on separate lines."""
    # Ensure all bullets start with "• "
    text = re.sub(r'^[\s]*[-•*]\s*', '• ', text, flags=re.MULTILINE)

    # Ensure bullet points sit on separate lines
    text = re.sub(r'•\s*([^\n•]+)\s*•', r'• \1\n• ', text)

    return text


# -----------------------------
# MAIN: Clean Text (Regex Only)
# -----------------------------
def clean_text_regex(text: str) -> str:
    """Main orchestrator for regex-based text cleaning.
    
    Order matters:
    1. Fix common splits (like "De sign" -> "Design")
    2. Fix merged words (DISABLED - too aggressive)
    3. Fix camelCase (like "BuiltAnd" -> "Built And")
    4. Clean bullets
    5. Normalize spacing
    """
    text = fix_common_splits(text)
    # fix_merged_words is disabled - raw extraction is good enough
    # text = fix_merged_words(text)
    text = fix_camel_case(text)
    text = clean_bullets(text)
    text = normalize_spacing(text)
    return text

