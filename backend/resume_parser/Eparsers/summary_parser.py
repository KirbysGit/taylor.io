# parsers/summary_parser.py

# Professional summary extraction.

import re
from typing import Optional


def parse_summary(section_text: str) -> Optional[str]:
    """Extract professional summary from summary section text.
    
    Args:
        section_text: Text from the summary section
        
    Returns:
        Cleaned summary text, or None if empty
    """
    if not section_text or not section_text.strip():
        return None
    
    # Clean up the text
    summary = section_text.strip()
    
    # Remove excessive whitespace (3+ newlines → 2)
    summary = re.sub(r'\n{3,}', '\n\n', summary)
    
    # Remove bullet points if present (summary is usually paragraph form)
    summary = re.sub(r'^[\s]*[•\-\*]\s*', '', summary, flags=re.MULTILINE)
    
    # Normalize whitespace (multiple spaces → single space)
    summary = re.sub(r' +', ' ', summary)
    
    # Remove leading/trailing whitespace from each line
    lines = [line.strip() for line in summary.split('\n') if line.strip()]
    summary = ' '.join(lines)
    
    return summary.strip() if summary else None
