from __future__ import annotations

import re
from functools import lru_cache
from typing import Dict, Set, Tuple

from ..extraction.lexicon import DOMAIN_LEXICONS, GLOBAL_PHRASE_CANONICAL
from ..extraction.profiles import TITLE_ANCHOR_HINTS

MANUAL_ALIAS_GROUPS: Dict[str, Set[str]] = {
    "postgresql": {"postgres"},
    "mysql": {"my sql"},
    "mongodb": {"mongo"},
    "javascript frameworks": {"js frameworks", "javascript framework", "js framework"},
    "javascript": {"js"},
    "typescript": {"ts"},
    "node.js": {"node"},
    "react": {"reactjs", "react.js"},
    "next.js": {"nextjs", "next js"},
    "vue.js": {"vue", "vuejs"},
    "react native": {"react-native"},
    "full stack engineer": {"full-stack engineer", "full stack developer", "full-stack developer", "fullstack engineer"},
    "microservices": {"micro services"},
    "restful apis": {"rest api", "rest apis", "restful api", "restful services"},
    "graphql": {"graph ql"},
    "scikit-learn": {"scikit learn", "sklearn"},
    "machine learning": {"ml", "ai/ml"},
    "artificial intelligence": {"ai"},
    "large language models": {"llm", "llms"},
    "retrieval augmented generation": {"rag"},
    "mlops": {"ml ops", "m l ops"},
    "natural language processing": {"nlp"},
    "computer vision": {"cv"},
    "deep learning": {"dl"},
    "continuous integration continuous delivery": {"ci/cd", "ci cd"},
    "docker": {"containers", "containerization"},
    "kubernetes": {"k8s"},
    "amazon web services": {"aws"},
    "google cloud platform": {"gcp"},
    "google kubernetes engine": {"gke"},
    "microsoft azure": {"azure"},
    "power automate": {"microsoft power automate", "power-automate", "powerautomate"},
    "copilot": {"microsoft copilot"},
    "business intelligence": {"bi"},
    "tableau": {"tableau desktop"},
    "power bi": {"powerbi", "power-bi"},
    "customer relationship management": {"crm"},
    "salesforce": {"sfdc"},
    "key performance indicators": {"kpi", "kpis"},
    "search engine optimization": {"seo"},
    "customer success": {"cs"},
    "customer satisfaction": {"csat"},
    "first call resolution": {"fcr"},
    "contact center as a service": {"ccaas", "ccaaS"},
    "user experience": {"ux"},
    "user interface": {"ui"},
    "quality assurance": {"qa"},
    "application programming interface": {"api", "apis"},
    "project management": {"project mgr", "project mgmt", "pm"},
    "program management": {"program mgr", "program mgmt", "pgm"},
    "product management": {"product mgr", "product mgmt", "pdm"},
    "account management": {"account mgmt", "acct mgmt"},
    "business development": {"biz dev", "bd"},
    "go to market": {"gtm"},
    "search engine marketing": {"sem"},
    "requirements gathering": {"requirement gathering"},
    "stakeholder management": {"stakeholder mgmt"},
    "process improvement": {"process optimization", "continuous improvement"},
    "operational efficiency": {"ops efficiency"},
    "service desk support": {"help desk", "helpdesk", "it support"},
    "incident response": {"incident management", "incident mgmt"},
    "standard operating procedures": {"sop", "sops"},
    "service level agreements": {"sla", "slas"},
    "quality control": {"qc"},
    "financial planning and analysis": {"fp&a", "fpa"},
    "profit and loss statements": {"p&l", "pnl"},
    "enterprise resource planning": {"erp"},
    "accounts payable": {"ap"},
    "accounts receivable": {"ar"},
    "software as a service": {"saas"},
    "business to business saas": {"b2b saas", "b2b software"},
    "proof of concept": {"poc"},
    "minimum viable product": {"mvp"},
    "subject matter expert": {"sme"},
    "return on investment": {"roi"},
    "end-to-end": {"end to end", "e2e"},
    "object oriented programming": {"oop"},
    "test driven development": {"tdd"},
    "database management systems": {"dbms"},
    "customer experience": {"cx"},
    "contact center": {"call center"},
    "human resources": {"hr"},
    "identity and access management": {"iam"},
    "single sign on": {"sso"},
    "multi factor authentication": {"mfa"},
    "security operations center": {"soc"},
    "virtual private cloud": {"vpc"},
    "data loss prevention": {"dlp"},
}


def _normalize_term(value: str) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


def _expand_alias_variants(value: str) -> Set[str]:
    normalized = _normalize_term(value)
    if not normalized:
        return set()
    variants = {normalized}
    for old, new in ((".", " "), (".", ""), ("/", " "), ("/", ""), ("-", " "), ("-", "")):
        if old in normalized:
            variants.add(_normalize_term(normalized.replace(old, new)))
    return {item for item in variants if item}


@lru_cache(maxsize=1)
def _build_alias_index() -> Tuple[Dict[str, str], Dict[str, Set[str]]]:
    alias_to_canonical: Dict[str, str] = {}

    def register(alias: str, canonical: str) -> None:
        canonical_norm = _normalize_term(canonical)
        alias_variants = _expand_alias_variants(alias)
        if not canonical_norm or not alias_variants:
            return
        alias_to_canonical.setdefault(canonical_norm, canonical_norm)
        for variant in alias_variants:
            alias_to_canonical.setdefault(variant, canonical_norm)

    for alias, canonical in GLOBAL_PHRASE_CANONICAL.items():
        register(alias, canonical)

    for domain_pack in DOMAIN_LEXICONS.values():
        for alias in domain_pack.get("aliases", set()):
            alias_norm = _normalize_term(alias)
            canonical = alias_to_canonical.get(alias_norm, alias_norm)
            register(alias_norm, canonical)
        for phrase in domain_pack.get("phrases", []):
            phrase_norm = _normalize_term(phrase)
            canonical = alias_to_canonical.get(phrase_norm, phrase_norm)
            register(phrase_norm, canonical)

    for hints in TITLE_ANCHOR_HINTS.values():
        for hint in hints:
            hint_norm = _normalize_term(hint)
            canonical = alias_to_canonical.get(hint_norm, hint_norm)
            register(hint_norm, canonical)

    for canonical, aliases in MANUAL_ALIAS_GROUPS.items():
        register(canonical, canonical)
        for alias in aliases:
            register(alias, canonical)

    canonical_to_aliases: Dict[str, Set[str]] = {}
    for alias, canonical in alias_to_canonical.items():
        canonical_to_aliases.setdefault(canonical, set()).add(alias)

    return alias_to_canonical, canonical_to_aliases


def canonicalize_term(term: str) -> str:
    normalized = _normalize_term(term)
    if not normalized:
        return ""
    alias_to_canonical, _ = _build_alias_index()
    return alias_to_canonical.get(normalized, normalized)


def get_term_aliases(term: str) -> Set[str]:
    normalized = _normalize_term(term)
    if not normalized:
        return set()
    canonical = canonicalize_term(normalized)
    _, canonical_to_aliases = _build_alias_index()
    aliases = set(canonical_to_aliases.get(canonical, set()))
    aliases.add(normalized)
    aliases.add(canonical)
    return aliases
