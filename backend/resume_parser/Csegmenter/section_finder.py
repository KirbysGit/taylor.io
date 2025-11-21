# segmenter/section_finder.py

# Section detection and splitting.

import re
from typing import Dict


SECTION_HEADERS = {
    "education": r"(education|academic|qualifications|degrees?)",
    "experience": r"(experience|employment|work history|professional experience|work experience)",
    "skills": r"(skills|technical skills|core competencies|proficiencies?)",
    "projects": r"(projects|personal projects|key projects)",
}


def split_into_sections(text: str) -> Dict[str, str]:
    """Split resume text into sections based on headers.
    
    Returns a dictionary mapping section names to their text content.
    Handles multi-column layouts by finding section headers and stopping at next header.
    """
    sections = {}
    
    # Find all section headers - look for bullet + section name pattern
    # Pattern matches: "• Education", "Education:", "EDUCATION", etc.
    header_positions = []
    for name, pattern in SECTION_HEADERS.items():
        # Match section headers that are typically on their own line with optional bullet
        header_pattern = rf'(?:^|\n)\s*[•\-\*]?\s*{pattern}\s*:?\s*(?:\n|$)'
        for match in re.finditer(header_pattern, text, re.IGNORECASE | re.MULTILINE):
            # Store the position where content starts (after the header line)
            header_positions.append((match.end(), name))
    
    if not header_positions:
        return {}
    
    # Sort by position in text
    header_positions.sort()
    
    # Extract content for each section (from header to next header)
    for i, (start_pos, section_name) in enumerate(header_positions):
        # Find where this section ends (start of next section, or end of text)
        if i + 1 < len(header_positions):
            end_pos = header_positions[i + 1][0]
        else:
            end_pos = len(text)
        
        # Extract section content (skip the header line itself)
        section_content = text[start_pos:end_pos].strip()
        
        # Clean up: remove any section headers that might appear in the content
        # (this can happen with multi-column layouts)
        for other_name, other_pattern in SECTION_HEADERS.items():
            if other_name != section_name:
                # Remove any other section headers from this section's content
                other_header_pattern = rf'\n\s*[•\-\*]?\s*{other_pattern}\s*:?\s*(?:\n|$).*'
                section_content = re.sub(other_header_pattern, '', section_content, flags=re.IGNORECASE | re.MULTILINE | re.DOTALL)
        
        if section_content:
            sections[section_name] = section_content.strip()
    
    return sections

