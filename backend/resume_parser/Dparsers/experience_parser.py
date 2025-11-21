# parsers/experience_parser.py

# Work experience extraction.

import re
from typing import Dict, List, Optional
from ..Bcleaner.clean_text_regex import clean_text_regex


def parse_experience(section_text: str) -> List[Dict[str, Optional[str]]]:
    """Extract work experience from experience section text."""
    if not section_text or not section_text.strip():
        return []
    
    experiences = []
    
    # split into individual job entries
    entries = re.split(r'\n\s*\n', section_text)
    
    for entry in entries:
        entry = entry.strip()
        if not entry or len(entry) < 20:
            continue
        
        exp_item = {
            "title": None,
            "company": None,
            "description": None,
            "startDate": None,
            "endDate": None,
            "current": False,
        }
        
        lines = [line.strip() for line in entry.split('\n') if line.strip()]
        if not lines:
            continue
        
        # extract dates first
        date_pattern = r'([A-Z][a-z]+\s+\d{4}|\d{4})\s*[-–—]\s*([A-Z][a-z]+\s+\d{4}|\d{4}|present|current)'
        date_match = None
        date_line_idx = None
        
        for i, line in enumerate(lines):
            date_match = re.search(date_pattern, line, re.IGNORECASE)
            if date_match:
                date_line_idx = i
                break
        
        # parse dates if found
        if date_match:
            start_date_str = date_match.group(1).strip()
            end_date_str = date_match.group(2).strip().lower()
            
            month_map = {
                'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
                'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
                'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
                'august': '08', 'aug': '08', 'september': '09', 'sep': '09', 'sept': '09',
                'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
                'december': '12', 'dec': '12'
            }
            
            if re.match(r'^\d{4}$', start_date_str):
                exp_item["startDate"] = f"{start_date_str}-01"
            elif re.match(r'^[A-Z][a-z]+\s+\d{4}$', start_date_str, re.IGNORECASE):
                try:
                    parts = start_date_str.split()
                    month = month_map.get(parts[0].lower(), '01')
                    year = parts[1]
                    exp_item["startDate"] = f"{year}-{month}"
                except:
                    exp_item["startDate"] = start_date_str
            
            if end_date_str in ['present', 'current']:
                exp_item["current"] = True
            elif re.match(r'^\d{4}$', end_date_str):
                exp_item["endDate"] = f"{end_date_str}-01"
            elif re.match(r'^[A-Z][a-z]+\s+\d{4}$', end_date_str, re.IGNORECASE):
                try:
                    parts = end_date_str.split()
                    month = month_map.get(parts[0].lower(), '01')
                    year = parts[1]
                    exp_item["endDate"] = f"{year}-{month}"
                except:
                    exp_item["endDate"] = end_date_str
        
        # extract title
        if lines:
            title = lines[0]
            title = re.sub(date_pattern, '', title, flags=re.IGNORECASE).strip()
            title = re.sub(r'\s+\|\s*$', '', title)
            exp_item["title"] = title if title else None
        
        # extract company
        if len(lines) > 1:
            company_line = lines[1]
            company_line = re.sub(date_pattern, '', company_line, flags=re.IGNORECASE).strip()
            
            if '|' in company_line:
                parts = company_line.split('|')
                company_name = parts[0].strip()
            else:
                company_name = company_line
            
            company_name = re.sub(r'\s+(Remote|On-site|Onsite|Hybrid|Full-time|Part-time|Contract|Internship)\s*$', '', company_name, flags=re.IGNORECASE)
            company_name = company_name.strip()
            if company_name and not re.match(r'^\d{4}', company_name):
                exp_item["company"] = company_name
        
        # extract description
        description_lines = []
        start_desc = 2
        if date_line_idx is not None:
            start_desc = max(2, date_line_idx + 1)
        
        for i in range(start_desc, len(lines)):
            line = lines[i]
            if re.match(r'^[A-Z][a-z]+.*\d{4}', line):
                break
            if re.match(r'^(Remote|On-site|Onsite|Hybrid|Full-time|Part-time)$', line, re.IGNORECASE):
                continue
            description_lines.append(line)
        
        if description_lines:
            description = "\n".join(description_lines)
            description = clean_text_regex(description)
            description = re.sub(r'^[\s]*[•\-\*]\s*', '• ', description, flags=re.MULTILINE)
            description = re.sub(r'•\s*([^\n•]+)', r'• \1', description)
            description = re.sub(r'[ \t]+', ' ', description)
            description = re.sub(r'\n\s*\n', '\n', description)
            description = re.sub(r'•\s*([^\n]+)\s*•', r'• \1\n•', description)
            exp_item["description"] = description.strip()
        
        if exp_item["title"]:
            experiences.append(exp_item)
    
    return experiences

