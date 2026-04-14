from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from .debug import (
    PROVIDER_RESPONSE_LATEST,
    strip_resume_data_from_user_prompt,
    write_debug_output,
    write_provider_debug_output,
    write_provider_response_text,
)
from .extraction import extract_job_keywords_detailed
from .openai import build_openai_request_payload, get_openai_model, is_openai_enabled, request_chat_completion
from .planning import build_edit_plan
from .post_processing import (
    apply_patch_to_resume_data,
    apply_provider_json_if_safe,
    build_classified_changes,
    build_concept_warnings,
    build_fallback_section_optimizations,
    build_patch_from_section_optimizations,
    build_reasoning_feed,
    extract_skill_names_from_resume,
)
from .processing import build_tailor_context
from .prompt import build_job_tailor_prompt
from .schemas import JobTailorSuggestRequest, JobTailorSuggestResponse, SectionOptimizations

logger = logging.getLogger(__name__)


def build_job_tailor_suggestions(payload: JobTailorSuggestRequest, *, user_id: int) -> JobTailorSuggestResponse:
    
    # extract the job's keywords.
    # - payload.job_description -> the job description
    # - limit=12 -> the number of keywords to extract
    # - target_role=payload.target_role -> the target role

    extraction_result = extract_job_keywords_detailed(payload.job_description, limit=12, target_role=payload.target_role)

    # turn keywords into a list of strings.
    raw_keywords = [entry["term"] for entry in extraction_result["keywords"]]

    # get the resume data.
    resume_data = payload.resume_data if isinstance(payload.resume_data, dict) else {}

    tailor_context = build_tailor_context(
        target_role=payload.target_role,
        extraction_result=extraction_result,
        resume_data=resume_data,
    )
    edit_plan = build_edit_plan(
        tailor_context=tailor_context,
        resume_data=resume_data,
        job_description=payload.job_description,
        target_role=payload.target_role or "",
    )
    prompt_bundle = build_job_tailor_prompt(payload, tailor_context=tailor_context, edit_plan=edit_plan)

    core_verified_keywords = list(tailor_context.get("core_verified_keywords", []))[:12]
    supporting_verified_keywords = list(tailor_context.get("supporting_verified_keywords", []))[:12]
    verified_keywords = list(
        dict.fromkeys(
            core_verified_keywords
            + supporting_verified_keywords
            + list(tailor_context.get("verified_resume_terms", tailor_context.get("resume_hits", [])))
        )
    )[:12]
    target_gap_keywords = list(tailor_context.get("target_gap_terms", tailor_context.get("resume_gaps", [])))[:12]
    ui_keywords = core_verified_keywords or verified_keywords or (
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

    logger.info("AI provider status enabled=%s model=%s user_id=%s", provider_output_debug["enabled"], selected_model, user_id)
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
        except Exception as exc:
            provider_output_debug["error"] = str(exc)
            logger.exception("AI provider call failed model=%s", selected_model)
    else:
        logger.info("AI provider call skipped (AI_USE_OPENAI not enabled or API key missing)")

    write_debug_output(
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
                "user_prompt": strip_resume_data_from_user_prompt(prompt_bundle["user_prompt"]),
                "resume_input_debug": prompt_bundle.get("resume_input_debug", {}),
                "openai_payload_preview": build_openai_request_payload(
                    model=selected_model,
                    system_prompt=prompt_bundle["system_prompt"],
                    user_prompt=strip_resume_data_from_user_prompt(prompt_bundle["user_prompt"]),
                ),
                "provider_output_debug": provider_output_debug,
            },
        }
    )

    normalized_resume_data = tailor_context.get("normalized_resume_data") if isinstance(tailor_context.get("normalized_resume_data"), dict) else resume_data
    keywords = ui_keywords
    warnings: List[str] = []

    section_optimizations = build_fallback_section_optimizations(
        edit_plan=edit_plan if isinstance(edit_plan, dict) else {},
        resume_data=normalized_resume_data if isinstance(normalized_resume_data, dict) else {},
    )
    suggested_resume_data_patch = build_patch_from_section_optimizations(section_optimizations)
    suggested_resume_data = apply_patch_to_resume_data(normalized_resume_data, suggested_resume_data_patch)

    provider_parse_debug: Dict[str, Any] = {"used": False}
    parsed_json = provider_output_debug.get("parsed_json")
    if isinstance(parsed_json, dict):
        (
            keywords,
            core_verified_keywords,
            supporting_verified_keywords,
            target_gap_keywords,
            warnings,
            suggested_resume_data,
            section_optimizations,
            suggested_resume_data_patch,
            provider_parse_debug,
        ) = apply_provider_json_if_safe(
            parsed_json=parsed_json,
            resume_gaps=list(tailor_context.get("resume_gaps", [])),
            resume_hits=list(tailor_context.get("resume_hits", [])),
            core_verified_keywords=core_verified_keywords,
            supporting_verified_keywords=supporting_verified_keywords,
            resume_evidence_lines=list(edit_plan.get("resume_evidence_lines", [])) if isinstance(edit_plan, dict) else [],
            has_experience=isinstance(resume_data.get("experience"), list) and bool(resume_data.get("experience")),
            has_projects=isinstance(resume_data.get("projects"), list) and bool(resume_data.get("projects")),
            has_skills=isinstance(resume_data.get("skills"), list) and bool(resume_data.get("skills")),
            fallback_resume_data=normalized_resume_data,
            fallback_section_optimizations=section_optimizations,
            fallback_keywords=keywords,
            fallback_core_keywords=core_verified_keywords,
            fallback_supporting_keywords=supporting_verified_keywords,
            fallback_target_gap_keywords=target_gap_keywords,
            available_skills=extract_skill_names_from_resume(normalized_resume_data if isinstance(normalized_resume_data, dict) else {}),
            fallback_warnings=warnings,
        )

    concept_warnings = build_concept_warnings(
        target_concepts=target_gap_keywords[:6],
        resume_hits=list(tailor_context.get("verified_resume_terms", tailor_context.get("resume_hits", []))),
        resume_evidence_lines=list(edit_plan.get("resume_evidence_lines", [])) if isinstance(edit_plan, dict) else [],
        resume_data=normalized_resume_data if isinstance(normalized_resume_data, dict) else {},
        limit=4,
    )
    for warning in concept_warnings:
        if warning not in warnings:
            warnings.append(warning)

    classified_changes = build_classified_changes(section_optimizations)
    reasoning_feed = build_reasoning_feed(
        target_role=payload.target_role or "",
        verified_keywords=keywords,
        target_gap_keywords=target_gap_keywords,
        warnings=warnings,
        edit_plan=edit_plan if isinstance(edit_plan, dict) else {},
        classified_changes=classified_changes,
    )

    write_provider_response_text(provider_full_content)
    write_provider_debug_output(
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
                "file": str(PROVIDER_RESPONSE_LATEST),
                "preview": provider_output_debug.get("response_preview"),
                "preview_chars": len(str(provider_output_debug.get("response_preview") or "")),
            },
            "resume_input_debug": prompt_bundle.get("resume_input_debug", {}),
            "parsed_json": provider_output_debug.get("parsed_json"),
            "validation": provider_parse_debug,
            "classified_changes": classified_changes,
            "reasoning_feed": reasoning_feed,
        }
    )

    return JobTailorSuggestResponse(
        prompt_version=prompt_bundle["prompt_version"],
        model=selected_model,
        summary=(
            "Prompt scaffold prepared and mock tailoring complete. "
            "Use usage.prompt_debug and usage.provider_output_debug to inspect request/response mapping."
        ),
        ats_keywords=keywords,
        verified_ats_keywords=keywords,
        core_verified_keywords=core_verified_keywords,
        supporting_verified_keywords=supporting_verified_keywords,
        target_gap_keywords=target_gap_keywords,
        warnings=warnings,
        suggestions=[],
        section_optimizations=SectionOptimizations.model_validate(section_optimizations),
        suggested_resume_data_patch=suggested_resume_data_patch,
        suggested_resume_data=suggested_resume_data,
        classified_changes=classified_changes,
        reasoning_feed=reasoning_feed,
        usage={
            "user_id": user_id,
            "job_description_chars": len(payload.job_description),
            "suggestion_count": 0,
            "is_mock": True,
            "openai_live_enabled": provider_output_debug["enabled"],
            "provider_response_file": str(PROVIDER_RESPONSE_LATEST),
            "verified_ats_keywords": keywords,
            "core_verified_keywords": core_verified_keywords,
            "supporting_verified_keywords": supporting_verified_keywords,
            "target_gap_keywords": target_gap_keywords,
            "classified_changes": classified_changes,
            "reasoning_feed": reasoning_feed,
            "suggested_resume_data_patch": suggested_resume_data_patch,
            "section_optimizations": section_optimizations,
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
