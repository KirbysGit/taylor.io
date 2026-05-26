from __future__ import annotations

import copy
import json
import math
import os
import re

from .preferences import build_tailor_preferences_block, preference_guidance
from .system_prompts import PASS_A_SYSTEM, PASS_B_SYSTEM

# When `TAILOR_AB_EXPERIMENT` is truthy, this block is appended to the Stage A user prompt (A/B vs baseline).
# Focus: direct JD-shaped retarget of experience + project bullets; keep empty to match baseline tokens.
TAILOR_AB_EXPERIMENT_APPEND = """
A/B — direct bullet retarget (hero experience + hero projects)
- For every `edits.experience` and `edits.projects` row you return: rewrite the **entire** description/bullet block as a **direct retarget to this job**—reorder and re-lead so the first bullets foreground what the JD and narrative reward; keep only facts and stack already true on that row. Not synonym polish, not the same lead with mild edits.
- Same underlying data; **new angle for this posting** in structure and emphasis. If a skim could mistake it for the old text lightly tweaked, it is not done. Skills are handled in a separate pass.
"""


def tailor_ab_experiment_enabled():
    v = (os.getenv("TAILOR_AB_EXPERIMENT") or "").strip().lower()
    return v in ("1", "true", "yes", "on")


def skillsFitSignals(mergedResume, tailorContext, jobDescription):
    """Cheap checklist for pass B: category↔JD overlap, how many groupings, no LLM."""
    tc = tailorContext if isinstance(tailorContext, dict) else {}
    jd_raw = (jobDescription or "") if isinstance(jobDescription, str) else ""
    jd = jd_raw.lower()
    rows = (mergedResume or {}).get("skills") if isinstance(mergedResume, dict) else None
    if not isinstance(rows, list):
        rows = []
    categories = []
    for r in rows:
        if not isinstance(r, dict):
            continue
        c = (r.get("category") or "").strip()
        if c and c not in categories:
            categories.append(c)
    n_cat = len(categories)
    hits = 0
    for c in categories:
        ok = False
        for t in c.lower().replace("/", " ").split():
            t = t.strip(".,;:")
            if len(t) >= 3 and t in jd:
                ok = True
                break
        if ok:
            hits += 1
    if n_cat == 0:
        fit = "no_categories"
    elif hits == 0:
        fit = "low"
    elif hits >= max(1, n_cat * 0.4):
        fit = "high"
    else:
        fit = "medium"
    jdp = top_keyword_terms(tc.get("keywords") or [], limit=12)
    return {
        "skillRowCount": len([x for x in rows if isinstance(x, dict)]),
        "distinctCategoryCount": n_cat,
        "categoryNames": categories,
        "categoryLabelOverlapWithJd": fit,
        "categoriesWithAJdHit": hits,
        "jdPriorityTerms": jdp,
        # Category *labels* (e.g. Languages, Frameworks) often share no words with the JD; row *names* (Python, React) still fit. Prevents over-trimming stack rows when fit reads "low."
        "note": "Scores category labels vs JD—not resume skill strings. Prefer **`resumeWideSkillEvidence`** + **`peripheralSkillEvidence`** in the user bundle for survival confidence. Low/medium fit is **not** a signal to strip stack rows.",
    }


def top_keyword_terms(keywords, limit=8):
    out = []
    seen = set()
    for entry in keywords or []:
        if not isinstance(entry, dict):
            continue
        t = str(entry.get("term") or "").strip()
        if not t:
            continue
        key = t.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(t)
        if len(out) >= limit:
            break
    return out


def secondary_terms(activeDomains, keywords, primarySet, limit=6):
    secondary = []
    for d in activeDomains or []:
        if isinstance(d, str) and d.strip():
            secondary.append(d.strip())
        if len(secondary) >= limit:
            return secondary[:limit]
    primaryLower = {x.lower() for x in primarySet}
    for entry in keywords or []:
        if len(secondary) >= limit:
            break
        if not isinstance(entry, dict):
            continue
        t = str(entry.get("term") or "").strip()
        if not t or t.lower() in primaryLower:
            continue
        if t.lower() in {x.lower() for x in secondary}:
            continue
        secondary.append(t)
    return secondary[:limit]


def experience_stack_hint(row):
    s = row.get("skills") if isinstance(row, dict) else None
    if isinstance(s, str) and s.strip():
        parts = [p.strip() for p in s.replace(";", ",").split(",") if p.strip()]
        return ", ".join(parts[:6]) if parts else ""
    return ""


def project_stack_hint(row):
    if not isinstance(row, dict):
        return ""
    ts = row.get("tech_stack")
    if isinstance(ts, list):
        parts = [str(x).strip() for x in ts if str(x).strip()]
        return ", ".join(parts[:8]) if parts else ""
    return ""


def best_evidence_labels(resumeData, rowsPerSectionRanked):
    labels = []
    if not isinstance(resumeData, dict):
        return labels
    experience = resumeData.get("experience", [])
    projects = resumeData.get("projects", [])
    idExp = {r.get("id"): r for r in experience if isinstance(r, dict)}
    idProj = {r.get("id"): r for r in projects if isinstance(r, dict)}

    for row in (rowsPerSectionRanked.get("experience") or [])[:4]:
        rid = row.get("id")
        r = idExp.get(rid, {})
        company = str(r.get("company") or "").strip()
        title = str(r.get("title") or "").strip()
        hint = experience_stack_hint(r)
        if company and title:
            labels.append(f"{company} — {title} ({hint})" if hint else f"{company} — {title}")
        elif company:
            labels.append(f"{company} ({hint})" if hint else company)
        elif title:
            labels.append(f"{title} ({hint})" if hint else title)

    for row in (rowsPerSectionRanked.get("projects") or [])[:3]:
        rid = row.get("id")
        r = idProj.get(rid, {})
        t = str(r.get("title") or "").strip()
        hint = project_stack_hint(r)
        if t:
            labels.append(f"{t} ({hint})" if hint else t)

    return labels


def real_gaps_line(resumeGaps, maxTerms=14):
    if not isinstance(resumeGaps, list) or not resumeGaps:
        return "None flagged from JD keyword scan (still verify fit manually)."
    terms = []
    for g in resumeGaps:
        if isinstance(g, str) and g.strip():
            terms.append(g.strip())
        if len(terms) >= maxTerms:
            break
    return ", ".join(terms) if terms else "None flagged from JD keyword scan."


def _narrative_id_list(nb: dict, key: str) -> list:
    """Stable int ids from narrative brief lists (heroExperience, heroProjects, etc.)."""
    v = nb.get(key) if isinstance(nb, dict) else None
    if not isinstance(v, list):
        return []
    out = []
    for x in v:
        if isinstance(x, int):
            out.append(x)
        elif isinstance(x, float) and x == int(x):
            out.append(int(x))
        elif isinstance(x, str) and x.strip().lstrip("-").isdigit():
            out.append(int(x.strip()))
    return out


