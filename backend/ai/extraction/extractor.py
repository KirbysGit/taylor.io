from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Dict, List, Set

from .profiles import get_extraction_profile

SECTION_HEADERS_TO_DOWNWEIGHT = {
    "our values",
    "benefits",
    "benefits compensation",
    "compensation",
    "compensation package",
    "compensation range",
    "additional benefits",
    "pay",
    "weekly pay",
    "salary",
    "job type",
    "full-time",
    "schedule",
    "work location",
    "in person",
    "on the road",
    "referral program",
    "paid training",
    "health insurance",
    "vision insurance",
    "dental insurance",
    "paid time off",
    "mileage reimbursement",
    "equal employment opportunity",
    "equal opportunity employer",
    "what s in it for you",
    "what's in it for you",
    "note",
    "drug free work place",
    "value statement",
    "competencies",
    "about us",
    "life at",
    "required education & experience",
}

SECTION_HEADERS_TO_SUPPRESS = {
    "our benefits",
    "benefits",
    "perks",
    "compensation",
    "compensation package",
    "compensation range",
    "the pay range",
    "we offer comprehensive benefits",
    "this job is not eligible for bonuses incentives or commissions",
    "kforce is an equal opportunity",
    "by clicking apply today",
    "who are jack",
    "who are jack and jill",
    "next steps",
    "talk to jack",
}

ROLE_SECTION_HEADERS = {
    "job description",
    "about the role",
    "role overview",
    "why this role is remarkable",
    "what you will do",
    "responsibilities",
    "key responsibilities",
    "requirements",
    "key qualifications",
    "qualifications",
    "nice to have",
    "preferred qualifications",
    "ideal candidate",
    "you might be the right person for the job if you",
}

NON_ROLE_SECTION_HEADERS = {
    "who are",
    "next steps",
    "our benefits",
    "benefits",
    "perks",
    "compensation",
    "compensation package",
    "compensation range",
    "equal opportunity",
    "equal employment opportunity",
    "by clicking apply",
    "apply today",
    "about us",
    "why join us",
    "what s in it for you",
    "what's in it for you",
}

BENEFIT_NOISE_TOKENS = {
    "company",
    "paid",
    "employee",
    "insurance",
    "benefits",
    "vacation",
    "holidays",
    "bonus",
    "compensation",
    "work",
}

RECRUITER_NOISE_TOKENS = {
    "jack",
    "jill",
    "recruiter",
    "network",
    "step",
    "steps",
    "talk",
    "spin",
    "free",
    "fake",
    "apply",
    "application",
    "dream",
    "job",
    "jobs",
}

CONNECTOR_EDGE_WORDS = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "for",
    "from",
    "if",
    "in",
    "is",
    "not",
    "of",
    "on",
    "or",
    "the",
    "to",
    "we",
    "with",
}

WRAPPER_SUPPRESS_LINE_PHRASES = {
    "who are jack",
    "who are jack and jill",
    "next steps",
    "talk to jack",
    "jack s network",
    "give jack a spin",
    "we never post fake jobs",
    "dream job",
}

DOWNWEIGHT_FACTOR = 0.35


def _canonical_keyword(token: str, phrase_canonical: Dict[str, str]) -> str:
    return phrase_canonical.get(token, token)


def _count_phrases_by_source(
    text: str,
    source: str,
    phrases: List[str],
    phrase_canonical: Dict[str, str],
    source_weight: float = 1.0,
) -> tuple[Dict[str, Dict[str, float]], str]:
    phrase_counts: Dict[str, Dict[str, float]] = {}
    scrubbed_text = f" {text} "
    for phrase in phrases:
        pattern = r"(?<!\w)" + re.escape(phrase.lower()) + r"(?!\w)"
        matches = re.findall(pattern, scrubbed_text)
        if not matches:
            continue
        canonical = _canonical_keyword(phrase, phrase_canonical)
        phrase_counts.setdefault(canonical, {})
        phrase_counts[canonical][source] = phrase_counts[canonical].get(source, 0.0) + (len(matches) * source_weight)
        scrubbed_text = re.sub(pattern, " ", scrubbed_text)
    return phrase_counts, scrubbed_text


def _is_numeric_or_noise(token: str, garbage_tokens: set[str]) -> bool:
    return token in garbage_tokens or bool(re.fullmatch(r"\d+[+]?", token))


