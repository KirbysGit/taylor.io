# parsers/education_parser.py

# Education information extraction.

import re
from typing import Dict, List, Optional


CITY_STATE_RE = re.compile(r"\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}),\s*([A-Z]{2})\b$")
CITY_PREFIXES = {
    "Santa",
    "San",
    "New",
    "Los",
    "Las",
    "Fort",
    "Saint",
    "St",
    "Mount",
    "Lake",
    "Port",
    "East",
    "West",
    "North",
    "South",
}
MONTH_PATTERN = (
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|"
    r"Nov(?:ember)?|Dec(?:ember)?)"
)


def _extract_trailing_location(text: str) -> tuple[str, Optional[str]]:
    text = (text or "").strip()
    match = CITY_STATE_RE.search(text)
    if not match:
        return text, None

    before_comma = text[: text.rfind(",")].strip()
    state_code = match.group(2)
    words = before_comma.split()
    if not words:
        return text, None

    city_words = [words[-1]]
    if len(words) >= 2 and words[-2] in CITY_PREFIXES:
        city_words = words[-2:]

    city = " ".join(city_words)
    remaining = " ".join(words[: -len(city_words)]).strip(" ,|-")
    return remaining or text, f"{city}, {state_code}"


def _strip_dates_and_locations(text: str) -> str:
    text = re.sub(
        rf"\s+{MONTH_PATTERN}\s+\d{{4}}\s*[-â€“â€”]\s*(?:{MONTH_PATTERN}\s+)?(?:\d{{4}}|present|current)\b.*$",
        "",
        text or "",
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\s+\d{4}\s*[-â€“â€”]\s*(?:\d{4}|present|current)\b.*$", "", text, flags=re.IGNORECASE)
    text, _location = _extract_trailing_location(text)
    return text.strip(" ,;|-")


def parse_education(section_text: str) -> List[Dict[str, Optional[str]]]:
    """Extract education information from education section text."""
    if not section_text or not section_text.strip():
        return []
    
    education = []
    
    # split into individual entries (usually separated by blank lines).
    entries = re.split(r'\n\s*\n', section_text)
    
    for entry in entries:
        entry = entry.strip()
        if not entry or len(entry) < 10:
            continue
        
        edu_item = {
            "school": None,
            "degree": None,
            "field": None,
            "minor": None,
            "startDate": None,
            "endDate": None,
            "current": False,
            "gpa": None,
            "honorsAwards": None,
            "clubsExtracurriculars": None,
            "location": None,
            "relevantCoursework": None,
        }
        
        lines = [line.strip() for line in entry.split('\n') if line.strip()]
        if not lines:
            continue

        non_date_label_re = re.compile(
            r'(?i)^(honors?\s*(?:&|and)?\s*awards?|awards?|clubs?\s*(?:&|and)?\s*extracurriculars?|extracurriculars?|relevant\s+coursework|coursework)\s*:'
        )

        # Extract GPA from any education line. Resumes often put it on the degree line:
        # "Bachelor of Science in Computer Engineering, 3.7 GPA Orlando, FL".
        gpa_patterns = [
            r'\(GPA\s+([\d.]+(?:\s*/\s*[\d.]+)?)\)',
            r'GPA\s*:?\s*([\d.]+(?:\s*/\s*[\d.]+)?)',
            r'([\d.]+(?:\s*/\s*[\d.]+)?)\s*GPA',
        ]
        for line in lines:
            for gpa_pattern in gpa_patterns:
                gpa_match = re.search(gpa_pattern, line, re.IGNORECASE)
                if gpa_match:
                    edu_item["gpa"] = gpa_match.group(1).strip()
                    break
            if edu_item["gpa"]:
                break
        
        # extract school name and GPA - look for university/college patterns or first line
        for i, line in enumerate(lines):
            if i == 0 or re.search(r'(?i)(university|college|institute|school|academy)', line):
                school_name = re.sub(r'\s*\([^\)]+\)', '', line).strip()  # Remove parentheses (may contain GPA)
                school_name = re.sub(r'\s*,?\s*[\d.]+(?:\s*/\s*[\d.]+)?\s*GPA\b', '', school_name, flags=re.IGNORECASE)
                school_name = re.sub(r'\s*GPA\s*:?\s*[\d.]+(?:\s*/\s*[\d.]+)?', '', school_name, flags=re.IGNORECASE)  # Remove GPA text
                school_name = re.sub(r'\s*[A-Z][a-z]+\s+\d{4}\s*[-–—]\s*([A-Z][a-z]+\s+)?\d{4}', '', school_name, flags=re.IGNORECASE)
                school_name = re.sub(r'\s*\d{4}\s*[-–—]\s*\d{4}', '', school_name)
                school_name, school_location = _extract_trailing_location(school_name)
                if school_location and not edu_item["location"]:
                    edu_item["location"] = school_location
                
                if not re.search(r'(?i)^(bachelor|master|phd|associate|degree|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?)', school_name):
                    school_name = school_name.strip()
                    if school_name:
                        edu_item["school"] = school_name
                        break
        
        # extract degree
        degree_patterns = [
            r'(?i)(bachelor(?:\'?s)?\s+(?:of\s+)?(?:science|arts|engineering|business|technology|computer|information))',
            r'(?i)(master(?:\'?s)?\s+(?:of\s+)?(?:science|arts|engineering|business|technology|computer|information|mba))',
            r'(?i)(ph\.?d\.?\s+(?:in\s+)?[A-Za-z\s]+)',
            r'(?i)(doctorate\s+(?:in\s+)?[A-Za-z\s]+)',
            r'(?i)(associate(?:\'?s)?\s+(?:of\s+)?(?:science|arts))',
            r'(?i)(b\.?s\.?\s+(?:in\s+)?[A-Za-z\s]+)',
            r'(?i)(b\.?a\.?\s+(?:in\s+)?[A-Za-z\s]+)',
            r'(?i)(m\.?s\.?\s+(?:in\s+)?[A-Za-z\s]+)',
            r'(?i)(m\.?a\.?\s+(?:in\s+)?[A-Za-z\s]+)',
        ]
        
        for pattern in degree_patterns:
            degree_match = re.search(pattern, entry)
            if degree_match:
                degree_text = degree_match.group(0).strip()
                degree_text = re.sub(r'^\d+\s+', '', degree_text)
                degree_text = re.sub(r'\s+in\s+.+$', '', degree_text, flags=re.IGNORECASE)
                degree_text = re.sub(r'\s+', ' ', degree_text)
                edu_item["degree"] = degree_text
                break

        minor_match = re.search(
            r'(?i)\bminor\s+in\s+(.+?)(?=\s+expected\b|\s+' + MONTH_PATTERN + r'\s+\d{4}|\s+\d{4}\s*[-â€“â€”]|[,\n]|$)',
            entry,
        )
        if minor_match:
            minor_text = _strip_dates_and_locations(minor_match.group(1))
            minor_text = re.sub(r'\s+', ' ', minor_text).strip(" ;,")
            if minor_text:
                edu_item["minor"] = minor_text
        
        # extract field of study
        degree_line_field = None
        for line in lines:
            if re.search(r'(?i)\b(bachelor|master|associate|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?)\b', line):
                line_field_match = re.search(
                    r'(?i)\b(?:bachelor|master|associate)(?:\'?s)?\s+(?:of\s+)?(?:science|arts|engineering|business|technology|administration)?\s*[-–—]\s+(.+?)(?=\s+\b(?:bachelor|master|associate)\b|\s+\([^\)]*\)\s*[-–—]\s*in\s+progress|$)',
                    line,
                )
                if not line_field_match:
                    line_field_match = re.search(r'(?i)\bin\s+(.+)$', line)
                if line_field_match:
                    degree_line_field = _strip_dates_and_locations(line_field_match.group(1))
                    degree_line_field = re.sub(r'(?i)\s*[,;]\s*minor\s+in\s+.*$', '', degree_line_field)
                    degree_line_field = re.sub(r'(?i)\s+minor\s+in\s+.*$', '', degree_line_field)
                    degree_line_field = re.sub(r'(?i)\s+expected\b.*$', '', degree_line_field)
                    degree_line_field = re.sub(r'\s*,?\s*[\d.]+(?:\s*/\s*[\d.]+)?\s*GPA\b', '', degree_line_field, flags=re.IGNORECASE)
                    degree_line_field = re.sub(r'\s*GPA\s*:?\s*[\d.]+(?:\s*/\s*[\d.]+)?', '', degree_line_field, flags=re.IGNORECASE)
                    degree_line_field = re.sub(r'\s+', ' ', degree_line_field).strip(" ;,")
                    break

        field_patterns = [
            r'(?i)(?:in|major\s+in|degree\s+in)\s+([A-Z][A-Za-z\s&]+?)(?=\s*$|\s*[,;]|\s+[A-Z][a-z]+,\s*[A-Z]{2}|\s+[A-Z][a-z]+\s+\d{4}|\n)',
            r'(?i)(?:bachelor|master|phd|associate|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?)\s+(?:of\s+)?(?:science|arts|engineering|business|technology)\s+in\s+([A-Z][A-Za-z\s&]+?)(?=\s*$|\s*[,;]|\s+[A-Z][a-z]+,\s*[A-Z]{2}|\s+[A-Z][a-z]+\s+\d{4}|\n)',
        ]

        if degree_line_field and len(degree_line_field) > 2:
            edu_item["field"] = degree_line_field
        
        if not edu_item["field"]:
            for pattern in field_patterns:
                field_match = re.search(pattern, entry)
                if field_match:
                    field_text = field_match.group(1).strip()
                    field_text = re.sub(r'(?i)\s*;\s*minor\s+in\s+.*$', '', field_text)
                    field_text = re.sub(r'(?i)\s*,\s*minor\s+in\s+.*$', '', field_text)
                    field_text = re.sub(r'\s+[A-Z]{2}\s*$', '', field_text)
                    field_text = re.sub(r'\s+[A-Z][a-z]+,\s*[A-Z]{2}\s*$', '', field_text)
                    field_text = re.sub(r'\s+(?:Orlando|Miami|Tampa|Jacksonville|Tallahassee|Gainesville|Atlanta|New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|San Francisco|Columbus|Fort Worth|Charlotte|Seattle|Denver|Washington|Boston|El Paso|Detroit|Nashville|Memphis|Portland|Oklahoma City|Las Vegas|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Kansas City|Mesa|Omaha|Raleigh|Long Beach|Virginia Beach|Oakland|Minneapolis|Tulsa|Cleveland|Wichita|Arlington)\s*$', '', field_text, flags=re.IGNORECASE)
                    field_text = re.sub(r'\s+', ' ', field_text).strip()
                    if field_text and len(field_text) > 2:
                        edu_item["field"] = field_text
                        break
        
        # extract dates
        month_date_pattern = r'([A-Z][a-z]+)\s+(\d{4})\s*[-–—]\s*((?:[A-Z][a-z]+\s+)?\d{4}|present|current)'
        date_source_text = "\n".join(line for line in lines if not non_date_label_re.match(line))
        month_date_match = re.search(month_date_pattern, date_source_text, re.IGNORECASE)
        
        if month_date_match:
            try:
                start_month = month_date_match.group(1)
                start_year = month_date_match.group(2)
                end_str = month_date_match.group(3).lower() if month_date_match.group(3) else None
                
                month_map = {
                    'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
                    'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
                    'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
                    'august': '08', 'aug': '08', 'september': '09', 'sep': '09', 'sept': '09',
                    'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
                    'december': '12', 'dec': '12'
                }
                
                start_month_num = month_map.get(start_month.lower(), '01')
                edu_item["startDate"] = f"{start_year}-{start_month_num}"
                
                if end_str in ['present', 'current']:
                    edu_item["current"] = True
                else:
                    end_parts = end_str.split()
                    if len(end_parts) == 2:
                        end_month = end_parts[0]
                        end_year = end_parts[1]
                        end_month_num = month_map.get(end_month.lower(), '01')
                        edu_item["endDate"] = f"{end_year}-{end_month_num}"
                    elif len(end_parts) == 1 and end_parts[0].isdigit():
                        edu_item["endDate"] = f"{end_parts[0]}-01"
            except Exception:
                pass
        
        if not edu_item["startDate"]:
            year_date_pattern = r'(\d{4})\s*[-–—]\s*(\d{4}|present|current)'
            year_date_match = re.search(year_date_pattern, date_source_text, re.IGNORECASE)
            if year_date_match:
                start_year = year_date_match.group(1)
                end_date = year_date_match.group(2).lower()
                edu_item["startDate"] = f"{start_year}-01"
                if end_date in ['present', 'current']:
                    edu_item["current"] = True
                else:
                    edu_item["endDate"] = f"{end_date}-01"
        
        # Extract additional fields from the entry text
        entry_lower = entry.lower()
        
        # Extract honors & awards
        honors_patterns = [
            r'(?i)honors?\s*[&]?\s*awards?\s*:?\s*(.+?)(?=\n|clubs|extracurriculars|coursework|relevant|$)',
            r'(?i)awards?\s*:?\s*(.+?)(?=\n|clubs|extracurriculars|coursework|relevant|$)',
        ]
        for pattern in honors_patterns:
            honors_match = re.search(pattern, entry, re.IGNORECASE | re.DOTALL)
            if honors_match:
                honors_text = honors_match.group(1).strip()
                # Clean up the text
                honors_text = re.sub(r'\s+', ' ', honors_text)
                honors_text = re.sub(r'^\s*[:\-]\s*', '', honors_text)
                if honors_text:
                    edu_item["honorsAwards"] = honors_text
                    break
        
        # Extract clubs & extracurriculars
        clubs_patterns = [
            r'(?i)clubs?\s*[&]?\s*extracurriculars?\s*:?\s*(.+?)(?=\n|honors|awards|coursework|relevant|$)',
            r'(?i)clubs?\s*:?\s*(.+?)(?=\n|honors|awards|coursework|relevant|$)',
            r'(?i)organizations?\s*:?\s*(.+?)(?=\n|honors|awards|coursework|relevant|$)',
            r'(?i)extracurriculars?\s*:?\s*(.+?)(?=\n|honors|awards|coursework|relevant|$)',
        ]
        for pattern in clubs_patterns:
            clubs_match = re.search(pattern, entry, re.IGNORECASE | re.DOTALL)
            if clubs_match:
                clubs_text = clubs_match.group(1).strip()
                clubs_text = re.sub(r'\s+', ' ', clubs_text)
                clubs_text = re.sub(r'^\s*[:\-]\s*', '', clubs_text)
                if clubs_text:
                    edu_item["clubsExtracurriculars"] = clubs_text
                    break
        
        # Extract location (City, State pattern)
        location_pattern = r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\s*$'
        location_match = re.search(location_pattern, entry)
        if location_match:
            location = location_match.group(0).strip()
            edu_item["location"] = location
        
        # Extract relevant coursework
        coursework_patterns = [
            r'(?i)relevant\s+coursework\s*:?\s*(.+?)(?=\nhonors|\nawards|\nclubs|\nextracurriculars|$)',
            r'(?i)coursework\s*:?\s*(.+?)(?=\nhonors|\nawards|\nclubs|\nextracurriculars|$)',
        ]
        for pattern in coursework_patterns:
            coursework_match = re.search(pattern, entry, re.IGNORECASE | re.DOTALL)
            if coursework_match:
                coursework_text = coursework_match.group(1).strip()
                coursework_text = re.sub(r'\s+', ' ', coursework_text)
                coursework_text = re.sub(r'^\s*[:\-]\s*', '', coursework_text)
                if coursework_text:
                    edu_item["relevantCoursework"] = coursework_text
                    break
        
        if edu_item["school"] or edu_item["degree"]:
            education.append(edu_item)
    
    return education

