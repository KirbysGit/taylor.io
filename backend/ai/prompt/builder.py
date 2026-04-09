from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from ..schemas import JobTailorSuggestRequest

PROMPT_VERSION = "job_tailor_v1_scaffold"
PROMPT_VERSION_V2 = "job_tailor_v2_context"

# -----------------------------
# Small shared helpers
# -----------------------------

def _sanitize_text(value: Any) -> str:
    return str(value or "").strip()


def _extract_style_preferences(payload: JobTailorSuggestRequest) -> Dict[str, Any]:
    return payload.style_preferences if isinstance(payload.style_preferences, dict) else {}


def _focus_and_tone(payload: JobTailorSuggestRequest) -> tuple[str, str]:
    prefs = _extract_style_preferences(payload)
    focus = _sanitize_text(prefs.get("focus") or "balanced").lower()
    tone = _sanitize_text(prefs.get("tone") or "balanced").lower()
    return focus, tone


def _truncate_text(text: str, max_chars: int) -> str:
    clean = str(text or "").strip()
    if len(clean) <= max_chars:
        return clean
    return clean[: max_chars - 3].rstrip() + "..."


def _resume_for_prompt(resume_data: Dict[str, Any]) -> str:
    try:
        return json.dumps(resume_data, ensure_ascii=True, indent=2, sort_keys=True)
    except Exception:
        return "{}"


def _build_rules(strict_truth: bool, focus: str, tone: str) -> List[str]:
    rules = [
        "Use only details present in user resume data and job description.",
        "Keep output ATS-friendly with clear, concrete language.",
        "Return recommendations at section level and line-edit level.",
    ]

    if strict_truth:
        rules.append("Do not invent facts, companies, titles, dates, metrics, or certifications.")
        rules.append(
            "Only use VERIFIED resume evidence in rewritten resume text. "
            "Do not include unsupported target skills in rewrites."
        )
        rules.append(
            "If a target term is missing from evidence, mention it only as a gap/warning, "
            "not as claimed experience."
        )
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


def _output_contract() -> str:
    # JSON shape the model must return.
    example = {
        "summary": "1-2 sentence overview of how resume was tailored for this role.",
        "core_verified_keywords": ["directly evidenced and central role-fit keyword"],
        "supporting_verified_keywords": ["evidenced but secondary/adjacent keyword"],
        "target_gap_keywords": ["important_jd_term_not_verified_in_resume"],
        "warnings": ["optional warning if evidence is weak"],
        "section_optimizations": {
            "summary": {
                "before": "existing summary text",
                "after": "optimized summary text",
                "reason": "why this summary is stronger for the role",
                "confidence": 0.8,
            },
            "experience": [
                {
                    "item_id": "experience_abc123",
                    "section": "experience",
                    "decision": "rewrite",
                    "before": "existing bullet text",
                    "after": "optimized bullet text",
                    "reason": "aligned to top JD evidence, grounded in resume facts",
                    "confidence": 0.78,
                }
            ],
            "projects": [
                {
                    "item_id": "projects_xyz456",
                    "section": "projects",
                    "decision": "keep",
                    "before": "existing project bullet",
                    "after": "existing project bullet",
                    "reason": "already high alignment and clear evidence",
                    "confidence": 0.73,
                }
            ],
            "skills": {
                "mode": "reorder_verified_front",
                "before": ["python", "react", "sql", "java"],
                "after": ["python", "sql", "react"],
                "reason": "reorder verified skills to prioritize highest role relevance",
                "confidence": 0.76,
            },
        },
        "suggested_resume_data_patch": {
            "summary": {"update": "updated summary text"},
            "experience": {
                "update_by_id": [
                    {"item_id": "experience_abc123", "description": "optimized bullet text", "decision": "rewrite"}
                ]
            },
            "projects": {
                "update_by_id": [
                    {"item_id": "projects_xyz456", "description": "existing project bullet", "decision": "keep"}
                ]
            },
            "skills": {
                "reorder_front": ["python", "sql", "react"]
            }
        },
    }
    return json.dumps(example, ensure_ascii=True, indent=2)


# -----------------------------
# JD snippet extraction
# -----------------------------

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

        # Stop capture when a new heading starts.
        if current and any_header.match(line):
            current = None

        if current:
            buckets[current].append(line)

    # Fallback to first bullet-like lines when headers are missing.
    if not any(buckets.values()):
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


# -----------------------------
# Minimal resume context helpers
# -----------------------------

def _normalize_for_match(text: str) -> str:
    lowered = str(text or "").lower()
    return re.sub(r"\s+", " ", lowered).strip()


def _entry_matches_evidence(entry: Dict[str, Any], evidence_lines: List[str]) -> bool:
    desc = _normalize_for_match(str(entry.get("description") or ""))
    if not desc:
        return False

    for line in evidence_lines:
        ev = _normalize_for_match(line)
        if not ev:
            continue
        # Partial matching helps with punctuation and truncation differences.
        if ev in desc or desc in ev:
            return True
    return False


