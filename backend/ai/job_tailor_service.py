# backend/ai/job_tailor_service.py

# Beginning of implementation of the job tailoring service.

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from copy import deepcopy
from typing import Any, Dict, List

# Local imports.
from .extraction import abstract_terms, extract_job_keywords_detailed, filter_non_reusable
from .planning import build_edit_plan
from .processing import build_tailor_context
from .prompt_builder import build_job_tailor_prompt
from .schemas import (
    JobTailorSuggestRequest,
    JobTailorSuggestResponse,
    JobTailorSuggestion,
)

# Model We're Using.
MODEL_NAME = "mock-planner"
_DEBUG_DIR = Path(__file__).resolve().parent / "debug_outputs"
_DEBUG_LATEST = _DEBUG_DIR / "job_tailor_latest.json"
_DEBUG_HISTORY = _DEBUG_DIR / "job_tailor_history.jsonl"


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


def _summary_suggestion(payload: JobTailorSuggestRequest, keywords: List[str]) -> JobTailorSuggestion | None:
    summary_block = payload.resume_data.get("summary") if isinstance(payload.resume_data, dict) else None
    before = ""
    if isinstance(summary_block, dict):
        before = str(summary_block.get("summary") or "").strip()
    elif isinstance(summary_block, str):
        before = summary_block.strip()

    if not before:
        return None

    top = ", ".join(keywords[:4]) if keywords else "role-relevant outcomes"
    after = (
        f"{before}\n\n"
        f"Tailor note: prioritize keywords from the JD such as {top} when phrasing measurable impact."
    )
    return JobTailorSuggestion(
        section="summary",
        action="rewrite",
        before=before,
        after=after,
        reason="Align opening summary language with high-signal terms from the target job description.",
        confidence=0.72,
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
    )
    prompt_bundle = build_job_tailor_prompt(payload, tailor_context=tailor_context, edit_plan=edit_plan)
    # Keep UI/prompt keywords concrete; abstractions remain debug metadata.
    ui_keywords = (
        tailor_context.get("keywords_primary", [])
        + [term for term in tailor_context.get("keywords_secondary", []) if term not in tailor_context.get("keywords_primary", [])]
    )[:12] or reusable_keywords or raw_keywords

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
            },
        }
    )
    keywords = ui_keywords
    warnings: List[str] = []
    suggestions: List[JobTailorSuggestion] = []
    suggestion = _summary_suggestion(payload, keywords)
    if suggestion:
        suggestions.append(suggestion)
    else:
        warnings.append("No existing summary found to tailor; consider adding one before AI rewrite.")

    suggested_resume_data = deepcopy(payload.resume_data)
    if suggestion:
        if not isinstance(suggested_resume_data.get("summary"), dict):
            suggested_resume_data["summary"] = {}
        suggested_resume_data["summary"]["summary"] = suggestion.after

    return JobTailorSuggestResponse(
        prompt_version=prompt_bundle["prompt_version"],
        model=MODEL_NAME,
        summary=(
            "Prompt scaffold prepared and mock tailoring complete. "
            "Use the usage.prompt_debug block to verify request data mapping before OpenAI wiring."
        ),
        ats_keywords=keywords,
        warnings=warnings,
        suggestions=suggestions,
        suggested_resume_data=suggested_resume_data,
        usage={
            "user_id": user_id,
            "job_description_chars": len(payload.job_description),
            "suggestion_count": len(suggestions),
            "is_mock": True,
            # Expose post-extraction transformer output directly for UI/testing.
            "tailor_context": tailor_context,
            "edit_plan": edit_plan,
            "prompt_debug": {
                "context": prompt_bundle["context"],
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
