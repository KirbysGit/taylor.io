# backend/ai/job_tailor_service.py

# Beginning of implementation of the job tailoring service.

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from copy import deepcopy
from typing import Any, Dict, List
import re

# Local imports.
from .extraction import abstract_terms, extract_job_keywords_detailed, filter_non_reusable
from .openai import (
    build_openai_request_payload,
    get_openai_model,
    is_openai_enabled,
    request_chat_completion,
)
from .planning import build_edit_plan
from .processing import build_tailor_context
from .prompt import build_job_tailor_prompt
from .schemas import (
    JobTailorSuggestRequest,
    JobTailorSuggestResponse,
    JobTailorSuggestion,
    SectionOptimizations,
)

# Model We're Using.
MODEL_NAME = "mock-planner"
_DEBUG_DIR = Path(__file__).resolve().parent / "debug_outputs"
_DEBUG_LATEST = _DEBUG_DIR / "job_tailor_latest.json"
_DEBUG_HISTORY = _DEBUG_DIR / "job_tailor_history.jsonl"
_PROVIDER_DEBUG_LATEST = _DEBUG_DIR / "openai_latest.json"
_PROVIDER_DEBUG_HISTORY = _DEBUG_DIR / "openai_history.jsonl"
_PROVIDER_RESPONSE_LATEST = _DEBUG_DIR / "openai_latest_response.txt"
logger = logging.getLogger(__name__)


def _strip_resume_data_from_user_prompt(user_prompt: str) -> str:
    marker = "\n\nResume data (JSON):"
    if marker not in user_prompt:
        return user_prompt
    return user_prompt.split(marker, 1)[0].rstrip() + "\n\nResume data (JSON): [omitted for debug]"


def _write_debug_output(entry: Dict[str, Any]) -> None:
    try:
        _DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        _DEBUG_LATEST.write_text(json.dumps(entry, ensure_ascii=True, indent=2), encoding="utf-8")
        with _DEBUG_HISTORY.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=True) + "\n")
    except Exception:
        # Debug logging should never break request flow.
        return


def _write_provider_debug_output(entry: Dict[str, Any]) -> None:
    try:
        _DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        _PROVIDER_DEBUG_LATEST.write_text(json.dumps(entry, ensure_ascii=True, indent=2), encoding="utf-8")
        with _PROVIDER_DEBUG_HISTORY.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=True) + "\n")
    except Exception:
        return


def _write_provider_response_text(text: str) -> None:
    try:
        _DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        _PROVIDER_RESPONSE_LATEST.write_text(str(text or ""), encoding="utf-8")
    except Exception:
        return


def _contains_term(text: str, term: str) -> bool:
    t = str(term or "").strip().lower()
    if not t:
        return False
    hay = str(text or "").lower()
    if " " in t:
        return t in hay
    pattern = r"(?<![a-z0-9])" + re.escape(t) + r"(?![a-z0-9])"
    return bool(re.search(pattern, hay))


def _uses_unverified_gap_term(text: str, resume_gaps: List[str]) -> bool:
    return any(_contains_term(text, gap) for gap in resume_gaps if gap)


def _tokenize(value: str) -> set[str]:
    return {
        tok
        for tok in re.findall(r"[a-z0-9+#./-]{2,}", str(value or "").lower())
        if tok not in {"the", "and", "for", "with", "from", "that", "this", "your", "our", "you"}
    }


def _has_verified_evidence_alignment(
    text: str,
    resume_hits: List[str],
    resume_evidence_lines: List[str],
) -> bool:
    lowered = str(text or "").lower()
    if not lowered.strip():
        return False

    # Fast path: contains at least one verified term directly.
    for term in resume_hits:
        if _contains_term(lowered, term):
            return True

    cand_tokens = _tokenize(lowered)
    if not cand_tokens:
        return False

    # Fallback: lexical overlap with at least one ranked resume evidence line.
    for line in resume_evidence_lines:
        line_tokens = _tokenize(line)
        if not line_tokens:
            continue
        overlap = len(cand_tokens.intersection(line_tokens)) / float(max(1, len(line_tokens)))
        if overlap >= 0.22:
            return True
    return False


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