def _rows_with_ids(rows, ids):
    """Return full row dicts for ids in resume section order; skip unknown ids."""
    if not isinstance(rows, list) or not ids:
        return []
    id_order = []
    seen = set()
    for i in ids:
        if i not in seen:
            seen.add(i)
            id_order.append(i)
    by_id = {}
    for r in rows:
        if not isinstance(r, dict):
            continue
        rid = r.get("id")
        if isinstance(rid, float) and rid == int(rid):
            rid = int(rid)
        if isinstance(rid, int):
            by_id[rid] = r
    out = []
    for i in id_order:
        r = by_id.get(i)
        if r is not None:
            out.append(r)
    return out


def _supporting_projects_slim(proj_rows, support_proj_ids):
    """id + title + tech_stack only—stage A must not edit these; full rows add noise."""
    slim = []
    for r in _rows_with_ids(proj_rows, support_proj_ids):
        if not isinstance(r, dict):
            continue
        rid = _row_id_int(r)
        if rid is None:
            continue
        slim.append({"id": rid, "title": r.get("title"), "tech_stack": r.get("tech_stack")})
    return slim


def _row_fact_anchor_experience(row: dict) -> str:
    """Single evidence string for this job row: what may be *named* in rewrites of this row (plus generic role phrasing)."""
    if not isinstance(row, dict):
        return ""
    parts = []
    for key in ("company", "title", "location", "skills"):
        v = row.get(key)
        if isinstance(v, str) and v.strip():
            parts.append(v.strip())
    d = row.get("description")
    if isinstance(d, str) and d.strip():
        parts.append(d.strip())
    return "\n".join(parts)


def _row_fact_anchor_project(row: dict) -> str:
    if not isinstance(row, dict):
        return ""
    parts = []
    t = row.get("title")
    if isinstance(t, str) and t.strip():
        parts.append(t.strip())
    ts = row.get("tech_stack")
    if isinstance(ts, list):
        join = " ".join(str(x).strip() for x in ts if str(x).strip())
        if join:
            parts.append(join)
    elif isinstance(ts, str) and ts.strip():
        parts.append(ts.strip())
    d = row.get("description")
    if isinstance(d, str) and d.strip():
        parts.append(d.strip())
    return "\n".join(parts)


def _row_prose_only_project(row: dict) -> str:
    """Title + description only—use to judge bullet-level tool names; tech_stack can be wrong and is corrected separately."""
    if not isinstance(row, dict):
        return ""
    parts = []
    t = row.get("title")
    if isinstance(t, str) and t.strip():
        parts.append(t.strip())
    d = row.get("description")
    if isinstance(d, str) and d.strip():
        parts.append(d.strip())
    return "\n".join(parts)


def _skill_name_vocabulary(skills_rows) -> list:
    out = []
    if not isinstance(skills_rows, list):
        return out
    seen = set()
    for r in skills_rows:
        if not isinstance(r, dict):
            continue
        n = r.get("name")
        if not isinstance(n, str) or not n.strip():
            continue
        k = n.strip().lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(n.strip())
        if len(out) >= 100:
            break
    return out


def compact_narrative_for_prompt(narrative_brief: dict | None) -> dict:
    """Small downstream contract: target story + action ids, without dumping legacy narrative noise."""
    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    target_story = nb.get("targetStory") if isinstance(nb.get("targetStory"), dict) else {}
    if not target_story:
        target_story = {
            "roleLane": nb.get("candidateAngle") or "",
            "readerTakeaway": nb.get("summaryGoal") or "",
            "proofExperienceIds": _narrative_id_list(nb, "rewriteExperience") or _narrative_id_list(nb, "heroExperience"),
            "proofProjectIds": _narrative_id_list(nb, "rewriteProjects") or _narrative_id_list(nb, "heroProjects"),
            "deEmphasizeExperienceIds": _narrative_id_list(nb, "dropExperience"),
            "deEmphasizeProjectIds": _narrative_id_list(nb, "dropProjects"),
            "evidenceThemes": list(nb.get("primaryStory") or [])[:4],
        }
    return {
        "alignmentMode": nb.get("alignmentMode") or "",
        "alignmentGuidance": nb.get("alignmentGuidance") or "",
        "targetStory": copy.deepcopy(target_story),
        "summaryGoal": nb.get("summaryGoal") or "",
        "summaryDecision": copy.deepcopy(nb.get("summaryDecision") or {}),
        "rewriteGoals": list(nb.get("rewriteGoals") or [])[:6],
        "skillsStrategy": list(nb.get("skillsStrategy") or [])[:6],
        "categoryStrategy": list(nb.get("categoryStrategy") or [])[:3],
        "sectionStrategy": copy.deepcopy(nb.get("sectionStrategy") or {}),
        "layout": {
            "strategy": list(nb.get("layoutStrategy") or [])[:4],
            "sectionOrder": list(nb.get("layoutSectionOrder") or []),
            "sectionVisibility": copy.deepcopy(nb.get("layoutSectionVisibility") or {}),
            "rationale": list(nb.get("layoutRationale") or [])[:4],
        },
        "selection": {
            "keepExperience": _narrative_id_list(nb, "keepExperience"),
            "dropExperience": _narrative_id_list(nb, "dropExperience"),
            "rewriteExperience": _narrative_id_list(nb, "rewriteExperience"),
            "keepProjects": _narrative_id_list(nb, "keepProjects"),
            "dropProjects": _narrative_id_list(nb, "dropProjects"),
            "rewriteProjects": _narrative_id_list(nb, "rewriteProjects"),
            "repairProjects": _narrative_id_list(nb, "repairProjects"),
        },
        "directEvidence": list(nb.get("directEvidence") or [])[:6],
        "transferableEvidence": list(nb.get("transferableEvidence") or [])[:8],
        "evidenceClassification": list(nb.get("evidenceClassification") or [])[:8],
        "jdSignalIntent": list(nb.get("jdSignalIntent") or [])[:10],
        "gapSupport": list(nb.get("gapSupport") or [])[:10],
        "unsupportedTerms": list(nb.get("unsupportedTerms") or [])[:8],
        "fitRisk": copy.deepcopy(nb.get("fitRisk") or {}),
        "avoid": list(nb.get("avoid") or [])[:4],
    }


def _experience_evidence_label(row):
    # --- Compact label where a skill name matched an experience blob. --- #
    if not isinstance(row, dict):
        return "experience"
    company = str(row.get("company") or "").strip()
    title = str(row.get("title") or "").strip()
    if company and title:
        return f"{company[:40]} — {title[:52]}"
    return (company or title or "experience")[:90]


