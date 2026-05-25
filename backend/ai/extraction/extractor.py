# --- incremental extractor pipeline. --- #

# ===== imports ===== #
import re
import os
from collections import defaultdict
from dataclasses import dataclass, field

# --- local imports.
from .profiles import get_extraction_profile

# --- rules + lexicon.
from .rules import (
    urlLinePatterns, complianceFooterSubstrings, wrapperSuppressLineSubstrings,
    nonRoleSectionHeaders, sectionHeadersToDownweight, roleSectionHeaders,
    downweightFactor, concreteStackTerms, roleCapabilityStackTerms,
    hardNoiseTokens, benefitNoiseTokens, keywordTrashTokens,
    umbrellaBodyWeakTokens,
)
from .lexicon import (
    globalStopWords, globalAllowShortTokens, globalPhraseCanonical, globalWeakTokens,
)

# --- debugging.
import json
from pathlib import Path
out = Path(__file__).resolve().parent.parent / "debug_out" / "extractor_latest.json"

# ===== dataclasses ===== #
@dataclass
class ExtractionResult:
    jobDescription: str
    targetRole: str

    profile: dict

    bodyLines: list[str] = field(default_factory=list)
    downweightedLines: list[str] = field(default_factory=list)

    cleanTitle: str = ""
    cleanBody: str = ""
    cleanDownweightedBody: str = ""

    termSources: dict[str, dict[str, float]] = field(default_factory=lambda: defaultdict(dict))

# ===== helpers ===== #

PRESERVED_SIGNAL_PHRASES = {
    "ai integration",
    "ai-driven applications",
    "amazon bedrock",
    "api integration",
    "api integrations",
    "backend services",
    "cloud platform",
    "cloud platforms",
    "conversational ai",
    "conversational applications",
    "dialog flow",
    "dialog flows",
    "dialogflow",
    "google ces",
    "google cloud",
    "google cloud platform",
    "large language models",
    "llm models",
    "openai",
    "prompt engineering",
    "third-party systems",
    "version control",
}

SIGNAL_CANONICAL = {
    "ai": "artificial intelligence",
    "api integrations": "api integration",
    "aws": "amazon web services",
    "ci/cd": "ci/cd",
    "ci cd": "ci/cd",
    "conversational applications": "conversational ai",
    "dialog flow": "dialogflow",
    "dialog flows": "dialogflow",
    "gcp": "google cloud platform",
    "google cloud": "google cloud platform",
    "llm": "large language models",
    "llm models": "large language models",
    "open ai": "openai",
    "version control": "git",
}

TOOL_PLATFORM_TERMS = {
    "amazon bedrock",
    "amazon web services",
    "anthropic claude",
    "azure",
    "ci/cd",
    "dialogflow",
    "docker",
    "fastapi",
    "git",
    "google ces",
    "google cloud platform",
    "java",
    "javascript",
    "kafka",
    "kubernetes",
    "langchain",
    "langgraph",
    "node.js",
    "openai",
    "postgresql",
    "python",
    "react",
    "sql",
    "typescript",
}

CONTEXT_TERMS = {
    "healthcare",
    "health care",
    "managed service providers",
    "msp",
    "msps",
    "natural gas",
    "utilities",
    "utility",
}

GENERIC_FRAGMENT_TERMS = {
    "application",
    "applications",
    "cloud platform",
    "cloud platforms",
    "experience",
    "flow",
    "model",
    "models",
    "platform",
    "platforms",
    "solution",
    "solutions",
}

NOISE_SIGNAL_TERMS = {
    "contract",
    "pay",
    "pay range",
    "recruiter",
    "remote",
}

CONTEXT_LINE_CUES = {
    "client is",
    "client is a",
    "client is a leading",
    "company is",
    "industry",
    "our client",
    "serving",
    "who we are",
}

ROLE_CAPABILITY_SOURCE_KEYS = {
    "knownPhrase",
    "titlePhrase",
    "concreteStack",
    "capabilityStack",
}

# --- normalize the header. --- #
def normalize_header(line: str) -> str:
    clean = re.sub(r"[^a-z0-9& ]+", " ", (line or "").lower()).strip()
    clean = re.sub(r"\s+", " ", clean)
    return clean

