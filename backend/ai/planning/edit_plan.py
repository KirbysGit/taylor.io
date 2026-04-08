from __future__ import annotations

import re
from typing import Any, Dict, List

GENERIC_JD_NOISE = {
    "equal opportunity",
    "all qualified applicants",
    "pay range",
    "compensation",
    "benefits",
    "message and data rates",
    "apply today",
    "privacy",
    "background check",
    "drug test",
    "we are looking for",
}

ACTION_HINTS = {
    "build",
    "design",
    "implement",
    "maintain",
    "optimize",
    "own",
    "develop",
    "deploy",
    "collaborate",
    "support",
}

MUST_HAVE_HINTS = {"required", "must", "minimum", "need", "needs"}
PREFERRED_HINTS = {"preferred", "nice to have", "plus"}
VAGUE_RESUME_HINTS = {"worked on", "helped with", "responsible for", "various", "etc"}
SEMANTIC_DRIFT_HINTS = {
    "user engagement",
    "customer engagement",
    "product monitoring",
    "customer health",
    "go-to-market",
}


def _as_list(value: Any) -> List[str]:
    if not isinstance(value, list):
        return []
    out: List[str] = []
    for item in value:
        text = str(item or "").strip().lower()
        if text and text not in out:
            out.append(text)
    return out


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def _tokens(text: str) -> List[str]:
    return re.findall(r"[a-z0-9+#./-]{2,}", _norm(text))


def _split_jd_lines(job_description: str) -> List[str]:
    lines: List[str] = []
    for raw in str(job_description or "").splitlines():
        line = raw.strip(" \t-*•")
        if not line:
            continue
        if len(line) < 18:
            continue
        lines.append(line)
    return list(dict.fromkeys(lines))


def _score_jd_line(line: str, role_tokens: set[str], focus_terms: List[str]) -> float:
    lowered = _norm(line)
    toks = _tokens(lowered)
    if not toks:
        return 0.0

    score = 0.0
    if any(hint in lowered for hint in MUST_HAVE_HINTS):
        score += 3.0
    if any(hint in lowered for hint in PREFERRED_HINTS):
        score += 1.0
    if any(hint in toks for hint in ACTION_HINTS):
        score += 1.8

    specific_terms = [t for t in toks if len(t) >= 4 and t not in {"team", "skills", "experience"}]
    score += min(3.0, 0.25 * len(specific_terms))

    focus_hits = sum(1 for term in focus_terms if term and term in lowered)
    score += min(3.0, 0.9 * focus_hits)

    role_hits = sum(1 for tok in role_tokens if tok in toks)
    score += min(2.0, 0.5 * role_hits)

    if any(noise in lowered for noise in GENERIC_JD_NOISE):
        score -= 3.0
    return score


def _select_jd_evidence_lines(job_description: str, target_role: str, focus_terms: List[str], limit: int = 6) -> List[str]:
    role_tokens = set(_tokens(target_role))
    scored = []
    for line in _split_jd_lines(job_description):
        s = _score_jd_line(line, role_tokens, focus_terms)
        if s > 1.1:
            scored.append((s, line))
    scored.sort(key=lambda x: (-x[0], x[1]))
    return [line for _, line in scored[:limit]]


def _flatten_resume_lines(resume_data: Dict[str, Any]) -> List[str]:
    lines: List[str] = []
    summary = resume_data.get("summary")
    if isinstance(summary, dict):
        text = str(summary.get("summary") or "").strip()
        if text:
            lines.append(text)
    elif isinstance(summary, str) and summary.strip():
        lines.append(summary.strip())

    for key in ("experience", "projects"):
        section = resume_data.get(key)
        if not isinstance(section, list):
            continue
        for item in section[:8]:
            if not isinstance(item, dict):
                continue
            desc = str(item.get("description") or "").strip()
            if not desc:
                continue
            for raw in desc.splitlines():
                line = raw.strip(" \t-*•")
                if len(line) >= 18:
                    lines.append(line)
    return list(dict.fromkeys(lines))


def _score_resume_line(line: str, jd_lines: List[str], focus_terms: List[str]) -> float:
    lowered = _norm(line)
    toks = _tokens(lowered)
    if not toks:
        return 0.0

    score = 0.0
    jd_overlap = 0.0
    for jd in jd_lines:
        jd_tokens = set(_tokens(jd))
        if not jd_tokens:
            continue
        overlap = len(set(toks).intersection(jd_tokens)) / float(max(1, len(jd_tokens)))
        jd_overlap = max(jd_overlap, overlap)
    score += min(4.0, jd_overlap * 8.0)

    focus_hits = sum(1 for term in focus_terms if term and term in lowered)
    score += min(2.0, 0.6 * focus_hits)

    if re.search(r"\d|%", lowered):
        score += 1.5
    if any(tok in ACTION_HINTS for tok in toks):
        score += 1.0
    if any(v in lowered for v in VAGUE_RESUME_HINTS):
        score -= 1.5
    return score