def _experience_text_lower(row):
    if not isinstance(row, dict):
        return ""
    parts = []
    for k in ("title", "company", "location", "skills", "description"):
        v = row.get(k)
        if isinstance(v, str) and v.strip():
            parts.append(v.strip())
    return "\n".join(parts).lower()


def _project_text_lower(row):
    if not isinstance(row, dict):
        return ""
    parts = []
    t = row.get("title")
    if isinstance(t, str) and t.strip():
        parts.append(t.strip())
    ts = row.get("tech_stack")
    if isinstance(ts, list):
        parts.append(" ".join(str(x).strip() for x in ts if str(x).strip()))
    elif isinstance(ts, str) and ts.strip():
        parts.append(ts.strip())
    d = row.get("description")
    if isinstance(d, str) and d.strip():
        parts.append(d.strip())
    return "\n".join(parts).lower()


def build_resume_wide_skill_evidence(resume_data, max_labels_per_skill=4, max_skill_names=70):
    # --- Map each resume skill line → short anchor labels wherever that string appears across exp/projects/summary. --- #
    rd = resume_data if isinstance(resume_data, dict) else {}
    skills_rows = rd.get("skills") if isinstance(rd.get("skills"), list) else []
    names = []
    seen_lower = set()
    for r in skills_rows:
        if not isinstance(r, dict):
            continue
        n = r.get("name")
        if not isinstance(n, str) or not n.strip():
            continue
        k = n.strip().lower()
        if k in seen_lower:
            continue
        seen_lower.add(k)
        names.append(n.strip())
        if len(names) >= max_skill_names:
            break

    blobs = []
    for exp in rd.get("experience") or []:
        if isinstance(exp, dict):
            blobs.append((_experience_text_lower(exp), _experience_evidence_label(exp)))
    for proj in rd.get("projects") or []:
        if isinstance(proj, dict):
            title = str(proj.get("title") or "Project").strip()[:90]
            blobs.append((_project_text_lower(proj), title))
    sm = rd.get("summary")
    if isinstance(sm, dict):
        st = sm.get("summary")
        if isinstance(st, str) and st.strip():
            blobs.append((st.lower(), "summary"))

    out = {}
    for name in names:
        needle = name.lower().strip()
        if len(needle) < 2:
            continue
        hits = []
        hit_labels = set()
        for blob, label in blobs:
            if needle not in blob:
                continue
            if label not in hit_labels:
                hit_labels.add(label)
                hits.append(label[:130])
            if len(hits) >= max_labels_per_skill:
                break
        if hits:
            out[name] = hits
    return out


def build_peripheral_skill_evidence(resume_data, peripheral_ids):
    # --- Peripheral projects carry stack + prose snippets so semi-hits are defensible beyond hero rows. --- #
    rd = resume_data if isinstance(resume_data, dict) else {}
    proj_rows = rd.get("projects") if isinstance(rd.get("projects"), list) else []
    by_id = {}
    for r in proj_rows:
        if not isinstance(r, dict):
            continue
        rid = r.get("id")
        if isinstance(rid, float) and rid == int(rid):
            rid = int(rid)
        if isinstance(rid, int):
            by_id[rid] = r
    out = []
    for pid in peripheral_ids or []:
        if isinstance(pid, float) and pid == int(pid):
            pid = int(pid)
        if not isinstance(pid, int):
            continue
        row = by_id.get(pid)
        if not isinstance(row, dict):
            continue
        title = str(row.get("title") or "").strip()[:120]
        ts = row.get("tech_stack")
        supported = []
        if isinstance(ts, list):
            for x in ts:
                if isinstance(x, str) and x.strip():
                    supported.append(x.strip()[:80])
        elif isinstance(ts, str) and ts.strip():
            supported = [ts.strip()[:120]]
        d = row.get("description")
        evidence_text = ""
        if isinstance(d, str) and d.strip():
            evidence_text = " ".join(d.strip().split())[:280]
        out.append(
            {
                "projectId": pid,
                "title": title or f"project {pid}",
                "skillsSupported": supported[:16],
                "evidenceText": evidence_text,
            }
        )
    return out


STABLE_SKILL_CATEGORY_LABELS = {
    "languages",
    "programming languages",
    "frameworks",
    "libraries",
    "frameworks & libraries",
    "frameworks and libraries",
    "data tools",
    "databases",
    "cloud",
    "cloud platforms",
    "tools",
    "platforms",
    "certifications",
}

FLEXIBLE_SKILL_CATEGORY_FRAGMENTS = (
    "focus",
    "strength",
    "competenc",
    "area",
    "professional skill",
    "core skill",
    "soft skill",
    "additional",
    "other",
)


def _skill_category_kind(category):
    label = str(category or "").strip()
    low = label.lower()
    if not low:
        return "uncategorized"
    if low in STABLE_SKILL_CATEGORY_LABELS:
        return "stable"
    if any(fragment in low for fragment in FLEXIBLE_SKILL_CATEGORY_FRAGMENTS):
        return "flexible"
    return "stable"


def build_skill_category_policy(skills_rows):
    rows = skills_rows if isinstance(skills_rows, list) else []
    by_category = {}
    row_rename_allowed = []
    row_rename_conservative = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        rid = _row_id_int(row)
        category = str(row.get("category") or "").strip() or "Uncategorized"
        entry = by_category.setdefault(category, {"category": category, "rowIds": [], "kind": _skill_category_kind(category)})
        if isinstance(rid, int):
            entry["rowIds"].append(rid)
            if entry["kind"] == "flexible":
                row_rename_allowed.append(rid)
            elif entry["kind"] == "stable":
                row_rename_conservative.append(rid)

    stable = []
    flexible = []
    for entry in by_category.values():
        shaped = {
            "category": entry["category"],
            "rowIds": entry["rowIds"],
            "policy": (
                "label may be renamed/regrouped if evidence-backed; row names may become role-shaped strengths without inventing new facts"
                if entry["kind"] == "flexible"
                else "preserve category label unless duplicate or clearly wrong; primarily reorder rows"
            ),
        }
        if entry["kind"] == "flexible":
            flexible.append(shaped)
        elif entry["kind"] == "stable":
            stable.append(shaped)

    return {
        "stableCategories": stable,
        "flexibleCategories": flexible,
        "categoryRenameAllowed": [x["category"] for x in flexible],
        "rowRenameAllowedIds": row_rename_allowed,
        "rowRenameConservativeIds": row_rename_conservative,
        "note": "Stable buckets carry concrete tools; flexible buckets carry positioning language. If no flexibleCategories exist, do not invent one.",
    }


# --- Pass A: max extra project rows we open for thin-placeholder bullet repair (supporting/peripheral). --- #
THIN_BULLET_PROJECT_MAX_ADD = 2
PASS_A_MAX_PROJECT_EDIT_IDS = 6


