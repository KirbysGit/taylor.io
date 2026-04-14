# --- create a basic profile based on job description and target role. --- #

# input -> job description and target role.
# output -> extraction profile.

import re # regex.

from .lexicon import (
    minAliasHits,
    domainDicts,
    globalAllowShortTokens,
    globalBoostWords,
    globalFillerPhrases,
    globalPhrases,
    globalPhraseCanonical,
    globalStopWords,
    globalWeakTokens,
    titleAnchorHints,
)

# --- just check if the term is in the text. --- #
def contains_alias(text, term):
    # get the value of the term.
    value = (term or "").strip().lower()
    if not value:
        return False
    
    # phrase-safe boundary match to avoid substring false positives (e.g., "ai" in "paid").
    pattern = r"(?<![a-z0-9])" + re.escape(value) + r"(?![a-z0-9])"
    
    return bool(re.search(pattern, text))

# --- merge two dictionaries, adding the values of the second dictionary to the first. --- #
def merge_dict_add(base, addon):
    # initialize a new dictionary.
    merged = dict(base)

    # iterate over the addon dictionary.
    for key, value in addon.items():
        # add the value to the merged dictionary.
        merged[key] = max(merged.get(key, 0), int(value))

    # return the merged dictionary.
    return merged

# --- using our domainDicts, detect active domains (e.g. engineering, sales) based on the job description & target role --- #
def detect_domains(jobDescription, targetRole, maxDomains):

    # get role and jd text.
    roleText = targetRole.lower()
    jdText = jobDescription.lower()

    # initialize a list for scored domains.
    scored = []

    # iterate over the domains.
    for domain, config in domainDicts.items():

        # get the aliases for the domain.
        aliases = set(config.get("aliases", set()))

        # count the hits for the role and jd text.
        roleHits = sum(1 for term in aliases if contains_alias(roleText, term))
        jdHits = sum(1 for term in aliases if contains_alias(jdText, term))
        titleAnchorHits = sum(1 for hint in titleAnchorHints.get(domain, set()) if contains_alias(roleText, hint))

        # if we don't have any hits for role or title and the jd hits are less than our min, skip domain.
        if not roleHits and not titleAnchorHits and jdHits < minAliasHits:
            continue

        # calculate the score.
        score = (roleHits * 5) + (titleAnchorHits * 4) + jdHits

        # if the score is greater than 0, add the domain to the list.
        if score > 0:
            scored.append((domain, score, (roleHits + titleAnchorHits) > 0))

    # sort the domains by score.
    ranked = sorted(scored, key=lambda item: (-item[1], item[0]))

    # if we don't have any ranked domains, return an empty list.
    if not ranked:
        return []
    
    # get the top score.
    topScore = ranked[0][1]

    # calculate the relative threshold.
    relativeThreshold = max(3, int(round(topScore * 0.45)))

    # initialize a list for our selected domains.
    selected = []

    # iterate over the ranked domains.
    for domain, score, hasTitleSignal in ranked:
        # if we have reached our max domains, break.
        if len(selected) >= maxDomains:
            break

        # if we have a title signal or score fits into our threshold, add domain to selected list.
        if hasTitleSignal or score >= relativeThreshold:
            selected.append(domain)

    # if we don't have any selected domains, add the top domain to the list.
    if not selected:
        selected.append(ranked[0][0])

    # return the selected domains.
    return selected[:maxDomains]

# --- get the extraction profile for the job description and target role. --- #
def get_extraction_profile(jobDescription, targetRole):
    
    # detect the active domains.
    activeDomains = detect_domains(jobDescription, targetRole, maxDomains=3)

    # initialize the phrases.
    phrases = list(globalPhrases)

    # initialize the boost words.
    boostWords = dict(globalBoostWords)
    weakTokens = set(globalWeakTokens)

    # iterate over the active domains.
    for domain in activeDomains:
        # get relevantdomain dict.
        domainPack = domainDicts.get(domain, {})

        # get the phrases for the domain.
        phrases.extend(list(domainPack.get("phrases", [])))

        # get the boost words for the domain.
        boostWords = merge_dict_add(boostWords, dict(domainPack.get("boostWords", {})))

        # get the weak tokens for the domain.
        weakTokens.update(set(domainPack.get("weakTokens", set())))

    # deduplicate the phrases.
    dedupedPhrases = list(dict.fromkeys(phrase.lower() for phrase in phrases))

    # return the extraction profile.
    return {
        "activeDomains": activeDomains,
        "weakTokens": weakTokens,
        "phrases": dedupedPhrases,
        "boostWords": boostWords,
    }