# --- checks if line is bs footer or redirect link line. --- #
def is_footer_or_link_line(normalized):
    # if line is url or link.
    if any(re.search(pattern, normalized) for pattern in urlLinePatterns):
        return True

    # if line is compliance footer.
    return any(snippet in normalized for snippet in complianceFooterSubstrings)

# --- check if the line looks like a techical stack line. --- #
# colons and bare commas match too many “requirements:” and prose lines; require lists / path-like patterns.
def looks_like_stack_line(line):
    if not line:
        return False
    s = line
    if "/" in s:
        return True
    if "(" in s and ")" in s:
        return True
    if "," in s and len(s) < 200:
        return True
    return False

# --- canonicalize the token based on our alias list. --- #
def canonicalize_token(token):
    term = (token or "").strip()
    if not term:
        return term
    low = term.lower()
    if low in SIGNAL_CANONICAL:
        return SIGNAL_CANONICAL[low]
    if low in globalPhraseCanonical:
        return globalPhraseCanonical[low]
    with_space = low.replace("/", " ")
    if with_space in SIGNAL_CANONICAL:
        return SIGNAL_CANONICAL[with_space]
    if with_space in globalPhraseCanonical:
        return globalPhraseCanonical[with_space]
    return low


# --- map multi-word known phrases to a single ranked key (e.g. microsoft azure -> azure) so stack + phrase credit collapse. --- #
def canonicalize_phrase_key(phrase):
    if not phrase:
        return phrase
    low = phrase.strip().lower()
    if low in SIGNAL_CANONICAL:
        return SIGNAL_CANONICAL[low]
    return globalPhraseCanonical.get(low, low)


def classify_jd_line(line: str) -> str:
    low = normalize_header(line)
    if is_footer_or_link_line(low):
        return "noise"
    if any(snippet in low for snippet in wrapperSuppressLineSubstrings):
        return "noise"
    if any(cue in low for cue in CONTEXT_LINE_CUES):
        return "context"
    if any(cue in low for cue in ("benefit", "benefits", "pay range", "401", "insurance", "sick leave")):
        return "noise"
    if any(cue in low for cue in ("responsibilities", "what you", "develop", "build", "maintain", "design", "implement")):
        return "role"
    if any(cue in low for cue in ("requirements", "skills", "experience with", "proficiency", "familiarity")):
        return "requirement"
    return "body"


def term_lines(term: str, lines: list[str]) -> list[str]:
    if not term:
        return []
    pattern = r"(?<![a-z0-9])" + re.escape(term.lower()) + r"(?![a-z0-9])"
    aliases = {term.lower()}
    if term == "dialogflow":
        aliases.update({"dialog flow", "dialog flows"})
    elif term == "google cloud platform":
        aliases.update({"gcp", "google cloud"})
    elif term == "amazon web services":
        aliases.update({"aws"})
    elif term == "large language models":
        aliases.update({"llm", "llm models"})
    elif term == "ci/cd":
        aliases.update({"ci cd"})
    out = []
    for line in lines or []:
        low = str(line or "").lower()
        if re.search(pattern, low) or any(alias and alias in low for alias in aliases):
            out.append(line)
    return out


def signal_type_for_term(term: str, source_map: dict | None = None, lines: list[str] | None = None) -> str:
    t = canonicalize_phrase_key(term)
    source_map = source_map or {}
    line_blob = " ".join(lines or []).lower()
    line_kinds = {classify_jd_line(line) for line in (lines or [])}

    if t in NOISE_SIGNAL_TERMS or line_kinds == {"noise"}:
        return "noise"
    if t in CONTEXT_TERMS or (line_kinds and line_kinds <= {"context", "noise"}):
        return "context"
    if t in TOOL_PLATFORM_TERMS:
        return "tool_platform"
    if t in GENERIC_FRAGMENT_TERMS:
        return "generic_fragment"
    if t in {"cloud"} and "cloud platform" in line_blob and not any(k in source_map for k in ROLE_CAPABILITY_SOURCE_KEYS):
        return "generic_fragment"
    if any(k in source_map for k in ROLE_CAPABILITY_SOURCE_KEYS):
        return "role_capability"
    return "generic_fragment" if t in globalWeakTokens else "role_capability"


