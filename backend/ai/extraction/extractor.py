from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Dict, List, Set

from .lexicon import DOMAIN_LEXICONS
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
    "this job is not eligible",
    "by clicking apply today",
    "next steps",
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
    "sick",
    "off",
    "pto",
    "leave",
}

RECRUITER_NOISE_TOKENS = {
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
    "recruiting",
    "employment",
    "eligible",
    "privacy",
    "opt",
    "supported",
}

LEGAL_NOISE_TOKENS = {
    "eligible",
    "employment",
    "privacy",
    "citizenship",
    "resident",
    "background",
    "check",
    "checks",
    "disability",
    "veteran",
    "criminal",
    "drug",
    "felony",
    "misdemeanor",
    "conviction",
    "authorization",
    "authorized",
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
    "such",
    "using",
    "whether",
    "into",
}

VERB_LEAD_TOKENS = {
    "build",
    "design",
    "assess",
    "use",
    "work",
    "develop",
    "create",
    "implement",
    "perform",
    "integrate",
    "ensure",
    "evaluate",
    "collaborate",
    "participate",
}

CONNECTOR_TRAIL_TOKENS = {
    "and",
    "or",
    "such",
    "using",
    "whether",
    "into",
    "with",
    "for",
    "to",
    "of",
}

STACK_TOKEN_BLOCKLIST = {
    "to",
    "full",
    "engineering",
    "development",
    "work",
    "sales",
    "business",
    "performance",
    "account",
    "opportunities",
    "clients",
    "relationships",
    "leadership",
    "ownership",
    "company",
    "benefits",
    "experience",
    "technical",
    "customer",
    "using",
}

STACK_ALLOW_SHORT_TOKENS = {
    "ai",
    "ml",
    "sql",
    "api",
    "aws",
    "gcp",
    "gke",
    "llm",
    "rag",
    "cx",
    "ivr",
    "fcr",
    "csat",
    "wfo",
    "ccaas",
    "wxcc",
}

CONCRETE_STACK_TERMS = {
    "react", "next.js", "nextjs", "react-native", "react native", "typescript", "javascript", "node", "node.js",
    "python", "java", "go", "rust", "php", "nestjs", "django", "flask", "fastapi", "graphql", "rest", "restful",
    "api", "apis", "sql", "postgres", "postgresql", "mysql", "mongodb", "redis", "databricks", "kafka", "nifi",
    "opensearch", "tableau", "power bi", "salesforce", "posthog", "aws", "gcp", "azure", "docker", "kubernetes",
    "gke", "rag", "llm", "mlops", "tensorflow", "pytorch", "scikit-learn", "transformers", "langchain", "langgraph",
    "webex", "calabrio", "dialogflow", "ci/cd", "linux", "vue", "vue.js", "angular",
}

ROLE_CAPABILITY_STACK_TERMS = {
    "workflow", "operations", "documentation", "implementation", "management", "execution", "delivery", "support",
    "billing", "efficiency", "security", "performance", "platform", "integration", "kpis", "compliance",
}

ORG_TOKEN_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "inc",
    "llc",
    "corp",
    "company",
    "remote",
    "today",
    "apply",
    "job",
    "jobs",
    "manager",
    "engineer",
    "developer",
    "position",
    "opening",
    "career",
    "opportunity",
    "role",
}

LOCATION_NOISE_TOKENS = {
    "york",
    "aventura",
    "county",
    "city",
    "state",
    "campus",
    "onsite",
    "on-site",
    "hybrid",
    "remote",
}

SCHOOL_LOCATION_CONTEXT_TOKENS = {
    "new",
    "york",
    "university",
    "campus",
    "county",
    "city",
    "state",
    "camp",
    "campers",
    "school",
}

GENERIC_OVERLAP_TOKENS = {
    "experience",
    "systems",
    "technical",
    "customer",
    "lead",
    "platform",
    "support",
    "business",
    "using",
    "performance",
    "data",
    "ai",
    "ml",
}

WRAPPER_SUPPRESS_HEADER_PATTERNS = (
    r"^who are .+$",
    r"^next steps?$",
    r"^about (us|the company)$",
    r"^apply( now| today)?$",
    r"^equal opportunity.*$",
    r"^(compensation|benefits|perks).*$",
    r"^equal employment.*$",
    r"^privacy notice.*$",
    r"^eligibility.*$",
    r"^background check.*$",
    r"^work authorization.*$",
    r"^security clearance.*$",
    r"^drug testing.*$",
    r"^background screening.*$",
)