def _contains_any_phrase(text: str, phrases: set[str]) -> bool:
    lowered = str(text or "").lower()
    return any(phrase in lowered for phrase in phrases)


def _has_unsupported_claim_language(
    text: str,
    resume_hits: List[str],
    resume_evidence_lines: List[str],
) -> bool:
    lowered = str(text or "").lower()
    evidence_blob = " ".join(str(x or "").lower() for x in resume_evidence_lines)

    def supported(phrase: str) -> bool:
        return _contains_term(" ".join(resume_hits), phrase) or (phrase in evidence_blob)

    for phrase in UNSUPPORTED_CLAIM_PHRASES["customer_facing"]:
        if phrase in lowered and not supported(phrase):
            return True

    ownership_hit = _contains_any_phrase(lowered, UNSUPPORTED_CLAIM_PHRASES["ownership_language"])
    scope_cues = any(cue in lowered for cue in {"platform", "roadmap", "implementation", "accounts"})
    if ownership_hit and scope_cues and not any(cue in evidence_blob for cue in {"led", "owned", "managed"}):
        return True
    return False


def _has_semantic_context_drift(
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


def _extract_skill_names_from_resume(resume_data: Dict[str, Any]) -> List[str]:
    out: List[str] = []
    skills = resume_data.get("skills")
    if not isinstance(skills, list):
        return out
    for item in skills:
        name = ""
        if isinstance(item, dict):
            name = str(item.get("name") or "").strip()
        else:
            name = str(item or "").strip()
        if name and name.lower() not in [x.lower() for x in out]:
            out.append(name)
    return out


def _is_skills_topn_safe(after_skills: List[str], available_skills: List[str]) -> bool:
    if not after_skills:
        return False
    allowed = {str(x).strip().lower() for x in available_skills if str(x).strip()}
    if not allowed:
        return False
    for skill in after_skills:
        if str(skill).strip().lower() not in allowed:
            return False
    return True


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def _build_fallback_section_optimizations(
    *,
    edit_plan: Dict[str, Any],
    resume_data: Dict[str, Any],
) -> Dict[str, Any]:
    section_scoring = edit_plan.get("section_scoring", {}) if isinstance(edit_plan, dict) else {}
    fallback = {
        "summary": None,
        "experience": [],
        "projects": [],
        "skills": None,
    }
    summary_before = ""
    summary_block = resume_data.get("summary")
    if isinstance(summary_block, dict):
        summary_before = str(summary_block.get("summary") or "").strip()
    elif isinstance(summary_block, str):
        summary_before = summary_block.strip()
    if summary_before:
        fallback["summary"] = {
            "before": summary_before,
            "after": summary_before,
            "reason": "Baseline preserved until validated full-section optimization is available.",
            "confidence": 0.65,
        }
    for section in ("experience", "projects"):
        for row in section_scoring.get(section, []):
            if not isinstance(row, dict):
                continue
            fallback[section].append(
                {
                    "item_id": str(row.get("item_id") or ""),
                    "section": section,
                    "decision": str(row.get("decision") or "keep"),
                    "before": str(row.get("before") or ""),
                    "after": str(row.get("before") or ""),
                    "reason": "Deterministic scoring baseline.",
                    "confidence": 0.65,
                    "jd_alignment_score": _safe_float(row.get("jd_alignment_score")),
                    "evidence_strength_score": _safe_float(row.get("evidence_strength_score")),
                    "risk_score": _safe_float(row.get("risk_score")),
                    "overall_priority": _safe_float(row.get("overall_priority")),
                }
            )
    skills_before = _extract_skill_names_from_resume(resume_data)
    skills_after = list(dict.fromkeys(section_scoring.get("skills_candidates", [])))[:8] or skills_before[:8]
    if skills_before:
        fallback["skills"] = {
            "mode": "replace_top_n",
            "before": skills_before,
            "after": skills_after,
            "reason": "Top-N verified and aligned skills.",
            "confidence": 0.7,
        }
    return fallback


def _build_patch_from_section_optimizations(section_optimizations: Dict[str, Any]) -> Dict[str, Any]:
    patch: Dict[str, Any] = {
        "summary": {},
        "experience": {"update_by_id": []},
        "projects": {"update_by_id": []},
        "skills": {},
    }
    summary = section_optimizations.get("summary")
    if isinstance(summary, dict) and str(summary.get("after") or "").strip():
        patch["summary"]["update"] = str(summary.get("after") or "").strip()

    for section in ("experience", "projects"):
        rows = section_optimizations.get(section, [])
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            item_id = str(row.get("item_id") or "").strip()
            if not item_id:
                continue
            patch[section]["update_by_id"].append(
                {
                    "item_id": item_id,
                    "description": str(row.get("after") or row.get("before") or "").strip(),
                    "decision": str(row.get("decision") or "keep").strip().lower(),
                }
            )

    skills = section_optimizations.get("skills")
    if isinstance(skills, dict):
        after = skills.get("after")
        if isinstance(after, list) and after:
            patch["skills"]["replace_top_n"] = [str(x).strip() for x in after if str(x).strip()]
    return patch


def _apply_patch_to_resume_data(resume_data: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    out = deepcopy(resume_data)
    if not isinstance(out, dict):
        out = {}
    summary_update = patch.get("summary", {}).get("update") if isinstance(patch.get("summary"), dict) else None
    if summary_update:
        summary = out.get("summary")
        if isinstance(summary, dict):
            summary["summary"] = summary_update
        else:
            out["summary"] = {"summary": summary_update}

    for section in ("experience", "projects"):
        updates = patch.get(section, {}).get("update_by_id") if isinstance(patch.get(section), dict) else None
        if not isinstance(updates, list):
            continue
        rows = out.get(section)
        if not isinstance(rows, list):
            continue
        update_map = {}
        for u in updates:
            if not isinstance(u, dict):
                continue
            iid = str(u.get("item_id") or "").strip()
            if iid:
                update_map[iid] = u
        for row in rows:
            if not isinstance(row, dict):
                continue
            iid = str(row.get("item_id") or "").strip()
            if iid in update_map:
                decision = str(update_map[iid].get("decision") or "keep").strip().lower()
                if decision == "omit":
                    row["_omit_suggested"] = True
                new_desc = str(update_map[iid].get("description") or "").strip()
                if new_desc:
                    row["description"] = new_desc

    skills_replace = patch.get("skills", {}).get("replace_top_n") if isinstance(patch.get("skills"), dict) else None
    if isinstance(skills_replace, list) and skills_replace:
        existing_skills = _extract_skill_names_from_resume(out)
        ordered_top = [str(x).strip() for x in skills_replace if str(x).strip()]
        ordered_top_lower = {x.lower() for x in ordered_top}
        remaining = [x for x in existing_skills if x.strip().lower() not in ordered_top_lower]
        out["skills"] = ordered_top + remaining
    return out


def _apply_provider_json_if_safe(
    *,
    parsed_json: Dict[str, Any],
    resume_gaps: List[str],
    resume_hits: List[str],
    resume_evidence_lines: List[str],
    has_experience: bool,
    has_projects: bool,
    has_skills: bool,
    fallback_suggestions: List[JobTailorSuggestion],
    fallback_resume_data: Dict[str, Any],
    fallback_section_optimizations: Dict[str, Any],
    fallback_keywords: List[str],
    fallback_target_gap_keywords: List[str],
    available_skills: List[str],
    fallback_warnings: List[str],
) -> tuple[List[str], List[str], List[JobTailorSuggestion], Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    provider_warnings = list(fallback_warnings)
    provider_keywords = list(fallback_keywords)
    provider_target_gap_keywords = list(fallback_target_gap_keywords)
    provider_suggestions = list(fallback_suggestions)
    provider_section_optimizations = deepcopy(fallback_section_optimizations)
    provider_patch = _build_patch_from_section_optimizations(provider_section_optimizations)
    provider_resume_data = _apply_patch_to_resume_data(fallback_resume_data, provider_patch)
    provider_debug: Dict[str, Any] = {
        "used": False,
        "rejected_count": 0,
        "rejected_by_reason": {
            "gap_term": 0,
            "no_evidence_alignment": 0,
            "unsupported_claim_language": 0,
            "semantic_drift": 0,
            "invalid_skills_reorder": 0,
            "unknown_item_id": 0,
        },
    }

    if not isinstance(parsed_json, dict):
        provider_debug["reason"] = "parsed_json_missing_or_invalid"
        return (
            provider_keywords,
            provider_target_gap_keywords,
            provider_warnings,
            provider_suggestions,
            provider_resume_data,
            provider_section_optimizations,
            provider_patch,
            provider_debug,
        )

    maybe_verified_keywords = parsed_json.get("verified_ats_keywords", parsed_json.get("ats_keywords"))
    if isinstance(maybe_verified_keywords, list):
        normalized = [str(x).strip().lower() for x in maybe_verified_keywords if str(x).strip()]
        if normalized:
            provider_keywords = list(dict.fromkeys(normalized))[:12]

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
            if after_text and not _uses_unverified_gap_term(after_text, resume_gaps):
                if (
                    _has_verified_evidence_alignment(after_text, resume_hits, resume_evidence_lines)
                    and not _has_unsupported_claim_language(after_text, resume_hits, resume_evidence_lines)
                    and not _has_semantic_context_drift(
                        before_text=before_text,
                        after_text=after_text,
                        resume_hits=resume_hits,
                        resume_evidence_lines=resume_evidence_lines,
                    )
                ):
                    accepted_section_opts["summary"] = {
                        "before": before_text,
                        "after": after_text,
                        "reason": str(summary_row.get("reason") or "Optimized summary."),
                        "confidence": _safe_float(summary_row.get("confidence") or 0.72),
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
                    if _uses_unverified_gap_term(after_text, resume_gaps):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["gap_term"] += 1
                        continue
                    if not _has_verified_evidence_alignment(after_text, resume_hits, resume_evidence_lines):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["no_evidence_alignment"] += 1
                        continue
                    if _has_unsupported_claim_language(after_text, resume_hits, resume_evidence_lines):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["unsupported_claim_language"] += 1
                        continue
                    if _has_semantic_context_drift(
                        before_text=before_text,
                        after_text=after_text,
                        resume_hits=resume_hits,
                        resume_evidence_lines=resume_evidence_lines,
                    ):
                        provider_debug["rejected_count"] += 1
                        provider_debug["rejected_by_reason"]["semantic_drift"] += 1
                        continue
                accepted_rows.append(
                    {
                        "item_id": item_id,
                        "section": section,
                        "decision": decision if decision in {"keep", "rewrite", "downrank", "omit"} else "keep",
                        "before": before_text,
                        "after": after_text,
                        "reason": str(row.get("reason") or "Model section optimization."),
                        "confidence": _safe_float(row.get("confidence") or 0.7),
                        "jd_alignment_score": _safe_float(row.get("jd_alignment_score")),
                        "evidence_strength_score": _safe_float(row.get("evidence_strength_score")),
                        "risk_score": _safe_float(row.get("risk_score")),
                        "overall_priority": _safe_float(row.get("overall_priority")),
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
                if _is_skills_topn_safe(cleaned, available_skills):
                    accepted_section_opts["skills"] = {
                        "mode": "replace_top_n",
                        "before": list(available_skills),
                        "after": cleaned,
                        "reason": str(skills_row.get("reason") or "Top-N skill optimization."),
                        "confidence": _safe_float(skills_row.get("confidence") or 0.72),
                    }
                else:
                    provider_debug["rejected_count"] += 1
                    provider_debug["rejected_by_reason"]["invalid_skills_reorder"] += 1

    provider_section_optimizations = accepted_section_opts
    provider_patch = _build_patch_from_section_optimizations(provider_section_optimizations)
    provider_resume_data = _apply_patch_to_resume_data(fallback_resume_data, provider_patch)


    maybe_warnings = parsed_json.get("warnings")
    if isinstance(maybe_warnings, list):
        provider_warnings = [str(x).strip() for x in maybe_warnings if str(x).strip()][:8]

    # Canonical output mode: section_optimizations is the only decision format.
    provider_suggestions = []

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
        provider_warnings.append(
            "AI output missing expected suggestion sections: " + ", ".join(missing_sections)
        )
    provider_debug["missing_sections"] = missing_sections

    provider_debug["section_counts"] = {
        "experience": len(provider_section_optimizations.get("experience", [])) if isinstance(provider_section_optimizations, dict) else 0,
        "projects": len(provider_section_optimizations.get("projects", [])) if isinstance(provider_section_optimizations, dict) else 0,
    }
    provider_debug["used"] = True
    return (
        provider_keywords,
        provider_target_gap_keywords,
        provider_warnings,
        provider_suggestions,
        provider_resume_data,
        provider_section_optimizations,
        provider_patch,
        provider_debug,
    )


def build_job_tailor_suggestions(
    payload: JobTailorSuggestRequest,
    *,
    user_id: int,
) -> JobTailorSuggestResponse:
    """
    MVP mock response for frontend integration.
    Keeps shape stable so OpenAI implementation can replace internals later.
    """
    extraction_result = extract_job_keywords_detailed(
        payload.job_description,
        target_role=payload.target_role,
        limit=12,
    )
    raw_keywords = [entry["term"] for entry in extraction_result["keywords"]]
    reusable_keywords = filter_non_reusable(raw_keywords)
    abstracted_keywords = abstract_terms(reusable_keywords, limit=4)
    tailor_context = build_tailor_context(
        target_role=payload.target_role,
        extraction_result=extraction_result,
        resume_data=payload.resume_data if isinstance(payload.resume_data, dict) else {},
    )
    edit_plan = build_edit_plan(
        tailor_context=tailor_context,
        resume_data=payload.resume_data if isinstance(payload.resume_data, dict) else {},
        job_description=payload.job_description,
        target_role=payload.target_role or "",
    )
    prompt_bundle = build_job_tailor_prompt(payload, tailor_context=tailor_context, edit_plan=edit_plan)
    # Keep UI keywords truthful: verified terms for resume-facing ATS list, gaps tracked separately.
    verified_keywords = list(tailor_context.get("verified_resume_terms", tailor_context.get("resume_hits", [])))[:12]
    target_gap_keywords = list(tailor_context.get("target_gap_terms", tailor_context.get("resume_gaps", [])))[:12]
    ui_keywords = verified_keywords or (
        tailor_context.get("keywords_primary", [])
        + [term for term in tailor_context.get("keywords_secondary", []) if term not in tailor_context.get("keywords_primary", [])]
    )[:12] or reusable_keywords or raw_keywords

    selected_model = get_openai_model()
    provider_output_debug: Dict[str, Any] = {
        "enabled": is_openai_enabled(),
        "attempted": False,
        "model": selected_model,
        "finish_reason": None,
        "error": None,
        "response_preview": None,
        "parsed_json": None,
        "usage": None,
    }
    provider_full_content = ""
    logger.info(
        "AI provider status enabled=%s model=%s user_id=%s",
        provider_output_debug["enabled"],
        selected_model,
        user_id,
    )
    if provider_output_debug["enabled"]:
        provider_output_debug["attempted"] = True
        try:
            provider_result = request_chat_completion(
                model=selected_model,
                system_prompt=prompt_bundle["system_prompt"],
                user_prompt=prompt_bundle["user_prompt"],
            )
            provider_output_debug["finish_reason"] = provider_result.get("finish_reason")
            provider_full_content = str(provider_result.get("content") or "")
            provider_output_debug["response_preview"] = provider_full_content[:1800]
            provider_output_debug["parsed_json"] = provider_result.get("parsed_json")
            provider_output_debug["usage"] = provider_result.get("usage")
            logger.info(
                "AI provider response ok model=%s finish_reason=%s tokens=%s",
                selected_model,
                provider_output_debug["finish_reason"],
                provider_output_debug["usage"],
            )
            logger.info(
                "AI provider response preview: %s",
                provider_output_debug["response_preview"][:400] if provider_output_debug["response_preview"] else "",
            )
        except Exception as exc:
            provider_output_debug["error"] = str(exc)
            logger.exception("AI provider call failed model=%s", selected_model)
    else:
        logger.info("AI provider call skipped (AI_USE_OPENAI not enabled or API key missing)")

    _write_debug_output(
        {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "request": {
                "target_role": payload.target_role,
                "job_description_chars": len(payload.job_description),
                "template_name": payload.template_name,
                "strict_truth": payload.strict_truth,
            },
            "extraction": {
                "active_domains": extraction_result["active_domains"],
                "top_keywords_raw": extraction_result["keywords"][:12],
                "keywords_filtered": reusable_keywords[:12],
                "keywords_abstracted": abstracted_keywords[:12],
                "dynamic_phrase_candidates": extraction_result["dynamic_phrase_candidates"][:10],
                "tailor_context": tailor_context,
                "edit_plan": edit_plan,
            },
            "prompt_setup": {
                "prompt_version": prompt_bundle["prompt_version"],
                "context": prompt_bundle["context"],
                "system_prompt": prompt_bundle["system_prompt"],
                "user_prompt": _strip_resume_data_from_user_prompt(prompt_bundle["user_prompt"]),
                "resume_input_debug": prompt_bundle.get("resume_input_debug", {}),
                "openai_payload_preview": build_openai_request_payload(
                    model=selected_model,
                    system_prompt=prompt_bundle["system_prompt"],
                    user_prompt=_strip_resume_data_from_user_prompt(prompt_bundle["user_prompt"]),
                ),
                "provider_output_debug": provider_output_debug,
            },
        }
    )
    normalized_resume_data = (
        tailor_context.get("normalized_resume_data")
        if isinstance(tailor_context.get("normalized_resume_data"), dict)
        else (payload.resume_data if isinstance(payload.resume_data, dict) else {})
    )
    keywords = ui_keywords
    warnings: List[str] = []
    suggestions: List[JobTailorSuggestion] = []

    section_optimizations = _build_fallback_section_optimizations(
        edit_plan=edit_plan if isinstance(edit_plan, dict) else {},
        resume_data=normalized_resume_data if isinstance(normalized_resume_data, dict) else {},
    )
    suggested_resume_data_patch = _build_patch_from_section_optimizations(section_optimizations)
    suggested_resume_data = _apply_patch_to_resume_data(normalized_resume_data, suggested_resume_data_patch)

    provider_parse_debug: Dict[str, Any] = {"used": False}
    parsed_json = provider_output_debug.get("parsed_json")
    if isinstance(parsed_json, dict):
        (
            keywords,
            target_gap_keywords,
            warnings,
            suggestions,
            suggested_resume_data,
            section_optimizations,
            suggested_resume_data_patch,
            provider_parse_debug,
        ) = _apply_provider_json_if_safe(
            parsed_json=parsed_json,
            resume_gaps=list(tailor_context.get("resume_gaps", [])),
            resume_hits=list(tailor_context.get("resume_hits", [])),
            resume_evidence_lines=list(edit_plan.get("resume_evidence_lines", [])) if isinstance(edit_plan, dict) else [],
            has_experience=isinstance(payload.resume_data.get("experience"), list) and bool(payload.resume_data.get("experience")),
            has_projects=isinstance(payload.resume_data.get("projects"), list) and bool(payload.resume_data.get("projects")),
            has_skills=isinstance(payload.resume_data.get("skills"), list) and bool(payload.resume_data.get("skills")),
            fallback_suggestions=[],
            fallback_resume_data=normalized_resume_data,
            fallback_section_optimizations=section_optimizations,
            fallback_keywords=keywords,
            fallback_target_gap_keywords=target_gap_keywords,
            available_skills=_extract_skill_names_from_resume(normalized_resume_data if isinstance(normalized_resume_data, dict) else {}),
            fallback_warnings=warnings,
        )
    _write_provider_response_text(provider_full_content)
    _write_provider_debug_output(
        {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "target_role": payload.target_role,
            "provider": {
                "enabled": provider_output_debug.get("enabled"),
                "attempted": provider_output_debug.get("attempted"),
                "model": provider_output_debug.get("model"),
                "finish_reason": provider_output_debug.get("finish_reason"),
                "error": provider_output_debug.get("error"),
                "usage": provider_output_debug.get("usage"),
            },
            "response": {
                "file": str(_PROVIDER_RESPONSE_LATEST),
                "preview": provider_output_debug.get("response_preview"),
                "preview_chars": len(str(provider_output_debug.get("response_preview") or "")),
            },
            "resume_input_debug": prompt_bundle.get("resume_input_debug", {}),
            "parsed_json": provider_output_debug.get("parsed_json"),
            "validation": provider_parse_debug,
        }
    )

    return JobTailorSuggestResponse(
        prompt_version=prompt_bundle["prompt_version"],
        model=MODEL_NAME,
        summary=(
            "Prompt scaffold prepared and mock tailoring complete. "
            "Use usage.prompt_debug and usage.provider_output_debug to inspect request/response mapping."
        ),
        ats_keywords=keywords,
        verified_ats_keywords=keywords,
        target_gap_keywords=target_gap_keywords,
        warnings=warnings,
        suggestions=suggestions,
        section_optimizations=SectionOptimizations.model_validate(section_optimizations),
        suggested_resume_data_patch=suggested_resume_data_patch,
        suggested_resume_data=suggested_resume_data,
        usage={
            "user_id": user_id,
            "job_description_chars": len(payload.job_description),
            "suggestion_count": len(suggestions),
            "is_mock": True,
            "openai_live_enabled": provider_output_debug["enabled"],
            "provider_response_file": str(_PROVIDER_RESPONSE_LATEST),
            "verified_ats_keywords": keywords,
            "target_gap_keywords": target_gap_keywords,
            "suggested_resume_data_patch": suggested_resume_data_patch,
            "section_optimizations": section_optimizations,
            # Expose post-extraction transformer output directly for UI/testing.
            "tailor_context": tailor_context,
            "edit_plan": edit_plan,
            "provider_output_debug": provider_output_debug,
            "provider_parse_debug": provider_parse_debug,
            "prompt_debug": {
                "context": prompt_bundle["context"],
                "resume_input_debug": prompt_bundle.get("resume_input_debug", {}),
                "prompt_char_counts": {
                    "system_prompt": len(prompt_bundle["system_prompt"]),
                    "user_prompt": len(prompt_bundle["user_prompt"]),
                },
                "prompt_preview": {
                    "system_prompt": prompt_bundle["system_prompt"][:600],
                    "user_prompt": prompt_bundle["user_prompt"][:1200],
                },
                "extraction_debug": {
                    "active_domains": extraction_result["active_domains"],
                    "top_keywords_raw": extraction_result["keywords"][:12],
                    "keywords_filtered": reusable_keywords[:12],
                    "keywords_abstracted": abstracted_keywords[:12],
                    "dynamic_phrase_candidates": extraction_result["dynamic_phrase_candidates"][:10],
                    "tailor_context": tailor_context,
                    "edit_plan": edit_plan,
                },
            },
        },
    )
