from __future__ import annotations

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

def _merge_dict_add(base: Dict[str, int], addon: Dict[str, int]) -> Dict[str, int]:
    merged = dict(base)
    for key, value in addon.items():
        merged[key] = max(merged.get(key, 0), int(value))
    return merged


def detect_domains(job_description: str, target_role: str | None, max_domains: int = 3) -> List[str]:
    role_text = (target_role or "").lower()
    jd_text = (job_description or "").lower()

    scored: List[tuple[str, int]] = []
    for domain, config in DOMAIN_LEXICONS.items():
        aliases: Set[str] = set(config.get("aliases", set()))
        role_hits = sum(1 for term in aliases if term in role_text)
        jd_hits = sum(1 for term in aliases if term in jd_text)
        score = (role_hits * 3) + jd_hits
        if score > 0:
            scored.append((domain, score))

    ranked = sorted(scored, key=lambda item: (-item[1], item[0]))
    return [domain for domain, _ in ranked[:max_domains]]


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
