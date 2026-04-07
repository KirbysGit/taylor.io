from __future__ import annotations

import re
from collections import OrderedDict
from typing import Iterable, List, Sequence

_CONNECTOR_WORDS = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
}

_NON_REUSABLE_EXACT = {
    "scaled cognition",
    "khosla ventures",
}

_NON_REUSABLE_TOKEN_HINTS = {
    "ventures",
    "corp",
    "inc",
    "llc",
}

_ABSTRACTION_RULES: Sequence[tuple[str, tuple[str, ...]]] = (
    ("customer-facing engineering", ("customer-facing", "customer solution", "developer relations")),
    ("ai agent delivery", ("ai agent", "agentic", "agent performance")),
    ("enterprise reliability and policy compliance", ("reliability", "policy", "compliance", "robust", "edge case")),
    ("systems integration", ("systems integration", "integration workflow", "integration", "interface documentation")),
    ("technical troubleshooting and escalation", ("troubleshooting", "escalation", "technical support")),
    ("cross-functional product and research collaboration", ("cross functional", "partner directly", "research team", "roadmap")),
    ("evaluation and performance robustness", ("evaluation", "performance", "rigorously test", "framework")),
    ("domain-adaptive solution implementation", ("new domains", "domain requirements", "implementation", "platform customization")),
    ("application development stack", ("python", "django", "react", "api design")),
    ("cloud and platform infrastructure", ("aws", "platform", "microservices", "deployment")),
    ("workflow automation and process optimization", ("workflow automation", "process automation", "operational efficiency")),
    ("ai governance and productivity tooling", ("copilot", "power automate", "automation governance", "prompt engineering")),
    ("monitoring and kpi-driven operations", ("monitoring", "kpi", "kpis", "performance tracking", "dashboarding")),
)


def _match_count(lowered_terms: Sequence[str], hints: Sequence[str]) -> int:
    matched = 0
    for hint in hints:
        if any(hint in term for term in lowered_terms):
            matched += 1
    return matched


def _looks_non_reusable(term: str) -> bool:
    t = term.strip().lower()
    if not t:
        return True
    if t in _NON_REUSABLE_EXACT:
        return True
    if any(hint in t for hint in _NON_REUSABLE_TOKEN_HINTS):
        return True
    if re.search(r"\d", t):
        return True

    parts = [p for p in re.split(r"\s+", t) if p]
    if not parts:
        return True
    if len(parts) > 5:
        return True
    if parts[0] in _CONNECTOR_WORDS or parts[-1] in _CONNECTOR_WORDS:
        return True

    non_connector = [p for p in parts if p not in _CONNECTOR_WORDS]
    if len(non_connector) <= 1 and len(parts) >= 3:
        return True
    return False


def filter_non_reusable(terms: Iterable[str]) -> List[str]:
    cleaned: "OrderedDict[str, None]" = OrderedDict()
    for term in terms:
        t = str(term or "").strip().lower()
        if not t or _looks_non_reusable(t):
            continue
        cleaned[t] = None
    return list(cleaned.keys())


def abstract_terms(terms: Iterable[str], limit: int = 12) -> List[str]:
    lowered_terms = [str(term or "").strip().lower() for term in terms if str(term or "").strip()]
    selected: "OrderedDict[str, None]" = OrderedDict()

    for label, hints in _ABSTRACTION_RULES:
        # Require multiple concrete supports before promoting an abstraction label.
        if _match_count(lowered_terms, hints) >= 2:
            selected[label] = None
        if len(selected) >= limit:
            break

    # Backfill with reusable raw terms when no abstraction rule matched.
    for term in lowered_terms:
        if len(selected) >= limit:
            break
        selected.setdefault(term, None)

    return list(selected.keys())[:limit]
