# cleaner/clean_text_regex.py

import re

# ------------------------------------------------------------------------------
# 1. Fix extremely common split words
# ------------------------------------------------------------------------------
def fix_common_splits(text: str) -> str:
    """
    Fix high-confidence splits only.
    Avoid risky patterns.
    """
    patterns = {
        r'\bDe\s+sign\b': 'Design',
        r'\bDe\s+velopment\b': 'Development',
        r'\bPro\s+gramming\b': 'Programming',
        r'\bEx\s+perience\b': 'Experience',
        r'\bRe\s+search\b': 'Research',
        r'\bAl\s+gorithm\b': 'Algorithm',
        r'\bMa\s+chine\s+Learning\b': 'Machine Learning',

        # hyphenated words
        r'decision\s*-\s*making': 'decision-making',
        r'pixel\s*-\s*perfect': 'pixel-perfect',
        r'real\s*-\s*time': 'real-time',
        r'cross\s*-\s*functionally': 'cross-functionally',
        r'production\s*-\s*grade': 'production-grade',
    }

    for pattern, replacement in patterns.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    return text


# ------------------------------------------------------------------------------
# 2. Fix CamelCase merges (safe)
# ------------------------------------------------------------------------------
def fix_camel_case(text: str) -> str:
    """Split camelCase words except acronyms and words with dashes."""
    def _split(match):
        word = match.group(0)
        if word.isupper():
            return word
        # Don't split words that contain dashes (e.g., "Real-Time", "cross-node")
        if '-' in word or '–' in word:
            return word
        return re.sub(r'([a-z])([A-Z])', r'\1 \2', word)

    return re.sub(r'\b([a-z]+[A-Z][A-Za-z]+)\b', _split, text)


# ------------------------------------------------------------------------------
# 3. Clean bullet formatting
# ------------------------------------------------------------------------------
def clean_bullets(text: str) -> str:
    """
    Standardize bullets:
    - Convert -, *, • into "• "
    - Ensure one bullet per line
    """
    # Normalize any bullet marker to "• "
    text = re.sub(r'^[\s]*[-*•∙▪▫]\s*', '• ', text, flags=re.MULTILINE)

    # Make sure bullets are not joined on the same line
    text = re.sub(r'•\s*(?!\s)([^\n]+)\n(?=[^\s•-])', r'• \1\n', text)

    return text


# ------------------------------------------------------------------------------
# 4. Normalize spacing (safe)
# ------------------------------------------------------------------------------
def normalize_spacing(text: str) -> str:
    """
    Safe whitespace normalization:
    - Collapse multi-spaces (but preserve spaces around dashes)
    - Remove trailing spaces
    - Preserve blank lines (double newline)
    """
    # Don't collapse spaces that are around dashes
    # First protect dash patterns
    dash_patterns = []
    counter = 0
    
    def protect_dash(match):
        nonlocal counter
        placeholder = f"__DASH_{counter}__"
        dash_patterns.append((placeholder, match.group(0)))
        counter += 1
        return placeholder
    
    # Protect any dash with spaces around it
    text = re.sub(r'\s+[–-]\s+', protect_dash, text)
    text = re.sub(r'\s+[–-](?=\S)', protect_dash, text)  # space-dash-word
    text = re.sub(r'(?<=\S)[–-]\s+', protect_dash, text)  # word-dash-space
    
    # Now collapse spaces
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r' *\n *', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Restore protected dash patterns
    for placeholder, original in dash_patterns:
        text = text.replace(placeholder, original)
    
    return text.strip()


# ------------------------------------------------------------------------------
# 5. MAIN CLEANER
# ------------------------------------------------------------------------------
def clean_text_regex(text: str) -> str:
    """
    Phase-1 safe text cleaning pipeline.
    Order matters.
    """
    text = fix_common_splits(text)
    text = fix_camel_case(text)
    text = clean_bullets(text)
    text = normalize_spacing(text)
    return text