def annotate_ranked_terms(ranked_terms: list[dict], body_lines: list[str], downweighted_lines: list[str]) -> list[dict]:
    all_lines = list(body_lines or []) + list(downweighted_lines or [])
    annotated = []
    for entry in ranked_terms or []:
        if not isinstance(entry, dict):
            continue
        term = canonicalize_phrase_key(entry.get("term") or "")
        if not term:
            continue
        lines = term_lines(term, all_lines)
        signal_type = signal_type_for_term(term, entry.get("sourceMap") or {}, lines)
        annotated.append(
            {
                **entry,
                "term": term,
                "signalType": signal_type,
                "lineKinds": sorted({classify_jd_line(line) for line in lines}),
                "linePreview": lines[:2],
            }
        )
    return annotated


def build_priority_keywords(annotated_terms: list[dict], limit: int) -> tuple[list[dict], list[dict]]:
    priority = []
    suppressed = []
    seen = set()
    for entry in annotated_terms or []:
        term = str((entry or {}).get("term") or "").strip()
        if not term or term in seen:
            continue
        seen.add(term)
        signal_type = entry.get("signalType") or "role_capability"
        reason = ""
        if signal_type == "generic_fragment":
            reason = "generic fragment; keep only inside stronger phrases"
        elif signal_type == "noise":
            reason = "job-post boilerplate/noise"
        elif signal_type == "context":
            reason = "company/product/client context; do not drive resume claims"
        if reason:
            suppressed.append({"term": term, "signalType": signal_type, "reason": reason, "sources": entry.get("sources") or []})
            continue
        priority.append(entry)
        if len(priority) >= limit:
            break
    return priority, suppressed


def compact_term_entries(entries: list[dict]) -> list[dict]:
    out = []
    for entry in entries or []:
        if not isinstance(entry, dict):
            continue
        out.append({k: v for k, v in entry.items() if k != "sourceMap"})
    return out


