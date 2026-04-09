from __future__ import annotations

from typing import Any, Dict, List

from ..shared.text_utils import safe_float


def risk_level_for_change(
    *,
    change_type: str,
    decision: str,
    confidence: float,
    risk_score: float,
) -> str:
    ctype = str(change_type or "").strip().lower()
    dec = str(decision or "").strip().lower()
    conf = safe_float(confidence)
    risk = safe_float(risk_score)

    if ctype == "reorder_skills":
        return "low"
    if dec == "omit":
        return "high"
    if dec == "downrank":
        return "medium" if conf >= 0.66 else "high"
    if ctype == "summary_rewrite":
        if conf >= 0.86:
            return "low"
        return "medium" if conf >= 0.7 else "high"
    if ctype == "item_rewrite":
        if risk >= 0.66 or conf < 0.62:
            return "high"
        if risk >= 0.4 or conf < 0.72:
            return "medium"
        return "low"
    return "medium"


def build_classified_changes(section_optimizations: Dict[str, Any]) -> List[Dict[str, Any]]:
    changes: List[Dict[str, Any]] = []
    if not isinstance(section_optimizations, dict):
        return changes

    summary = section_optimizations.get("summary")
    if isinstance(summary, dict):
        before = str(summary.get("before") or "").strip()
        after = str(summary.get("after") or "").strip()
        if after and after != before:
            confidence = safe_float(summary.get("confidence") or 0.72)
            risk_level = risk_level_for_change(
                change_type="summary_rewrite",
                decision="rewrite",
                confidence=confidence,
                risk_score=0.0,
            )
            changes.append(
                {
                    "change_id": "summary:root",
                    "section": "summary",
                    "item_id": "summary",
                    "change_type": "summary_rewrite",
                    "before": before,
                    "after": after,
                    "reason": str(summary.get("reason") or "Summary alignment update."),
                    "confidence": confidence,
                    "risk_level": risk_level,
                    "auto_apply": risk_level == "low",
                }
            )

    for section in ("experience", "projects"):
        rows = section_optimizations.get(section, [])
        if not isinstance(rows, list):
            continue
        for row_index, row in enumerate(rows):
            if not isinstance(row, dict):
                continue
            item_id = str(row.get("item_id") or "").strip()
            decision = str(row.get("decision") or "keep").strip().lower()
            before = str(row.get("before") or "").strip()
            after = str(row.get("after") or "").strip()
            if not item_id or decision == "keep":
                continue
            change_type = "item_rewrite" if decision == "rewrite" else decision
            confidence = safe_float(row.get("confidence") or 0.7)
            risk_level = risk_level_for_change(
                change_type="item_rewrite",
                decision=decision,
                confidence=confidence,
                risk_score=safe_float(row.get("risk_score")),
            )
            changes.append(
                {
                    "change_id": f"{section}:{item_id}",
                    "section": section,
                    "item_id": item_id,
                    "row_index": row_index,
                    "change_type": change_type,
                    "before": before,
                    "after": after or before,
                    "reason": str(row.get("reason") or "Section optimization update."),
                    "confidence": confidence,
                    "risk_level": risk_level,
                    "auto_apply": risk_level == "low",
                }
            )

    skills = section_optimizations.get("skills")
    if isinstance(skills, dict):
        before_list = skills.get("before") if isinstance(skills.get("before"), list) else []
        after_list = skills.get("after") if isinstance(skills.get("after"), list) else []
        before = ", ".join(str(x).strip() for x in before_list if str(x).strip())
        after = ", ".join(str(x).strip() for x in after_list if str(x).strip())
        if after and before != after:
            confidence = safe_float(skills.get("confidence") or 0.72)
            risk_level = risk_level_for_change(
                change_type="reorder_skills",
                decision="reorder",
                confidence=confidence,
                risk_score=0.0,
            )
            changes.append(
                {
                    "change_id": "skills:reorder",
                    "section": "skills",
                    "item_id": "skills",
                    "change_type": "reorder_skills",
                    "before": before,
                    "after": after,
                    "before_list": [str(x).strip() for x in before_list if str(x).strip()],
                    "after_list": [str(x).strip() for x in after_list if str(x).strip()],
                    "reason": str(skills.get("reason") or "Reordered verified skills to prioritize role fit."),
                    "confidence": confidence,
                    "risk_level": risk_level,
                    "auto_apply": risk_level == "low",
                }
            )
    return changes


def build_reasoning_feed(
    *,
    target_role: str,
    verified_keywords: List[str],
    target_gap_keywords: List[str],
    warnings: List[str],
    edit_plan: Dict[str, Any],
    classified_changes: List[Dict[str, Any]],
) -> Dict[str, Any]:
    role = str(target_role or "target role").strip()
    role_signals = list(edit_plan.get("jd_evidence_lines", [])) if isinstance(edit_plan, dict) else []
    resume_evidence_used = list(edit_plan.get("resume_evidence_lines", [])) if isinstance(edit_plan, dict) else []
    section_priorities = list(edit_plan.get("section_priorities", [])) if isinstance(edit_plan, dict) else []
    applied = [x for x in classified_changes if bool(x.get("auto_apply"))]
    pending = [x for x in classified_changes if not bool(x.get("auto_apply"))]
    return {
        "headline": f"Tailored for {role}",
        "overview": {
            "applied_auto_count": len(applied),
            "pending_review_count": len(pending),
            "highlights": list(verified_keywords or [])[:6],
            "gaps": list(target_gap_keywords or [])[:6],
        },
        "role_signals": role_signals[:6],
        "resume_evidence_used": resume_evidence_used[:6],
        "section_priorities": section_priorities[:4],
        "changes_made": [
            {
                "section": str(x.get("section") or ""),
                "change_type": str(x.get("change_type") or ""),
                "reason": str(x.get("reason") or ""),
                "risk_level": str(x.get("risk_level") or "medium"),
            }
            for x in classified_changes[:10]
        ],
        "safety_notes": list(warnings or [])[:5],
    }
