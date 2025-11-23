# parsers/projects_parser.py

# Projects extraction.

import re
from typing import Dict, List, Optional


def parse_projects(section_text: str) -> List[Dict[str, Optional[str]]]:
    """Extract projects from projects section text."""
    if not section_text or not section_text.strip():
        return []
    
    projects = []
    
    # split by project boundaries: lines starting with project name followed by | or –
    lines = [line.strip() for line in section_text.split('\n') if line.strip()]
    if not lines:
        return []
    
    current_project = None
    
    for i, line in enumerate(lines):
        # detect project title: line with | separator (tech stack indicator)
        # pattern: "ProjectName – Description | Tech Stack" or "ProjectName | Tech Stack"
        # Don't split on dashes - keep title as-is
        if '|' in line and not line.strip().startswith('•'):
            # if we have a previous project, save it
            if current_project and current_project.get("title"):
                # convert description list to string if needed
                if isinstance(current_project["description"], list):
                    description = "\n".join(current_project["description"])
                    description = re.sub(r'^[\s]*[•\-\*]\s*', '• ', description, flags=re.MULTILINE)
                    # split by bullets into list
                    bullet_items = re.split(r'•\s+', description)
                    bullet_items = [item.strip() for item in bullet_items if item.strip()]
                    # clean each bullet item (remove newlines)
                    cleaned_items = []
                    for item in bullet_items:
                        # remove newlines and replace with spaces
                        item = re.sub(r'\n+', ' ', item)
                        item = re.sub(r'[ \t]+', ' ', item)
                        item = re.sub(r'\s+([,\.;:!?])', r'\1', item)
                        item = item.strip()
                        if item:
                            cleaned_items.append(item)
                    # return as list if we have bullets, otherwise as string
                    if cleaned_items:
                        current_project["description"] = cleaned_items
                    else:
                        current_project["description"] = description.strip() if description.strip() else None
                projects.append(current_project)
            
            # start new project - split on | to get title and tech stack
            parts = line.split('|')
            # everything before | is the full title (keep dashes as-is)
            title = parts[0].strip()
            # everything after | is tech stack
            tech_stack_str = '|'.join(parts[1:]).strip() if len(parts) > 1 else ''
            
            # Extract URLs from tech stack string (pattern: https?://[^\s|,]+)
            url_pattern = r'https?://[^\s|,]+'
            urls_found = re.findall(url_pattern, tech_stack_str, re.IGNORECASE)
            project_url = urls_found[0] if urls_found else None
            
            # Remove URLs from tech stack string
            if urls_found:
                for url in urls_found:
                    tech_stack_str = tech_stack_str.replace(url, '').strip()
                # Clean up any leftover separators
                tech_stack_str = re.sub(r'[,|]\s*[,|]+', ',', tech_stack_str)
                tech_stack_str = tech_stack_str.strip(' ,|')
            
            # extract tech stack
            tech_stack = []
            if tech_stack_str:
                # split by comma or pipe
                tech_items = [t.strip() for t in re.split(r'[,|]', tech_stack_str) if t.strip()]
                # Filter out any remaining URLs that might have been missed
                tech_items = [item for item in tech_items if not re.match(r'^https?://', item, re.IGNORECASE)]
                tech_stack.extend(tech_items)
            
            current_project = {
                "title": title,
                "description": None,
                "techStack": tech_stack if tech_stack else [],
                "url": project_url,
            }
        else:
            # this is description content
            if current_project:
                # Check for URLs in description lines
                url_pattern = r'https?://[^\s|,]+'
                urls_in_line = re.findall(url_pattern, line, re.IGNORECASE)
                if urls_in_line and not current_project.get("url"):
                    # Store first URL found in description if no URL set yet
                    current_project["url"] = urls_in_line[0]
                    # Remove URL from the line before adding to description
                    for url in urls_in_line:
                        line = line.replace(url, '').strip()
                    line = re.sub(r'\s+', ' ', line).strip()
                
                if not current_project["description"]:
                    current_project["description"] = []
                if line:  # Only add non-empty lines
                    current_project["description"].append(line)
    
    # save last project
    if current_project and current_project.get("title"):
        if isinstance(current_project["description"], list):
            description = "\n".join(current_project["description"])
            description = re.sub(r'^[\s]*[•\-\*]\s*', '• ', description, flags=re.MULTILINE)
            # split by bullets into list
            bullet_items = re.split(r'•\s+', description)
            bullet_items = [item.strip() for item in bullet_items if item.strip()]
            # clean each bullet item (remove newlines)
            cleaned_items = []
            for item in bullet_items:
                # remove newlines and replace with spaces
                item = re.sub(r'\n+', ' ', item)
                item = re.sub(r'[ \t]+', ' ', item)
                item = re.sub(r'\s+([,\.;:!?])', r'\1', item)
                item = item.strip()
                if item:
                    cleaned_items.append(item)
            # return as list if we have bullets, otherwise as string
            if cleaned_items:
                current_project["description"] = cleaned_items
            else:
                current_project["description"] = description.strip() if description.strip() else None
        projects.append(current_project)
    
    return projects

