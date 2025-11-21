# parsers/contact_parser.py

# Contact information extraction.

import re
from typing import Dict, Optional


def parse_contact(text: str) -> Dict[str, Optional[str]]:
    """Extract contact information from resume text."""
    contact = {
        "email": None,
        "phone": None,
    }
    
    # extract email.
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_match = re.search(email_pattern, text)
    if email_match:
        contact["email"] = email_match.group(0)
    
    # extract phone number.
    phone_patterns = [
        r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # (123) 456-7890 or 123-456-7890
        r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # 123-456-7890
        r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # +1 (123) 456-7890
    ]
    for pattern in phone_patterns:
        phone_match = re.search(pattern, text)
        if phone_match:
            contact["phone"] = phone_match.group(0)
            break
    
    return contact