def _norm_project_id(row):
    if not isinstance(row, dict):
        return None
    rid = row.get("id")
    if isinstance(rid, float) and rid == int(rid):
        return int(rid)
    return rid if isinstance(rid, int) else None


def _split_project_description_bullets(desc):
    if not isinstance(desc, str) or not desc.strip():
        return []
    lines = []
    for raw in re.split(r"[\n\r]+", desc):
        ln = raw.strip()
        if not ln:
            continue
        ln = re.sub(r"^[\-\*\u2022\u25cf\u25cb\d]+[\.\)\s]*", "", ln).strip()
        if ln:
            lines.append(ln)
    return lines


_thin_placeholder_re = re.compile(
    r"(?i)\b(built\s+stuff|did\s+stuff|made\s+stuff|worked\s+on\s+stuff|various\s+stuff|just\s+stuff|"
    r"learned\s+a\s+lot|made\s+things|did\s+things|worked\s+on\s+things|etc\.?|"
    r"different\s+things|some\s+stuff|and\s+stuff|n\s+stuff|and\s+things|"
    r"made\s+it\s+\w+\s+(?:and|n)\s+stuff|made\s+it\s+\w+\s+(?:and|n)\s+things)\b|"
    r"^stuff\.?$|^things\.?$"
)


def _project_row_has_thin_bullets(row):
    # --- Supporting/peripheral rows with empty or meme bullets still need Stage A quality pass. --- #
    if not isinstance(row, dict):
        return False
    desc = row.get("description")
    if not isinstance(desc, str):
        return not desc
    t = desc.strip()
    if not t:
        return True
    if len(t) < 42:
        return True
    bullets = _split_project_description_bullets(t)
    if not bullets:
        return len(t) < 130
    for b in bullets:
        bw = len(b.split())
        if _thin_placeholder_re.search(b):
            return True
        if len(b.strip()) < 16:
            return True
        if bw <= 4 and len(b) < 45:
            return True
    if len(bullets) == 1 and len(t) < 90:
        return True
    return False


def _thin_bullet_project_repair_candidates(proj_rows, hero_proj_ids, support_proj_ids, peripheral_proj_ids, max_add):
    """Pick non-hero projects with visibly weak bullets — opened for rewrite like heroes, capped."""
    hero = set()
    for x in hero_proj_ids or []:
        if isinstance(x, float) and x == int(x):
            x = int(x)
        if isinstance(x, int):
            hero.add(x)
    by_id = {}
    order = []
    for r in proj_rows or []:
        if not isinstance(r, dict):
            continue
        rid = _norm_project_id(r)
        if rid is None:
            continue
        by_id[rid] = r
        order.append(rid)
    prioritized = []
    for pid in support_proj_ids or []:
        if isinstance(pid, float) and pid == int(pid):
            pid = int(pid)
        if isinstance(pid, int) and pid not in prioritized:
            prioritized.append(pid)
    for pid in peripheral_proj_ids or []:
        if isinstance(pid, float) and pid == int(pid):
            pid = int(pid)
        if isinstance(pid, int) and pid not in prioritized:
            prioritized.append(pid)
    for rid in order:
        if rid not in prioritized:
            prioritized.append(rid)

    picks = []
    for rid in prioritized:
        if rid in hero or rid in picks:
            continue
        row = by_id.get(rid)
        if row is None:
            continue
        if _project_row_has_thin_bullets(row):
            picks.append(rid)
        if len(picks) >= max_add:
            break
    return picks


def project_quality_repair_ids_for_narrative(
    resume_data,
    narrative_brief,
    style_preferences=None,
    max_add=THIN_BULLET_PROJECT_MAX_ADD,
):
    """
    Deterministically open non-hero projects that contain placeholder/thin bullets.

    This is intentionally role-agnostic: if a row survives as kept/maybe/peripheral
    content, bad resume writing should be cleaned up even when the row is not a
    top JD-fit hero.
    """
    rd = resume_data if isinstance(resume_data, dict) else {}
    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    proj_rows = rd.get("projects") if isinstance(rd.get("projects"), list) else []
    hero_proj_ids = _narrative_id_list(nb, "heroProjects")
    rewrite_proj_ids = _narrative_id_list(nb, "rewriteProjects") or hero_proj_ids
    repair_proj_ids = _narrative_id_list(nb, "repairProjects")
    keep_proj_ids = _narrative_id_list(nb, "keepProjects")
    support_proj_ids = _narrative_id_list(nb, "supportingProjects")
    peripheral_proj_ids = _narrative_id_list(nb, "peripheralProjects")
    maybe_proj_ids = _narrative_id_list(nb, "maybeProjects")
    drop_proj_ids = set(_narrative_id_list(nb, "dropProjects"))
    prefs = style_preferences if isinstance(style_preferences, dict) else {}
    if prefs.get("length_target") == "one_page":
        action_keep = set(_narrative_id_list(nb, "keepProjects")) | set(rewrite_proj_ids) | set(repair_proj_ids) | set(hero_proj_ids)
        for mid in maybe_proj_ids:
            if mid not in action_keep:
                drop_proj_ids.add(mid)

    candidate_ids = []
    for source in (keep_proj_ids, support_proj_ids, repair_proj_ids, peripheral_proj_ids, maybe_proj_ids):
        for pid in source or []:
            if isinstance(pid, float) and pid == int(pid):
                pid = int(pid)
            if isinstance(pid, int) and pid not in candidate_ids:
                candidate_ids.append(pid)

    picks = _thin_bullet_project_repair_candidates(
        proj_rows,
        rewrite_proj_ids or hero_proj_ids,
        candidate_ids,
        [],
        max_add,
    )
    return [pid for pid in picks if pid not in drop_proj_ids]


def project_quality_repair_debug(resume_data, narrative_brief, style_preferences=None):
    ids = project_quality_repair_ids_for_narrative(resume_data, narrative_brief, style_preferences)
    titles = {}
    for row in (resume_data or {}).get("projects") or []:
        if not isinstance(row, dict):
            continue
        rid = _norm_project_id(row)
        if isinstance(rid, int):
            titles[rid] = str(row.get("title") or f"Project {rid}").strip() or f"Project {rid}"
    return {
        "weakBulletRepair": bool(ids),
        "repairProjectIds": ids,
        "repairProjectTitles": [titles.get(pid, f"Project {pid}") for pid in ids],
        "reason": (
            "Opened surviving project row(s) for cleanup because they contain placeholder or thin bullets."
            if ids
            else "No surviving project rows needed placeholder-bullet cleanup."
        ),
    }