def _normalize_term(term: str) -> str:
    cleaned = re.sub(r"^[^a-z0-9+#./-]+|[^a-z0-9+#./-]+$", "", term.strip().lower())
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def _extract_dynamic_phrases(
    text: str,
    stop_words: Set[str],
    filler_phrases: Set[str],
    min_count: int = 1,
) -> Dict[str, int]:
    tokens = re.findall(r"[a-z][a-z0-9+.#-]{1,}", text.lower())
    if not tokens:
        return {}

    counts: Dict[str, int] = defaultdict(int)
    for n in (2, 3, 4):
        for i in range(0, max(0, len(tokens) - n + 1)):
            phrase_tokens = tokens[i : i + n]
            if sum(1 for tok in phrase_tokens if tok in stop_words) >= n - 1:
                continue
            if phrase_tokens[0] in CONNECTOR_EDGE_WORDS or phrase_tokens[-1] in CONNECTOR_EDGE_WORDS:
                continue
            noise_count = sum(1 for tok in phrase_tokens if tok in BENEFIT_NOISE_TOKENS)
            if noise_count >= max(2, n - 1):
                continue
            if phrase_tokens[0] in BENEFIT_NOISE_TOKENS or phrase_tokens[-1] in BENEFIT_NOISE_TOKENS:
                continue
            if any(tok in RECRUITER_NOISE_TOKENS for tok in phrase_tokens):
                continue
            phrase = _normalize_term(" ".join(phrase_tokens).strip())
            if phrase in filler_phrases:
                continue
            counts[phrase] += 1
    return {phrase: freq for phrase, freq in counts.items() if freq >= min_count}


def _score_term(
    term: str,
    frequency: float,
    source_counts: Dict[str, float],
    boost_words: Dict[str, int],
    weak_tokens: Set[str],
    filler_phrases: Set[str],
    phrase_component_hits: int = 0,
) -> float:
    score = float(frequency)
    score += float(boost_words.get(term, 0))
    if " " in term or "/" in term:
        score += 2.0
    if "known_phrase" in source_counts:
        score += 1.2
    if "dynamic_phrase" in source_counts:
        score += 0.9
    if "title_phrase" in source_counts or "title_token" in source_counts:
        score += 1.4
    if term in weak_tokens:
        score -= 0.6
    if term in filler_phrases:
        score -= 2.0
    if term in RECRUITER_NOISE_TOKENS:
        score -= 3.0
    # Suppress broad tokens when stronger phrase-level evidence exists.
    if " " not in term and phrase_component_hits >= 2:
        score -= min(2.5, 0.7 * float(phrase_component_hits))
    # Keep repeated broad tokens from dominating domain-specific phrases.
    if " " not in term and frequency >= 8:
        score = min(score, 7.5)
    return score


def _normalize_header(line: str) -> str:
    clean = re.sub(r"[^a-z0-9& ]+", " ", line.lower()).strip()
    clean = re.sub(r"\s+", " ", clean)
    return clean


def _split_weighted_sections(text: str) -> tuple[str, str]:
    normal_lines: List[str] = []
    downweighted_lines: List[str] = []
    mode = "normal"  # normal | downweighted | suppressed

    for raw_line in text.splitlines():
        line = raw_line.strip()
        normalized = _normalize_header(line)

        if normalized:
            if any(phrase in normalized for phrase in WRAPPER_SUPPRESS_LINE_PHRASES):
                mode = "suppressed"
                continue
            if any(normalized.startswith(header) for header in SECTION_HEADERS_TO_SUPPRESS):
                mode = "suppressed"
                continue
            if any(normalized.startswith(header) for header in SECTION_HEADERS_TO_DOWNWEIGHT):
                mode = "downweighted"
                downweighted_lines.append(line)
                continue
        else:
            # reset after blank line so we do not suppress the entire remainder of the JD
            mode = "normal"
            continue

        if mode == "suppressed":
            continue
        if mode == "downweighted":
            downweighted_lines.append(line)
        else:
            normal_lines.append(line)

    return "\n".join(normal_lines), "\n".join(downweighted_lines)


def _extract_role_focused_text(text: str) -> str:
    """
    Prefer role-specific sections over recruiter wrapper copy.
    Falls back to original text if no role sections are found.
    """
    lines = text.splitlines()
    focused_lines: List[str] = []
    mode = "neutral"  # neutral | include | exclude
    saw_include_header = False

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            if mode == "include":
                focused_lines.append("")
            continue

        normalized = _normalize_header(line)

        if any(normalized.startswith(header) for header in ROLE_SECTION_HEADERS):
            mode = "include"
            saw_include_header = True
            focused_lines.append(line)
            continue

        if any(normalized.startswith(header) for header in NON_ROLE_SECTION_HEADERS):
            mode = "exclude"
            continue

        # Keep bullets and plain lines only while inside include mode.
        if mode == "include":
            focused_lines.append(line)

    if saw_include_header and focused_lines:
        return "\n".join(focused_lines)
    return text


