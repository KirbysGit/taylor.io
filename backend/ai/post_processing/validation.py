from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from ..shared.text_utils import concept_tokens, contains_term, tokenize


UNSUPPORTED_CLAIM_PHRASES = {
    "customer_facing": {
        "customer onboarding",
        "pre-sales",
        "presales",
        "account management",
        "implementation engineer",
        "manage high volume accounts",
    },
    "ownership_language": {
        "owned",
        "led",
        "drove",
        "managed end-to-end",
        "owned roadmap",
        "owned delivery",
    },
}

SEMANTIC_DRIFT_PHRASES = {
    "user engagement metrics",
    "customer engagement metrics",
    "product monitoring",
    "customer health metrics",
    "go-to-market",
    "go to market",
    "account lifecycle",
    "onboarding journey",
}

INFRA_PROCESS_TERMS = {
    "ci/cd",
    "cicd",
    "devops",
    "cloud-native",
    "cloud native",
    "deployment",
    "deploy",
    "production infrastructure",
    "infrastructure",
    "sre",
}


def uses_unverified_gap_term(text: str, resume_gaps: List[str]) -> bool:
    return any(contains_term(text, gap) for gap in resume_gaps if gap)


def has_verified_evidence_alignment(
    text: str,
    resume_hits: List[str],
    resume_evidence_lines: List[str],
) -> bool:
    lowered = str(text or "").lower()
    if not lowered.strip():
        return False
    for term in resume_hits:
        if contains_term(lowered, term):
            return True
    cand_tokens = tokenize(lowered)
    if not cand_tokens:
        return False
    for line in resume_evidence_lines:
        line_tokens = tokenize(line)
        if not line_tokens:
            continue
        overlap = len(cand_tokens.intersection(line_tokens)) / float(max(1, len(line_tokens)))
        if overlap >= 0.22:
            return True
    return False


def contains_any_phrase(text: str, phrases: set[str]) -> bool:
    lowered = str(text or "").lower()
    return any(phrase in lowered for phrase in phrases)


def has_unsupported_claim_language(
    text: str,
    resume_hits: List[str],
    resume_evidence_lines: List[str],
) -> bool:
    lowered = str(text or "").lower()
    evidence_blob = " ".join(str(x or "").lower() for x in resume_evidence_lines)

    def supported(phrase: str) -> bool:
        return contains_term(" ".join(resume_hits), phrase) or (phrase in evidence_blob)

    for phrase in UNSUPPORTED_CLAIM_PHRASES["customer_facing"]:
        if phrase in lowered and not supported(phrase):
            return True

    ownership_hit = contains_any_phrase(lowered, UNSUPPORTED_CLAIM_PHRASES["ownership_language"])
    scope_cues = any(cue in lowered for cue in {"platform", "roadmap", "implementation", "accounts"})
    if ownership_hit and scope_cues and not any(cue in evidence_blob for cue in {"led", "owned", "managed"}):
        return True
    return False


def has_semantic_context_drift(
    *,
    before_text: str,
    after_text: str,
    resume_hits: List[str],
    resume_evidence_lines: List[str],
) -> bool:
    before_lower = str(before_text or "").lower()
    after_lower = str(after_text or "").lower()
    evidence_blob = " ".join([str(x or "").lower() for x in resume_evidence_lines] + [str(x or "").lower() for x in resume_hits])
    for phrase in SEMANTIC_DRIFT_PHRASES:
        if phrase in after_lower and phrase not in before_lower and phrase not in evidence_blob:
            return True
    return False


def extract_quant_markers(text: str) -> set[str]:
    lowered = str(text or "").lower()
    markers = set()
    for match in re.findall(r"\b\d+(?:\.\d+)?\s*%|\b\d+(?:\.\d+)?\s*(?:x|k|m|b)\b|\broc[-\s]?auc\b|\bauc\b|\blatency\b|\bthroughput\b", lowered):
        m = str(match).strip()
        if m:
            markers.add(m)
    for match in re.findall(r"\b\d{1,4}\+?\b", lowered):
        if match:
            markers.add(match)
    return markers


def drops_quantified_evidence(before_text: str, after_text: str) -> bool:
    before_markers = extract_quant_markers(before_text)
    if not before_markers:
        return False
    after_markers = extract_quant_markers(after_text)
    if not after_markers:
        return True
    overlap = len(before_markers.intersection(after_markers)) / float(max(1, len(before_markers)))
    return overlap < 0.2


def has_unverified_infra_process_claim(
    text: str,
    resume_hits: List[str],
    resume_evidence_lines: List[str],
) -> bool:
    lowered = str(text or "").lower()
    if not lowered.strip():
        return False
    evidence_blob = " ".join(str(x or "").lower() for x in resume_evidence_lines)
    hits_blob = " ".join(str(x or "").lower() for x in resume_hits)
    for term in INFRA_PROCESS_TERMS:
        if term in lowered and term not in evidence_blob and term not in hits_blob:
            return True
    return False


def overuses_supporting_without_core(
    text: str,
    core_keywords: List[str],
    supporting_keywords: List[str],
) -> bool:
    lowered = str(text or "").lower()
    if not lowered.strip():
        return False
    has_core = any(contains_term(lowered, term) for term in core_keywords if term)
    has_supporting = any(contains_term(lowered, term) for term in supporting_keywords if term)
    return bool(core_keywords) and has_supporting and not has_core


def concept_evidence_level(
    *,
    concept: str,
    resume_hits: List[str],
    resume_evidence_lines: List[str],
    resume_data: Dict[str, Any],
) -> str:
    concept_lower = str(concept or "").strip().lower()
    if not concept_lower:
        return "missing"
    hits_blob = " ".join(str(x or "").lower() for x in resume_hits)
    if contains_term(hits_blob, concept_lower):
        return "direct"
    resume_blob = json.dumps(resume_data if isinstance(resume_data, dict) else {}, ensure_ascii=True).lower()
    if contains_term(resume_blob, concept_lower):
        return "direct"
    concept_toks = concept_tokens(concept_lower)
    if not concept_toks:
        return "missing"
    best_overlap = 0.0
    for line in resume_evidence_lines:
        line_toks = concept_tokens(str(line or ""))
        if not line_toks:
            continue
        overlap = len(concept_toks.intersection(line_toks)) / float(max(1, len(concept_toks)))
        best_overlap = max(best_overlap, overlap)
    if best_overlap >= 0.66:
        return "direct"
    if best_overlap >= 0.28:
        return "adjacent"
    return "missing"


def build_concept_warnings(
    *,
    target_concepts: List[str],
    resume_hits: List[str],
    resume_evidence_lines: List[str],
    resume_data: Dict[str, Any],
    limit: int = 4,
) -> List[str]:
    warnings: List[str] = []
    for concept in target_concepts:
        c = str(concept or "").strip()
        if not c:
            continue
        level = concept_evidence_level(
            concept=c,
            resume_hits=resume_hits,
            resume_evidence_lines=resume_evidence_lines,
            resume_data=resume_data,
        )
        if level == "direct":
            continue
        if level == "adjacent":
            warnings.append(f"Resume shows adjacent evidence for target signal '{c}', but explicit coverage remains limited.")
        else:
            warnings.append(f"Resume has limited direct evidence for target signal '{c}'; treat this as a true gap.")
        if len(warnings) >= limit:
            break
    return warnings