def pass_b_deletion_budget(n_skill_rows):
    # --- Soft caps surfaced in Prompt B — keeps pruning visibly rare vs row count. --- #
    try:
        n = int(float(n_skill_rows))
    except (TypeError, ValueError):
        n = 0
    if n <= 0:
        return {
            "skillsRowCount": 0,
            "minSurvivorsTarget": 0,
            "maxOmissionsBudget": 0,
            "note": "No skill rows.",
        }
    if n >= 20:
        min_pct = 0.75
    elif n >= 12:
        min_pct = 0.82
    else:
        min_pct = 0.88
    min_survivors_target = max(1, int(math.ceil(min_pct * n)))
    raw_omit = n - min_survivors_target
    max_omit = min(5, max(0, raw_omit))
    if n < 14:
        max_omit = min(max_omit, 3)
    floor_survivors = max(min_survivors_target, n - max_omit)
    return {
        "skillsRowCount": n,
        "minSurvivorsTarget": floor_survivors,
        "maxOmissionsBudget": max_omit,
        "note": "Rare pruning: stay within maxOmissionsBudget unless duplicate or avoid removes more; prefer demotion.",
    }


def build_stage_a_rewrite_focus(resume_data: dict, narrative_brief: dict | None, style_preferences: dict | None = None) -> dict:
    """
    Slim JSON placed first in the stage-A user prompt: the rows the model should actually rewrite.
    Full resume still appended later as a truth anchor.
    """
    rd = resume_data if isinstance(resume_data, dict) else {}
    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    hero_exp_ids = _narrative_id_list(nb, "heroExperience")
    hero_proj_ids = _narrative_id_list(nb, "heroProjects")
    rewrite_exp_ids = _narrative_id_list(nb, "rewriteExperience") or hero_exp_ids
    rewrite_proj_ids = _narrative_id_list(nb, "rewriteProjects") or hero_proj_ids
    repair_proj_ids = _narrative_id_list(nb, "repairProjects")
    drop_exp_ids = _narrative_id_list(nb, "dropExperience")
    drop_proj_ids = _narrative_id_list(nb, "dropProjects")
    keep_exp_ids = _narrative_id_list(nb, "keepExperience")
    keep_proj_ids = _narrative_id_list(nb, "keepProjects")
    maybe_proj_ids = _narrative_id_list(nb, "maybeProjects")
    support_proj_ids = _narrative_id_list(nb, "supportingProjects")
    peripheral_proj_ids = _narrative_id_list(nb, "peripheralProjects")

    prefs = style_preferences if isinstance(style_preferences, dict) else {}
    if prefs.get("length_target") == "one_page":
        action_keep = set(keep_proj_ids) | set(rewrite_proj_ids) | set(repair_proj_ids) | set(hero_proj_ids)
        for mid in maybe_proj_ids:
            if mid not in action_keep and mid not in drop_proj_ids:
                drop_proj_ids.append(mid)

    exp_rows = rd.get("experience") if isinstance(rd.get("experience"), list) else []
    proj_rows = rd.get("projects") if isinstance(rd.get("projects"), list) else []
    skills_rows = rd.get("skills") if isinstance(rd.get("skills"), list) else []
    rewrite_exp_ids = [i for i in rewrite_exp_ids if i not in drop_exp_ids]

    summary_block = rd.get("summary") if isinstance(rd.get("summary"), dict) else {}

    thin_repairs = project_quality_repair_ids_for_narrative(
        rd,
        nb,
        prefs,
        THIN_BULLET_PROJECT_MAX_ADD,
    )
    allowed_proj_ids = []
    seen_proj = set()
    for hid in rewrite_proj_ids:
        if isinstance(hid, float) and hid == int(hid):
            hid = int(hid)
        if not isinstance(hid, int) or hid in seen_proj:
            continue
        if hid in drop_proj_ids:
            continue
        seen_proj.add(hid)
        allowed_proj_ids.append(hid)
    for rid in repair_proj_ids:
        if len(allowed_proj_ids) >= PASS_A_MAX_PROJECT_EDIT_IDS:
            break
        if not isinstance(rid, int) or rid in seen_proj or rid in drop_proj_ids:
            continue
        seen_proj.add(rid)
        allowed_proj_ids.append(rid)
    for tid in thin_repairs:
        if len(allowed_proj_ids) >= PASS_A_MAX_PROJECT_EDIT_IDS:
            break
        if tid in seen_proj or tid in drop_proj_ids:
            continue
        seen_proj.add(tid)
        allowed_proj_ids.append(tid)
    narrative_hero_set = set()
    for h in hero_proj_ids:
        if isinstance(h, float) and h == int(h):
            h = int(h)
        if isinstance(h, int):
            narrative_hero_set.add(h)
    thin_only = [x for x in allowed_proj_ids if x not in narrative_hero_set]

    hero_exp_filled = []
    for r in _rows_with_ids(exp_rows, rewrite_exp_ids):
        if not isinstance(r, dict):
            continue
        row = copy.deepcopy(r)
        row["rowFactAnchor"] = _row_fact_anchor_experience(r)
        hero_exp_filled.append(row)

    hero_proj_filled = []
    for r in _rows_with_ids(proj_rows, allowed_proj_ids):
        if not isinstance(r, dict):
            continue
        row = copy.deepcopy(r)
        row["rowFactAnchor"] = _row_fact_anchor_project(r)
        row["rowProseOnly"] = _row_prose_only_project(r)
        hero_proj_filled.append(row)

    return {
        "allowedExperienceEditIds": rewrite_exp_ids,
        "legacyHeroExperienceIds": hero_exp_ids,
        "allowedExperienceRewriteIds": rewrite_exp_ids,
        "dropExperienceIds": drop_exp_ids,
        "keepExperienceIds": keep_exp_ids,
        "allowedProjectEditIds": allowed_proj_ids,
        "dropProjectIds": drop_proj_ids,
        "keepProjectIds": keep_proj_ids,
        "maybeProjectIds": maybe_proj_ids,
        "narrativeHeroProjectIds": hero_proj_ids,
        "narrativeRewriteProjectIds": rewrite_proj_ids,
        "thinBulletRepairProjectIds": thin_only,
        "supportingProjectIds": support_proj_ids,
        "summarySection": copy.deepcopy(summary_block),
        "resumeSkillVocabulary": _skill_name_vocabulary(skills_rows),
        "heroExperienceRows": hero_exp_filled,
        "heroProjectRows": hero_proj_filled,
        "supportingProjectRows_referenceOnly": _supporting_projects_slim(proj_rows, support_proj_ids),
        "skillsRows": copy.deepcopy(skills_rows),
        "layoutPlan": {
            "layoutStrategy": copy.deepcopy(nb.get("layoutStrategy") or []),
            "sectionOrder": copy.deepcopy(nb.get("layoutSectionOrder") or []),
            "sectionVisibility": copy.deepcopy(nb.get("layoutSectionVisibility") or {}),
            "layoutRationale": copy.deepcopy(nb.get("layoutRationale") or []),
            "summaryDecision": copy.deepcopy(nb.get("summaryDecision") or {}),
            "currentSectionOrder": copy.deepcopy(rd.get("sectionOrder") or []),
            "currentSectionVisibility": copy.deepcopy(rd.get("sectionVisibility") or {}),
        },
    }


