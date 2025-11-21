# parsers/education_parser.py

# Education information extraction.

import re
from typing import Dict, List, Optional


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
            "startDate": None,
            "endDate": None,
            "current": False,
        }
        
        lines = [line.strip() for line in entry.split('\n') if line.strip()]
        if not lines:
            continue
        
        # extract school name - look for university/college patterns or first line
        for i, line in enumerate(lines):
            if i == 0 or re.search(r'(?i)(university|college|institute|school|academy)', line):
                school_name = re.sub(r'\s*\([^\)]+\)', '', line).strip()
                school_name = re.sub(r'\s*[A-Z][a-z]+\s+\d{4}\s*[-–—]\s*([A-Z][a-z]+\s+)?\d{4}', '', school_name, flags=re.IGNORECASE)
                school_name = re.sub(r'\s*\d{4}\s*[-–—]\s*\d{4}', '', school_name)
                school_name = re.sub(r'\s+[A-Z][a-z]+,\s*[A-Z]{2}\s*$', '', school_name)
                school_name = re.sub(r',\s*[A-Z]{2}\s*$', '', school_name)
                school_name = re.sub(r'\s+[A-Z]{2}\s*$', '', school_name)
                
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
                degree_text = re.sub(r'\s+', ' ', degree_text)
                edu_item["degree"] = degree_text
                break
        
        # extract field of study
        field_patterns = [
            r'(?i)(?:in|major\s+in|degree\s+in)\s+([A-Z][A-Za-z\s&]+?)(?=\s*$|\s*[,;]|\s+[A-Z][a-z]+,\s*[A-Z]{2}|\s+[A-Z][a-z]+\s+\d{4}|\n)',
            r'(?i)(?:bachelor|master|phd|associate|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?)\s+(?:of\s+)?(?:science|arts|engineering|business|technology)\s+in\s+([A-Z][A-Za-z\s&]+?)(?=\s*$|\s*[,;]|\s+[A-Z][a-z]+,\s*[A-Z]{2}|\s+[A-Z][a-z]+\s+\d{4}|\n)',
        ]
        
        for pattern in field_patterns:
            field_match = re.search(pattern, entry)
            if field_match:
                field_text = field_match.group(1).strip()
                field_text = re.sub(r'\s+[A-Z]{2}\s*$', '', field_text)
                field_text = re.sub(r'\s+[A-Z][a-z]+,\s*[A-Z]{2}\s*$', '', field_text)
                field_text = re.sub(r'\s+(?:Orlando|Miami|Tampa|Jacksonville|Tallahassee|Gainesville|Atlanta|New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|San Francisco|Columbus|Fort Worth|Charlotte|Seattle|Denver|Washington|Boston|El Paso|Detroit|Nashville|Memphis|Portland|Oklahoma City|Las Vegas|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Kansas City|Mesa|Omaha|Raleigh|Long Beach|Virginia Beach|Oakland|Minneapolis|Tulsa|Cleveland|Wichita|Arlington)\s*$', '', field_text, flags=re.IGNORECASE)
                field_text = re.sub(r'\s+', ' ', field_text).strip()
                if field_text and len(field_text) > 2:
                    edu_item["field"] = field_text
                    break
        
        # extract dates
        month_date_pattern = r'([A-Z][a-z]+)\s+(\d{4})\s*[-–—]\s*((?:[A-Z][a-z]+\s+)?\d{4}|present|current)'
        month_date_match = re.search(month_date_pattern, entry, re.IGNORECASE)
        
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
            year_date_match = re.search(year_date_pattern, entry, re.IGNORECASE)
            if year_date_match:
                start_year = year_date_match.group(1)
                end_date = year_date_match.group(2).lower()
                edu_item["startDate"] = f"{start_year}-01"
                if end_date in ['present', 'current']:
                    edu_item["current"] = True
                else:
                    edu_item["endDate"] = f"{end_date}-01"
        
        if edu_item["school"] or edu_item["degree"]:
            education.append(edu_item)
    
    return education

