from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Dict, Iterable, List, Set
import json

# --- local imports.
from ..shared.text_utils import normalize_term
from .alias_map import canonicalize_term, get_term_aliases






def _normalize_search_text(value: str) -> str:
    normalized = _normalize_term(value)
    normalized = re.sub(r"[^a-z0-9+#./\s-]+", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _is_variant_in_resume(variant: str, resume_raw: str, resume_normalized: str) -> bool:
    v = _normalize_term(variant)
    if not v:
        return False
    if " " in v:
        return f" {v} " in f" {resume_normalized} "
    pattern = r"(?<![a-z0-9])" + re.escape(v) + r"(?![a-z0-9])"
    return bool(re.search(pattern, resume_raw)) or bool(re.search(pattern, resume_normalized))


def _is_term_in_resume(term: str, resume_raw: str, resume_normalized: str) -> bool:
    canonical = canonicalize_term(term)
    for variant in get_term_aliases(canonical):
        if _is_variant_in_resume(variant, resume_raw, resume_normalized):
            return True
    return False



def _select_primary_terms(keywords: List[Dict[str, Any]], limit: int = 8) -> List[str]:
    picked: List[str] = []
    seen_canonical: Set[str] = set()
    for entry in keywords:
        term = _normalize_term(entry.get("term", ""))
        canonical = canonicalize_term(term)
        if not term or canonical in seen_canonical:
            continue
        sources = set(entry.get("sources", []))
        strong = bool({"known_phrase", "dynamic_phrase", "concrete_stack", "title_phrase", "title_phrase_ngram"} & sources)
        if strong or (" " in term):
            picked.append(term)
            seen_canonical.add(canonical)
        if len(picked) >= limit:
            break
    if len(picked) < limit:
        for entry in keywords:
            term = _normalize_term(entry.get("term", ""))
            canonical = canonicalize_term(term)
            if not term or canonical in seen_canonical:
                continue
            picked.append(term)
            seen_canonical.add(canonical)
            if len(picked) >= limit:
                break
    return picked


# --- takes our nested resume data & flattens it to a single string. --- #
# input -> resume data (dict)
# output -> flattened resume text (str)
def flatten_resume_text(resume_data):

    # verifies resume data is a dictionary.
    if not isinstance(resume_data, dict):
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
    summary = resume_data.get("summary", {})
    if isinstance(summary, dict):
        value = summary.get("summary")
        if isinstance(value, str) and value.strip():
            buckets["summary"].append(value.strip())

    # get the education.
    education = resume_data.get("education", [])
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
    experience = resume_data.get("experience", [])
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
    projects = resume_data.get("projects", [])
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
    skills = resume_data.get("skills", [])
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
def resume_blob(resume_sections):
    return " \n ".join(chunk for section_items in resume_sections.values() for chunk in section_items).lower()



def build_tailor_context(target_role, keywords, resume_data):

    # grab keywords & resume data.
    resume_data = resume_data if isinstance(resume_data, dict) else {}

    # converts resume dict to single string.
    resume_sections = flatten_resume_text(resume_data)

    # turn resume sections into a single string.
    resume_str = resume_blob(resume_sections)

    # initialize hits & gaps.
    resume_hits = []
    resume_gaps = []
    seen = set()

    for entry in keywords:
        term = normalize_term(entry.get("term", ""))

        if term in resume_str:
            resume_hits.append(term)
        else:
            resume_gaps.append(term)

    #dynamic_candidates = []
    #primary_terms = _select_primary_terms(ranked_keywords, limit=8)

    return


    return {
        "target_role": (target_role or "").strip() or None,
        "active_domains": [],
        "keywords_primary": primary_terms,
        "keywords_secondary": secondary_terms,
        "phrase_focus": phrase_focus,
        "resume_hits": resume_hits,
        "resume_gaps": resume_gaps,
        # Explicit split between provable evidence vs desired targets.
        "verified_resume_terms": resume_hits,
        "core_verified_keywords": core_verified,
        "supporting_verified_keywords": supporting_verified,
        "target_gap_terms": resume_gaps,
        "section_item_ids": {
            "experience": exp_ids,
            "projects": proj_ids,
        },
    }