def _row_id_int(row: dict) -> int | None:
    if not isinstance(row, dict):
        return None
    rid = row.get("id")
    if isinstance(rid, float) and rid == int(rid):
        return int(rid)
    return rid if isinstance(rid, int) else None


def build_resume_truth_anchor_compact(resume_data: dict, narrative_brief: dict | None) -> dict:
    """
    Non-hero resume slices only—reduces “whole resume” dominance. Heroes + supporting appear in rewrite_focus.
    """
    rd = resume_data if isinstance(resume_data, dict) else {}
    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    hero_e = set(_narrative_id_list(nb, "heroExperience"))
    hero_p = set(_narrative_id_list(nb, "heroProjects"))
    sup_p = set(_narrative_id_list(nb, "supportingProjects"))

    exp_rows = rd.get("experience") if isinstance(rd.get("experience"), list) else []
    proj_rows = rd.get("projects") if isinstance(rd.get("projects"), list) else []

    other_exp = []
    for r in exp_rows:
        rid = _row_id_int(r)
        if rid is None or rid in hero_e:
            continue
        if not isinstance(r, dict):
            continue
        slim = {"id": rid}
        for k in ("title", "company", "start_date", "end_date", "location", "current", "skills"):
            v = r.get(k)
            if v is not None and v != "":
                slim[k] = v
        other_exp.append(slim)

    other_proj = []
    for r in proj_rows:
        rid = _row_id_int(r)
        if rid is None or rid in hero_p or rid in sup_p:
            continue
        if not isinstance(r, dict):
            continue
        other_proj.append(
            {
                "id": rid,
                "title": r.get("title"),
                "tech_stack": r.get("tech_stack"),
            }
        )

    return {
        "education": copy.deepcopy(rd.get("education")) if isinstance(rd.get("education"), list) else [],
        "experienceOtherThanHeroes": other_exp,
        "projectsPeripheralOnly": other_proj,
    }


def build_pass_a_system():
    # Pass 1: summary + hero experience + hero projects only. Skills run in a second model call.
    # Full text lives in system_prompts.py for easier review with teammates.
    return PASS_A_SYSTEM


