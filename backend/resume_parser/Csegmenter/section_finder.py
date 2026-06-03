# segmenter/section_finder.py

# Section detection and splitting.

import re
from typing import Dict


# Focus on 6 key sections: Experience, Education, Skills, Contact, Projects, Summary
SECTION_HEADERS = {
    "contact": r"(contact|contact information|contact info|personal information|personal info)",
    "education": r"(education|academic|qualifications|degrees?|educational background)",
    "experience": r"(experience|employment|work history|professional experience|work experience|employment history|career)",
    "skills": r"(skills(?:\s*&\s*extracurriculars?)?|technical skills|key competencies|core competencies|proficiencies?|competencies|expertise)",
    "projects": r"(projects|personal projects|key projects|project experience|portfolio)",
    "summary": r"(summary|professional summary|profile|objective|career objective|executive summary|about)",
}


SPACED_HEADER_ALIASES = {
    "PROFILE": "summary",
    "SUMMARY": "summary",
    "OBJECTIVE": "summary",
    "EDUCATION": "education",
    "EXPERIENCE": "experience",
    "EMPLOYMENT": "experience",
    "SKILLS": "skills",
    "PROJECTS": "projects",
    "CONTACT": "contact",
}


def _spaced_header_name(line: str) -> str | None:
    cleaned = re.sub(r"[^A-Za-z]", "", line or "").upper()
    if len(cleaned) < 4:
        return None
    letters_and_spaces = re.sub(r"[^A-Za-z\s]", "", line or "").strip()
    if not letters_and_spaces:
        return None
    # Letter-spaced headers usually have more separators than words.
    if " " not in letters_and_spaces and not line.isupper():
        return None
    return SPACED_HEADER_ALIASES.get(cleaned)


def split_into_sections(text: str) -> Dict[str, str]:
    """Split resume text into sections based on keyword headers.
    
    Returns a dictionary mapping section names to their text content.
    Focuses on: Experience, Education, Skills, Contact, Projects, Summary.
    Handles variations in header formatting and multi-column layouts.
    """
    sections = {}
    
    # Find all section headers - look for section name pattern
    # Pattern matches: "Education", "Education:", "• Education", "EDUCATION", etc.
    header_positions = []
    for match in re.finditer(r'(?:^|\n)([^\n]+)(?:\n|$)', text, re.MULTILINE):
        line = match.group(1).strip()
        section_name = _spaced_header_name(line)
        if section_name:
            header_positions.append((match.start(), match.end(), section_name))

    for name, pattern in SECTION_HEADERS.items():
        # Match section headers that are typically on their own line
        # Allow for optional bullet, colon, and whitespace variations
        header_pattern = rf'(?:^|\n)\s*[•\-\*]?\s*{pattern}\s*:?\s*(?:\n|$)'
        for match in re.finditer(header_pattern, text, re.IGNORECASE | re.MULTILINE):
            # Store the position where content starts (after the header line)
            # Also store the match start to handle duplicates
            header_positions.append((match.start(), match.end(), name))
    
    if not header_positions:
        return {}
    
    # Sort by position in text (by start position)
    header_positions.sort(key=lambda x: x[0])
    
    # Remove duplicate headers (keep first occurrence)
    seen = set()
    unique_headers = []
    for start, end, name in header_positions:
        if name not in seen:
            seen.add(name)
            unique_headers.append((start, end, name))
    
    # Extract content for each section (from header to next header)
    for i, (start_pos, end_pos, section_name) in enumerate(unique_headers):
        # Find where this section ends (start of next section, or end of text)
        if i + 1 < len(unique_headers):
            next_start = unique_headers[i + 1][0]
            section_end = next_start
        else:
            section_end = len(text)
        
        # Extract section content (from end of header to start of next section)
        section_content = text[end_pos:section_end].strip()
        
        # Clean up: remove any section headers that might appear in the content
        # (this can happen with multi-column layouts or nested content)
        prior_section_names = {name for _, _, name in unique_headers[:i]}
        for other_name, other_pattern in SECTION_HEADERS.items():
            if other_name != section_name:
                if other_name in prior_section_names:
                    continue
                # Remove any other section headers from this section's content
                other_header_pattern = rf'\n\s*[•\-\*]?\s*{other_pattern}\s*:?\s*(?:\n|$).*'
                section_content = re.sub(
                    other_header_pattern, 
                    '', 
                    section_content, 
                    flags=re.IGNORECASE | re.MULTILINE | re.DOTALL
                )
        
        if section_content:
            sections[section_name] = section_content.strip()
    
    return sections

