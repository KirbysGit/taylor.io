from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from .schemas import JobTailorSuggestRequest

PROMPT_VERSION = "job_tailor_v1_scaffold"
PROMPT_VERSION_V2 = "job_tailor_v2_context"


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


def _truncate_text(text: str, max_chars: int) -> str:
    clean = str(text or "").strip()
    if len(clean) <= max_chars:
        return clean
    return clean[: max_chars - 3].rstrip() + "..."


def _extract_jd_snippets(job_description: str) -> Dict[str, str]:
    lines = [ln.rstrip() for ln in (job_description or "").splitlines()]
    header_patterns = {
        "requirements": re.compile(r"^(requirements?|must have|required skills|qualifications?)\s*:?\s*$", re.I),
        "responsibilities": re.compile(r"^(responsibilities|what you will do|key responsibilities|duties)\s*:?\s*$", re.I),
        "qualifications": re.compile(r"^(preferred qualifications|nice to have|ideal candidate)\s*:?\s*$", re.I),
    }
    any_header = re.compile(r"^[A-Za-z][A-Za-z0-9 /&()-]{2,}\s*:?\s*$")

    buckets: Dict[str, List[str]] = {"requirements": [], "responsibilities": [], "qualifications": []}
    current: Optional[str] = None
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        matched = None
        for section, pattern in header_patterns.items():
            if pattern.match(line):
                matched = section
                break
        if matched:
            current = matched
            continue
        if current and any_header.match(line):
            # Stop section capture when another heading starts.
            current = None
        if current:
            buckets[current].append(line)

    if not any(buckets.values()):
        # Fallback: keep first N bullet-like lines.
        bullet_like: List[str] = []
        for raw in lines:
            line = raw.strip()
            if not line:
                continue
            if line.startswith(("-", "*", "\u2022")) or re.match(r"^\d+[.)]\s+", line):
                bullet_like.append(line)
            if len(bullet_like) >= 14:
                break
        fallback = bullet_like or [ln.strip() for ln in lines if ln.strip()][:10]
        return {
            "requirements": _truncate_text("\n".join(fallback[:6]), 900),
            "responsibilities": _truncate_text("\n".join(fallback[6:12]), 900),
            "qualifications": "",
        }

    return {
        "requirements": _truncate_text("\n".join(buckets["requirements"]), 900),
        "responsibilities": _truncate_text("\n".join(buckets["responsibilities"]), 900),
        "qualifications": _truncate_text("\n".join(buckets["qualifications"]), 700),
    }


def _section_to_compact_text(section: Any, max_chars: int = 900) -> str:
    if section is None:
        return ""
    if isinstance(section, str):
        return _truncate_text(section, max_chars)
    try:
        text = json.dumps(section, ensure_ascii=True, separators=(",", ":"))
    except Exception:
        text = str(section)
    return _truncate_text(text, max_chars)


def _select_relevant_resume_sections(resume_data: Dict[str, Any], tailor_context: Dict[str, Any]) -> Dict[str, str]:
    include_keys = ("summary", "skills", "experience", "projects")
    selected: Dict[str, str] = {}
    for key in include_keys:
        if key not in resume_data:
            continue
        compact = _section_to_compact_text(resume_data.get(key))
        if compact:
            selected[key] = compact
    # Lightweight fallback for sparse resumes.
    if not selected:
        for key in list(resume_data.keys())[:4]:
            compact = _section_to_compact_text(resume_data.get(key), max_chars=500)
            if compact:
                selected[key] = compact
    # Keep overall prompt compact.
    running = 0
    trimmed: Dict[str, str] = {}
    for key, value in selected.items():
        budget = 1200 if key in ("experience", "projects") else 700
        text = _truncate_text(value, budget)
        if running + len(text) > 2800:
            continue
        trimmed[key] = text
        running += len(text)
    return trimmed