WRAPPER_SUPPRESS_LINE_SUBSTRINGS = {
    "apply now",
    "apply today",
    "talk to",
    "for free",
    "message and data rates",
    "we never post fake jobs",
    "equal opportunity",
    "we are looking for",
    "ideal candidate",
    "join our team",
    "opportunity to",
    "hiring for",
    "submit your resume",
    "all qualified applicants",
    "women and minorities are encouraged",
    "equal employment opportunity",
    "background records check",
    "public trust clearance",
    "us citizenship",
    "perm resident alien",
    "privacy policy",
    "employment eligibility",
    "opt out",
    "message and data rates may apply",
    "must be able to pass",
    "drug screening",
    "drug test",
    "criminal background check",
    "work authorization required",
    "subject to background",
    "equal opportunity employer",
    "please include",
    "relevant title",
    "job title in subject",
    "if interested send",
    "paid time off",
    "holiday pay",
    "sick leave",
    "medical dental vision",
}

MISSION_CULTURE_LINE_SUBSTRINGS = {
    "our mission",
    "our values",
    "our culture",
    "why join us",
    "who we are",
    "about us",
    "value statement",
    "inclusive environment",
    "open-door policy",
    "we value your",
    "personally accountable",
    "build trusted relationships",
    "drive innovation",
    "work in partnership",
    "ready to work hard",
}

PHRASE_OVERLAP_EXACT_PREFER = {
    "api": {"restful apis", "api integration", "third-party apis"},
    "ai": {"generative ai", "ai agents", "llm-based solutions"},
    "management": {"project management", "account management", "hospitality management"},
    "customer": {"customer service", "customer outcomes"},
    "service": {"customer service", "professional services"},
}

LOW_SIGNAL_MODIFIER_TOKENS = {
    "strong",
    "clear",
    "comprehensive",
    "another",
    "top",
    "green",
    "new",
    "high",
    "great",
}

TOOL_LIST_FRAGMENT_TOKENS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "node",
    "node.js",
    "django",
    "fastapi",
    "flask",
    "react",
    "next.js",
    "nestjs",
    "aws",
    "gcp",
    "azure",
    "docker",
    "kubernetes",
    "sql",
    "mysql",
    "postgresql",
    "graphql",
    "alteryx",
    "tableau",
    "power bi",
}

FILLER_FUNCTION_TOKENS = {
    "during",
    "functions",
    "environment",
    "degree",
    "must",
    "perform",
    "across",
    "analyses",
    "analysis",
    "eg",
    "e.g",
}

ROLE_PHRASE_HEAD_TOKENS = {
    "management",
    "engineering",
    "automation",
    "systems",
    "operations",
    "support",
    "compliance",
    "scheduling",
    "documentation",
    "testing",
}

PHRASE_PRONOUN_TOKENS = {
    "you",
    "your",
    "yours",
    "our",
    "ours",
    "their",
    "theirs",
    "we",
    "us",
}

INSTRUCTION_NOISE_TOKENS = {
    "not",
    "please",
    "relevant",
    "title",
    "description",
    "least",
    "more",
    "than",
    "then",
    "three",
}

TITLE_FRAGMENT_BLACKLIST_TAIL_TOKENS = {"associate", "assistant"}

ORG_LOCATION_PHRASE_TOKENS = {
    "outlet",
    "outlets",
    "school",
    "university",
    "college",
    "hospital",
    "clinic",
    "center",
    "centre",
    "district",
    "campus",
    "county",
    "city",
    "state",
    "region",
    "branch",
    "location",
    "office",
}

PHRASE_GLUE_TRAIL_TOKENS = {
    "will",
    "would",
    "could",
    "should",
    "ability",
    "teams",
    "team",
    "group",
    "groups",
}

COMPARATIVE_GLUE_TOKENS = {
    "least",
    "more",
    "most",
    "than",
    "then",
    "only",
    "just",
}

NARRATIVE_TRAIL_TOKENS = {
    "business",
    "vertical",
    "role",
    "position",
    "candidate",
    "opportunity",
    "title",
}

SAFE_DOTTED_TOKENS = {"node.js", "next.js", "vue.js", "u.s"}