def _entry_to_min_context(entry: Dict[str, Any], max_chars: int = 420) -> str:
    title = _sanitize_text(entry.get("title") or entry.get("name") or "")
    company = _sanitize_text(entry.get("company") or "")
    header = " - ".join(part for part in [title, company] if part).strip()
    body = _truncate_text(_sanitize_text(entry.get("description") or ""), max_chars)
    if header and body:
        return f"{header}: {body}"
    return header or body


def _select_minimal_section_context(resume_data: Dict[str, Any], evidence_lines: List[str]) -> Dict[str, str]:
    selected: Dict[str, str] = {}

    summary = resume_data.get("summary")
    summary_text = ""
    if isinstance(summary, dict):
        summary_text = _sanitize_text(summary.get("summary") or "")
    elif isinstance(summary, str):
        summary_text = _sanitize_text(summary)
    if summary_text:
        selected["summary"] = _truncate_text(summary_text, 420)

    for section_key in ("experience", "projects"):
        section = resume_data.get(section_key)
        if not isinstance(section, list) or not section:
            continue

        matched_rows: List[str] = []
        for item in section:
            if not isinstance(item, dict):
                continue
            if _entry_matches_evidence(item, evidence_lines):
                row = _entry_to_min_context(item)
                if row and row not in matched_rows:
                    matched_rows.append(row)
            if len(matched_rows) >= 2:
                break

        if not matched_rows:
            # Fallback to first usable entry.
            for item in section:
                if not isinstance(item, dict):
                    continue
                row = _entry_to_min_context(item)
                if row:
                    matched_rows.append(row)
                    break

        if matched_rows:
            selected[section_key] = _truncate_text("\n".join(f"- {row}" for row in matched_rows), 900)

    # Add a compact skills snapshot so model can produce reorder suggestions.
    skills = resume_data.get("skills")
    if isinstance(skills, list) and skills:
        names: List[str] = []
        for item in skills:
            if isinstance(item, dict):
                name = _sanitize_text(item.get("name") or "")
            else:
                name = _sanitize_text(item)
            if name and name not in names:
                names.append(name)
            if len(names) >= 18:
                break
        if names:
            selected["skills"] = ", ".join(names)

    return selected


# -----------------------------
# Prompt assembly
# -----------------------------

