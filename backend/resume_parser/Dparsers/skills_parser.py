# parsers/skills_parser.py

# Skills extraction.

import re
from typing import Dict, List
from ..Bcleaner.clean_text_regex import clean_text_regex


def parse_skills(section_text: str) -> List[Dict[str, str]]:
    """Extract skills from skills section text, preserving category groupings if present."""
    if not section_text or not section_text.strip():
        return []
    
    skills = []
    
    # check if skills are organized by categories
    category_pattern = r'^([A-Z][A-Za-z\s]+?)\s*:\s*(.+)$'
    
    lines = [line.strip() for line in section_text.split('\n') if line.strip()]
    
    current_category = None
    
    for line in lines:
        category_match = re.match(category_pattern, line)
        if category_match:
            category_name = category_match.group(1).strip()
            skills_list = category_match.group(2).strip()
            current_category = category_name
            
            skill_items = re.split(r'[,;]', skills_list)
            for skill in skill_items:
                skill = skill.strip()
                skill = clean_text_regex(skill)
                if skill and len(skill) > 1 and len(skill) < 50:
                    if not re.match(r'(?i)^(and|or|the|a|an|with|using)$', skill):
                        skills.append({
                            "name": skill,
                            "category": current_category
                        })
        else:
            if current_category:
                skill_items = re.split(r'[,;]', line)
                for skill in skill_items:
                    skill = skill.strip()
                    skill = clean_text_regex(skill)
                    if skill and len(skill) > 1 and len(skill) < 50:
                        if not re.match(r'(?i)^(and|or|the|a|an|with|using)$', skill):
                            skills.append({
                                "name": skill,
                                "category": current_category
                            })
            else:
                line_cleaned = re.sub(r'[•\-\*]', ',', line)
                skill_items = re.split(r'[,;]', line_cleaned)
                for skill in skill_items:
                    skill = skill.strip()
                    skill = clean_text_regex(skill)
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
            skill = clean_text_regex(skill)
            if skill and len(skill) > 1 and len(skill) < 50:
                if not re.match(r'(?i)^(and|or|the|a|an|with|using)$', skill):
                    skills.append({"name": skill})
    
    return skills