URL_LINE_PATTERNS = (
    r"https?://",
    r"\bwww\.",
    r"\.(gov|mil|pdf|docx?|pptx?|xlsx?)\b",
    r"\b[A-Za-z0-9.-]+\.(gov|mil|pdf|org|com)\b",
)

COMPLIANCE_FOOTER_SUBSTRINGS = {
    "know your rights",
    "pay transparency",
    "ofccp",
    "equal employment opportunity",
    "eeo",
    "dol.gov",
    "department of labor",
    "poster",
    "supplement",
    "download",
    "pdf",
    "poster notice",
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


def _extract_title_ngram_phrases(
    role_text: str,
    phrase_canonical: Dict[str, str],
    weak_tokens: Set[str],
    domain_signal_tokens: Set[str],
    known_phrases: Set[str],
) -> Dict[str, float]:
    tokens = re.findall(r"[a-z][a-z0-9+.#-]{1,}", (role_text or "").lower())
    if len(tokens) < 2:
        return {}
    found: Dict[str, float] = {}
    max_n = min(4, len(tokens))
    for n in range(2, max_n + 1):
        for i in range(0, len(tokens) - n + 1):
            parts = tokens[i : i + n]
            if parts[0] in CONNECTOR_EDGE_WORDS or parts[-1] in CONNECTOR_EDGE_WORDS:
                continue
            if any(tok in PHRASE_PRONOUN_TOKENS or tok in INSTRUCTION_NOISE_TOKENS for tok in parts):
                continue
            phrase = _normalize_term(" ".join(parts))
            if phrase not in known_phrases:
                # Reject generic title fragments like "<noun> associate" unless explicitly known.
                if len(parts) == 2 and parts[-1] in TITLE_FRAGMENT_BLACKLIST_TAIL_TOKENS:
                    continue
                # Reject "<noun> manager <location/org chunk>" style fragments unless explicitly known.
                if len(parts) >= 3 and "manager" in parts and any(tok in ORG_LOCATION_PHRASE_TOKENS for tok in parts):
                    continue
            if all(tok in weak_tokens for tok in parts):
                continue
            if not any(tok in domain_signal_tokens for tok in parts):
                continue
            canonical = _canonical_keyword(phrase, phrase_canonical)
            found[canonical] = max(found.get(canonical, 0.0), 1.0)
    return found


def _is_numeric_or_noise(token: str, garbage_tokens: set[str]) -> bool:
    return token in garbage_tokens or bool(re.fullmatch(r"\d+[+]?", token))


def _normalize_term(term: str) -> str:
    cleaned = re.sub(r"^[^a-z0-9+#./-]+|[^a-z0-9+#./-]+$", "", term.strip().lower())
    cleaned = re.sub(r"[.,;:!?]+$", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def _build_signal_token_set(boost_words: Dict[str, int], allow_short_tokens: Set[str]) -> Set[str]:
    signal_tokens: Set[str] = set()
    for key in boost_words.keys():
        phrase = _normalize_term(str(key))
        if not phrase:
            continue
        signal_tokens.add(phrase)
        if " " in phrase:
            # Keep multiword boosts as phrase-level signals only.
            continue
        # Only explode multiword boosts into tokens when each token is non-generic.
        for piece in re.findall(r"[a-z0-9+#.-]{2,}", phrase):
            if piece in STACK_TOKEN_BLOCKLIST or piece in CONNECTOR_EDGE_WORDS:
                continue
            signal_tokens.add(piece)
    signal_tokens.update(allow_short_tokens)
    signal_tokens.update(STACK_ALLOW_SHORT_TOKENS)
    return signal_tokens


def _extract_stack_list_terms(
    text: str,
    signal_tokens: Set[str],
    stop_words: Set[str],
    weak_tokens: Set[str],
    boost_words: Dict[str, int],
) -> tuple[Dict[str, float], Dict[str, float]]:
    """
    Promote concrete technologies/frameworks explicitly listed in JD stack sections.
    """
    concrete_found: Dict[str, float] = {}
    capability_found: Dict[str, float] = {}
    for raw_line in text.splitlines():
        line = raw_line.lower()
        if not line.strip():
            continue
        looks_like_stack_line = (
            line.count(",") >= 2
            or "/" in line
            or "(" in line
            or ")" in line
            or ":" in line
        )
        if not looks_like_stack_line:
            continue
        for token in re.findall(r"[a-z0-9+#.-]{2,}", line):
            t = _normalize_term(token)
            if not t:
                continue
            if t in stop_words or t in weak_tokens or t in CONNECTOR_EDGE_WORDS:
                continue
            if t in STACK_TOKEN_BLOCKLIST or t in RECRUITER_NOISE_TOKENS or t in BENEFIT_NOISE_TOKENS:
                continue
            if len(t) < 3 and t not in STACK_ALLOW_SHORT_TOKENS:
                continue
            if t in signal_tokens:
                has_stack_shape = bool(re.search(r"[+#./-]|\d", t)) or (t in STACK_ALLOW_SHORT_TOKENS)
                if has_stack_shape or t in CONCRETE_STACK_TERMS:
                    concrete_found[t] = concrete_found.get(t, 0.0) + 1.0
                elif t in ROLE_CAPABILITY_STACK_TERMS:
                    capability_found[t] = capability_found.get(t, 0.0) + 1.0
    return concrete_found, capability_found


def _extract_dynamic_phrases(
    text: str,
    stop_words: Set[str],
    weak_tokens: Set[str],
    filler_phrases: Set[str],
    signal_tokens: Set[str],
    domain_signal_tokens: Set[str],
    known_phrases: Set[str],
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
            if phrase_tokens[0] in VERB_LEAD_TOKENS:
                continue
            if any(tok in VERB_LEAD_TOKENS for tok in phrase_tokens[1:]):
                continue
            if phrase_tokens[-1] in CONNECTOR_TRAIL_TOKENS:
                continue
            connector_count = sum(1 for tok in phrase_tokens if tok in CONNECTOR_EDGE_WORDS or tok in CONNECTOR_TRAIL_TOKENS)
            if connector_count > 1:
                continue
            if connector_count > 0 and len(phrase_tokens) >= 3:
                continue
            noise_count = sum(1 for tok in phrase_tokens if tok in BENEFIT_NOISE_TOKENS)
            if noise_count >= max(2, n - 1):
                continue
            if phrase_tokens[0] in BENEFIT_NOISE_TOKENS or phrase_tokens[-1] in BENEFIT_NOISE_TOKENS:
                continue
            if any(tok in RECRUITER_NOISE_TOKENS for tok in phrase_tokens):
                continue
            if any(tok in LEGAL_NOISE_TOKENS for tok in phrase_tokens):
                continue
            if any(tok in PHRASE_PRONOUN_TOKENS for tok in phrase_tokens):
                continue
            if any(tok in INSTRUCTION_NOISE_TOKENS for tok in phrase_tokens):
                continue
            if phrase_tokens[-1] in PHRASE_GLUE_TRAIL_TOKENS:
                continue
            if any("." in tok and tok not in SAFE_DOTTED_TOKENS for tok in phrase_tokens):
                continue
            if all(tok in stop_words or tok in weak_tokens for tok in phrase_tokens):
                continue
            has_signal = any(tok in signal_tokens for tok in phrase_tokens)
            has_domain_signal = any(tok in domain_signal_tokens for tok in phrase_tokens)
            if not has_signal and not has_domain_signal:
                continue
            weak_count = sum(1 for tok in phrase_tokens if tok in weak_tokens)
            if len(phrase_tokens) >= 3 and weak_count >= 2:
                continue
            if len(phrase_tokens) in (2, 3) and has_domain_signal:
                # For non-tech roles, allow concise domain phrases when at least
                # one domain-specific token is present.
                role_head_hits = sum(1 for tok in phrase_tokens if tok in ROLE_PHRASE_HEAD_TOKENS)
                if role_head_hits == 0 and not has_signal:
                    continue
            if phrase_tokens[0] in LOW_SIGNAL_MODIFIER_TOKENS or phrase_tokens[-1] in LOW_SIGNAL_MODIFIER_TOKENS:
                continue
            if len(phrase_tokens) >= 3 and phrase_tokens[0].endswith("ing") and phrase_tokens[-1] in NARRATIVE_TRAIL_TOKENS:
                # Reject narrative sentence chunks like "launching new business vertical".
                continue
            if n == 2:
                joined = _normalize_term(" ".join(phrase_tokens))
                both_stack_tokens = phrase_tokens[0] in signal_tokens and phrase_tokens[1] in signal_tokens
                if both_stack_tokens and joined not in signal_tokens:
                    # Avoid chained stack fragments like "react typescript" unless explicitly modeled.
                    continue
            joined_phrase = _normalize_term(" ".join(phrase_tokens))
            tool_like_count = sum(1 for tok in phrase_tokens if tok in TOOL_LIST_FRAGMENT_TOKENS or tok in signal_tokens)
            if tool_like_count >= len(phrase_tokens) and joined_phrase not in known_phrases:
                # Avoid list-run fragments like "django fastapi flask" or "python alteryx".
                continue
            phrase = _normalize_term(" ".join(phrase_tokens).strip())
            if phrase in filler_phrases:
                continue
            counts[phrase] += 1
    filtered: Dict[str, int] = {}
    for phrase, freq in counts.items():
        if freq < min_count:
            continue
        tokens = [tok for tok in re.findall(r"[a-z0-9+#.-]{2,}", phrase) if tok]
        if not tokens:
            continue
        if tokens[-1] in PHRASE_GLUE_TRAIL_TOKENS:
            continue
        if any(tok in PHRASE_PRONOUN_TOKENS or tok in INSTRUCTION_NOISE_TOKENS for tok in tokens):
            continue
        filtered[phrase] = freq
    return filtered


def _extract_org_like_tokens(raw_text: str) -> Set[str]:
    counts: Dict[str, int] = defaultdict(int)
    lines = (raw_text or "").splitlines()[:40]
    for line_idx, line in enumerate(lines):
        for token in re.findall(r"\b[A-Z][A-Za-z0-9&.+-]{2,}\b", line):
            t = _normalize_term(token)
            if not t or t in ORG_TOKEN_STOPWORDS:
                continue
            if t in CONCRETE_STACK_TERMS or t in STACK_ALLOW_SHORT_TOKENS:
                continue
            counts[t] += 1
            # Header-heavy top lines are often company/title/location context.
            if line_idx <= 6 and len(t) >= 5:
                counts[t] += 1
    return {token for token, freq in counts.items() if freq >= 2}


def _is_footer_or_link_line(normalized: str) -> bool:
    if any(re.search(pattern, normalized) for pattern in URL_LINE_PATTERNS):
        return True
    return any(snippet in normalized for snippet in COMPLIANCE_FOOTER_SUBSTRINGS)


def _preclean_job_text(text: str) -> str:
    kept: List[str] = []
    for raw in (text or "").splitlines():
        line = raw.strip()
        if not line:
            kept.append("")
            continue
        lowered = line.lower()
        if _is_footer_or_link_line(lowered):
            continue
        kept.append(raw)
    return "\n".join(kept)


def _build_domain_signal_tokens(active_domains: List[str]) -> Set[str]:
    signal: Set[str] = set()
    for domain in active_domains:
        pack = DOMAIN_LEXICONS.get(domain, {})
        aliases = set(pack.get("aliases", set()))
        phrases = list(pack.get("phrases", []))
        for term in aliases.union(set(phrases)):
            t = _normalize_term(str(term))
            if not t:
                continue
            for tok in re.findall(r"[a-z0-9+#.-]{3,}", t):
                signal.add(tok)
    return signal


def _phrase_tokens(term: str) -> Set[str]:
    return {
        tok
        for tok in re.findall(r"[a-z0-9+#.-]{2,}", (term or "").lower())
        if tok not in CONNECTOR_EDGE_WORDS and tok not in PHRASE_PRONOUN_TOKENS
    }


def _is_redundant_phrase(term: str, kept_terms: List[str], *, strict_for_title_ngram: bool = False) -> bool:
    cand = _phrase_tokens(term)
    if len(cand) < 2:
        return False
    for kept in kept_terms:
        kept_tokens = _phrase_tokens(kept)
        if len(kept_tokens) < 2:
            continue
        if cand.issubset(kept_tokens) or kept_tokens.issubset(cand):
            overlap = len(cand.intersection(kept_tokens)) / float(min(len(cand), len(kept_tokens)))
            if overlap >= 1.0:
                return True
        if strict_for_title_ngram:
            overlap = len(cand.intersection(kept_tokens)) / float(min(len(cand), len(kept_tokens)))
            if overlap >= 0.8:
                return True
    return False


def _score_term(
    term: str,
    frequency: float,
    source_counts: Dict[str, float],
    boost_words: Dict[str, int],
    weak_tokens: Set[str],
    filler_phrases: Set[str],
    org_like_tokens: Set[str],
    phrase_component_hits: int = 0,
) -> float:
    score = float(frequency)
    term_boost = float(boost_words.get(term, 0))
    if term in weak_tokens:
        term_boost = min(term_boost, 0.5)
    score += term_boost
    if " " in term or "/" in term:
        score += 2.0
    if "known_phrase" in source_counts:
        score += 1.2
    if "dynamic_phrase" in source_counts:
        score += 0.9
    if "title_phrase" in source_counts or "title_token" in source_counts:
        score += 1.4
    if "title_phrase_ngram" in source_counts:
        score += 1.0
    if " " in term and source_counts.get("title_phrase_ngram", 0.0) > 0:
        tokens = _phrase_tokens(term)
        if tokens and any(tok in ORG_LOCATION_PHRASE_TOKENS for tok in tokens):
            score -= 2.0
            score = min(score, 1.8)
    if term in weak_tokens:
        score -= 1.2
        has_strong_source = any(
            key in source_counts for key in ("known_phrase", "dynamic_phrase", "title_phrase", "concrete_stack")
        )
        if not has_strong_source:
            score -= 1.0
            score = min(score, 3.0)
    if term in filler_phrases:
        score -= 2.0
    if term in RECRUITER_NOISE_TOKENS:
        score -= 3.0
    if term in LEGAL_NOISE_TOKENS:
        score -= 3.0
    token_only_sources = set(source_counts.keys()) == {"token"}
    if " " not in term and token_only_sources and int(boost_words.get(term, 0)) == 0 and frequency >= 3:
        # De-prioritize high-frequency narrative/company words that lack explicit skill signals.
        score -= 2.0
    if " " not in term and token_only_sources and term in FILLER_FUNCTION_TOKENS:
        score -= 2.2
        score = min(score, 1.8)
    if " " not in term and token_only_sources and term in INSTRUCTION_NOISE_TOKENS:
        score -= 2.8
        score = min(score, 1.4)
    if " " not in term and token_only_sources and term in COMPARATIVE_GLUE_TOKENS:
        score -= 2.4
        score = min(score, 1.5)
    if " " not in term and "." in term and term not in SAFE_DOTTED_TOKENS:
        score -= 3.0
        score = min(score, 1.2)
    if " " not in term and term in LOCATION_NOISE_TOKENS:
        score -= 2.6
        score = min(score, 1.6)
    if " " not in term and token_only_sources and int(boost_words.get(term, 0)) == 0 and frequency >= 5:
        score = min(score, 2.5)
    if " " not in term and term in org_like_tokens and source_counts.get("concrete_stack", 0.0) <= 0:
        score -= 3.0
        score = min(score, 2.0)
    if " " not in term and source_counts.get("capability_stack", 0.0) > 0 and source_counts.get("concrete_stack", 0.0) <= 0:
        score -= 1.2
    if " " not in term and source_counts.get("title_token", 0.0) > 0 and len(source_counts) == 1:
        # Prevent role/company title residue from ranking as standalone skill signal.
        score -= 2.2
        score = min(score, 2.2)
    # Generic overlap suppression: if a unigram mostly appears inside stronger phrases,
    # it should not outrank those phrases.
    if " " not in term and phrase_component_hits >= 1:
        base_overlap_penalty = min(2.5, 0.7 * float(phrase_component_hits))
        # Extra demotion for weak/generic short unigrams (e.g., one, end, role, etc.).
        if term in weak_tokens or len(term) <= 3:
            base_overlap_penalty += 1.2
        if term in GENERIC_OVERLAP_TOKENS:
            base_overlap_penalty += 1.0
        score -= base_overlap_penalty
    # Keep repeated broad tokens from dominating domain-specific phrases.
    if " " not in term and frequency >= 8:
        score = min(score, 7.5)
    return score


def _normalize_header(line: str) -> str:
    clean = re.sub(r"[^a-z0-9& ]+", " ", line.lower()).strip()
    clean = re.sub(r"\s+", " ", clean)
    return clean


def _is_wrapper_header_line(normalized: str) -> bool:
    if any(normalized.startswith(header) for header in SECTION_HEADERS_TO_SUPPRESS):
        return True
    return any(re.match(pattern, normalized) for pattern in WRAPPER_SUPPRESS_HEADER_PATTERNS)


def _is_wrapper_cta_line(normalized: str) -> bool:
    return any(snippet in normalized for snippet in WRAPPER_SUPPRESS_LINE_SUBSTRINGS)


def _line_has_concrete_signal(line: str) -> bool:
    lowered = (line or "").lower()
    if re.search(r"[+#./-]|\d", lowered):
        return True
    for token in re.findall(r"[a-z0-9+#.-]{2,}", lowered):
        if token in CONCRETE_STACK_TERMS or token in STACK_ALLOW_SHORT_TOKENS:
            return True
    return False


def _is_mission_culture_line(normalized: str, raw_line: str) -> bool:
    if any(snippet in normalized for snippet in MISSION_CULTURE_LINE_SUBSTRINGS):
        return not _line_has_concrete_signal(raw_line)
    return False


def _split_weighted_sections(text: str) -> tuple[str, str]:
    normal_lines: List[str] = []
    downweighted_lines: List[str] = []
    mode = "normal"  # normal | downweighted | suppressed

    for raw_line in text.splitlines():
        line = raw_line.strip()
        normalized = _normalize_header(line)

        if normalized:
            if _is_wrapper_cta_line(normalized):
                mode = "suppressed"
                continue
            if _is_wrapper_header_line(normalized):
                mode = "suppressed"
                continue
            if any(normalized.startswith(header) for header in SECTION_HEADERS_TO_DOWNWEIGHT):
                mode = "downweighted"
                downweighted_lines.append(line)
                continue
            if _is_mission_culture_line(normalized, line):
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
    org_like_tokens = _extract_org_like_tokens(job_description or "")
    domain_signal_tokens = _build_domain_signal_tokens(profile.get("active_domains", []))
    phrases = list(profile["phrases"])
    stop_words = set(profile["stop_words"])
    weak_tokens = set(profile["weak_tokens"])
    garbage_tokens = set(profile["garbage_tokens"])
    filler_phrases = set(profile["filler_phrases"])
    boost_words = dict(profile["boost_words"])
    phrase_canonical = dict(profile["phrase_canonical"])
    allow_short_tokens = set(profile["allow_short_tokens"])
    signal_tokens = _build_signal_token_set(boost_words, allow_short_tokens)
    known_phrases = set(phrases)

    role_text = (target_role or "").lower().strip()
    body_text = _preclean_job_text(job_description or "")
    body_text = body_text.lower()
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
    title_ngram_phrases = _extract_title_ngram_phrases(
        role_text,
        phrase_canonical,
        weak_tokens,
        domain_signal_tokens,
        known_phrases,
    )
    for term, freq in title_ngram_phrases.items():
        term_sources.setdefault(term, {})
        term_sources[term]["title_phrase_ngram"] = max(term_sources[term].get("title_phrase_ngram", 0.0), float(freq))

    dynamic_candidates = _extract_dynamic_phrases(
        clean_body,
        stop_words,
        weak_tokens,
        filler_phrases,
        signal_tokens,
        domain_signal_tokens,
        known_phrases,
        min_count=2,
    )
    for term, freq in dynamic_candidates.items():
        canonical = _canonical_keyword(term, phrase_canonical)
        term_sources.setdefault(canonical, {})
        term_sources[canonical]["dynamic_phrase"] = term_sources[canonical].get("dynamic_phrase", 0.0) + float(freq)

    concrete_stack_terms, capability_stack_terms = _extract_stack_list_terms(
        clean_body,
        signal_tokens,
        stop_words,
        weak_tokens,
        boost_words,
    )
    for term, freq in concrete_stack_terms.items():
        canonical = _canonical_keyword(term, phrase_canonical)
        term_sources.setdefault(canonical, {})
        term_sources[canonical]["concrete_stack"] = term_sources[canonical].get("concrete_stack", 0.0) + float(freq)
    for term, freq in capability_stack_terms.items():
        canonical = _canonical_keyword(term, phrase_canonical)
        term_sources.setdefault(canonical, {})
        term_sources[canonical]["capability_stack"] = term_sources[canonical].get("capability_stack", 0.0) + float(freq)

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
    phrase_component_weight: Dict[str, float] = defaultdict(float)
    phrase_presence: Set[str] = set()
    for term, source_counts in term_sources.items():
        if " " not in term and "/" not in term:
            continue
        phrase_freq = (
            source_counts.get("known_phrase", 0.0)
            + source_counts.get("known_phrase_downweighted", 0.0)
            + source_counts.get("dynamic_phrase", 0.0)
            + source_counts.get("title_phrase", 0.0)
            + source_counts.get("title_phrase_ngram", 0.0)
        )
        if phrase_freq <= 0:
            continue
        phrase_presence.add(term)
        for piece in re.findall(r"[a-z][a-z0-9+.#-]{1,}", term.lower()):
            phrase_component_counts[piece] += 1
            phrase_component_weight[piece] += float(phrase_freq)

    scored_entries: List[Dict[str, Any]] = []
    for term, source_counts in term_sources.items():
        frequency = sum(source_counts.values())
        has_strong_source = any(
            source_counts.get(key, 0.0) > 0
            for key in ("known_phrase", "dynamic_phrase", "title_phrase", "title_phrase_ngram", "concrete_stack")
        )
        score = _score_term(
            term,
            frequency,
            source_counts,
            boost_words,
            weak_tokens,
            filler_phrases,
            org_like_tokens,
            phrase_component_counts.get(term, 0),
        )
        if score <= 0:
            continue
        if " " not in term and term in weak_tokens and not has_strong_source:
            # Do not let weak standalone narrative tokens fill the tail.
            if score < 3.6:
                continue
        if " " not in term and term in SCHOOL_LOCATION_CONTEXT_TOKENS and not has_strong_source:
            # Suppress school/location residue unless there is real phrase/title backing.
            if source_counts.get("title_phrase", 0.0) <= 0:
                continue
        token_only = set(source_counts.keys()) == {"token"}
        if token_only and float(boost_words.get(term, 0)) <= 0 and score <= 2.6:
            # Drop weak tail tokens that are not domain-anchored.
            if term not in domain_signal_tokens and term not in role_text:
                continue
        if token_only and term in (INSTRUCTION_NOISE_TOKENS | COMPARATIVE_GLUE_TOKENS):
            continue
        if " " not in term and set(source_counts.keys()) == {"token"} and term in GENERIC_OVERLAP_TOKENS:
            if score < 4.0:
                continue
        if " " not in term:
            preferred_phrases = PHRASE_OVERLAP_EXACT_PREFER.get(term, set())
            if preferred_phrases and any(phrase in phrase_presence for phrase in preferred_phrases):
                score -= 2.2
                if term in weak_tokens:
                    continue
            if phrase_component_weight.get(term, 0.0) >= 2.0:
                score -= min(2.2, 0.6 * phrase_component_weight[term])
                if term in weak_tokens and score < 4.0:
                    continue
        if source_counts.get("concrete_stack", 0.0) > 0:
            score += min(1.8, 0.6 * source_counts["concrete_stack"])
        if source_counts.get("capability_stack", 0.0) > 0 and source_counts.get("concrete_stack", 0.0) <= 0:
            score -= min(1.0, 0.4 * source_counts["capability_stack"])
        scored_entries.append(
            {
                "term": term,
                "score": round(score, 3),
                "frequency": round(frequency, 3),
                "sources": sorted(source_counts.keys()),
            }
        )

    ranked = sorted(scored_entries, key=lambda item: (-item["score"], -item["frequency"], item["term"]))
    deduped: List[Dict[str, Any]] = []
    kept_phrase_terms: List[str] = []
    for item in ranked:
        term = item["term"]
        is_title_ngram = "title_phrase_ngram" in item.get("sources", [])
        if " " in term and _is_redundant_phrase(
            term,
            kept_phrase_terms,
            strict_for_title_ngram=is_title_ngram,
        ):
            continue
        deduped.append(item)
        if " " in term:
            kept_phrase_terms.append(term)
    return {
        "active_domains": profile.get("active_domains", []),
        "keywords": deduped[:limit],
        "dynamic_phrase_candidates": sorted(dynamic_candidates.items(), key=lambda kv: (-kv[1], kv[0]))[:20],
    }


def extract_job_keywords(job_description: str, limit: int = 12, target_role: str | None = None) -> List[str]:
    detailed = extract_job_keywords_detailed(job_description, limit=limit, target_role=target_role)
    return [item["term"] for item in detailed["keywords"]]
