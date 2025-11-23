# parsers/contact_parser.py

# Contact information extraction.

import re
from typing import Dict, Optional


def parse_contact(text: str, sections: Optional[Dict[str, str]] = None) -> Dict[str, Optional[str]]:
    """Extract contact information from resume text.
    
    Args:
        text: Full resume text
        sections: Optional dict of section names to section text (to exclude URLs from projects/experiences)
    """
    contact = {
        "email": None,
        "phone": None,
        "github": None,
        "linkedin": None,
        "portfolio": None,
    }
    
    # Collect URLs from projects/experiences sections to exclude from portfolio extraction
    excluded_urls = set()
    if sections:
        projects_text = sections.get("projects", "")
        experience_text = sections.get("experience", "")
        # Find all URLs in these sections
        url_pattern = r'https?://[^\s|,]+'
        excluded_urls.update(re.findall(url_pattern, projects_text, re.IGNORECASE))
        excluded_urls.update(re.findall(url_pattern, experience_text, re.IGNORECASE))
    
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
    
    # extract GitHub link
    github_patterns = [
        r'https?://(?:www\.)?github\.com/[^\s|,]+',  # https://github.com/username
        r'github\.com/[^\s|,]+',  # github.com/username
    ]
    for pattern in github_patterns:
        github_match = re.search(pattern, text, re.IGNORECASE)
        if github_match:
            url = github_match.group(0)
            # normalize to https:// if not present
            if not url.startswith('http'):
                url = 'https://' + url
            contact["github"] = url
            break
    
    # extract LinkedIn link
    linkedin_patterns = [
        r'https?://(?:www\.)?linkedin\.com/[^\s|,]+',  # https://linkedin.com/in/username
        r'linkedin\.com/[^\s|,]+',  # linkedin.com/in/username
    ]
    for pattern in linkedin_patterns:
        linkedin_match = re.search(pattern, text, re.IGNORECASE)
        if linkedin_match:
            url = linkedin_match.group(0)
            # normalize to https:// if not present
            if not url.startswith('http'):
                url = 'https://' + url
            contact["linkedin"] = url
            break
    
    # extract portfolio/website (https:// URLs that aren't github or linkedin)
    # Only extract from contact section (exclude URLs found in projects/experiences)
    portfolio_pattern = r'https://[^\s|,]+'
    portfolio_matches = re.finditer(portfolio_pattern, text, re.IGNORECASE)
    for match in portfolio_matches:
        url = match.group(0)
        # skip if it's github or linkedin
        if 'github' not in url.lower() and 'linkedin' not in url.lower():
            # skip if this URL was found in projects/experiences sections
            if url not in excluded_urls:
                contact["portfolio"] = url
                break
    
    return contact

