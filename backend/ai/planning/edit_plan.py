from __future__ import annotations

from typing import Any, Dict, List


def _as_list(value: Any) -> List[str]:
    if not isinstance(value, list):
        return []
    out: List[str] = []
    for item in value:
        text = str(item or "").strip().lower()
        if text and text not in out:
            out.append(text)
    return out


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
) -> Dict[str, Any]:
    primary = _as_list(tailor_context.get("keywords_primary"))
    hits = _as_list(tailor_context.get("resume_hits"))
    gaps = _as_list(tailor_context.get("resume_gaps"))
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

    return {
        "emphasis_targets": emphasis_targets,
        "evidence_to_preserve": evidence_to_preserve,
        "gap_priorities": gap_priorities,
        "section_priorities": section_priorities,
        "risk_flags": risk_flags,
    }
