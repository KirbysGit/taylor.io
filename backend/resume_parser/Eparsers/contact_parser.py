# parsers/contact_parser.py

# Contact information extraction.

import re
from typing import Dict, Optional


URL_RE = re.compile(r'https?://[^\s|,]+', re.IGNORECASE)
BARE_DOMAIN_RE = re.compile(
    r'\b(?:www\.)?(?:[A-Za-z0-9-]+\.)+(?:com|dev|io|app|net|org|co|edu)(?:/[^\s|,]*)?\b',
    re.IGNORECASE,
)
NON_PORTFOLIO_DOMAIN_RE = re.compile(r'(?i)(github\.com|linkedin\.com)')
EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')


def _normalize_url(url: str) -> str:
    url = (url or "").strip().rstrip(".")
    if url and not url.lower().startswith(("http://", "https://")):
        return "https://" + url
    return url


def _collect_section_urls(text: str) -> set[str]:
    return set(URL_RE.findall(text or "")) | set(BARE_DOMAIN_RE.findall(text or ""))


def _is_portfolio_candidate(url: str, excluded_urls: set[str]) -> bool:
    raw_url = (url or "").strip().rstrip(".")
    if not raw_url:
        return False
    if raw_url in excluded_urls or _normalize_url(raw_url) in excluded_urls:
        return False
    if NON_PORTFOLIO_DOMAIN_RE.search(raw_url):
        return False
    return True


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
        excluded_urls.update(_collect_section_urls(projects_text))
        excluded_urls.update(_collect_section_urls(experience_text))
    
    # extract email.
    email_match = EMAIL_RE.search(text)
    if email_match:
        contact["email"] = email_match.group(0)
    
    # extract phone number.
    phone_patterns = [
        r'\b\d{3}\s*(?:[·•â€¢\.\-\s]|Â·)\s*\d{3}\s*(?:[·•â€¢\.\-\s]|Â·)\s*\d{4}\b',
        r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # (123) 456-7890 or 123-456-7890
        r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # 123-456-7890
        r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # +1 (123) 456-7890
    ]
    for pattern in phone_patterns:
        phone_match = re.search(pattern, text)
        if phone_match:
            phone = re.sub(r"\D", "", phone_match.group(0))
            if len(phone) == 10:
                contact["phone"] = f"{phone[:3]}-{phone[3:6]}-{phone[6:]}"
            else:
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
    # Only extract from contact section (exclude URLs found in projects/experiences).
    for match in URL_RE.finditer(text):
        url = match.group(0)
        if _is_portfolio_candidate(url, excluded_urls):
            contact["portfolio"] = _normalize_url(url)
            break

    if not contact["portfolio"]:
        for match in BARE_DOMAIN_RE.finditer(text):
            if match.start() > 0 and text[match.start() - 1] == "@":
                continue
            url = match.group(0)
            if _is_portfolio_candidate(url, excluded_urls):
                contact["portfolio"] = _normalize_url(url)
                break
    
    return contact