def _select_resume_evidence_lines(resume_data: Dict[str, Any], jd_lines: List[str], focus_terms: List[str], limit: int = 6) -> List[str]:
    scored = []
    for line in _flatten_resume_lines(resume_data):
        s = _score_resume_line(line, jd_lines, focus_terms)
        if s > 0.8:
            scored.append((s, line))
    scored.sort(key=lambda x: (-x[0], x[1]))
    return [line for _, line in scored[:limit]]


def _iter_section_items(resume_data: Dict[str, Any], section: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    rows = resume_data.get(section)
    if not isinstance(rows, list):
        return out
    for idx, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        item_id = str(row.get("item_id") or "").strip() or f"{section}_{idx}"
        desc = str(row.get("description") or "").strip()
        if not desc:
            continue
        out.append(
            {
                "item_id": item_id,
                "title": str(row.get("title") or row.get("name") or "").strip(),
                "description": desc,
            }
        )
    return out


def _score_section_item(item: Dict[str, Any], jd_lines: List[str], focus_terms: List[str]) -> Dict[str, Any]:
    text = _norm(item.get("description", ""))
    toks = _tokens(text)
    if not toks:
        return {
            "jd_alignment_score": 0.0,
            "evidence_strength_score": 0.0,
            "risk_score": 1.0,
            "overall_priority": 0.0,
            "decision": "keep",
        }

    jd_alignment = 0.0
    for jd in jd_lines:
        jd_tokens = set(_tokens(jd))
        if not jd_tokens:
            continue
        overlap = len(set(toks).intersection(jd_tokens)) / float(max(1, len(jd_tokens)))
        jd_alignment = max(jd_alignment, overlap)
    jd_alignment = min(1.0, jd_alignment * 2.0)

    focus_hits = sum(1 for term in focus_terms if term and term in text)
    has_metric = bool(re.search(r"\d|%", text))
    evidence_strength = min(1.0, (0.18 * focus_hits) + (0.35 if has_metric else 0.15))

    vague_hits = sum(1 for hint in VAGUE_RESUME_HINTS if hint in text)
    drift_hits = sum(1 for hint in SEMANTIC_DRIFT_HINTS if hint in text)
    risk_score = min(1.0, (0.22 * vague_hits) + (0.28 * drift_hits))

    overall = max(0.0, min(1.0, (0.55 * jd_alignment) + (0.45 * evidence_strength) - (0.35 * risk_score)))
    if overall >= 0.62:
        decision = "rewrite"
    elif overall >= 0.42:
        decision = "keep"
    elif overall >= 0.25:
        decision = "downrank"
    else:
        decision = "omit"
    return {
        "jd_alignment_score": round(jd_alignment, 4),
        "evidence_strength_score": round(evidence_strength, 4),
        "risk_score": round(risk_score, 4),
        "overall_priority": round(overall, 4),
        "decision": decision,
    }


def _rank_section_items(
    resume_data: Dict[str, Any],
    section: str,
    jd_lines: List[str],
    focus_terms: List[str],
) -> List[Dict[str, Any]]:
    ranked: List[Dict[str, Any]] = []
    for item in _iter_section_items(resume_data, section):
        scores = _score_section_item(item, jd_lines, focus_terms)
        ranked.append(
            {
                "item_id": item["item_id"],
                "section": section,
                "title": item.get("title", ""),
                "before": item.get("description", ""),
                **scores,
            }
        )
    ranked.sort(key=lambda x: (-float(x.get("overall_priority", 0.0)), x.get("item_id", "")))
    return ranked


def _section_priorities(resume_data: Dict[str, Any], focus_terms: List[str]) -> List[Dict[str, str]]:
    has_summary = bool(resume_data.get("summary"))
    has_skills = bool(resume_data.get("skills"))
    has_experience = bool(resume_data.get("experience"))
    has_projects = bool(resume_data.get("projects"))

    priorities: List[Dict[str, str]] = []
    if has_summary:
        priorities.append(
            {
                "section": "summary",
                "action": "rewrite",
                "intent": "Align role narrative with top target terms and measurable impact.",
            }
        )
    else:
        priorities.append(
            {
                "section": "summary",
                "action": "suggest_addition",
                "intent": "Add a short role-aligned summary grounded in verified resume evidence.",
            }
        )

    if has_skills:
        priorities.append(
            {
                "section": "skills",
                "action": "reorder",
                "intent": "Move high-priority target terms to the top when supported.",
            }
        )
    if has_experience:
        priorities.append(
            {
                "section": "experience",
                "action": "emphasize",
                "intent": "Strengthen bullets using concrete outcomes tied to target terms.",
            }
        )
    if has_projects:
        priorities.append(
            {
                "section": "projects",
                "action": "emphasize",
                "intent": "Highlight projects that best support top role requirements.",
            }
        )

    if not any((has_skills, has_experience, has_projects)):
        priorities.append(
            {
                "section": "profile_data",
                "action": "suggest_addition",
                "intent": "Collect more evidence for top terms before aggressive rewrites.",
            }
        )

    if focus_terms and priorities:
        priorities[0]["intent"] += " Focus first on: " + ", ".join(focus_terms[:3]) + "."
    return priorities


def build_edit_plan(
    *,
    tailor_context: Dict[str, Any],
    resume_data: Dict[str, Any],
    job_description: str = "",
    target_role: str = "",
) -> Dict[str, Any]:
    primary = _as_list(tailor_context.get("keywords_primary"))
    hits = _as_list(tailor_context.get("verified_resume_terms") or tailor_context.get("resume_hits"))
    gaps = _as_list(tailor_context.get("target_gap_terms") or tailor_context.get("resume_gaps"))
    phrase_focus = _as_list(tailor_context.get("phrase_focus"))

    emphasis_targets: List[str] = []
    for term in gaps + hits + phrase_focus + primary:
        if term not in emphasis_targets:
            emphasis_targets.append(term)
        if len(emphasis_targets) >= 8:
            break

    evidence_to_preserve: List[str] = []
    for term in hits + primary:
        if term in evidence_to_preserve:
            continue
        evidence_to_preserve.append(term)
        if len(evidence_to_preserve) >= 6:
            break

    gap_priorities: List[str] = []
    for term in gaps:
        if term not in gap_priorities:
            gap_priorities.append(term)
        if len(gap_priorities) >= 6:
            break

    risk_flags: List[str] = []
    if len(gap_priorities) >= 4:
        risk_flags.append("high_gap_density")
    if not evidence_to_preserve:
        risk_flags.append("low_verified_evidence")
    if not resume_data:
        risk_flags.append("sparse_resume_data")

    section_priorities = _section_priorities(resume_data if isinstance(resume_data, dict) else {}, emphasis_targets)
    jd_evidence_lines = _select_jd_evidence_lines(job_description, target_role, emphasis_targets, limit=6)
    resume_evidence_lines = _select_resume_evidence_lines(
        resume_data if isinstance(resume_data, dict) else {},
        jd_evidence_lines,
        emphasis_targets,
        limit=6,
    )
    normalized_resume = tailor_context.get("normalized_resume_data") if isinstance(tailor_context.get("normalized_resume_data"), dict) else (
        resume_data if isinstance(resume_data, dict) else {}
    )
    experience_ranked = _rank_section_items(normalized_resume, "experience", jd_evidence_lines, emphasis_targets)
    projects_ranked = _rank_section_items(normalized_resume, "projects", jd_evidence_lines, emphasis_targets)
    skills_candidates = []
    skills = normalized_resume.get("skills")
    if isinstance(skills, list):
        for skill in skills:
            name = str(skill.get("name") if isinstance(skill, dict) else skill).strip().lower()
            if not name:
                continue
            aligned = any(name in str(x).lower() for x in jd_evidence_lines) or any(name in str(x).lower() for x in hits)
            if aligned:
                skills_candidates.append(name)
    skills_candidates = list(dict.fromkeys(skills_candidates))[:12]

    return {
        "emphasis_targets": emphasis_targets,
        "evidence_to_preserve": evidence_to_preserve,
        "gap_priorities": gap_priorities,
        "jd_evidence_lines": jd_evidence_lines,
        "resume_evidence_lines": resume_evidence_lines,
        "section_scoring": {
            "experience": experience_ranked,
            "projects": projects_ranked,
            "skills_candidates": skills_candidates,
        },
        "section_priorities": section_priorities,
        "risk_flags": risk_flags,
    }