def _build_v2_user_prompt(
    payload: JobTailorSuggestRequest,
    tailor_context: Dict[str, Any],
    edit_plan: Optional[Dict[str, Any]],
    focus: str,
    tone: str,
) -> str:
    snippets = _extract_jd_snippets(payload.job_description)
    resume_sections = _select_relevant_resume_sections(
        payload.resume_data if isinstance(payload.resume_data, dict) else {},
        tailor_context,
    )
    lines: List[str] = [
        f"Target role: {_sanitize_text(payload.target_role) or 'Not specified'}",
        f"Template: {_sanitize_text(payload.template_name) or 'classic'}",
        f"Focus: {focus}",
        f"Tone: {tone}",
        f"Strict truth mode: {'on' if payload.strict_truth else 'off'}",
        "",
        f"Active domains: {', '.join(tailor_context.get('active_domains', [])) or 'none'}",
        f"Primary keywords: {', '.join(tailor_context.get('keywords_primary', [])) or 'none'}",
        f"Phrase focus: {', '.join(tailor_context.get('phrase_focus', [])) or 'none'}",
        f"Resume hits: {', '.join(tailor_context.get('resume_hits', [])) or 'none'}",
        f"Resume gaps: {', '.join(tailor_context.get('resume_gaps', [])) or 'none'}",
    ]
    if isinstance(edit_plan, dict) and edit_plan:
        section_notes = []
        for row in edit_plan.get("section_priorities", [])[:4]:
            if not isinstance(row, dict):
                continue
            section = _sanitize_text(row.get("section"))
            action = _sanitize_text(row.get("action"))
            if section and action:
                section_notes.append(f"{section}:{action}")
        lines.extend(
            [
                "",
                f"Plan emphasis targets: {', '.join(edit_plan.get('emphasis_targets', [])) or 'none'}",
                f"Plan evidence to preserve: {', '.join(edit_plan.get('evidence_to_preserve', [])) or 'none'}",
                f"Plan gap priorities: {', '.join(edit_plan.get('gap_priorities', [])) or 'none'}",
                f"Plan section priorities: {', '.join(section_notes) or 'none'}",
                f"Plan risk flags: {', '.join(edit_plan.get('risk_flags', [])) or 'none'}",
            ]
        )
    lines.extend(
        [
            "",
            "JD requirements snippet:",
            snippets.get("requirements") or "(not found)",
            "",
            "JD responsibilities snippet:",
            snippets.get("responsibilities") or "(not found)",
        ]
    )
    if snippets.get("qualifications"):
        lines.extend(["", "JD qualifications snippet:", snippets["qualifications"]])
    lines.extend(["", "Relevant resume sections:"])
    for key, value in resume_sections.items():
        lines.extend([f"[{key}]", value, ""])
    return "\n".join(lines).strip()


def build_job_tailor_prompt(
    payload: JobTailorSuggestRequest,
    tailor_context: Optional[Dict[str, Any]] = None,
    edit_plan: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    focus, tone = _focus_and_tone(payload)
    target_role = _sanitize_text(payload.target_role) or "Not specified"
    style_prefs = _extract_style_preferences(payload)
    rules = _build_rules(payload.strict_truth, focus, tone)
    company = _sanitize_text(style_prefs.get("company") or "")

    system_prompt = (
        "You are a resume improvement and tailoring assistant for Taylor.io.\n"
        "Primary objective: maximize role-fit clarity while staying strictly truthful.\n"
        "Optimize for: ATS parseability, recruiter scanability, and stronger evidence-to-requirement alignment.\n"
        "When rewriting, prioritize concrete skills, outcomes, and role-relevant phrasing over generic wording.\n"
        "If evidence is weak or missing, identify the gap and propose safe, clearly marked improvement options.\n"
        "Do not inflate seniority, fabricate scope, or imply tools/experience not supported by user data.\n"
        "Follow these rules exactly:\n"
        + "\n".join(f"- {rule}" for rule in rules)
    )

    using_v2_context = bool(tailor_context)
    if using_v2_context:
        user_prompt = _build_v2_user_prompt(payload, tailor_context or {}, edit_plan, focus, tone)
    else:
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
        "prompt_version": PROMPT_VERSION_V2 if using_v2_context else PROMPT_VERSION,
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
            "using_tailor_context": using_v2_context,
            "using_edit_plan": bool(edit_plan),
        },
    }