def extract_job_keywords_detailed(
    job_description: str,
    limit: int = 12,
    target_role: str | None = None,
) -> Dict[str, Any]:
    profile = get_extraction_profile(job_description, target_role)
    phrases = list(profile["phrases"])
    stop_words = set(profile["stop_words"])
    weak_tokens = set(profile["weak_tokens"])
    garbage_tokens = set(profile["garbage_tokens"])
    filler_phrases = set(profile["filler_phrases"])
    boost_words = dict(profile["boost_words"])
    phrase_canonical = dict(profile["phrase_canonical"])
    allow_short_tokens = set(profile["allow_short_tokens"])

    role_text = (target_role or "").lower().strip()
    body_text = (job_description or "").lower()
    body_text = _extract_role_focused_text(body_text)

    term_sources: Dict[str, Dict[str, float]] = defaultdict(dict)

    weighted_body, downweighted_body = _split_weighted_sections(body_text)
    title_phrase_counts, clean_title = _count_phrases_by_source(role_text, "title_phrase", phrases, phrase_canonical, 1.0)
    body_phrase_counts, clean_body = _count_phrases_by_source(weighted_body, "known_phrase", phrases, phrase_canonical, 1.0)
    downweighted_phrase_counts, clean_downweighted_body = _count_phrases_by_source(
        downweighted_body, "known_phrase_downweighted", phrases, phrase_canonical, DOWNWEIGHT_FACTOR
    )
    for phrase_bucket in (body_phrase_counts, downweighted_phrase_counts, title_phrase_counts):
        for term, source_map in phrase_bucket.items():
            existing = term_sources.get(term, {})
            for source_name, count in source_map.items():
                existing[source_name] = existing.get(source_name, 0.0) + count
            term_sources[term] = existing

    dynamic_candidates = _extract_dynamic_phrases(clean_body, stop_words, filler_phrases, min_count=2)
    for term, freq in dynamic_candidates.items():
        canonical = _canonical_keyword(term, phrase_canonical)
        term_sources.setdefault(canonical, {})
        term_sources[canonical]["dynamic_phrase"] = term_sources[canonical].get("dynamic_phrase", 0.0) + float(freq)

    for token in re.findall(r"[A-Za-z][A-Za-z0-9+.#-]{0,}", clean_body):
        term = _normalize_term(_canonical_keyword(token.lower(), phrase_canonical))
        if not term:
            continue
        if term in stop_words:
            continue
        if _is_numeric_or_noise(term, garbage_tokens):
            continue
        if len(term) < 3 and term not in allow_short_tokens:
            continue
        term_sources.setdefault(term, {})
        term_sources[term]["token"] = term_sources[term].get("token", 0.0) + 1.0

    for token in re.findall(r"[A-Za-z][A-Za-z0-9+.#-]{0,}", clean_downweighted_body):
        term = _normalize_term(_canonical_keyword(token.lower(), phrase_canonical))
        if not term:
            continue
        if term in stop_words:
            continue
        if _is_numeric_or_noise(term, garbage_tokens):
            continue
        if len(term) < 3 and term not in allow_short_tokens:
            continue
        term_sources.setdefault(term, {})
        term_sources[term]["token_downweighted"] = term_sources[term].get("token_downweighted", 0.0) + DOWNWEIGHT_FACTOR

    for token in re.findall(r"[A-Za-z][A-Za-z0-9+.#-]{0,}", clean_title):
        term = _normalize_term(_canonical_keyword(token.lower(), phrase_canonical))
        if not term:
            continue
        if term in stop_words:
            continue
        if _is_numeric_or_noise(term, garbage_tokens):
            continue
        if len(term) < 3 and term not in allow_short_tokens:
            continue
        term_sources.setdefault(term, {})
        term_sources[term]["title_token"] = term_sources[term].get("title_token", 0.0) + 1.0

    phrase_component_counts: Dict[str, int] = defaultdict(int)
    for term, source_counts in term_sources.items():
        if " " not in term and "/" not in term:
            continue
        phrase_freq = (
            source_counts.get("known_phrase", 0.0)
            + source_counts.get("known_phrase_downweighted", 0.0)
            + source_counts.get("dynamic_phrase", 0.0)
            + source_counts.get("title_phrase", 0.0)
        )
        if phrase_freq <= 0:
            continue
        for piece in re.findall(r"[a-z][a-z0-9+.#-]{1,}", term.lower()):
            phrase_component_counts[piece] += 1

    scored_entries: List[Dict[str, Any]] = []
    for term, source_counts in term_sources.items():
        frequency = sum(source_counts.values())
        score = _score_term(
            term,
            frequency,
            source_counts,
            boost_words,
            weak_tokens,
            filler_phrases,
            phrase_component_counts.get(term, 0),
        )
        if score <= 0:
            continue
        scored_entries.append(
            {
                "term": term,
                "score": round(score, 3),
                "frequency": round(frequency, 3),
                "sources": sorted(source_counts.keys()),
            }
        )

    ranked = sorted(scored_entries, key=lambda item: (-item["score"], -item["frequency"], item["term"]))
    return {
        "active_domains": profile.get("active_domains", []),
        "keywords": ranked[:limit],
        "dynamic_phrase_candidates": sorted(dynamic_candidates.items(), key=lambda kv: (-kv[1], kv[0]))[:20],
    }


def extract_job_keywords(job_description: str, limit: int = 12, target_role: str | None = None) -> List[str]:
    detailed = extract_job_keywords_detailed(job_description, limit=limit, target_role=target_role)
    return [item["term"] for item in detailed["keywords"]]
