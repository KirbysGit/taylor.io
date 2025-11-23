# formatter/formatters.py

# Helper utilities for formatting data in DOCX resumes.

# imports.
from datetime import datetime
import re


def format_date(date_value):
    """
    Format date value for display in resume.
    Returns formatted string like "Jan 2020" or empty string if None.
    """
    if not date_value:
        return ""
    
    try:
        # handle datetime objects.
        if isinstance(date_value, datetime):
            return date_value.strftime("%b %Y")
        
        # handle string dates.
        date_str = str(date_value)
        
        # try parsing ISO format.
        if 'T' in date_str:
            date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00').split('T')[0])
        else:
            date_obj = datetime.fromisoformat(date_str)
        
        return date_obj.strftime("%b %Y")
    except (ValueError, TypeError):
        # if parsing fails, return the original value as string.
        return str(date_value) if date_value else ""


def clean_text_for_docx(text: str) -> str:
    """
    Clean text for DOCX insertion (remove special characters that might break formatting).
    """
    if not text:
        return ""
    
    # remove excessive whitespace.
    text = re.sub(r'\s+', ' ', text)
    # strip leading/trailing whitespace.
    return text.strip()


def fix_bullets(text: str) -> str:
    """
    Normalize bullet characters to consistent format (•).
    """
    if not text:
        return ""
    
    # normalize various bullet characters to •
    text = re.sub(r'^[\s]*[-*•∙▪▫]\s*', '• ', text, flags=re.MULTILINE)
    return text.strip()

