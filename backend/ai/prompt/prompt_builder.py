from __future__ import annotations

import copy
import json
import os

from ..post_processing.resume_tailor_report import skills_change_expected_from_context

# When `TAILOR_AB_EXPERIMENT` is truthy, this block is appended to the Stage A user prompt (A/B vs baseline).
# Keep empty for identical token baseline; put your experiment instructions here only for the "on" runs.
TAILOR_AB_EXPERIMENT_APPEND = """
    Experiment override — assertive retargeting (not polish):
    - Treat this as a **full reframe for this exact posting**: the reader should feel the resume was **rebuilt around the role**, not lightly edited.
    - For every allowed hero experience and hero project row, rewrite the **entire** bullet block so **leads, order, and emphasis** change to foreground what this JD rewards. Same facts; **new angle and structure** vs the source. If a paragraph could still read as “the old resume with tweaks,” it is not done.
    - The summary must **open with a role-shaped hook** using concrete shapes from the candidate’s work (tools, systems, data/product surfaces) — avoid generic “builder / impactful / scalable” filler.
    - Do not shrink scope: if a section is in `edits`, the change should be **obvious** on a 10-second skim that this version targets this job.
"""


def tailor_ab_experiment_enabled():
    v = (os.getenv("TAILOR_AB_EXPERIMENT") or "").strip().lower()
    return v in ("1", "true", "yes", "on")


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


