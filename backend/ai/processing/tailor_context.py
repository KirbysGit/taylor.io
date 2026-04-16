from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Dict, Iterable, List, Set
import json

# --- local imports.
from ..shared.text_utils import normalize_term
from .alias_map import canonicalize_term, get_term_aliases

# --- takes our nested resume data & flattens it to a single string. --- #
# input -> resume data (dict)
# output -> flattened resume text (str)
def flatten_resume_text(resumeData):

    # verifies resume data is a dictionary.
    if not isinstance(resumeData, dict):
        return {
            "summary": [],
            "education": [],
            "experience": [],
            "projects": [],
            "skills": [],
        }

    buckets = {
        "summary": [],
        "education": [],
        "experience": [],
        "projects": [],
        "skills": [],
    }

    # initialize chunks.
    chunks = []

    # get the summary.
    summary = resumeData.get("summary", {})
    if isinstance(summary, dict):
        value = summary.get("summary")
        if isinstance(value, str) and value.strip():
            buckets["summary"].append(value.strip())

    # get the education.
    education = resumeData.get("education", [])
    if isinstance(education, list):
        for row in education:
            if not isinstance(row, dict):
                continue
                
            parts = []
            for key in ("school", "degree", "discipline", "location", "gpa", "minor"):
                value = row.get(key)
                if isinstance(value, str) and value.strip():
                    parts.append(value.strip())

            # deal w/ subsections (if any).
            subsections = row.get("subsections", {})
            if isinstance(subsections, dict):
                for key, value in subsections.items():
                    if isinstance(value, str) and value.strip():
                        parts.append(f"{key.strip().lower()}: {value.strip()}")

            if parts:
                buckets["education"].append(f"{' | '.join(parts)}")


    # get the experience.
    experience = resumeData.get("experience", [])
    if isinstance(experience, list):
        for row in experience:
            if not isinstance(row, dict):
                continue

            parts = []
            for key in ("title", "company", "description", "location", "skills"):
                value = row.get(key)
                if isinstance(value, str) and value.strip():
                    parts.append(value.strip())

            if parts:
                buckets["experience"].append(f"{' | '.join(parts)}")

    # get the projects.
    projects = resumeData.get("projects", [])
    if isinstance(projects, list):
        for row in projects:
            if not isinstance(row, dict):
                continue

            parts = []

            # get main project details.
            for key in ("title", "description", "url"):
                value = row.get(key)
                if isinstance(value, str) and value.strip():
                    parts.append(value.strip())

            # deal w/ tech stack (if any).
            tech_stack = row.get("tech_stack", [])
            if isinstance(tech_stack, list):
                techs = [tech.strip() for tech in tech_stack if isinstance(tech, str) and tech.strip()]
                if techs:
                    parts.append(f"tech: {', '.join(techs)}")

            if parts:
                buckets["projects"].append(f"{' | '.join(parts)}")

    # get the skills.
    skills = resumeData.get("skills", [])
    if isinstance(skills, list):
        grouped_skills = defaultdict(list)

        for row in skills:
            if not isinstance(row, dict):
                continue
                
            category = str(row.get("category", "")).strip()
            name = str(row.get("name", "")).strip()

            if not category or not name:
                continue

            grouped_skills[category].append(name)

        for category, names in grouped_skills.items():
            buckets["skills"].append(f"{category.strip().lower()}: {', '.join(names)}")

    # return the chunks.
    return buckets


# --- converts our resume data to a single string. --- #
# input -> resume data (dict)
# output -> joined resume text (str)
def resume_blob(resumeSections):
    return " \n ".join(chunk for section_items in resumeSections.values() for chunk in section_items).lower()

def is_in_resume(term, resumeStr):
    # iterate over the potential aliases checking the resume.
    for alias in get_term_aliases(term):

        # create a regex pattern for the alias.
        pattern = r"(?<![a-z0-9])" + re.escape(alias) + r"(?![a-z0-9])"

        # if the alias is in the resume string, return True.
        if re.search(pattern, resumeStr):
            return True
        
    return False

# --- builds the tailor context. --- #
# input -> target role (str), keywords (list), resume data (dict)
# output -> tailor context (dict)
def build_tailor_context(targetRole, activeDomains, keywords, resumeData):

    # grab keywords & resume data.
    resumeData = resumeData if isinstance(resumeData, dict) else {}

    # converts resume dict to single string.
    resumeSections = flatten_resume_text(resumeData)

    # turn resume sections into a single string.
    resumeStr = resume_blob(resumeSections)

    # initialize hits & gaps.
    resumeHits = []
    resumeGaps = []
    seen = set()

    for entry in keywords:
        # get the term and canonicalize it.
        term = entry.get("term", "")
        canon = canonicalize_term(term)

        # if term is empty or canonical already seen, continue.
        if not term or canon in seen:
            continue

        # add the canonical to the seen set.
        seen.add(canon)

        # checks all alias variants against resume str.
        if is_in_resume(term, resumeStr):
            resumeHits.append(canon)
        else:
            resumeGaps.append(canon)

    # return the tailor context.
    return {
        "targetRole": (targetRole or "").strip() or None,
        "activeDomains": activeDomains,
        "keywords": keywords,
        "resumeHits": resumeHits,
        "resumeGaps": resumeGaps,
        "resumeSections": resumeSections,
    }