def _build_v2_user_prompt(
    payload: JobTailorSuggestRequest,
    tailor_context: Dict[str, Any],
    edit_plan: Optional[Dict[str, Any]],
    focus: str,
    tone: str,
) -> tuple[str, Dict[str, Any]]:
    snippets = _extract_jd_snippets(payload.job_description)

    resume_evidence_lines: List[str] = []
    if isinstance(edit_plan, dict):
        resume_evidence_lines = [str(x).strip() for x in edit_plan.get("resume_evidence_lines", []) if str(x).strip()]

    minimal_context = _select_minimal_section_context(
        payload.resume_data if isinstance(payload.resume_data, dict) else {},
        resume_evidence_lines,
    )

    lines: List[str] = [
        # 1) Role summary
        f"Target role: {_sanitize_text(payload.target_role) or 'Not specified'}",
        f"Template: {_sanitize_text(payload.template_name) or 'classic'}",
        f"Focus: {focus}",
        f"Tone: {tone}",
        f"Strict truth mode: {'on' if payload.strict_truth else 'off'}",
        "",
        # 2) Minimal planning summary
        f"Primary keywords: {', '.join(tailor_context.get('keywords_primary', [])) or 'none'}",
        f"Core verified keywords: {', '.join(tailor_context.get('core_verified_keywords', [])) or 'none'}",
        f"Supporting verified keywords: {', '.join(tailor_context.get('supporting_verified_keywords', [])) or 'none'}",
        f"Verified resume terms (all): {', '.join(tailor_context.get('verified_resume_terms', tailor_context.get('resume_hits', []))) or 'none'}",
        f"Target gap terms: {', '.join(tailor_context.get('target_gap_terms', tailor_context.get('resume_gaps', []))) or 'none'}",
    ]

    if isinstance(edit_plan, dict) and edit_plan:
        section_notes: List[str] = []
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
                f"Plan section priorities: {', '.join(section_notes) or 'none'}",
                f"Plan risk flags: {', '.join(edit_plan.get('risk_flags', [])) or 'none'}",
                "Plan full-section scoring is provided below and must be respected for decision depth.",
                "",
                # 3) Grounding evidence
                "Top JD evidence lines:",
            ]
        )

        for line in edit_plan.get("jd_evidence_lines", [])[:6]:
            lines.append(f"- {line}")

        lines.append("")
        lines.append("Top resume evidence lines:")
        for line in resume_evidence_lines[:6]:
            lines.append(f"- {line}")

        section_scoring = edit_plan.get("section_scoring", {}) if isinstance(edit_plan, dict) else {}
        for section_key in ("experience", "projects"):
            rows = section_scoring.get(section_key, []) if isinstance(section_scoring, dict) else []
            if not rows:
                continue
            lines.extend(["", f"{section_key.title()} optimization candidates (all items):"])
            for row in rows[:18]:
                if not isinstance(row, dict):
                    continue
                lines.append(
                    "- "
                    + f"id={_sanitize_text(row.get('item_id'))}; "
                    + f"decision_hint={_sanitize_text(row.get('decision'))}; "
                    + f"priority={row.get('overall_priority', 0)}; "
                    + f"jd={row.get('jd_alignment_score', 0)}; "
                    + f"evidence={row.get('evidence_strength_score', 0)}; "
                    + f"risk={row.get('risk_score', 0)}; "
                    + f"text={_truncate_text(_sanitize_text(row.get('before') or ''), 220)}"
                )
        skill_candidates = section_scoring.get("skills_candidates", []) if isinstance(section_scoring, dict) else []
        if skill_candidates:
            lines.extend(["", f"Skills candidates (verified and aligned): {', '.join(skill_candidates)}"])

    has_ranked_jd_lines = bool(isinstance(edit_plan, dict) and edit_plan.get("jd_evidence_lines"))
    if not has_ranked_jd_lines:
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

    lines.extend(
        [
            "",
            "Hard constraint:",
            "In rewritten resume text, use only verified resume terms/evidence.",
            "Prioritize core verified keywords first; use supporting verified keywords only as secondary context.",
            "Missing target terms may appear only in warnings/gap notes.",
            "Never place target gap terms directly into rewritten resume claims.",
            "Do not introduce business/user/product framing unless that framing is present in matched resume evidence.",
            "Skills optimization must output reorder_verified_front using existing verified skills only; do not add new categories.",
            "When rewriting aligned bullets, preserve quantified proof points (percentages, scale, latency, throughput, ROC/AUC, counts) unless clearly irrelevant.",
            "Optimize full sections, not sample edits. Every experience/project item must get a decision.",
            "Use item_id references in outputs and patch operations; do not rely on full-string matching.",
            "Do not output legacy suggestions when section_optimizations is present.",
            "",
            "Minimum coverage requirements for section_optimizations:",
            "- Include summary optimization when summary exists.",
            "- For experience context, return decisions for all listed item_ids.",
            "- For project context, return decisions for all listed item_ids.",
            "- For skills context, return a front-priority reorder list from verified skills only (preserve full skill inventory).",
            "",
            "Required output format:",
            "Return ONLY a valid JSON object. No markdown, no prose, no code fences.",
            "Use keys exactly as specified in the contract below.",
            _output_contract(),
        ]
    )

    if minimal_context:
        lines.extend(["", "Minimal section context (fallback grounding):"])
        for key, value in minimal_context.items():
            lines.extend([f"[{key}]", value, ""])

    debug_payload = {
        "resume_evidence_lines_used": resume_evidence_lines[:6],
        "minimal_section_context_used": minimal_context,
    }
    return "\n".join(lines).strip(), debug_payload


def build_job_tailor_prompt(
    payload: JobTailorSuggestRequest,
    tailor_context: Optional[Dict[str, Any]] = None,
    edit_plan: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:

    # get the focus and tone.
    focus, tone = _focus_and_tone(payload)

    # get the target role, company, and rules.
    target_role = _sanitize_text(payload.target_role) or "Not specified"

    # get the style preferences and build the rules.
    style_prefs = _extract_style_preferences(payload)

    # build the rules.
    rules = _build_rules(payload.strict_truth, focus, tone)
    
    # get the company.
    company = _sanitize_text(style_prefs.get("company") or "")

    # build the system prompt.
    system_prompt = (
        "You are a resume improvement and tailoring assistant for Taylor.io.\n"
        "Primary objective: maximize role-fit clarity while staying strictly truthful.\n"
        "Optimize for: ATS parseability, recruiter scanability, and stronger evidence-to-requirement alignment.\n"
        "When rewriting, prioritize concrete skills, outcomes, and role-relevant phrasing over generic wording.\n"
        "If evidence is weak or missing, identify the gap and propose safe, clearly marked improvement options.\n"
        "Do not inflate seniority, fabricate scope, or imply tools/experience not supported by user data.\n"
        "Output must be strict machine-readable JSON only.\n"
        "Do not include markdown, bullet lists, headings, or explanatory prose outside JSON.\n"
        "Follow these rules exactly:\n"
        + "\n".join(f"- {rule}" for rule in rules)
    )

    # check if we are using the v2 context.
    using_v2_context = bool(tailor_context)

    prompt_debug_payload: Dict[str, Any] = {}
    # build the user prompt.
    if using_v2_context:
        user_prompt, prompt_debug_payload = _build_v2_user_prompt(payload, tailor_context or {}, edit_plan, focus, tone)
    else:
        # build the user prompt for the v1 context.
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

    # get the resume keys.
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
        "resume_input_debug": prompt_debug_payload,
    }
