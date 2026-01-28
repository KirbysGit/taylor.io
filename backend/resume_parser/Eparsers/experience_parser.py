# parsers/experience_parser.py

# Work experience extraction.

import re
from typing import Dict, List, Optional


def parse_experience(section_text: str) -> List[Dict[str, Optional[str]]]:
    """Extract work experience from experience section text."""
    if not section_text or not section_text.strip():
        return []
    
    experiences = []
    
    # Split by lines and detect experience boundaries
    # An experience starts with a title line that has a date pattern
    lines = [line.strip() for line in section_text.split('\n') if line.strip()]
    if not lines:
        return []
    
    # Detect experience boundaries: lines that look like job titles with dates
    # Pattern: Title followed by date (not a bullet point)
    date_pattern = r'([A-Z][a-z]+\s+\d{4}|\d{4})\s*[-–—]\s*([A-Z][a-z]+\s+\d{4}|\d{4}|present|current)'
    
    entry_starts = [0]  # First line is always a start
    for i in range(1, len(lines)):
        line = lines[i]
        # Check if this line has a date pattern and doesn't start with bullet
        # This indicates a new experience starting
        has_date = re.search(date_pattern, line, re.IGNORECASE)
        is_bullet = line.strip().startswith('•') or line.strip().startswith('-') or line.strip().startswith('*')
        
        if has_date and not is_bullet:
            # This is likely a new experience
            # Check if previous line was also a title (both have dates = definitely new experience)
            if i > 0:
                prev_line = lines[i-1]
                prev_has_date = re.search(date_pattern, prev_line, re.IGNORECASE)
                prev_is_bullet = prev_line.strip().startswith('•') or prev_line.strip().startswith('-') or prev_line.strip().startswith('*')
                
                # If previous line had a date and wasn't a bullet, this is a new experience
                # OR if previous was a bullet (end of description), this is a new experience
                if (prev_has_date and not prev_is_bullet) or prev_is_bullet:
                    entry_starts.append(i)
    
    # Split into entries based on detected boundaries
    entries = []
    for i in range(len(entry_starts)):
        start_idx = entry_starts[i]
        end_idx = entry_starts[i+1] if i+1 < len(entry_starts) else len(lines)
        entry = '\n'.join(lines[start_idx:end_idx])
        entries.append(entry)
    
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
            "location": None,
            "skills": None,
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
        
        # extract company and location
        if len(lines) > 1:
            company_line = lines[1]
            company_line = re.sub(date_pattern, '', company_line, flags=re.IGNORECASE).strip()
            
            # Pattern for location: "City, ST" or "Remote" or similar
            location_patterns = [
                r'\b(Remote|On-site|Onsite|Hybrid)\b',  # Work location keywords
                r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b',  # City, State pattern
            ]
            
            # First, check for pipe-separated values
            if '|' in company_line:
                parts = [p.strip() for p in company_line.split('|')]
                company_name = parts[0]
                # check remaining parts for location/role type
                for part in parts[1:]:
                    if re.match(r'^(Remote|On-site|Onsite|Hybrid)$', part, re.IGNORECASE):
                        if not exp_item["location"]:
                            exp_item["location"] = part
            else:
                company_name = company_line
            
            # Extract location from company line (City, State pattern)
            # Simple heuristic: find ", ST" at the end, extract last 1-2 words before comma as city
            # Pattern: ", [A-Z]{2}" at the end of the line
            state_pattern = r',\s*([A-Z]{2})\s*$'
            state_match = re.search(state_pattern, company_name)
            if state_match and not exp_item["location"]:
                state_code = state_match.group(1)
                # Find the position of the comma
                comma_pos = company_name.rfind(',')
                if comma_pos > 0:
                    # Get everything before the comma
                    before_comma = company_name[:comma_pos].strip()
                    words = before_comma.split()
                    
                    # Extract city: try last 2 words first (for "Santa Clara", "New York", etc.)
                    # Use heuristics: if second-to-last word is a city prefix or very short, include both
                    # Otherwise, just take the last word (safer for company names)
                    city_words = []
                    if len(words) >= 2:
                        word1, word2 = words[-2], words[-1]
                        # Common city prefixes that indicate multi-word cities
                        city_prefixes = ['Santa', 'San', 'New', 'Los', 'Las', 'Fort', 'Saint', 'St', 'Mount', 'Lake', 'Port', 'East', 'West', 'North', 'South']
                        # If word1 is a known city prefix, include both words
                        if word1 in city_prefixes:
                            city_words = [word1, word2]
                        # If word1 is very short (<=3 chars) and both capitalized, might be city
                        elif len(word1) <= 3 and word1[0].isupper() and word2[0].isupper():
                            city_words = [word1, word2]
                        else:
                            # Default: just take last word (safer - avoids "Hacks Orlando" from "Knight Hacks Orlando")
                            city_words = [word2]
                    elif len(words) >= 1:
                        city_words = [words[-1]]
                    
                    if city_words:
                        city_name = ' '.join(city_words)
                        location = f"{city_name}, {state_code}"
                        exp_item["location"] = location
                        # Remove location from company name (from the end)
                        # Remove the city words and comma+state from the end of the string
                        location_to_remove = ' '.join(city_words) + ', ' + state_code
                        # Remove from end to avoid removing if it appears elsewhere in company name
                        if company_name.endswith(location_to_remove):
                            company_name = company_name[:-len(location_to_remove)].strip()
                        else:
                            # Fallback: use replace if end check fails
                            company_name = company_name.replace(location_to_remove, '').strip()
                        # Clean up any extra spaces
                        company_name = re.sub(r'\s+', ' ', company_name).strip()
            
            # Extract "Remote" or similar location keywords
            remote_match = re.search(r'\b(Remote|On-site|Onsite|Hybrid)\b', company_name, re.IGNORECASE)
            if remote_match and not exp_item["location"]:
                location = remote_match.group(1)
                exp_item["location"] = location
                # Remove location keyword from company name
                company_name = re.sub(r'\s*\b' + re.escape(location) + r'\b\s*', '', company_name, flags=re.IGNORECASE).strip()
            
            
            # Final cleanup: remove any remaining location/role keywords
            company_name = re.sub(r'\s+(Remote|On-site|Onsite|Hybrid|Full-time|Part-time|Contract|Internship|Freelance|Temporary)\s*$', '', company_name, flags=re.IGNORECASE)
            company_name = company_name.strip()
            if company_name and not re.match(r'^\d{4}', company_name):
                exp_item["company"] = company_name
        
        # extract location and role type from separate lines
        location_role_pattern = r'^(Remote|On-site|Onsite|Hybrid|Full-time|Part-time|Contract|Internship|Freelance|Temporary)$'
        for i in range(len(lines)):
            line = lines[i].strip()
            if re.match(location_role_pattern, line, re.IGNORECASE):
                if line.lower() in ['remote', 'on-site', 'onsite', 'hybrid']:
                    if not exp_item["location"]:
                        exp_item["location"] = line
                else:
                    continue
        
        # extract description
        description_lines = []
        start_desc = 2
        if date_line_idx is not None:
            start_desc = max(2, date_line_idx + 1)
        
        for i in range(start_desc, len(lines)):
            line = lines[i]
            if re.match(r'^[A-Z][a-z]+.*\d{4}', line):
                break
            if re.match(location_role_pattern, line, re.IGNORECASE):
                continue
            description_lines.append(line)
        
        if description_lines:
            description = "\n".join(description_lines)
            # normalize bullets - match more Unicode bullet characters (same as pipeline.py)
            # normalize any bullet marker to "• " at start of lines
            description = re.sub(r'^[\s]*[-*•∙▪▫]\s*', '• ', description, flags=re.MULTILINE)
            
            # extract bullet items: find all lines that start with bullets
            lines = description.split('\n')
            bullet_items = []
            current_bullet = []
            
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue
                
                # check if this line starts with a bullet
                if stripped.startswith('•'):
                    # save previous bullet if exists
                    if current_bullet:
                        bullet_text = ' '.join(current_bullet)
                        bullet_text = re.sub(r'^•\s+', '', bullet_text)  # remove leading bullet
                        if bullet_text.strip():
                            bullet_items.append(bullet_text.strip())
                    # start new bullet
                    current_bullet = [stripped]
                elif current_bullet:
                    # continuation of current bullet (multi-line bullet)
                    current_bullet.append(stripped)
                # else: skip non-bullet lines that come before any bullets
            
            # save last bullet
            if current_bullet:
                bullet_text = ' '.join(current_bullet)
                bullet_text = re.sub(r'^•\s+', '', bullet_text)  # remove leading bullet
                if bullet_text.strip():
                    bullet_items.append(bullet_text.strip())
            
            # clean each bullet item
            cleaned_items = []
            for item in bullet_items:
                # remove extra whitespace
                item = re.sub(r'[ \t]+', ' ', item)
                item = re.sub(r'\s+([,\.;:!?])', r'\1', item)
                item = item.strip()
                if item:
                    cleaned_items.append(item)
            
            # return as list if we have bullets, otherwise as string
            if cleaned_items:
                exp_item["description"] = "• " + "\n• ".join(cleaned_items)
            else:
                exp_item["description"] = description.strip()
        
        if exp_item["title"]:
            experiences.append(exp_item)
    
    return experiences

