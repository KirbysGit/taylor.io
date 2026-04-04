from __future__ import annotations

import json
from typing import Any, Dict, List

from .schemas import JobTailorSuggestRequest

PROMPT_VERSION = "job_tailor_v1_scaffold"


def _sanitize_text(value: Any) -> str:
    text = str(value or "").strip()
    return text


def _extract_style_preferences(payload: JobTailorSuggestRequest) -> Dict[str, Any]:
    if isinstance(payload.style_preferences, dict):
        return payload.style_preferences
    return {}


def _focus_and_tone(payload: JobTailorSuggestRequest) -> tuple[str, str]:
    prefs = _extract_style_preferences(payload)
    focus = _sanitize_text(prefs.get("focus") or "balanced").lower()
    tone = _sanitize_text(prefs.get("tone") or "balanced").lower()
    return focus, tone


def _build_rules(strict_truth: bool, focus: str, tone: str) -> List[str]:
    rules = [
        "Use only details present in user resume data and job description.",
        "Keep output ATS-friendly with clear, concrete language.",
        "Return recommendations at section level and line-edit level.",
    ]
    if strict_truth:
        rules.append("Do not invent facts, companies, titles, dates, metrics, or certifications.")
    else:
        rules.append("If information is missing, suggest placeholders clearly marked for user confirmation.")

    if focus == "impact":
        rules.append("Prioritize measurable outcomes, ownership, and business impact.")
    elif focus == "technical":
        rules.append("Prioritize technical depth, systems, tools, and implementation details.")
    elif focus == "leadership":
        rules.append("Prioritize leadership, mentoring, and cross-functional collaboration.")
    else:
        rules.append("Balance impact, technical detail, and leadership signals.")

    if tone == "concise":
        rules.append("Prefer concise rewrites with short, high-signal bullets.")
    elif tone == "detailed":
        rules.append("Prefer richer detail while preserving readability and scanability.")
    else:
        rules.append("Use a balanced professional tone suitable for modern resume formats.")
    return rules


def _resume_for_prompt(resume_data: Dict[str, Any]) -> str:
    try:
        return json.dumps(resume_data, ensure_ascii=True, indent=2, sort_keys=True)
    except Exception:
        return "{}"


def build_job_tailor_prompt(payload: JobTailorSuggestRequest) -> Dict[str, Any]:
    focus, tone = _focus_and_tone(payload)
    target_role = _sanitize_text(payload.target_role) or "Not specified"
    style_prefs = _extract_style_preferences(payload)
    rules = _build_rules(payload.strict_truth, focus, tone)
    company = _sanitize_text(style_prefs.get("company") or "")

    system_prompt = (
        "You are a resume tailoring assistant for Taylor.io.\n"
        "Your job is to analyze job requirements, map them to resume evidence, and propose truthful rewrites.\n"
        "Follow these rules exactly:\n"
        + "\n".join(f"- {rule}" for rule in rules)
    )

    user_prompt = (
        f"Target role: {target_role}\n"
        f"Company: {company or 'Not specified'}\n"
        f"Template: {_sanitize_text(payload.template_name) or 'classic'}\n"
        f"Focus: {focus}\n"
        f"Tone: {tone}\n"
        f"Strict truth mode: {'on' if payload.strict_truth else 'off'}\n\n"
        "Job description:\n"
        f"{payload.job_description.strip()}\n\n"
        "Resume data (JSON):\n"
        f"{_resume_for_prompt(payload.resume_data)}"
    )

    resume_keys = sorted(payload.resume_data.keys()) if isinstance(payload.resume_data, dict) else []
    return {
        "prompt_version": PROMPT_VERSION,
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "context": {
            "target_role": target_role,
            "company": company or None,
            "focus": focus,
            "tone": tone,
            "strict_truth": payload.strict_truth,
            "template_name": payload.template_name or "classic",
            "resume_keys": resume_keys,
        },
    }
