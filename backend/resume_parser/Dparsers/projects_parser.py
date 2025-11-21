# parsers/projects_parser.py

# Projects extraction.

import re
from typing import Dict, List, Optional


def parse_projects(section_text: str) -> List[Dict[str, Optional[str]]]:
    """Extract projects from projects section text."""
    if not section_text or not section_text.strip():
        return []
    
    projects = []
    
    # split into individual project entries
    entries = re.split(r'\n\s*\n', section_text)
    
    for entry in entries:
        entry = entry.strip()
        if not entry or len(entry) < 10:
            continue
        
        project_item = {
            "title": None,
            "description": None,
            "techStack": None,
        }
        
        lines = [line.strip() for line in entry.split('\n') if line.strip()]
        if not lines:
            continue
        
        # first line is often project title
        project_item["title"] = lines[0]
        
        # remaining lines are description
        if len(lines) > 1:
            description_lines = []
            tech_stack = []
            
            for line in lines[1:]:
                tech_keywords = ['python', 'javascript', 'react', 'node', 'java', 'sql', 'html', 'css', 'api', 'framework']
                if any(keyword in line.lower() for keyword in tech_keywords):
                    tech_items = re.findall(r'\b[A-Z][a-zA-Z]+\b|\b\w+\.(js|py|ts|jsx|tsx)\b', line)
                    tech_stack.extend(tech_items)
                else:
                    description_lines.append(line)
            
            if description_lines:
                project_item["description"] = " ".join(description_lines)
            
            if tech_stack:
                project_item["techStack"] = list(set(tech_stack))
        
        if project_item["title"]:
            projects.append(project_item)
    
    return projects

