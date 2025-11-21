# routers/resume_parser.py

# Thin router wrapper for resume parser.

# This file maintains backward compatibility by importing from the modular resume_parser package.
# The actual parsing logic has been moved to backend/resume_parser/

from resume_parser import parse_resume_file

# Re-export for backward compatibility
__all__ = ["parse_resume_file"]
