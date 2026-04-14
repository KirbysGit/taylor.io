from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Dict, List, Set

from .lexicon import domainDicts, globalAllowShortTokens, globalPhraseCanonical, globalStopWords
from .profiles import get_extraction_profile

from .tokens import (
    benefitNoiseTokens,
    comparativeGlueTokens,
    complianceFooterSubstrings,
    concreteStackTerms,
    connectorEdgeWords,
    connectorTrailTokens,
    downweightFactor,
    fillerFunctionTokens,
    genericOverlapTokens,
    instructionNoiseTokens,
    legalNoiseTokens,
    locationNoiseTokens,
    lowSignalModifierTokens,
    missionCultureLineSubstrings,
    narrativeTrailTokens,
    nonRoleSectionHeaders,
    orgLocationPhraseTokens,
    orgTokenStopwords,
    phraseGlueTrailTokens,
    phraseOverlapExactPrefer,
    phrasePronounTokens,
    recruiterNoiseTokens,
    roleCapabilityStackTerms,
    rolePhraseHeadTokens,
    roleSectionHeaders,
    safeDottedTokens,
    schoolLocationContextTokens,
    sectionHeadersToDownweight,
    sectionHeadersToSuppress,
    stackAllowShortTokens,
    wrapperSuppressLineSubstrings,
)


def count_phrases_by_source(text, source, phrases, source_weight):

    # initialize a dict for phrase counts.
    phrase_counts = {}

    # scrub the text.
    scrubbed_text = f" {text} "

    # iterate over the phrases.
    for phrase in phrases:
        # create a regex pattern for the phrase.
        pattern = r"(?<!\w)" + re.escape(phrase.lower()) + r"(?!\w)"
        
        # find all matches in the scrubbed text.
        matches = re.findall(pattern, scrubbed_text)
        
        # if no matches, continue.
        if not matches:
            continue

        # initialize the phrase count for the source.
        phrase_counts.setdefault(phrase, {})

        # get the current count for the source and add the matches * the source weight.
        phrase_counts[phrase][source] = phrase_counts[phrase].get(source, 0.0) + (len(matches) * source_weight)

        # remove the matches from the scrubbed text.
        scrubbed_text = re.sub(pattern, " ", scrubbed_text)

    # return the phrase counts and the scrubbed text.
    return phrase_counts, scrubbed_text

# --- gets any relevant keywords from the title text. --- #
# input -> role title text, phrases, weak tokens, domain signal tokens.
# output -> dict of phrases and their frequencies.
def extract_title_ngram_phrases(roleTitle, phrases, weakTokens, domainSignalTokens):

    # find all tokens in the role text.
    tokens = re.findall(r"[a-z][a-z0-9+.#-]{1,}", (role_text or "").lower())

    # if the number of tokens is less than 2, return an empty dict.
    if len(tokens) < 2:
        return {}

    # initialize a dict for found phrases.
    found = {}

    # find all n-grams in the tokens.
    max_n = min(4, len(tokens))

    # iterate over the n-grams.
    for n in range(2, max_n + 1):
        
        # iterate over the tokens.
        for i in range(0, len(tokens) - n + 1):
            
            # get the parts of the n-gram.
            parts = tokens[i : i + n]

            # if the parts are connector edge words, continue.
            if parts[0] in connectorEdgeWords or parts[-1] in connectorEdgeWords:
                continue

            # if the parts are phrase pronouns or instruction noise, continue.
            if any(tok in phrasePronounTokens or tok in instructionNoiseTokens for tok in parts):
                continue

            # normalize the phrase.
            phrase = normalize_term(" ".join(parts))

            # if the phrase is not in the known phrases, continue.
            if phrase not in phrases:
                
                # reject generic title fragments like "<noun> associate" unless explicitly known.
                if len(parts) == 2 and parts[-1] in titleFragmentBlacklistTailTokens:
                    continue

                # reject "<noun> manager <location/org chunk>" style fragments unless explicitly known.
                if len(parts) >= 3 and "manager" in parts and any(tok in orgLocationPhraseTokens for tok in parts):
                    continue
            
            # if all the parts are weak tokens, continue.
            if all(tok in weakTokens for tok in parts):
                continue

            # if not any of the parts are domain signal tokens, continue.
            if not any(tok in domainSignalTokens for tok in parts):
                continue

            # add the phrase to the found dict.
            found[phrase] = max(found.get(phrase, 0.0), 1.0)
    return found