def build_pass_a_user(payload, tailorContext, sectionDetails, relevantJDLines, narrativeBrief=None, ab_experiment=False):
    targetRole = tailorContext.get("targetRole", "")
    companyRaw = payload.get("company")
    company = companyRaw if isinstance(companyRaw, str) else ""
    resumeRaw = payload.get("resume_data")
    resumeData = resumeRaw if isinstance(resumeRaw, dict) else {}
    prefs = preference_guidance(payload.get("style_preferences"))
    prefs_block = build_tailor_preferences_block(prefs)
    roleLabel = (targetRole or "").strip() or "this role"

    nb = narrativeBrief if isinstance(narrativeBrief, dict) else {}
    narrative_json = json.dumps(compact_narrative_for_prompt(nb), ensure_ascii=False, indent=2)
    rewrite_focus = build_stage_a_rewrite_focus(resumeData, nb, payload.get("style_preferences"))
    hero_exp = rewrite_focus.get("allowedExperienceEditIds") or []
    allowed_proj_edit = rewrite_focus.get("allowedProjectEditIds") or []
    thin_repairs = rewrite_focus.get("thinBulletRepairProjectIds") or []
    drop_exp = rewrite_focus.get("dropExperienceIds") or []
    drop_proj = rewrite_focus.get("dropProjectIds") or []
    has_exp = len(hero_exp) > 0
    has_proj = len(allowed_proj_edit) > 0
    sm = resumeData.get("summary") if isinstance(resumeData.get("summary"), dict) else {}
    has_summary_text = bool((sm.get("summary") or "").strip())

    out_shape = {"summarySection": {"summary": "…"}}
    if has_exp:
        out_shape["experience"] = [{"id": 0, "description": "full bullet block"}]
    if has_proj:
        out_shape["projects"] = [
            {
                "id": 0,
                "tech_stack": ["optional: corrected list; align with title+description; drop names only in stale tech_stack"],
                "description": "full bullet block",
            }
        ]
    if drop_exp:
        out_shape["removedExperienceIds"] = drop_exp
    if drop_proj:
        out_shape["removedProjectIds"] = drop_proj
    layout_plan = rewrite_focus.get("layoutPlan") if isinstance(rewrite_focus.get("layoutPlan"), dict) else {}
    if layout_plan.get("sectionOrder"):
        out_shape["sectionOrder"] = layout_plan.get("sectionOrder")
    if layout_plan.get("sectionVisibility"):
        out_shape["sectionVisibility"] = layout_plan.get("sectionVisibility")
    output_contract = {"edits": out_shape}

    tc = tailorContext if isinstance(tailorContext, dict) else {}
    ats_hits = list(tc.get("resumeHits") or [])[:24]
    ats_jd_top = top_keyword_terms(tc.get("keywords") or [], limit=12)
    evidenced_keyword_alignment = {
        "resumeLiteralHits": ats_hits,
        "jdKeywordPriority": ats_jd_top,
    }
    truth_anchor = build_resume_truth_anchor_compact(resumeData, nb)
    strict_truth = bool(payload.get("strict_truth", True))
    alignment_mode = str(nb.get("alignmentMode") or "").strip().lower()

    lines = [
        "## Pass 1 — profile summary and hero rows only (no skills in `edits`)",
        f"Target role: {roleLabel}",
        f"Company (context only): {company or 'Not specified'}",
        prefs_block,
        "Ground every claim in the resume; the JD may **reorder emphasis and phrasing** only.",
        f"strict_truth (from request): {strict_truth}",
        "",
        "### Task",
        "Selection is part of this pass: include `removedExperienceIds` and/or `removedProjectIds` exactly when `dropExperienceIds` / `dropProjectIds` are present in the focused rewrite surface. Do not keep low-fit rows just because they existed in the original resume.",
        "Layout is also part of tailoring, but secondary to content. If `layoutPlan.sectionOrder` or `layoutPlan.sectionVisibility` is populated, include those exact sanitized values in `edits` unless they would hide evidence-bearing sections.",
        "Return **only** `edits` with `summarySection` and/or `experience` and/or `projects` as needed. **Never** put `skills` in `edits` here—pass 2 will handle skills.",
    ]
    if alignment_mode in ("adjacent", "stretch"):
        lines.extend(
            [
                f"Alignment mode is `{alignment_mode}`: this is not a clean direct-fit resume. Bridge from proven evidence to the job; do **not** claim unsupported target-role duties, industries, tools, scheduling ownership, or resource allocation.",
                "Use `evidenceClassification` from the narrative target as claim guidance: lead with `direct_role_evidence`, bridge with `transferable_behavior`, use `domain_tool_evidence` only as supporting context, and avoid making `weak_lexical_overlap` sound like direct experience.",
                "Use `jdSignalIntent` from the narrative target as keyword priority: role responsibilities and candidate requirements should shape leads; company/product context is supporting color unless the resume directly proves that work.",
                "Use `gapSupport`: `conceptual` gaps may support related phrasing, but only `direct` support should sound like exact experience and only `unsupported` terms should become warnings.",
                "Use `fitRisk` as a hard caution layer. If `fitRisk.level` is `extreme`, this is not a normal target-role tailoring pass: keep claims exploratory, avoid target-level titles/seniority ownership, and do not let project/tool evidence substitute for missing leadership or scope.",
                "Set `edits.summarySection` so it opens from the candidate's real background and transferable proof. Avoid saying they already are the target role unless the resume directly proves that title.",
                "For rows, use transferable nouns only when the row supports them: compliance workflow, metrics visibility, automation, coordination, fast-paced communication, reporting, response, or operational dashboards.",
            ]
        )
    else:
        lines.append("Set `edits.summarySection` so the professional summary fits this target role. Use the narrative’s `summaryGoal` / `rewriteGoals` and real evidence on the resume.")
    if not has_summary_text:
        lines.append("If the summary is empty or very thin, add a strong opening that only states what the experience and projects on this resume can support.")
    else:
        lines.append("If a summary already exists, reframe for this role and keep the same factual roots; change focus, not made-up history.")
    if drop_exp:
        lines.append(
            "`dropExperienceIds` are intentional omissions for this tailored draft. Output them as `edits.removedExperienceIds` unless removing them would leave the resume with no credible experience/project evidence."
        )
    if has_exp:
        lines.append("Include `edits.experience`: one row object per `allowedExperienceEditIds`, each with a full `description` bullet block. **Make the retargeting obvious**—re-lead and reorder so this role’s reader sees why the job fits.")
    if has_proj:
        lines.append(
            "Include `edits.projects`: one object per `allowedProjectEditIds`. For each, you may set **`tech_stack`** first (Strings only) so labels match the project’s real work—**remove** names that only appeared in a bloated or wrong `tech_stack` and never in `rowProseOnly` for that id; then set **`description`** to match. **Do not** edit project ids outside `allowedProjectEditIds`. Narrative **heroes** drive role-shaped retargets; **`thinBulletRepairProjectIds`** (if present) are **quality passes** for placeholder/empty bullets on non-hero rows—replace vague lines with concrete, evidence-safe claims from `rowProseOnly` only; full JD retarget is optional there but **no** ghost tools."
        )
    if has_exp or has_proj:
        lines.append(
            "**Rewrite strength requirement:** for every returned experience/project row, change the first bullet and the bullet order or grouping. Reuse true facts and metrics, but do not return synonym-level edits."
        )
    if drop_proj:
        lines.append(
            "`dropProjectIds` are intentional omissions for this tailored draft. Output them as `edits.removedProjectIds`; in one-page mode, remove low-fit/off-lane projects before weakening the strongest evidence for this posting."
        )
    if thin_repairs:
        lines.append(
            "**Thin-bullet repair ids** (non-hero, opened for rewrite): "
            + json.dumps(thin_repairs, ensure_ascii=False)
            + " — treat like hero rows for **description** depth; remove casual placeholder bullets like `n stuff`, `things`, or `etc.` and replace them only with evidence already present in `rowProseOnly`."
        )
    if not has_exp and not has_proj:
        lines.append("There are no hero experience or project rows in this run—`edits` may be summary-only, or empty keys omitted.")
    lines.extend(
        [
            "Prioritize 1–2 `jdKeywordPriority` or `resumeLiteralHits` in hero leads where the resume already evidences them (or reflect the *work type* without inventing a tool name that is not in that row’s `rowFactAnchor`). Avoid generic brochure phrasing in the summary.",
            "Return **only** `{\"edits\":{...}}`. Omit sections you are not changing.",
            "",
            "### Row-local identity (same as system: stay inside each row’s evidence for *names*)",
            "Each `heroExperienceRows` / `heroProjectRows` object includes `rowFactAnchor` (and projects add **`rowProseOnly`**: title + **original** description). **Large, role-shaped `description` edits** are still the goal. For **new proper nouns** in hero **experience** bullets, they must already appear in that row’s `rowFactAnchor`. For **project** rows: if stale `tech_stack` disagrees with `rowProseOnly`, **fix `tech_stack` in the edit** and keep bullet names consistent with `rowProseOnly` and your corrected list—not ghost tools from the old `tech_stack`.",
            "Summary: for named tools, use `resumeSkillVocabulary` plus what appears in the existing summary or hero anchors—do not add a JD stack line as the candidate’s main toolkit unless it’s in that vocabulary/anchors.",
        ]
    )
    lines.append(
        "Project tech stacks are user-provided evidence: preserve truthful differentiating tools by default. Shorten or reorder stack display for fit, but remove a tool only when it is contradicted by the project story or clearly misleading; if bullets mention a tool, keep it in that project stack."
    )
    if strict_truth:
        lines.append(
            "strict_truth is **on**: be strict on **named** stack in hero/project bullets—no new tool names outside that row’s `rowFactAnchor`. For the summary, no new **named** tools outside `resumeSkillVocabulary` or the combined hero anchors + prior summary text."
        )
    else:
        lines.append(
            "strict_truth is **off**: keep the same rule of thumb for **named** tools; you may use slightly **broader generic** labels for the work if the row clearly implies that category, still without adding specific framework names that are not in the anchor."
        )
    lines.extend(
        [
            "",
            "### Narrative target",
        narrative_json,
        "",
            "### Evidenced keyword alignment",
            json.dumps(evidenced_keyword_alignment, ensure_ascii=False, indent=2),
            "",
            "### Focused rewrite surface (allowed edit ids and hero rows; skillsRows is context only for pass 2)",
            json.dumps(rewrite_focus, ensure_ascii=False, indent=2),
            "",
            "### JD excerpts",
        json.dumps(relevantJDLines, ensure_ascii=False, indent=2),
        "",
            "### Compact truth anchor (not editable)",
            json.dumps(truth_anchor, ensure_ascii=False, indent=2),
            "",
            "### Output shape (omit keys you do not use; no `skills`)",
        json.dumps(output_contract, ensure_ascii=False, indent=2),
    ]
    )
    ap = (TAILOR_AB_EXPERIMENT_APPEND or "").strip()
    if ab_experiment and ap:
        lines.extend(["", "### A/B experiment (TAILOR_AB_EXPERIMENT=on)", ap])
    return "\n".join(lines)