# --- split slash-joined tool lists (e.g. node.js/express) into parts unless the full token is a known idiom (ci/cd, ml/ai, …). --- #
def normalize_target_role_for_extraction(targetRole):
    text = (targetRole or "").lower().strip()
    text = re.sub(r"\([^)]*\)", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def top_count_items(counts, limit=12):
    if not isinstance(counts, dict):
        return []
    return [
        {"term": term, "count": round(float(count), 3)}
        for term, count in sorted(counts.items(), key=lambda item: (-float(item[1]), str(item[0])))[:limit]
    ]


def build_basic_extraction_debug(
    *,
    target_role,
    company,
    profile,
    body_lines,
    downweighted_lines,
    title_phrase_counts,
    body_phrase_counts,
    downweighted_phrase_counts,
    concrete_stack_counts,
    capability_stack_counts,
    title_token_counts,
    body_token_counts,
    downweighted_token_counts,
    ranked_terms,
    priority_terms=None,
    suppressed_terms=None,
    relevant_lines,
    num_keywords,
):
    phrase_counts = {}
    for bucket in (title_phrase_counts, body_phrase_counts, downweighted_phrase_counts):
        for phrase, source_map in (bucket or {}).items():
            phrase_counts[phrase] = phrase_counts.get(phrase, 0.0) + sum(float(v or 0) for v in source_map.values())
    return {
        "target_role": target_role,
        "company": company,
        "active_domains": list((profile or {}).get("activeDomains") or []),
        "line_counts": {
            "included_body": len(body_lines or []),
            "downweighted": len(downweighted_lines or []),
        },
        "included_line_samples": list(body_lines or [])[:12],
        "downweighted_line_samples": list(downweighted_lines or [])[:8],
        "top_keywords": list(ranked_terms or [])[:num_keywords],
        "priority_keywords": list(priority_terms or [])[:num_keywords],
        "suppressed_terms": list(suppressed_terms or [])[:16],
        "relevant_jd_lines": list(relevant_lines or [])[:10],
        "line_classification": [
            {"kind": classify_jd_line(line), "line": line}
            for line in list(body_lines or [])[:20]
        ],
        "top_known_phrases": top_count_items(phrase_counts, limit=12),
        "top_stack_terms": {
            "concrete": top_count_items(concrete_stack_counts, limit=12),
            "capability": top_count_items(capability_stack_counts, limit=8),
        },
        "top_tokens": {
            "title": top_count_items(title_token_counts, limit=10),
            "body": top_count_items(body_token_counts, limit=14),
            "downweighted": top_count_items(downweighted_token_counts, limit=10),
        },
    }


def iter_slashed_token_pieces(raw):
    # initialize the token.
    t = (raw or "").rstrip(".,;:").lower()
    if not t:
        return
    # if the token does not contain a slash, yield the token.
    if "/" not in t:
        yield t
        return
    # if the token is a known idiom, yield the token.
    if t in globalPhraseCanonical:
        yield t
        return
    # if the token is a known idiom with a space, yield the token.
    if t.replace("/", " ") in globalPhraseCanonical:
        yield t
        return
    # iterate over the parts of the token.
    for part in t.split("/"):
        part = part.strip()
        if part:
            yield part

# --- words inside a matched phrase get partOfPhrase so the weak-token penalty does not fire for phrase-only use. --- #
def merge_part_of_phrase_hits(termSources, phraseCounts, scale):

    # for each phrase and its source map.
    for phrase, sourceMap in phraseCounts.items():
        # get the weight of the phrase.
        w = sum(sourceMap.values()) * scale

        # if the weight is less than or equal to 0, continue.
        if w <= 0:
            continue

        # for each raw token in the phrase.
        for raw in re.findall(r"[a-z][a-z0-9+.#/-]{0,}", phrase.lower()):
            # iterate over the parts of the token.
            for piece in iter_slashed_token_pieces(raw):
                t = canonicalize_token(piece)

                # if the token is empty, a stop word, or a weak token, continue.
                if not t or t in globalStopWords or t in globalWeakTokens:
                    continue

                # if the token is less than 3 characters and not in the global allow short tokens, continue.
                if len(t) < 3 and t not in globalAllowShortTokens:
                    continue

                # get the term source.
                ts = termSources[t]

                # add the weight to the term source.
                ts["partOfPhrase"] = ts.get("partOfPhrase", 0.0) + w

# --- update the aggregate counts (for my own personal debugging).--- #
def update_aggregate_counts(rankedTerms, limit=10):
    # set the path to the aggregate terms file.
    aggPath = Path(__file__).resolve().parent.parent / "debug_out" / "aggregate_terms.json"

    # if the aggregate terms file exists, load the data.
    if aggPath.exists():
        # load the data from the file.
        data = json.loads(aggPath.read_text(encoding="utf-8"))
    else:
        # initialize the data.
        data = {}

    # iterate over the ranked terms. (limit to the top N terms.)
    for item in rankedTerms[:limit]:
        # get the term.
        term = item["term"].lower()
        data[term] = data.get(term, 0) + 1

    # save the data to the file.
    aggPath.parent.mkdir(parents=True, exist_ok=True)
    aggPath.write_text(json.dumps(dict(sorted(data.items(), key=lambda kv: (-kv[1], kv[0]))), indent=2) + "\n", encoding="utf-8")

# ===== main steps of pipeline ===== #

# --- parse the job description into lines. --- #
# input -> job description text, target role.
# output -> body lines, downweighted lines.
def parse_jd_lines(jobDescription):

    # initialize body & downweighted lines.
    bodyLines = []
    downweightedLines = []
    neutralLines = []

    # initialize mode.
    mode = "neutral"
    sawRoleHeader = False

    for rawLine in jobDescription.splitlines():

        line = rawLine.strip()

        # if line is empty, reset mode.
        if not line:
            continue

        # normalize the line and give it formatting to catch headers.
        lowered = (line or "").lower()
        normalized = normalize_header(lowered)

        # if line is a footer or link line, skip it.
        if is_footer_or_link_line(normalized):
            continue

        # if line is a wrapper suppress line, skip it (e.g. "apply now")
        if any(snippet in normalized for snippet in wrapperSuppressLineSubstrings):
            continue

        # if line is a non-role section header, skip it. (e.g. "who we are", "next steps")
        if any(normalized.startswith(header) for header in nonRoleSectionHeaders):
            mode = "exclude"
            continue
            
        # if line is a section header to downweight, downweight it. (e.g. "our values", "job type")
        if any(normalized.startswith(header) for header in sectionHeadersToDownweight):
            mode = "downweighted"
            continue

        # if line is a role section header, include it. (e.g. "job description", "about the role")
        if any(normalized.startswith(header) for header in roleSectionHeaders):
            mode = "include"
            sawRoleHeader = True
            continue

        # based on state, add line to our lists.
        if mode == "include":
            bodyLines.append(lowered)
        elif mode == "downweighted":
            downweightedLines.append(lowered)
        elif mode == "neutral":
            neutralLines.append(lowered)

    if not sawRoleHeader:
        bodyLines = neutralLines

    return bodyLines, downweightedLines

            
# --- count our phrases by source. --- #
# input -> text, source, phrases, sourceWeight.
# output -> phraseCounts, scrubbed text.
def count_phrases(text, source, phrases, sourceWeight=1.0):
    # initialize our dict.
    phraseCounts = {}

    # scrub the text.
    scrubbed = f" {text} "

    # iterate over our phrases.
    for phrase in phrases:
        
        # set our phrase pattern. (no alpha-numeric chars touching the phrase.)
        pattern = r"(?<!\w)" + re.escape(phrase) + r"(?!\w)"

        # find all matches in the scrubbed text.
        matches = re.findall(pattern, scrubbed)

        if not matches:
            continue

        # set empty dictionary for this phrase.
        phraseCounts.setdefault(phrase, {})

        # add the matches to the phrase count w/ source and weight.
        phraseCounts[phrase][source] = phraseCounts[phrase].get(source, 0.0) + (len(matches) * sourceWeight)

        # removes matches from scrubbed text.
        scrubbed = re.sub(pattern, " ", scrubbed)
    
    # remove extra whitespace.
    scrubbed = re.sub(r"\s+", " ", scrubbed).strip()

    return phraseCounts, scrubbed

# --- extract stack terms from jd. --- #
# input -> body lines.
# output -> concrete counts, capability counts.
def extract_stack_terms(bodyLines, company=""):
    concreteCounts = {}
    capabilityCounts = {}

    # iterate over the body lines.
    for line in bodyLines:
        # normalize the line.
        low = line.lower().strip()

        # if the line does not look like a stack line, continue.
        if not looks_like_stack_line(low):
            continue

        # iterate over the tokens in the line.
        for token in re.findall(r"[a-z0-9+#.-]{2,}", low):
            # canonicalize the token.
            term = canonicalize_token(token.strip())
            if not term:
                continue

            # if the token is a company term, continue.
            if str(company or "").strip() and (str(company).lower() in (term or "") or (term in str(company).lower())): continue

            # if the token is a concrete stack term, update the concrete counts.
            if term in concreteStackTerms:
                concreteCounts[term] = concreteCounts.get(term, 0.0) + 1.0
            
            # if the token is a role capability stack term, update the capability counts.
            elif term in roleCapabilityStackTerms:
                capabilityCounts[term] = capabilityCounts.get(term, 0.0) + 1.0
    
    return concreteCounts, capabilityCounts

# --- extract tokens from text by cleaning. --- #
# this func will leave us with a dict of terms that "make sense" as a token (based on our current ruleset).
# input -> text.
# output -> token counts.
def extract_tokens(text, company=""):
    # initialize token counts.
    tokenCounts = {}

    # for each raw token in text. (e.g. "")
    for rawToken in re.findall(r"[a-z][a-z0-9+.#/-]{0,}", text):
        for piece in iter_slashed_token_pieces(rawToken):
            term = canonicalize_token(piece)

            # if token is empty, continue.
            if not term:
                continue
            if str(company or "").strip() and (str(company).lower() in (term or "") or (term in str(company).lower())): continue

            # if token is a stop word, continue.
            if term in globalStopWords:
                continue

            # if token is a hard noise token or benefit noise token, continue.
            if term in hardNoiseTokens or term in benefitNoiseTokens:
                continue

            # drop narrative/culture tokens so they never enter body/title token counts or termSources.
            if term in keywordTrashTokens:
                continue

            if len(term) < 3 and term not in globalAllowShortTokens:
                continue

            tokenCounts[term] = tokenCounts.get(term, 0.0) + 1.0

    return tokenCounts

# --- score terms based on the sources. --- #
# this is how we'll rank our terms based on our sources.
# input -> term sources, boost words, weak tokens.
# output -> scored list.
def score_terms(termSources, boostWords, weakTokens, umbrellaWeak=None):

    # initialize scored list.
    scored = []
    umbrellaW = umbrellaWeak or frozenset()
    preservedCanonical = {canonicalize_phrase_key(p) for p in PRESERVED_SIGNAL_PHRASES}

    for term, sourceMap in termSources.items():
        # get frequency of term.
        frequency = sum(sourceMap.values())

        # convert to float.
        score = float(frequency)

        # boost words from our respective profile.
        score += float(boostWords.get(term, 0))

        # conditional boost based on sources.
        # title_ph > known > known_dw > concrete > capability > title_tok > else.
        if "titlePhrase" in sourceMap:
            score += 2.0
        if "knownPhrase" in sourceMap:
            score += 2.0
        if "concreteStack" in sourceMap:
            score += 1.5
        if "titleToken" in sourceMap:
            score += 1.0
        if "knownPhraseDownweighted" in sourceMap:
            score += 0.75
        if "capabilityStack" in sourceMap:
            score += 0.3
        if term in TOOL_PLATFORM_TERMS:
            score += 2.0
        if term in PRESERVED_SIGNAL_PHRASES or term in preservedCanonical:
            score += 2.0

        # check if term has a strong source.
        strongSource = any(key in sourceMap for key in ("titlePhrase", "knownPhrase", "concreteStack", "titleToken"))
        if sourceMap.get("partOfPhrase", 0.0) > 0.0:
            strongSource = True

        # weak tokens without a strong source: scale with repeat count (flat -1 is not enough for 4–10× body hits).
        if term in weakTokens and not strongSource:
            score -= min(8.0, 1.2 + 0.55 * max(0.0, frequency - 1.0))

        # extra dampening for high-frequency umbrella words (data, experience, systems, …) from body only.
        if term in umbrellaW and not strongSource:
            score -= min(5.0, 0.5 * float(frequency))

        # add the term to the scored list.
        scored.append({
            "term": term,
            "score": round(score, 3),
            "frequency": round(frequency, 3),
            "sources": sorted(sourceMap.keys()),
            "sourceMap": dict(sourceMap),
        })
        
    # return scored listed sorted by score (desc), frequency (desc), term (asc).
    return sorted(scored, key=lambda item: (-item["score"], -item["frequency"], item["term"]))
 

# --- get the relevant JD lines. --- #
# input -> body lines, keywords.
# output -> relevant lines.
def get_relevant_jd_lines(bodyLines, keywords):
    # initialize the relevant line hits.

    # get the keywords.
    keywords = [keyword["term"] for keyword in keywords]

    # initialize the relevant line hits.
    relevantLineHits = {}

    # iterate over the body lines.
    for idx, line in enumerate(bodyLines):
        
        # iterate over the keywords.
        for keyword in keywords:

            # set the pattern.
            pattern = r"(?<![a-z0-9])" + re.escape(keyword) + r"(?![a-z0-9])"

            # if the line matches the keyword, update the relevant line hits.
            if re.search(pattern, line):
                relevantLineHits[idx] = relevantLineHits.get(idx, 0) + 1

    # sort the relevant line hits by hits (desc) and index (asc).
    sortedLinesByHits = sorted(relevantLineHits.items(), key=lambda item: (-item[1], item[0]))

    # initialize the relevant lines.
    relevantLines = []

    # add top 10 relevant lines to the relevant lines list.
    for idx, hits in sortedLinesByHits[:10]:
        relevantLines.append(bodyLines[idx])
    
    return relevantLines


    
# --- extract keywords from the job description. --- #
# main function that calls our other functions in sequence.
# input -> job description, target role, number of keywords.
# output -> ranked terms.
def extract_keywords(jobDescription, targetRole, numKeywords, company=""):

    # debugging control.
    wanna_debug = (os.getenv("TAILOR_EXTRACT_DEBUG") or "").strip().lower() in ("1", "true", "yes", "on")
    wanna_count = (os.getenv("TAILOR_AGGREGATE_TERMS") or "").strip().lower() in ("1", "true", "yes", "on")
    if wanna_debug:
        debug = {}

    # 1. get extraction profile. (active domains, relevant phrases, weak tokens, boost words)
    profile = get_extraction_profile(jobDescription, targetRole)

    res = ExtractionResult(jobDescription=jobDescription, targetRole=targetRole, profile=profile)

    if wanna_debug: 
        debug["profile.activeDomains"] = profile["activeDomains"]
        debug["profile.weakTokens"] = list(profile["weakTokens"])
        debug["company"] = company

    # 2. parse jd into lines.
    res.bodyLines, res.downweightedLines = parse_jd_lines(jobDescription)

    if wanna_debug:
        debug["bodyLines"] = res.bodyLines.copy()
        debug["downweightedLines"] = res.downweightedLines.copy()

    # 3. clean our text fields.
    res.cleanTitle = normalize_target_role_for_extraction(res.targetRole)
    res.cleanBody = "\n".join(res.bodyLines)
    res.cleanDownweightedBody = "\n".join(res.downweightedLines)
    
    # 4. extract known phrases / keywords.
    extraction_phrases = sorted(
        set(res.profile["phrases"] or []) | PRESERVED_SIGNAL_PHRASES,
        key=lambda phrase: (-len(str(phrase)), str(phrase)),
    )
    titlePhraseCounts, res.cleanTitle = count_phrases(res.cleanTitle, "titlePhrase", extraction_phrases, 1.0)
    bodyPhraseCounts, res.cleanBody = count_phrases(res.cleanBody, "knownPhrase", extraction_phrases, 1.0)
    downweightedPhraseCounts, res.cleanDownweightedBody = count_phrases(res.cleanDownweightedBody, "knownPhraseDownweighted", extraction_phrases, downweightFactor)

    # 5. merge into our termSources.

    # iterate over our phrase buckets (body, downweighted, title).
    for phraseBucket in (bodyPhraseCounts, downweightedPhraseCounts, titlePhraseCounts):
        # get the term and its source map (term, { source: count })
        for term, sourceMap in phraseBucket.items():
            term = canonicalize_phrase_key(term)
            # get the term sources.
            ts = res.termSources[term]

            # iterate over the source map.
            for sourceName, count in sourceMap.items():
                # add the count to the term source.
                ts[sourceName] = ts.get(sourceName, 0.0) + count

    # 6. words inside matched phrases get partOfPhrase on their token rows (weak-token rule).

    # helps tokens that appear in phrases so scoring doesn't punish them like random filler.
    merge_part_of_phrase_hits(res.termSources, bodyPhraseCounts, 1.0)
    merge_part_of_phrase_hits(res.termSources, titlePhraseCounts, 1.0)
    merge_part_of_phrase_hits(res.termSources, downweightedPhraseCounts, downweightFactor)

    if wanna_debug:
        debug["cleanTitle"] = res.cleanTitle
        debug["cleanBody"] = res.cleanBody
        debug["cleanDownweightedBody"] = res.cleanDownweightedBody
        debug["extractionPhrases"] = extraction_phrases
        debug["titlePhraseCounts"] = titlePhraseCounts
        debug["bodyPhraseCounts"] = bodyPhraseCounts
        debug["downweightedPhraseCounts"] = downweightedPhraseCounts
        debug["termSources_after_known_phrases"] = dict(res.termSources)

    # 7. extract stack terms & update termSources.
    concreteStackCounts, capabilityStackCounts = extract_stack_terms(res.bodyLines, company=company)

    # iterate over the concrete stack counts, and update our termSources.
    for term, freq in concreteStackCounts.items():
        ts = res.termSources[term]
        ts["concreteStack"] = ts.get("concreteStack", 0.0) + freq

    # iterate over the capability stack counts, and update our termSources.
    for term, freq in capabilityStackCounts.items():
        ts = res.termSources[term]
        ts["capabilityStack"] = ts.get("capabilityStack", 0.0) + freq

    if wanna_debug:
        debug["concreteStackCounts"] = concreteStackCounts
        debug["capabilityStackCounts"] = capabilityStackCounts

    # 8. extract tokens from text.
    titleTokenCounts = extract_tokens(res.cleanTitle, company=company)
    bodyTokenCounts = extract_tokens(res.cleanBody, company=company)
    downweightedTokenCounts = extract_tokens(res.cleanDownweightedBody, company=company)

    # iterate over the title token counts, and update our termSources.
    for term, freq in titleTokenCounts.items():
        ts = res.termSources[term]
        ts["titleToken"] = ts.get("titleToken", 0.0) + freq

    # iterate over the body token counts, and update our termSources.
    for term, freq in bodyTokenCounts.items():
        ts = res.termSources[term]
        ts["bodyToken"] = ts.get("bodyToken", 0.0) + freq

    # iterate over the downweighted token counts, and update our termSources.
    for term, freq in downweightedTokenCounts.items():
        ts = res.termSources[term]
        ts["downweightedToken"] = ts.get("downweightedToken", 0.0) + freq

    if wanna_debug:
        debug["titleTokenCounts"] = titleTokenCounts
        debug["bodyTokenCounts"] = bodyTokenCounts
        debug["downweightedTokenCounts"] = downweightedTokenCounts

    # if the company is not empty, filter out the term sources that contain the company name.
    if str(company or "").strip(): res.termSources = {k: v for k, v in res.termSources.items() if not (str(company).lower() in (k or "") or (k in str(company).lower()))}

    # if JD is too short, dampen the body tokens.
    bodyLength = sum(len(x) for x in res.bodyLines)
    if len(res.bodyLines) < 3 or bodyLength < 200:
        # iterate over the term sources.
        for term, sourceMap in res.termSources.items():
            # iterate over the body and downweighted tokens.
            for k in ("bodyToken", "downweightedToken"):
                if k in sourceMap and sourceMap[k]:
                    sourceMap[k] = sourceMap[k] * 0.3
        if wanna_debug:
            debug["thinBodyDampen"] = True
    else:
        if wanna_debug:
            debug["thinBodyDampen"] = False

    # 9. score our term sources.

    rankedTermsRaw = score_terms(
        res.termSources, res.profile["boostWords"], res.profile["weakTokens"],
        umbrellaWeak=umbrellaBodyWeakTokens,
    )
    rankedTerms = annotate_ranked_terms(rankedTermsRaw, res.bodyLines, res.downweightedLines)
    priorityTerms, suppressedTerms = build_priority_keywords(rankedTerms, numKeywords)
    rankedTermsCompact = compact_term_entries(rankedTerms)
    priorityTermsCompact = compact_term_entries(priorityTerms)

    # 10. get the relevant JD lines.
    relevantLines = get_relevant_jd_lines(res.bodyLines, priorityTerms[:numKeywords] or rankedTerms[:numKeywords])

    extraction_debug = build_basic_extraction_debug(
        target_role=targetRole,
        company=company,
        profile=profile,
        body_lines=res.bodyLines,
        downweighted_lines=res.downweightedLines,
        title_phrase_counts=titlePhraseCounts,
        body_phrase_counts=bodyPhraseCounts,
        downweighted_phrase_counts=downweightedPhraseCounts,
        concrete_stack_counts=concreteStackCounts,
        capability_stack_counts=capabilityStackCounts,
        title_token_counts=titleTokenCounts,
        body_token_counts=bodyTokenCounts,
        downweighted_token_counts=downweightedTokenCounts,
        ranked_terms=rankedTermsCompact,
        priority_terms=priorityTermsCompact,
        suppressed_terms=suppressedTerms,
        relevant_lines=relevantLines,
        num_keywords=numKeywords,
    )

    if wanna_debug:
        debug["rankedTerms"] = rankedTermsCompact[:numKeywords].copy()
        debug["priorityTerms"] = priorityTermsCompact.copy()
        debug["suppressedTerms"] = suppressedTerms.copy()
        debug["basic"] = extraction_debug
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(debug, indent=2, ensure_ascii=False, default=str) + "\n", encoding="utf-8")
    
    if wanna_count:
        update_aggregate_counts(rankedTermsCompact, 20)

    # 11. return the results.
    return {
        "keywords": priorityTermsCompact[:numKeywords],
        "rawKeywords": rankedTermsCompact[:numKeywords],
        "suppressedKeywords": suppressedTerms,
        "activeDomains": res.profile["activeDomains"],
        "relevantJDLines": relevantLines,
        "debug": extraction_debug,
    }


if __name__ == "__main__":
    extract_keywords("", "", 12)
