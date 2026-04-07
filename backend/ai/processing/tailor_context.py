from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Set

from .alias_map import canonicalize_term, get_term_aliases


def _normalize_term(value: str) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


def _flatten_resume_text(value: Any) -> Iterable[str]:
    if value is None:
        return
    if isinstance(value, str):
        text = value.strip()
        if text:
            yield text
        return
    if isinstance(value, dict):
        for v in value.values():
            yield from _flatten_resume_text(v)
        return
    if isinstance(value, list):
        for item in value:
            yield from _flatten_resume_text(item)
        return
    text = str(value).strip()
    if text:
        yield text


def _resume_blob(resume_data: Dict[str, Any]) -> str:
    chunks = list(_flatten_resume_text(resume_data))
    return " \n ".join(chunks).lower()


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


def _select_secondary_terms(keywords: List[Dict[str, Any]], primary: Set[str], limit: int = 8) -> List[str]:
    primary_canonical = {canonicalize_term(term) for term in primary}
    secondary: List[str] = []
    seen_canonical: Set[str] = set()
    for entry in keywords:
        term = _normalize_term(entry.get("term", ""))
        canonical = canonicalize_term(term)
        if not term or canonical in primary_canonical or canonical in seen_canonical:
            continue
        secondary.append(term)
        seen_canonical.add(canonical)
        if len(secondary) >= limit:
            break
    return secondary


def _extract_phrase_focus(
    primary_terms: List[str],
    dynamic_phrase_candidates: List[Any],
    limit: int = 6,
) -> List[str]:
    phrases: List[str] = []
    for term in primary_terms:
        if " " in term and term not in phrases:
            phrases.append(term)
            if len(phrases) >= limit:
                return phrases
    for candidate in dynamic_phrase_candidates:
        phrase = ""
        if isinstance(candidate, (list, tuple)) and candidate:
            phrase = _normalize_term(candidate[0])
        elif isinstance(candidate, str):
            phrase = _normalize_term(candidate)
        if phrase and " " in phrase and phrase not in phrases:
            phrases.append(phrase)
            if len(phrases) >= limit:
                break
    return phrases


def build_tailor_context(
    *,
    target_role: str | None,
    extraction_result: Dict[str, Any],
    resume_data: Dict[str, Any],
) -> Dict[str, Any]:
    ranked_keywords = list(extraction_result.get("keywords", []))
    dynamic_candidates = list(extraction_result.get("dynamic_phrase_candidates", []))
    primary_terms = _select_primary_terms(ranked_keywords, limit=8)
    secondary_terms = _select_secondary_terms(ranked_keywords, set(primary_terms), limit=8)
    phrase_focus = _extract_phrase_focus(primary_terms, dynamic_candidates, limit=6)

    resume_text_raw = _resume_blob(resume_data if isinstance(resume_data, dict) else {})
    resume_text_normalized = _normalize_search_text(resume_text_raw)
    resume_hits = [term for term in primary_terms if _is_term_in_resume(term, resume_text_raw, resume_text_normalized)]
    resume_gaps = [term for term in primary_terms if term not in resume_hits]

    return {
        "target_role": (target_role or "").strip() or None,
        "active_domains": list(extraction_result.get("active_domains", [])),
        "keywords_primary": primary_terms,
        "keywords_secondary": secondary_terms,
        "phrase_focus": phrase_focus,
        "resume_hits": resume_hits,
        "resume_gaps": resume_gaps,
    }
