

import re
from functools import lru_cache

from ..extraction.lexicon import domainDicts, globalPhraseCanonical
from ..extraction.lexicon import titleAnchorHints
from ..shared.text_utils import normalize_term

# --- takes our alias value and expands it to all possible variants. --- #
# e.g. "react.js" -> {"react", "react js", "react.js", "react js", "react-js", "react-js"}
def expand_alias_variants(value):

    # normalize the value.
    normalized = normalize_term(value)

    # if the normalized value is empty, return an empty set.
    if not normalized:
        return set()

    # initialize our variants set.
    variants = {normalized}

    # iterate over the old and new values.
    for old, new in ((".", " "), (".", ""), ("/", " "), ("/", ""), ("-", " "), ("-", "")):
        if old in normalized:
            variants.add(normalize_term(normalized.replace(old, new)))

    # return the variants set.
    return {item for item in variants if item}

# --- builds the alias maps. --- #
# this is a cache of the alias maps to avoid rebuilding them on every call.
# returns the alias to canonical and canonical to aliases maps.
@lru_cache(maxsize=1)
def build_alias_index():

    # initialize our alias to canonical map.
    alias_to_canonical = {}


    # --- helper function to register new alias and canonical. --- #
    def register(alias, canonical):
        
        # normalize the alias & canonical.
        canonical_norm = normalize_term(canonical)

        # expand the alias variants.
        alias_variants = expand_alias_variants(alias)
        
        # if the canonical or alias variants are empty, return.
        if not canonical_norm or not alias_variants:
            return

        # set the canonical to the alias to canonical map.
        alias_to_canonical.setdefault(canonical_norm, canonical_norm)

        # iterate over the alias variants.
        for variant in alias_variants:
            alias_to_canonical.setdefault(variant, canonical_norm)

    # iterate over the global phrase canonical.
    for alias, canonical in globalPhraseCanonical.items():
        register(alias, canonical)

    # initialize our canonical to aliases map.
    canonical_to_aliases: Dict[str, Set[str]] = {}
    for alias, canonical in alias_to_canonical.items():
        canonical_to_aliases.setdefault(canonical, set()).add(alias)

    # return the alias to canonical and canonical to aliases maps.
    return alias_to_canonical, canonical_to_aliases


# --- canonicalize a term. --- #
# e.g. "react.js" -> "react"
def canonicalize_term(term):
    # get maps from alias index.
    alias_to_canonical, _ = build_alias_index()

    # return the canonicalized term.
    return alias_to_canonical.get(term, term)


# --- get the aliases for a term. --- #
# e.g. "react.js" -> {"react", "react js", "react.js", "react js", "react-js", "react-js"}
def get_term_aliases(term):
    # normalize the term.
    normalized = normalize_term(term)
    if not normalized:
        return set()

    # canonicalize the term.
    canonical = canonicalize_term(normalized)

    # get the aliases from the canonical to aliases map.
    _, canonical_to_aliases = build_alias_index()

    # get the aliases from the canonical to aliases map.
    aliases = set(canonical_to_aliases.get(canonical, set()))

    # add the normalized and canonical terms to the aliases.
    aliases.add(normalized)

    # add the canonical term to the aliases.
    aliases.add(canonical)

    # return the aliases.
    return aliases