def build_stage_a_rewrite_focus(resume_data: dict, narrative_brief: dict | None) -> dict:
    """
    Slim JSON placed first in the stage-A user prompt: the rows the model should actually rewrite.
    Full resume still appended later as a truth anchor.
    """
    rd = resume_data if isinstance(resume_data, dict) else {}
    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    hero_exp_ids = _narrative_id_list(nb, "heroExperience")
    hero_proj_ids = _narrative_id_list(nb, "heroProjects")
    support_proj_ids = _narrative_id_list(nb, "supportingProjects")

    exp_rows = rd.get("experience") if isinstance(rd.get("experience"), list) else []
    proj_rows = rd.get("projects") if isinstance(rd.get("projects"), list) else []
    skills_rows = rd.get("skills") if isinstance(rd.get("skills"), list) else []

    summary_block = rd.get("summary") if isinstance(rd.get("summary"), dict) else {}

    return {
        "allowedExperienceEditIds": hero_exp_ids,
        "allowedProjectEditIds": hero_proj_ids,
        "supportingProjectIds": support_proj_ids,
        "summarySection": copy.deepcopy(summary_block),
        "heroExperienceRows": _rows_with_ids(exp_rows, hero_exp_ids),
        "heroProjectRows": _rows_with_ids(proj_rows, hero_proj_ids),
        "supportingProjectRows_referenceOnly": _supporting_projects_slim(proj_rows, support_proj_ids),
        "skillsRows": copy.deepcopy(skills_rows),
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


def build_system_prompt():
    # Stage A: return only {"edits": ...}; merge + reporting happen downstream.
    return "\n".join(
        [
            "You are a truth-first resume rewriter for one target role. Your edits must be **intentional**: every changed block should read as redesigned for this posting (role language, lead bullets, and keyword placement that the candidate’s facts support)—not a polite polish.",
            "",
            "Stage A only outputs rewrites. Do not explain, justify, warn, summarize, diff, or add commentary. No self-audit.",
            "",
            "Return **only** `{\"edits\": { ... }}` as the JSON object. Exactly one top-level key: `edits`. No `warnings`, no `summary`, no `tailorSummary`, no other top-level keys.",
            "",
            "Edit surface under `edits`:",
            "- `summarySection` — full profile paragraph rewrite.",
            "- `experience` — **only** rows whose `id` appears in `allowedExperienceEditIds` in the user message.",
            "- `projects` — **only** rows whose `id` appears in `allowedProjectEditIds`. Never edit supporting or peripheral project ids.",
            "- `skills` — if `skillsRows` is non-trivial, return `edits.skills` with *visible* regrouping, reorder, prioritization, or demotion. When the narrative `skillsStrategy` names rises/sinks, reflect that; when `evidencedKeywordAlignment` in the user message lists terms that are already in the candidate’s work, move those to prominent positions. Do not leave skills unchanged if reordering or regrouping would better match the target role and narrative. Exception: a single row or a list already in ideal order (rare).",
            "- Other layout keys (e.g. `sectionOrder`) only if you intentionally change them.",
            "",
            "ATS / keyword reality: Many employers’ parsers match literal strings (job title, tools, and JD nouns from **evidencedKeywordAlignment**). Weave those terms into summary and hero text **where they are already true**—use standard spellings; avoid synthetic repetition. Never invent a skill or project technology to pass a filter.",
            "",
            "Hero rows are mandatory rewrite targets: include **every** allowed hero experience row and **every** allowed hero project row in `edits`, each with a **complete** new `description` (full bullet block, same shape as input, e.g. lines starting with •). Match counts: if `allowedExperienceEditIds` has N ids, `edits.experience` has N row objects; if `allowedProjectEditIds` has N ids, `edits.projects` has N row objects. Bullet-block rewrites only—no polish-only tweaks, no synonym swaps, no partial-line patches. Same facts allowed; stronger **posting-shaped** framing. A polished bullet may still need a full rewrite if it is not the strongest truthful version for this role.",
            "",
            "STRUCTURAL REWRITE DEPTH: for each hero row, a valid rewrite must change at least one of: (a) bullet lead emphasis, (b) bullet order, (c) sentence structure, or (d) which technical signal is foregrounded first. Rewrites that only smooth wording while preserving the same lead, order, and structure are not sufficient.",
            "",
            "Bullets are evidence pools: new wording must stay grounded in true claims already on that row—no invented stack, metrics, domain, or ownership. Preserve or improve technical specificity; never dumb bullets down.",
            "",
            "SUMMARY ANTI-BROCHURE RULE: in `edits.summarySection.summary`, do not use generic résumé phrases such as `scalable solutions`, `reliable applications`, `impactful solutions`, `robust data processing`, `efficient applications`, or similar abstractions. Prefer concrete work shapes the resume proves: services, APIs, pipelines, data stores, dashboards, workflows, and integrations. Open with a **clear role-shaped hook** (aligned to the target role when true) and front-load 1–2 **literal** terms from evidencedKeywordAlignment / resume that match the posting when those terms are true.",
            "",
            "Skills: regroup / reorder / demote before removal. Do not casually delete core evidenced stack. Omit `removedSkillIds` (and similar) entirely unless you deliberately remove rows—never emit empty removal arrays as placeholders.",
            "",
            "Sparse `edits`: include only keys and list entries you are actually changing. Omit unchanged sections. Do not output empty arrays, empty objects, placeholder strings, or unused keys.",
            "",
            "Truth: no invented facts, tools, scope, or domain. Follow the narrative JSON unless it conflicts with the resume.",
            "",
            "Output valid JSON only—no markdown, no fences.",
        ]
    )


def build_user_prompt(payload, tailorContext, sectionDetails, relevantJDLines, narrativeBrief=None, ab_experiment=False):
    targetRole = tailorContext.get("targetRole", "")

    companyRaw = payload.get("company")
    company = companyRaw if isinstance(companyRaw, str) else ""
    resumeRaw = payload.get("resume_data")
    resumeData = resumeRaw if isinstance(resumeRaw, dict) else {}

    styleRaw = payload.get("style_preferences")
    stylePreferences = styleRaw if isinstance(styleRaw, dict) else {}
    focusRaw = stylePreferences.get("focus")
    focus = focusRaw if isinstance(focusRaw, str) else "balanced"
    toneRaw = stylePreferences.get("tone")
    tone = toneRaw if isinstance(toneRaw, str) else "balanced"

    roleLabel = (targetRole or "").strip() or "this role"

    output_contract = {
        "edits": {
            "summarySection": {"summary": "…"},
            "experience": [
                {"id": 1, "description": "full rewritten bullet block"},
                {"id": 2, "description": "full rewritten bullet block"},
            ],
            "projects": [
                {"id": 1, "description": "full rewritten bullet block"},
                {"id": 2, "description": "full rewritten bullet block"},
            ],
            "skills": [{"id": 1, "name": "Python", "category": "Languages"}],
        }
    }

    prefsOneLine = (
        f"Prefs: focus={focus}, tone={tone}. "
        "Truth: every claim grounded in the resume; JD shapes emphasis only—no invented facts, stack, metrics, ownership, or domain. "
        "Do not fabricate to match the JD. "
        + {
            "impact": "Stress outcomes the resume can substantiate.",
            "technical": "Stress on-row depth; no JD stack imports.",
            "leadership": "Stress leadership only where supported.",
        }.get(focus, "Balance impact, depth, leadership.")
        + " "
        + {"concise": "Tight bullets.", "detailed": "Richer detail, no filler."}.get(tone, "Balanced length.")
    )

    tc = tailorContext if isinstance(tailorContext, dict) else {}
    ats_hits = list(tc.get("resumeHits") or [])[:24]
    ats_jd_top = top_keyword_terms(tc.get("keywords") or [], limit=12)
    evidenced_keyword_alignment = {
        "resumeLiteralHits": ats_hits,
        "jdKeywordPriority": ats_jd_top,
    }

    nb = narrativeBrief if isinstance(narrativeBrief, dict) else {}
    narrative_json = json.dumps(nb, ensure_ascii=False, indent=2)
    rewrite_focus = build_stage_a_rewrite_focus(resumeData, nb)
    truth_anchor = build_resume_truth_anchor_compact(resumeData, nb)
    skills_obligation_active = skills_change_expected_from_context(nb, resumeData)

    lines = [
        "## Stage A rewrite",
        f"Target role: {roleLabel}",
        f"Company (context only): {company or 'Not specified'}",
        prefsOneLine,
        "",
        "### Task",
        "Rewrite the profile summary (`edits.summarySection`). The opening should **signal fit to this target role** when the candidate’s real experience supports it; align wording with `rewriteGoals` and `summaryGoal` in the narrative JSON.",
        "Rewrite **every** row in `allowedExperienceEditIds` under `edits.experience` with a **full** `description` (entire bullet block).",
        "If `allowedExperienceEditIds` has **N** ids, `edits.experience` must contain **N** objects—one per id.",
        "Rewrite **every** row in `allowedProjectEditIds` under `edits.projects` with a **full** `description`.",
        "If `allowedProjectEditIds` has **N** ids, `edits.projects` must contain **N** objects—one per id.",
        "If `skillsRows` is non-empty, produce **meaningful** `edits.skills` whenever reordering, regrouping, or demotion would better reflect `skillsStrategy` and the target role. If the narrative’s skillsStrategy names specific rises or sinks, the skills section must show that. Only skip `edits.skills` when the list is already optimal or a single line leaves nothing to do.",
        "### Skills obligation (hard when triggered)",
        "When **any** of: (1) narrative `skillsStrategy` contains a non-empty line, (2) resume skills use **≥2 distinct category** labels, (3) any category looks like **Focus Areas** (or similar theme bucket), you **must** return `edits.skills` with at least one visible change (reorder, regroup, or name/category field edit). Exception: exactly one skill row and no room to improve.",
        f"**This resume — obligation active:** {str(skills_obligation_active).lower()}. When true, omitting `edits.skills` is a failed task.",
        "Do **not** edit supporting or peripheral project ids—they appear for context only.",
        "Use the same underlying facts; **assertive, posting-shaped** framing. No polish-only or synonym-swap passes.",
        "For each rewritten hero row, change at least one of: bullet lead emphasis, bullet order, sentence structure, or which technical signal appears first. **Prioritize 1–2 `resumeLiteralHits` or `jdKeywordPriority` terms in the first bullet** when those terms are already true for that row.",
        "For the summary, avoid brochure phrasing like `scalable solutions`, `reliable applications`, `impactful solutions`, and `robust data processing`. Lead with concrete work shapes; integrate literals from `evidencedKeywordAlignment` when they match the story.",
        "Return **only** `{\"edits\": {...}}`. Omit any key you are not changing. Do not output empty arrays, empty objects, or placeholder fields.",
        "",
        "### Narrative target",
        narrative_json,
        "",
        "### Evidenced keyword alignment (for ATS: weave where true—no stuffing, no new facts)",
        json.dumps(evidenced_keyword_alignment, ensure_ascii=False, indent=2),
        "",
        "### Focused rewrite surface",
        json.dumps(rewrite_focus, ensure_ascii=False, indent=2),
        "",
        "### JD excerpts",
        json.dumps(relevantJDLines, ensure_ascii=False, indent=2),
        "",
        "### Compact truth anchor (not editable)",
        json.dumps(truth_anchor, ensure_ascii=False, indent=2),
        "",
        "### Output shape (omit unused sections; no extra top-level keys)",
        json.dumps(output_contract, ensure_ascii=False, indent=2),
    ]

    exp = (TAILOR_AB_EXPERIMENT_APPEND or "").strip()
    if ab_experiment and exp:
        lines.extend(
            [
                "",
                "### A/B experiment override (TAILOR_AB_EXPERIMENT=on)",
                exp,
            ]
        )

    return "\n".join(lines)


def build_prompt(payload, tailorContext, sectionDetails, relevantJDLines, narrativeBrief=None):
    ab = tailor_ab_experiment_enabled()
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(
        payload,
        tailorContext,
        sectionDetails,
        relevantJDLines,
        narrativeBrief=narrativeBrief,
        ab_experiment=ab,
    )
    return system_prompt, user_prompt
