from __future__ import annotations

import re
from typing import Any, Dict, List, Set

from .lexicon import (
    DOMAIN_LEXICONS,
    GLOBAL_ALLOW_SHORT_TOKENS,
    GLOBAL_BOOST_WORDS,
    GLOBAL_FILLER_PHRASES,
    GLOBAL_GARBAGE_TOKENS,
    GLOBAL_PHRASES,
    GLOBAL_PHRASE_CANONICAL,
    GLOBAL_STOP_WORDS,
    GLOBAL_WEAK_TOKENS,
)

TITLE_ANCHOR_HINTS: Dict[str, Set[str]] = {
    "operations": {
        "project manager",
        "operations manager",
        "program manager",
        "superintendent",
        "estimator",
        "general manager",
        "restaurant manager",
        "grille manager",
        "hospitality manager",
    },
    "sales": {"account executive", "sales manager", "business development", "account manager"},
    "marketing": {"marketing manager", "assistant marketing manager", "demand generation", "brand manager", "content manager"},
    "finance": {"financial analyst", "controller", "accounting manager", "treasury"},
    "legal": {"legal counsel", "paralegal", "compliance manager"},
    "engineering": {"software engineer", "full stack", "backend", "frontend", "developer", "front end engineer", "front end developer"},
    "data": {"data engineer", "data analyst", "analytics engineer", "data scientist", "machine learning scientist"},
    "ai": {"machine learning engineer", "ai engineer", "ml engineer"},
    "industrial": {"electrical engineer", "automation engineer", "controls engineer", "industrial engineer"},
    "construction": {"construction materials professional", "field technician", "construction engineer", "site inspector"},
    "healthcare": {
        "medical assistant",
        "clinic coordinator",
        "patient coordinator",
        "clinical assistant",
        "psychiatrist",
        "licensed psychiatrist",
        "psychologist",
        "therapist",
        "counselor",
    },
    "education": {"teacher", "summer camp instructor", "advanced placement", "faculty"},
    "legal_admin": {"legal assistant", "paralegal", "litigation assistant"},
    "aviation": {"pilot", "first officer", "captain", "flight instructor"},
    "marine": {"naval architect", "marine engineer"},
    "mechanical": {"cad designer", "mechanical engineer", "mechanical designer"},
    "insurance": {"commercial lines account manager", "account manager", "underwriter", "brokerage"},
    "retail": {"assistant store manager", "store manager", "retail manager"},
    "brokerage": {"underwriter assistant", "brokerage assistant", "securities services associate"},
}

AI_STRONG_ALIASES: Set[str] = {
    "machine learning",
    "ml",
    "llm",
    "rag",
    "generative ai",
    "mlops",
    "pytorch",
    "tensorflow",
    "transformers",
}


def _contains_alias(text: str, term: str) -> bool:
    value = (term or "").strip().lower()
    if not value:
        return False
    # Phrase-safe boundary match to avoid substring false positives (e.g., "ai" in "paid").
    pattern = r"(?<![a-z0-9])" + re.escape(value) + r"(?![a-z0-9])"
    return bool(re.search(pattern, text))


def _merge_dict_add(base: Dict[str, int], addon: Dict[str, int]) -> Dict[str, int]:
    merged = dict(base)
    for key, value in addon.items():
        merged[key] = max(merged.get(key, 0), int(value))
    return merged


def detect_domains(job_description: str, target_role: str | None, max_domains: int = 3) -> List[str]:
    role_text = (target_role or "").lower()
    jd_text = (job_description or "").lower()

    scored: List[tuple[str, int, bool]] = []
    for domain, config in DOMAIN_LEXICONS.items():
        aliases: Set[str] = set(config.get("aliases", set()))
        role_hits = sum(1 for term in aliases if _contains_alias(role_text, term))
        jd_hits = sum(1 for term in aliases if _contains_alias(jd_text, term))
        title_anchor_hits = sum(1 for hint in TITLE_ANCHOR_HINTS.get(domain, set()) if _contains_alias(role_text, hint))
        if domain == "ai" and role_hits == 0 and title_anchor_hits == 0:
            strong_jd_hits = sum(1 for term in AI_STRONG_ALIASES if _contains_alias(jd_text, term))
            if strong_jd_hits == 0:
                continue
        score = (role_hits * 5) + (title_anchor_hits * 4) + jd_hits
        if score > 0:
            scored.append((domain, score, (role_hits + title_anchor_hits) > 0))

    ranked = sorted(scored, key=lambda item: (-item[1], item[0]))
    if not ranked:
        return []

    top_score = ranked[0][1]
    relative_threshold = max(3, int(round(top_score * 0.45)))
    selected: List[str] = []
    for domain, score, has_title_signal in ranked:
        if len(selected) >= max_domains:
            break
        if has_title_signal or score >= relative_threshold:
            selected.append(domain)

    if not selected:
        selected.append(ranked[0][0])
    return selected[:max_domains]


def detect_domain_from_role(target_role: str | None) -> str:
    domains = detect_domains("", target_role, max_domains=1)
    return domains[0] if domains else "general"


def get_extraction_profile(job_description: str = "", target_role: str | None = None) -> Dict[str, Any]:
    active_domains = detect_domains(job_description, target_role, max_domains=3)

    phrases = list(GLOBAL_PHRASES)
    boost_words = dict(GLOBAL_BOOST_WORDS)
    stop_words = set(GLOBAL_STOP_WORDS)
    weak_tokens = set(GLOBAL_WEAK_TOKENS)
    garbage_tokens = set(GLOBAL_GARBAGE_TOKENS)
    filler_phrases = set(GLOBAL_FILLER_PHRASES)
    phrase_canonical = dict(GLOBAL_PHRASE_CANONICAL)
    allow_short_tokens = set(GLOBAL_ALLOW_SHORT_TOKENS)

    for domain in active_domains:
        domain_pack = DOMAIN_LEXICONS.get(domain, {})
        phrases.extend(list(domain_pack.get("phrases", [])))
        boost_words = _merge_dict_add(boost_words, dict(domain_pack.get("boost_words", {})))
        weak_tokens.update(set(domain_pack.get("weak_tokens", set())))
        garbage_tokens.update(set(domain_pack.get("garbage_tokens", set())))
        filler_phrases.update(set(domain_pack.get("filler_phrases", set())))

    deduped_phrases = list(dict.fromkeys(phrase.lower() for phrase in phrases))
    return {
        "active_domains": active_domains,
        "stop_words": stop_words,
        "weak_tokens": weak_tokens,
        "garbage_tokens": garbage_tokens,
        "filler_phrases": filler_phrases,
        "phrases": deduped_phrases,
        "boost_words": boost_words,
        "phrase_canonical": phrase_canonical,
        "allow_short_tokens": allow_short_tokens,
    }
