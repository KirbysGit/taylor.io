# parsers/__init__.py

from .contact_parser import parse_contact
from .education_parser import parse_education
from .experience_parser import parse_experience
from .skills_parser import parse_skills
from .projects_parser import parse_projects
from .summary_parser import parse_summary

__all__ = ["parse_contact", "parse_education", "parse_experience", "parse_skills", "parse_projects", "parse_summary"]

