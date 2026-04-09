from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List, Tuple

from ..shared.text_utils import safe_float
from .formatting import preserve_description_format
from .patching import apply_patch_to_resume_data, build_patch_from_section_optimizations, is_skills_topn_safe
from .validation import (
    drops_quantified_evidence,
    has_semantic_context_drift,
    has_unverified_infra_process_claim,
    has_unsupported_claim_language,
    has_verified_evidence_alignment,
    overuses_supporting_without_core,
    uses_unverified_gap_term,
)


def apply_provider_json_if_safe(
    *,
    parsed_json: Dict[str, Any],
    resume_gaps: List[str],
    resume_hits: List[str],
    core_verified_keywords: List[str],
    supporting_verified_keywords: List[str],
    resume_evidence_lines: List[str],
    has_experience: bool,
    has_projects: bool,
    has_skills: bool,
    fallback_resume_data: Dict[str, Any],
    fallback_section_optimizations: Dict[str, Any],
    fallback_keywords: List[str],
    fallback_core_keywords: List[str],
    fallback_supporting_keywords: List[str],
    fallback_target_gap_keywords: List[str],
    available_skills: List[str],
    fallback_warnings: List[str],
) -> Tuple[List[str], List[str], List[str], List[str], List[str], Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    provider_warnings = list(fallback_warnings)
    provider_keywords = list(fallback_keywords)
    provider_core_keywords = list(fallback_core_keywords)
    provider_supporting_keywords = list(fallback_supporting_keywords)
    provider_target_gap_keywords = list(fallback_target_gap_keywords)
    provider_section_optimizations = deepcopy(fallback_section_optimizations)
    provider_patch = build_patch_from_section_optimizations(provider_section_optimizations)
    provider_resume_data = apply_patch_to_resume_data(fallback_resume_data, provider_patch)
    provider_debug: Dict[str, Any] = {
        "used": False,
        "rejected_count": 0,
        "rejected_by_reason": {
            "gap_term": 0,
            "no_evidence_alignment": 0,
            "unsupported_claim_language": 0,
            "semantic_drift": 0,
            "dropped_quant_evidence": 0,
            "infra_process_unverified": 0,
            "supporting_without_core": 0,
            "invalid_skills_reorder": 0,
            "unknown_item_id": 0,
        },
    }

    if not isinstance(parsed_json, dict):
        provider_debug["reason"] = "parsed_json_missing_or_invalid"
        return (
            provider_keywords,
            provider_core_keywords,
            provider_supporting_keywords,
            provider_target_gap_keywords,
            provider_warnings,
            provider_resume_data,
            provider_section_optimizations,
            provider_patch,
            provider_debug,
        )

    maybe_core_keywords = parsed_json.get("core_verified_keywords")
    if isinstance(maybe_core_keywords, list):
        normalized = [str(x).strip().lower() for x in maybe_core_keywords if str(x).strip()]
        if normalized:
            provider_core_keywords = list(dict.fromkeys(normalized))[:12]

    maybe_supporting_keywords = parsed_json.get("supporting_verified_keywords")
    if isinstance(maybe_supporting_keywords, list):
        normalized = [str(x).strip().lower() for x in maybe_supporting_keywords if str(x).strip()]
        if normalized:
            provider_supporting_keywords = list(dict.fromkeys(normalized))[:12]

    maybe_verified_keywords = parsed_json.get("verified_ats_keywords", parsed_json.get("ats_keywords"))
    if isinstance(maybe_verified_keywords, list):
        normalized = [str(x).strip().lower() for x in maybe_verified_keywords if str(x).strip()]
        if normalized:
            provider_keywords = list(dict.fromkeys(normalized))[:12]
    else:
        provider_keywords = list(dict.fromkeys(provider_core_keywords + provider_supporting_keywords))[:12]

    maybe_target_gaps = parsed_json.get("target_gap_keywords")
    target_gap_keywords: List[str] = list(provider_target_gap_keywords)
    if isinstance(maybe_target_gaps, list):
        target_gap_keywords = [str(x).strip().lower() for x in maybe_target_gaps if str(x).strip()][:12]
    provider_target_gap_keywords = target_gap_keywords
    provider_debug["target_gap_keywords"] = target_gap_keywords

    known_ids: Dict[str, set[str]] = {"experience": set(), "projects": set()}
    for section in ("experience", "projects"):
        rows = provider_section_optimizations.get(section, [])
        if isinstance(rows, list):
            for row in rows:
                if isinstance(row, dict):
                    iid = str(row.get("item_id") or "").strip()
                    if iid:
                        known_ids[section].add(iid)

    maybe_section_opts = parsed_json.get("section_optimizations")
    accepted_section_opts = deepcopy(provider_section_optimizations)
    if isinstance(maybe_section_opts, dict):
        summary_row = maybe_section_opts.get("summary")
        if isinstance(summary_row, dict):
            before_text = str(summary_row.get("before") or "").strip()
            after_text = str(summary_row.get("after") or "").strip()
            if after_text and not uses_unverified_gap_term(after_text, resume_gaps):
                if (
                    not drops_quantified_evidence(before_text, after_text)
                    and has_verified_evidence_alignment(after_text, resume_hits, resume_evidence_lines)
                    and not has_unsupported_claim_language(after_text, resume_hits, resume_evidence_lines)
                    and not has_semantic_context_drift(
                        before_text=before_text,
                        after_text=after_text,
                        resume_hits=resume_hits,
                        resume_evidence_lines=resume_evidence_lines,
                    )
                    and not has_unverified_infra_process_claim(after_text, resume_hits, resume_evidence_lines)
                    and not overuses_supporting_without_core(after_text, provider_core_keywords, provider_supporting_keywords)
                ):
                    accepted_section_opts["summary"] = {
                        "before": before_text,
                        "after": after_text,
                        "reason": str(summary_row.get("reason") or "Optimized summary."),
                        "confidence": safe_float(summary_row.get("confidence") or 0.72),
                    }

        for section in ("experience", "projects"):
            rows = maybe_section_opts.get(section)
            if not isinstance(rows, list):
                continue
            accepted_rows: List[Dict[str, Any]] = []
            for row in rows:
                if not isinstance(row, dict):
                    continue
                item_id = str(row.get("item_id") or "").strip()
                if not item_id or item_id not in known_ids[section]:
                    provider_debug["rejected_count"] += 1
                    provider_debug["rejected_by_reason"]["unknown_item_id"] += 1
                    continue
                decision = str(row.get("decision") or "keep").strip().lower()
                before_text = str(row.get("before") or "").strip()
                after_text = str(row.get("after") or before_text).strip()
                if decision == "rewrite":
                    if drops_quantified_evidence(before_text, after_text):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["dropped_quant_evidence"] += 1
                        continue
                    if uses_unverified_gap_term(after_text, resume_gaps):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["gap_term"] += 1
                        continue
                    if not has_verified_evidence_alignment(after_text, resume_hits, resume_evidence_lines):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["no_evidence_alignment"] += 1
                        continue
                    if has_unsupported_claim_language(after_text, resume_hits, resume_evidence_lines):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["unsupported_claim_language"] += 1
                        continue
                    if has_semantic_context_drift(
                        before_text=before_text,
                        after_text=after_text,
                        resume_hits=resume_hits,
                        resume_evidence_lines=resume_evidence_lines,
                    ):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["semantic_drift"] += 1
                        continue
                    if has_unverified_infra_process_claim(after_text, resume_hits, resume_evidence_lines):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["infra_process_unverified"] += 1
                        continue
                    if overuses_supporting_without_core(after_text, provider_core_keywords, provider_supporting_keywords):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["supporting_without_core"] += 1
                        continue
                normalized_after = preserve_description_format(before_text, after_text)
                accepted_rows.append(
                    {
                        "item_id": item_id,
                        "section": section,
                        "decision": decision if decision in {"keep", "rewrite", "downrank", "omit"} else "keep",
                        "before": before_text,
                        "after": normalized_after,
                        "reason": str(row.get("reason") or "Model section optimization."),
                        "confidence": safe_float(row.get("confidence") or 0.7),
                        "jd_alignment_score": safe_float(row.get("jd_alignment_score")),
                        "evidence_strength_score": safe_float(row.get("evidence_strength_score")),
                        "risk_score": safe_float(row.get("risk_score")),
                        "overall_priority": safe_float(row.get("overall_priority")),
                    }
                )
            if accepted_rows:
                accepted_ids = {r["item_id"] for r in accepted_rows}
                fallback_rows = [x for x in provider_section_optimizations.get(section, []) if str(x.get("item_id") or "") not in accepted_ids]
                accepted_section_opts[section] = accepted_rows + fallback_rows

        skills_row = maybe_section_opts.get("skills")
        if isinstance(skills_row, dict):
            maybe_after = skills_row.get("after")
            if isinstance(maybe_after, list):
                cleaned = [str(x).strip() for x in maybe_after if str(x).strip()][:12]
                if is_skills_topn_safe(cleaned, available_skills):
                    accepted_section_opts["skills"] = {
                        "mode": "reorder_verified_front",
                        "before": list(available_skills),
                        "after": cleaned,
                        "reason": str(skills_row.get("reason") or "Top-N skill optimization."),
                        "confidence": safe_float(skills_row.get("confidence") or 0.72),
                    }
                else:
                    provider_debug["rejected_count"] += 1
                    provider_debug["rejected_by_reason"]["invalid_skills_reorder"] += 1

    provider_section_optimizations = accepted_section_opts
    provider_patch = build_patch_from_section_optimizations(provider_section_optimizations)
    provider_resume_data = apply_patch_to_resume_data(fallback_resume_data, provider_patch)

    maybe_warnings = parsed_json.get("warnings")
    if isinstance(maybe_warnings, list):
        provider_warnings = [str(x).strip() for x in maybe_warnings if str(x).strip()][:8]

    present_sections = set()
    if isinstance(provider_section_optimizations.get("summary"), dict):
        present_sections.add("summary")
    if isinstance(provider_section_optimizations.get("experience"), list) and provider_section_optimizations.get("experience"):
        present_sections.add("experience")
    if isinstance(provider_section_optimizations.get("projects"), list) and provider_section_optimizations.get("projects"):
        present_sections.add("projects")
    if isinstance(provider_section_optimizations.get("skills"), dict) and provider_section_optimizations.get("skills", {}).get("after"):
        present_sections.add("skills")
    missing_sections: List[str] = []
    if "summary" not in present_sections:
        missing_sections.append("summary")
    if has_experience and "experience" not in present_sections:
        missing_sections.append("experience")
    if has_projects and "projects" not in present_sections:
        missing_sections.append("projects")
    if has_skills and "skills" not in present_sections:
        missing_sections.append("skills")
    if missing_sections:
        provider_warnings.append("AI output missing expected suggestion sections: " + ", ".join(missing_sections))
    provider_debug["missing_sections"] = missing_sections
    provider_debug["section_counts"] = {
        "experience": len(provider_section_optimizations.get("experience", [])) if isinstance(provider_section_optimizations, dict) else 0,
        "projects": len(provider_section_optimizations.get("projects", [])) if isinstance(provider_section_optimizations, dict) else 0,
    }
    provider_debug["used"] = True
    return (
        provider_keywords,
        provider_core_keywords,
        provider_supporting_keywords,
        provider_target_gap_keywords,
        provider_warnings,
        provider_resume_data,
        provider_section_optimizations,
        provider_patch,
        provider_debug,
    )
