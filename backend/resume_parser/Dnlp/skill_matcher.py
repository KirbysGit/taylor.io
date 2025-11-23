# resume_parser/Dnlp/skill_matcher.py

import re
from typing import List, Dict

SKILL_DICT = {
    "languages": [
        "python", "javascript", "typescript", "java", "c++", "sql", "html", "css"
    ],
    "frameworks": [
        "react", "next.js", "node.js", "django", "fastapi", "flask", 
        "pytorch", "tensorflow", "xgboost"
    ],
    "databases": [
        "postgresql", "mysql", "mongodb", "redis"
    ],
    "cloud": [
        "aws", "ec2", "lambda", "s3", "gcp", "azure", "docker", "kubernetes"
    ],
}

# Flatten for easier matching
ALL_SKILLS = {skill.lower(): cat for cat, skills in SKILL_DICT.items() for skill in skills}


def extract_skills_nlp(text: str) -> Dict[str, List[str]]:
    """Return skills found using keyword detection."""
    found = {cat: [] for cat in SKILL_DICT.keys()}
    lowered = text.lower()

    for skill, category in ALL_SKILLS.items():
        if re.search(rf"\b{re.escape(skill)}\b", lowered):
            found[category].append(skill)

    return found
