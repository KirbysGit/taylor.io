# parsers/skills_parser.py

# Skills extraction.

import re
from typing import Dict, List


def parse_skills(section_text: str) -> List[Dict[str, str]]:
    """Extract skills from skills section text, preserving category groupings if present."""
    if not section_text or not section_text.strip():
        return []
    
    skills = []
    
    # Pattern to match category headers: "Category Name:" or "Category/Name:" followed by skills
    # More flexible: allows for slashes, spaces, and various category formats
    # Pattern: starts with capital letter, followed by letters/spaces/slashes, then colon, then skills
    # Use greedy match to capture full category name before colon
    category_pattern = r'^([A-Z][A-Za-z\s/]+)\s*:\s*(.+)$'
    
    lines = [line.strip() for line in section_text.split('\n') if line.strip()]
    
    current_category = None
    
    for line in lines:
        # Check if this line starts a new category
        # Look for pattern: "CategoryName:" or "Category Name:" or "Category/Name:"
        category_match = re.match(category_pattern, line)
        if category_match:
            category_name = category_match.group(1).strip()
            skills_list = category_match.group(2).strip()
            # Clean up category name (remove any trailing punctuation)
            category_name = re.sub(r'[^\w\s/]', '', category_name).strip()
            current_category = category_name
            
            # Extract skills from the rest of the line
            if skills_list:
                skill_items = re.split(r'[,;]', skills_list)
                for skill in skill_items:
                    skill = skill.strip()
                    if skill and len(skill) > 1 and len(skill) < 50:
                        # Skip common words and ensure it's a valid skill
                        if not re.match(r'(?i)^(and|or|the|a|an|with|using)$', skill):
                            skills.append({
                                "name": skill,
                                "category": current_category
                            })
        else:
            # This line continues the previous category (no category header)
            if current_category:
                # Extract skills from this continuation line
                skill_items = re.split(r'[,;]', line)
                for skill in skill_items:
                    skill = skill.strip()
                    if skill and len(skill) > 1 and len(skill) < 50:
                        # Skip common words and ensure it's a valid skill
                        if not re.match(r'(?i)^(and|or|the|a|an|with|using)$', skill):
                            skills.append({
                                "name": skill,
                                "category": current_category
                            })
            else:
                # No category detected yet, treat as uncategorized skills
                line_cleaned = re.sub(r'[•\-\*]', ',', line)
                skill_items = re.split(r'[,;]', line_cleaned)
                for skill in skill_items:
                    skill = skill.strip()
                    if skill and len(skill) > 1 and len(skill) < 50:
                        if not re.match(r'(?i)^(and|or|the|a|an|with|using)$', skill):
                            skills.append({"name": skill})
    
    # if no categories were found, fall back to original method
    if not any(skill.get("category") for skill in skills):
        skills_text_cleaned = re.sub(r'[•\-\*]', ',', section_text)
        skills_text_cleaned = re.sub(r'\s*\n\s*', ', ', skills_text_cleaned)
        
        skill_items = re.split(r'[,;]', skills_text_cleaned)
        
        skills = []
        for skill in skill_items:
            skill = skill.strip()
            if skill and len(skill) > 1 and len(skill) < 50:
                if not re.match(r'(?i)^(and|or|the|a|an|with|using)$', skill):
                    skills.append({"name": skill})
    
    return skills