def build_pass_b_system():
    return PASS_B_SYSTEM


def build_pass_b_user(payload, tailorContext, relevantJDLines, narrativeBrief, fitSignals):
    companyRaw = payload.get("company")
    company = companyRaw if isinstance(companyRaw, str) else ""
    resumeRaw = payload.get("resume_data")
    resumeData = resumeRaw if isinstance(resumeRaw, dict) else {}
    roleLabel = (tailorContext.get("targetRole", "") or "").strip() or "this role"
    prefs_block = build_tailor_preferences_block(payload.get("style_preferences"))
    prefsOneLine = f"Target role: {roleLabel}. Company: {company or 'Not specified'}."
    tc = tailorContext if isinstance(tailorContext, dict) else {}
    ats_hits = list(tc.get("resumeHits") or [])[:24]
    ats_jd_top = top_keyword_terms(tc.get("keywords") or [], limit=12)
    job_strategy = tc.get("jobStrategy") if isinstance(tc.get("jobStrategy"), dict) else {}
    evidenced_keyword_alignment = {
        "resumeLiteralHits": ats_hits,
        "jdKeywordPriority": ats_jd_top,
    }
    nb = narrativeBrief if isinstance(narrativeBrief, dict) else {}
    narrative_json = json.dumps(compact_narrative_for_prompt(nb), ensure_ascii=False, indent=2)
    alignment_mode = str(nb.get("alignmentMode") or "").strip().lower()
    skills_focus = build_stage_a_rewrite_focus(resumeData, nb, payload.get("style_preferences"))
    n_skill = len([r for r in (skills_focus.get("skillsRows") or []) if isinstance(r, dict)])
    peripheral_ids = _narrative_id_list(nb, "peripheralProjects")
    pass_b_bundle = dict(skills_focus)
    pass_b_bundle["resumeWideSkillEvidence"] = build_resume_wide_skill_evidence(resumeData)
    pass_b_bundle["peripheralSkillEvidence"] = build_peripheral_skill_evidence(resumeData, peripheral_ids)
    pass_b_bundle["skillCategoryPolicy"] = build_skill_category_policy(pass_b_bundle.get("skillsRows") or [])
    pass_b_bundle["deletionBudget"] = pass_b_deletion_budget(n_skill)
    pass_b_bundle["jobStrategySkills"] = {
        "persona": job_strategy.get("persona"),
        "roleArchetype": job_strategy.get("roleArchetype"),
        "preserve": job_strategy.get("skillPreserve") or [],
        "reframeTargets": job_strategy.get("skillReframeTargets") or [],
        "deprioritize": job_strategy.get("skillDeprioritize") or [],
        "summaryGuardrails": job_strategy.get("summaryGuardrails") or [],
        "claimRules": job_strategy.get("claimRules") or [],
        "note": "preserve is for existing hard skills/tools that should survive when present; reframeTargets are flexible Focus Areas-style wording targets that still require resume support.",
    }
    budget = pass_b_bundle["deletionBudget"]
    budget_line = (
        f"**Deletion budget for this resume:** `{budget.get('skillsRowCount')}` skill rows → aim ≥ `{budget.get('minSurvivorsTarget')}` "
        f"survivors; **`maxOmissionsBudget` = `{budget.get('maxOmissionsBudget')}`** absent duplicate/`avoid`. Prefer demotion."
    )
    alignment_line = ""
    if alignment_mode in ("adjacent", "stretch"):
        alignment_line = (
            f"Alignment mode is `{alignment_mode}`: use flexible skill buckets as transfer-positioning space. "
            "Prioritize evidenced bridge strengths, but do not invent target-role skills; demote exact-tool noise before deleting. "
            "If `evidenceClassification` marks a row as `domain_tool_evidence` or `weak_lexical_overlap`, do not promote that wording into a direct role skill. "
            "Use `jdSignalIntent`: role responsibilities and candidate requirements lead; company/product context comes later. "
            "Use `gapSupport` so conceptually supported terms can be reflected in flexible buckets without pretending they were exact resume terms. "
            "If `fitRisk.level` is `extreme`, keep flexible buckets honest and broad; do not rename skills as senior leadership, executive ownership, or people-management evidence unless the resume proves it."
        )
    return "\n".join(
        [
            "## Pass 2 — reorder + recategorize skills (evidence-informed)",
            prefsOneLine,
            prefs_block,
            budget_line,
            alignment_line,
            "**Preserve first:** output **one row per surviving `skillsRows` id** by default. **Semi-hit** rows (resume-evidenced, not JD-top) ⇒ **keep**, order later. **Lead** flows from JD + **`skillsStrategy`** — **not** survivor filters.",
            "Return **`edits.skills`**; optional **`_debugOmitted`** if you omit any id.",
            "Use **`skillCategoryPolicy`** to separate stable tool buckets from flexible positioning buckets. Stable buckets mostly keep their labels; flexible buckets may be renamed or reframed when the JD and resume evidence support it.",
            "Use **`jobStrategySkills`** as the strategy contract: keep existing hard skills/tools that match `preserve`, use `reframeTargets` only for flexible Focus Areas-style wording when resume evidence supports it, demote `deprioritize` before deleting preserved rows, and never invent unsupported hard tools.",
            "",
            "### Fit checklist (category labels vs JD—not per-skill names)",
            json.dumps(fitSignals, ensure_ascii=False, indent=2),
            "",
            "### Narrative brief",
            narrative_json,
            "",
            "### Keyword hints for **order** only (not membership)",
            json.dumps(evidenced_keyword_alignment, ensure_ascii=False, indent=2),
            "",
            "### Structured skill context (read before dropping anything)",
            "Includes **`skillsRows`**, **`resumeWideSkillEvidence`**, **`peripheralSkillEvidence`**, **`skillCategoryPolicy`**, **`jobStrategySkills`**, **`deletionBudget`**, hero/supporting rows.",
            json.dumps(pass_b_bundle, ensure_ascii=False, indent=2),
            "",
            "### JD excerpts",
            json.dumps(relevantJDLines, ensure_ascii=False, indent=2),
            "",
            "### Output contract",
            "Valid **`edits`** with **`skills`** array. Optional **`_debugOmitted`** paired with omissions.",
        ]
    )


def build_prompt(payload, tailorContext, sectionDetails, relevantJDLines, narrativeBrief=None):
    ab = tailor_ab_experiment_enabled()
    return build_pass_a_system(), build_pass_a_user(
        payload,
        tailorContext,
        sectionDetails,
        relevantJDLines,
        narrativeBrief=narrativeBrief,
        ab_experiment=ab,
    )
