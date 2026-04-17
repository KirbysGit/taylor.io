# --- incremental extractor pipeline. --- #

# ===== imports ===== #
import re

from dataclasses import dataclass, field
from collections import defaultdict

# --- local imports.
from .profiles import get_extraction_profile

# --- rules + lexicon.
from .rules import (
    urlLinePatterns, complianceFooterSubstrings, wrapperSuppressLineSubstrings,
    nonRoleSectionHeaders, sectionHeadersToDownweight, roleSectionHeaders,
    downweightFactor, concreteStackTerms, roleCapabilityStackTerms,
    hardNoiseTokens, benefitNoiseTokens,
)
from .lexicon import (
    globalStopWords, globalAllowShortTokens, globalPhraseCanonical,
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
def looks_like_stack_line(line):
    
    if not line:
        return False

    return ("," in line or "/" in line or "(" in line or ")" in line or ":" in line)

# --- canonicalize the token based on our alias list. --- #
def canonicalize_token(token):
    term = token.strip()
    return globalPhraseCanonical.get(term, term)

# --- update the aggregate counts (for my own personal debugging).--- #
def update_aggregate_counts(rankedTerms, limit=10):
    aggPath = Path(__file__).resolve().parent.parent / "debug_out" / "aggregate_terms.json"

    if aggPath.exists():
        data = json.loads(aggPath.read_text(encoding="utf-8"))
    else:
        data = {}

    for item in rankedTerms[:limit]:
        term = item["term"]
        data[term] = data.get(term, 0) + 1

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
def extract_stack_terms(bodyLines):
    concreteCounts = {}
    capabilityCounts = {}

    for line in bodyLines:
        low = line.lower().strip()

        if not looks_like_stack_line(low):
            continue

        for token in re.findall(r"[a-z0-9+#.-]{2,}", low):
            term = token.strip()
            if not term:
                continue

            if term in concreteStackTerms:
                concreteCounts[term] = concreteCounts.get(term, 0.0) + 1.0
            elif term in roleCapabilityStackTerms:
                capabilityCounts[term] = capabilityCounts.get(term, 0.0) + 1.0
    
    return concreteCounts, capabilityCounts

# --- extract tokens from text by cleaning. --- #
# this func will leave us with a dict of terms that "make sense" as a token (based on our current ruleset).
# input -> text.
# output -> token counts.
def extract_tokens(text):
    # initialize token counts.
    tokenCounts = {}

    # for each raw token in text. (e.g. "")
    for rawToken in re.findall(r"[a-z][a-z0-9+.#/-]{0,}", text):
        term = canonicalize_token(rawToken)

        # if token is empty, continue.
        if not term:
            continue

        # if token is a stop word, continue.
        if term in globalStopWords:
            continue

        # if token is a hard noise token or benefit noise token, continue.
        if term in hardNoiseTokens or term in benefitNoiseTokens:
            continue

        if len(term) < 3 and term not in globalAllowShortTokens:
            continue

        tokenCounts[term] = tokenCounts.get(term, 0.0) + 1.0

    return tokenCounts

# --- score terms based on the sources. --- #
# this is how we'll rank our terms based on our sources.
# input -> term sources, boost words, weak tokens.
# output -> scored list.
def score_terms(termSources, boostWords, weakTokens):

    # initialize scored list.
    scored = []

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
            score += 0.5

        # check if term has a strong source.
        strongSource = any(key in sourceMap for key in ("titlePhrase", "knownPhrase", "concreteStack", "titleToken"))
        
        # if term is a weak token and does not have a strong source, penalize it.
        if term in weakTokens and not strongSource:
            score -= 1.0

        # add the term to the scored list.
        scored.append({
            "term": term,
            "score": round(score, 3),
            "frequency": round(frequency, 3),
            "sources": sorted(sourceMap.keys()),
        })
        
    # return scored listed sorted by score (desc), frequency (desc), term (asc).
    return sorted(scored, key=lambda item: (-item["score"], -item["frequency"], item["term"]))
 

def get_relevant_jd_lines(bodyLines, keywords):

    keywords = [keyword["term"] for keyword in keywords]

    relevantLineHits = {}

    for idx, line in enumerate(bodyLines):
        
        for keyword in keywords:

            pattern = r"(?<![a-z0-9])" + re.escape(keyword) + r"(?![a-z0-9])"
            
            if re.search(pattern, line):
                relevantLineHits[idx] = relevantLineHits.get(idx, 0) + 1

    sortedLinesByHits = sorted(relevantLineHits.items(), key=lambda item: (-item[1], item[0]))

    relevantLines = []

    for idx, hits in sortedLinesByHits[:10]:
        relevantLines.append(bodyLines[idx])
    
    print(relevantLines)

    return relevantLines


    
# --- extract keywords from the job description. --- #
# main function that calls our other functions in sequence.
# input -> job description, target role, number of keywords.
# output -> ranked terms.
def extract_keywords(jobDescription, targetRole, numKeywords):

    # debugging control.
    wanna_debug = True
    wanna_count = True
    if wanna_debug:
        debug = {}

    # 1. get extraction profile. (active domains, relevant phrases, weak tokens, boost words)
    profile = get_extraction_profile(jobDescription, targetRole)

    res = ExtractionResult(jobDescription=jobDescription, targetRole=targetRole, profile=profile)

    if wanna_debug: 
        debug["profile"] = profile.copy()

    # 2. parse jd into lines.
    res.bodyLines, res.downweightedLines = parse_jd_lines(jobDescription)

    if wanna_debug:
        debug["bodyLines"] = res.bodyLines.copy()
        debug["downweightedLines"] = res.downweightedLines.copy()

    # 3. clean our text fields.
    res.cleanTitle = res.targetRole.lower().strip()
    res.cleanBody = "\n".join(res.bodyLines)
    res.cleanDownweightedBody = "\n".join(res.downweightedLines)
    
    # 4. extract known phrases / keywords.
    titlePhraseCounts, res.cleanTitle = count_phrases(res.cleanTitle, "titlePhrase", res.profile["phrases"], 1.0)
    bodyPhraseCounts, res.cleanBody = count_phrases(res.cleanBody, "knownPhrase", res.profile["phrases"], 1.0)
    downweightedPhraseCounts, res.cleanDownweightedBody = count_phrases(res.cleanDownweightedBody, "knownPhraseDownweighted", res.profile["phrases"], downweightFactor)

    # 5. merge into our termSources.

    # iterate over our phrase buckets (body, downweighted, title).
    for phraseBucket in (bodyPhraseCounts, downweightedPhraseCounts, titlePhraseCounts):
        # get the term and its source map (term, { source: count })
        for term, sourceMap in phraseBucket.items():
            # get the term sources.
            ts = res.termSources[term]

            # iterate over the source map.
            for sourceName, count in sourceMap.items():
                # add the count to the term source.
                ts[sourceName] = ts.get(sourceName, 0.0) + count

    if wanna_debug:
        debug["cleanTitle"] = res.cleanTitle
        debug["cleanBody"] = res.cleanBody
        debug["cleanDownweightedBody"] = res.cleanDownweightedBody
        debug["titlePhraseCounts"] = titlePhraseCounts
        debug["bodyPhraseCounts"] = bodyPhraseCounts
        debug["downweightedPhraseCounts"] = downweightedPhraseCounts
        debug["termSources_after_known_phrases"] = dict(res.termSources)

    # 6. extract stack terms & update termSources.
    concreteStackCounts, capabilityStackCounts = extract_stack_terms(res.bodyLines)

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

    # 7. extract tokens from text.
    titleTokenCounts = extract_tokens(res.cleanTitle)
    bodyTokenCounts = extract_tokens(res.cleanBody)
    downweightedTokenCounts = extract_tokens(res.cleanDownweightedBody)

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

    # 8. score our term sources.

    rankedTerms = score_terms(res.termSources, res.profile["boostWords"], res.profile["weakTokens"])

    if wanna_debug:
        debug["rankedTerms"] = rankedTerms[:numKeywords].copy()

    if wanna_debug:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(debug, indent=2, ensure_ascii=False, default=str) + "\n", encoding="utf-8")
    
    if wanna_count:
        update_aggregate_counts(rankedTerms, 30)
    
    relevantLines = get_relevant_jd_lines(res.bodyLines, rankedTerms[:numKeywords])

    return {
        "keywords": rankedTerms[:numKeywords],
        "activeDomains": res.profile["activeDomains"],
        "relevantJDLines": relevantLines,
    }


if __name__ == "__main__":
    extract_keywords("", "", 12)