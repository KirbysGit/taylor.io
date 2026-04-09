from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List

from ..shared.text_utils import safe_float


def extract_skill_names_from_resume(resume_data: Dict[str, Any]) -> List[str]:
    out: List[str] = []
    skills = resume_data.get("skills")
    if not isinstance(skills, list):
        return out
    lowered = set()
    for item in skills:
        if isinstance(item, dict):
            name = str(item.get("name") or "").strip()
        else:
            name = str(item or "").strip()
        key = name.lower()
        if name and key not in lowered:
            lowered.add(key)
            out.append(name)
    return out


def is_skills_topn_safe(after_skills: List[str], available_skills: List[str]) -> bool:
    if not after_skills:
        return False
    allowed = {str(x).strip().lower() for x in available_skills if str(x).strip()}
    if not allowed:
        return False
    for skill in after_skills:
        if str(skill).strip().lower() not in allowed:
            return False
    return True


def build_fallback_section_optimizations(
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
                    "jd_alignment_score": safe_float(row.get("jd_alignment_score")),
                    "evidence_strength_score": safe_float(row.get("evidence_strength_score")),
                    "risk_score": safe_float(row.get("risk_score")),
                    "overall_priority": safe_float(row.get("overall_priority")),
                }
            )

    skills_before = extract_skill_names_from_resume(resume_data)
    skills_after = list(dict.fromkeys(section_scoring.get("skills_candidates", [])))[:8] or skills_before[:8]
    if skills_before:
        fallback["skills"] = {
            "mode": "reorder_verified_front",
            "before": skills_before,
            "after": skills_after,
            "reason": "Top-N verified and aligned skills.",
            "confidence": 0.7,
        }
    return fallback


def build_patch_from_section_optimizations(section_optimizations: Dict[str, Any]) -> Dict[str, Any]:
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
            patch["skills"]["reorder_front"] = [str(x).strip() for x in after if str(x).strip()]
    return patch


def apply_patch_to_resume_data(resume_data: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
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

    skills_reorder = patch.get("skills", {}).get("reorder_front") if isinstance(patch.get("skills"), dict) else None
    if isinstance(skills_reorder, list) and skills_reorder:
        existing_skills = extract_skill_names_from_resume(out)
        ordered_top = [str(x).strip() for x in skills_reorder if str(x).strip()]
        ordered_top_lower = {x.lower() for x in ordered_top}
        remaining = [x for x in existing_skills if x.strip().lower() not in ordered_top_lower]
        out["skills"] = ordered_top + remaining
    return out