def is_numeric_or_noise(token, garbage_tokens):
    return token in garbage_tokens or bool(re.fullmatch(r"\d+[+]?", token))

# --- phrase-friendly clean up for a term. --- #
# input -> term.
# output -> cleaned term. (lowercase, strips punctuation and junk)
def normalize_term(term):
    cleaned = re.sub(r"^[^a-z0-9+#./-]+|[^a-z0-9+#./-]+$", "", term.strip().lower())
    cleaned = re.sub(r"[.,;:!?]+$", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def build_signal_token_set(boostWords):

    # initialize a set for signal tokens.
    signalTokens = set()

    # iterate over the boost words.
    for key in boostWords.keys():
        signalTokens.add(key)
        if " " in phrase:
            # keep multiword boosts as phrase-level signals only.
            continue

        # only explode multiword boosts into tokens when each token is non-generic.
        for piece in re.findall(r"[a-z0-9+#.-]{2,}", key):
            if piece in STACK_TOKEN_BLOCKLIST or piece in CONNECTOR_EDGE_WORDS:
                continue
            # add the piece to the signal tokens.
            signal_tokens.add(piece)

    # update the signal tokens with the allow short tokens.
    signal_tokens.update(allow_short_tokens)
    signal_tokens.update(STACK_ALLOW_SHORT_TOKENS)
    return signal_tokens


def extract_stack_list_terms(text, signal_tokens, stop_words, weak_tokens, boost_words):

    # initialize a dict for concrete found tokens.
    concrete_found = {}

    # initialize a dict for capability found tokens.
    capability_found = {}

    # iterate over the lines in the text.
    for raw_line in text.splitlines():

        # get the line.
        line = raw_line.lower()

        # if the line is empty, continue.
        if not line.strip():
            continue

        # check if the line looks like a stack line.
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


# --- extracts dynamic phrases from the text. --- #
# input -> text, weak tokens, domain signal tokens, phrases, min count.
# output -> dict of phrases and their frequencies.
def extract_dynamic_phrases(text, weakTokens, domainSignalTokens, phrases, minCount):

    # find all tokens in the text.
    tokens = re.findall(r"[a-z][a-z0-9+.#-]{1,}", text.lower())
    if not tokens:
        return {}

    # initialize a dict for counts.
    counts = defaultdict(int)

    # iterate over the n-grams.
    for n in (2, 3, 4):
        for i in range(0, max(0, len(tokens) - n + 1)):
            
            # get the parts of the n-gram.
            parts = tokens[i : i + n]

            # if the parts are stop words, continue.
            if sum(1 for tok in parts if tok in stopWords) >= n - 1:
                continue
            if parts[0] in CONNECTOR_EDGE_WORDS or parts[-1] in CONNECTOR_EDGE_WORDS:
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

# --- checks if line is bs footer or redirect link line. --- #
def is_footer_or_link_line(normalized):
    # if line is url or link.
    if any(re.search(pattern, normalized) for pattern in urlLinePatterns):
        return True

    # if line is compliance footer.
    return any(snippet in normalized for snippet in complianceFooterSubstrings)


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


# --- normalize the header. --- #
# input -> raw header text.
# output -> normalized header text.
def normalize_header(line: str) -> str:

    # remove all non-alphanumeric characters and spaces.
    clean = re.sub(r"[^a-z0-9& ]+", " ", line.lower()).strip()
    clean = re.sub(r"\s+", " ", clean)
    return clean


def line_has_concrete_signal(line: str) -> bool:
    lowered = (line or "").lower()
    if re.search(r"[+#./-]|\d", lowered):
        return True
    
    # iterate over the tokens in the line.
    for token in re.findall(r"[a-z0-9+#.-]{2,}", lowered):
        if token in concreteStackTerms or token in stackAllowShortTokens:
            return True
    return False

# --- splits the role description lines into normal and downweighted lines. --- #
# input -> role description lines.
# output -> normal lines (like skills or responsibilities) & downweighted lines (like our values).
def split_weighted_sections(roleDescriptionLines):
    
    # initialize the lines.
    normalLines = []
    downweightedLines = []

    # initialize the mode.
    mode = "normal"  # normal | downweighted | suppressed

    # iterate over the lines.
    for line in roleDescriptionLines:

        # normalize the line.
        normalized = normalize_header(line)

        if normalized:
            # if line is a wrapper supress line (e.g. "Apply Now")
            if any(snippet in normalized for snippet in wrapperSuppressLineSubstrings):
                mode = "suppressed"
                continue

            # if line is a section header to suppress (e.g. "Our Benefits")
            if any(normalized.startswith(header) for header in sectionHeadersToSuppress):
                mode = "suppressed"
                continue

            # if line is a section header to downweight (e.g. "Our Values")
            if any(normalized.startswith(header) for header in sectionHeadersToDownweight):
                mode = "downweighted"
                downweightedLines.append(line)
                continue

            # if line is a mission culture line (e.g. "Our Mission") and does not have a concrete signal.
            if any(snippet in normalized for snippet in missionCultureLineSubstrings) and not line_has_concrete_signal(line):
                mode = "downweighted"
                downweightedLines.append(line)
                continue
        else:
            # reset after blank line so we do not suppress the entire remainder of the JD.
            mode = "normal"
            continue

        # if mode is suppressed, do not add the line to the normal or downweighted lines.
        if mode == "suppressed":
            continue

        # if mode is downweighted, add the line to the downweighted lines.
        if mode == "downweighted":
            downweightedLines.append(line)
        else:
            normalLines.append(line)

    return normalLines, downweightedLines

# --- precleans the job description text. --- #
# input -> raw JD text.
# output -> parsed JD lines
def parse_jd_lines(jobDescription):
    keep = []
    for raw in jobDescription.splitlines():
        line = raw.strip()

        # if line is empty, add an empty string.
        if not line:
            keep.append("")
            continue
        
        # normalize the line.
        lowered = line.lower()

        # if line is footer or link, don't add it.
        if is_footer_or_link_line(lowered):
            continue

        # add the line to the kept lines.
        keep.append(lowered)

    return keep

# --- based on key headers, extract role focused text. --- #
# input -> role description lines.
# output -> role focused text. (e.g. "Responsibilities: ...\n\nRequirements: ...\n\nQualifications: ...")
def extract_role_focused_text(roleDescriptionLines):

    focused = []

    # initialize the mode.
    mode = "neutral"  # neutral | include | exclude
    sawIncludeHeader = False

    # iterate over role description lines toggling mode based on headers.
    for line in roleDescriptionLines:

        # normalize the line for sake of headers. (e.g. "**Responsibilities**" -> "responsibilities")
        normalized = normalize_header(line)

        # if the line is a role section header, add it to the focused lines.
        if any(normalized.startswith(header) for header in roleSectionHeaders):
            mode = "include"
            sawIncludeHeader = True
            focused.append(line)
            continue

        # if the line is a non-role section header, exclude it.
        if any(normalized.startswith(header) for header in nonRoleSectionHeaders):
            mode = "exclude"
            continue

        # if the line is a bullet or plain line, add it to the focused lines.
        if mode == "include":
            focused.append(line)

    # return array of focused lines (if we have any).
    if sawIncludeHeader and focused:
        return focused

    return []

# --- extract the org like tokens from the text. --- #
# input -> raw JD text.
# output -> org like tokens. (e.g. ["bloomberg", "deloitte", "wayfair"])
def extract_org_like_tokens(rawText):

    # initialize a dict for counts.
    counts = defaultdict(int)

    # get the lines from the text.
    lines = (rawText or "").splitlines()[:40]

    # iterate over the lines.
    for line_idx, line in enumerate(lines):

        # find all tokens in the line.
        for token in re.findall(r"\b[A-Z][A-Za-z0-9&.+-]{2,}\b", line):

            # normalize the token.
            token = normalize_term(token)

            # if the token is empty or a stop word, continue.
            if not token or token in ORG_TOKEN_STOPWORDS:
                continue

            # if the token is a concrete stack term or a short token, continue.
            if token in CONCRETE_STACK_TERMS or token in STACK_ALLOW_SHORT_TOKENS:
                continue

            # add the token to the counts.
            counts[token] += 1

    # return the org like tokens.
    return {token for token, freq in counts.items() if freq >= 2}

# --- breaks down aliases and phrases for each domain into signal tokens. --- #
# input -> active domains. (e.g. engineering, sales)
# output -> signal tokens.
def build_domain_signal_tokens(activeDomains):

    # initialize a set for signal tokens.
    signalTokens = set()

    # iterate over the active domains.
    for domain in activeDomains:
        pack = domainDicts.get(domain, {})

        # grab aliases and phrases for that domain.
        aliases = set(pack.get("aliases", set()))
        phrases = list(pack.get("phrases", []))

        # iterate over the aliases and phrases.
        for term in aliases.union(set(phrases)):

            # find all tokens in the term. (e.g. "full stack engineer" -> ["full", "stack", "engineer"])
            for token in re.findall(r"[a-z0-9+#.-]{3,}", term):

                # add the token to the signal tokens.
                signalTokens.add(token)

    # return the signal tokens.
    return signalTokens


def extract_job_keywords_detailed(jobDescription, limit, targetRole):

    # get extraction profile.
    profile = get_extraction_profile(jobDescription, targetRole)

    # extract the org like tokens.
    orgLikeTokens = extract_org_like_tokens(jobDescription)

    # build the domain signal tokens.
    domainSignalTokens = build_domain_signal_tokens(profile["activeDomains"])

    # initialize the phrases.
    phrases = set(list(profile["phrases"]))
    weakTokens = set(profile["weakTokens"])
    boostWords = dict(profile["boostWords"])

    # build the signal tokens.
    signalTokens = build_signal_token_set(boostWords)

    # extract text from JD.
    roleTitle = targetRole.lower().strip()

    # cleans out footer and link lines.
    roleDescriptionLines = parse_jd_lines(jobDescription)

    # extracts role focused text like Responsibilites or Qualifications.
    roleDescriptionLines = extract_role_focused_text(roleDescriptionLines)

    # splits the role description lines into normal and downweighted lines.
    weightedBodyLines, downweightedBodyLines = split_weighted_sections(roleDescriptionLines)

    # counts the phrases by source.
    titlePhraseCounts, cleanTitle = count_phrases_by_source(roleTitle, "title_phrase", phrases, 1.0)
    bodyPhraseCounts, cleanBody = count_phrases_by_source(weightedBodyLines, "known_phrase", phrases, 1.0)
    downweightedPhraseCounts, cleanDownweightedBody = count_phrases_by_source(downweightedBodyLines, "known_phrase_downweighted", phrases, downweightFactor)
    
    # initialize the term sources.
    termSources = defaultdict(dict)

    # iterate over the phrase buckets and add the counts to the term sources.
    for phraseBucket in (bodyPhraseCounts, downweightedPhraseCounts, titlePhraseCounts):
        # iterate over the phrase bucket (body, downweighted, title).
        for term, sourceMap in phraseBucket.items():
            # get the term sources.
            ts = termSources[term]
            
            # iterate over the source map.
            for sourceName, count in sourceMap.items():
                ts[source_name] = ts.get(source_name, 0.0) + count
    
    # extracts title n-gram phrases.
    titleNgramPhrases = extract_title_ngram_phrases(roleTitle, phrases, weakTokens, domainSignalTokens)

    # iterate over the title n-gram phrases and add the counts to the term sources.
    for term, freq in titleNgramPhrases.items():
        termSources.setdefault(term, {})
        termSources[term]["titlePhraseNgram"] = max(termSources[term].get("titlePhraseNgram", 0.0), float(freq))

    # extracts dynamic phrases.
    dynamicCandidates = extract_dynamic_phrases(cleanBody, weakTokens, domainSignalTokens, phrases, 2)

    # iterate over the dynamic candidates and add the counts to the term sources.
    for term, freq in dynamicCandidates.items():
        termSources.setdefault(term, {})
        termSources[term]["dynamicPhrase"] = termSources[term].get("dynamicPhrase", 0.0) + freq

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
        term_sources[term]["token_downweighted"] = term_sources[term].get("token_downweighted", 0.0) + downweightFactor

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
