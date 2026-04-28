from __future__ import annotations

import copy
import json
import os

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
        "note": "This checklist scores category *label* words against the JD, not each skill *name*. `low` or `medium` is common and is **not** a signal to drop Languages/Frameworks/DB rows—reorder them instead.",
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

    hero_exp_filled = []
    for r in _rows_with_ids(exp_rows, hero_exp_ids):
        if not isinstance(r, dict):
            continue
        row = copy.deepcopy(r)
        row["rowFactAnchor"] = _row_fact_anchor_experience(r)
        hero_exp_filled.append(row)

    hero_proj_filled = []
    for r in _rows_with_ids(proj_rows, hero_proj_ids):
        if not isinstance(r, dict):
            continue
        row = copy.deepcopy(r)
        row["rowFactAnchor"] = _row_fact_anchor_project(r)
        row["rowProseOnly"] = _row_prose_only_project(r)
        hero_proj_filled.append(row)

    return {
        "allowedExperienceEditIds": hero_exp_ids,
        "allowedProjectEditIds": hero_proj_ids,
        "supportingProjectIds": support_proj_ids,
        "summarySection": copy.deepcopy(summary_block),
        "resumeSkillVocabulary": _skill_name_vocabulary(skills_rows),
        "heroExperienceRows": hero_exp_filled,
        "heroProjectRows": hero_proj_filled,
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


def build_pass_a_system():
    # Pass 1: summary + hero experience + hero projects only. Skills run in a second model call.
    return "\n".join(
        [
            "You are a truth-first resume rewriter for one target role. The user chose **Tailor** to see a **clear, role-shaped difference** in heroes and summary—not a timid copy-edit. Be **assertive** in leads, order, and emphasis—**rooted in what the resume already proves** (`rowFactAnchor`, `resumeSkillVocabulary` for summary). Big retargets are good when the block needs it; **do not** pad with invented stack or vague polish.",
            "",
            "This is pass 1 of 2. Do not output `edits.skills`. Skills are handled later.",
            "Pass 1 only outputs rewrites. Do not explain, justify, warn, summarize, diff, or add commentary. No self-audit.",
            "",
            "Return **only** `{\"edits\": { ... }}` as the JSON object. Exactly one top-level key: `edits`. No `warnings`, no `summary`, no `tailorSummary`, no other top-level keys. Never include a `skills` key under `edits`.",
            "",
            "Edit surface under `edits` in this pass:",
            "- `summarySection` when the user message includes it (profile summary for the role).",
            "- `experience` — **only** rows whose `id` appears in `allowedExperienceEditIds`.",
            "- `projects` — **only** rows whose `id` appears in `allowedProjectEditIds`. You may include **`tech_stack`** (list of strings) on a project row to **correct** labels so they match what the project actually did—**before** you lean on bullets (remove unsupported framework/ML/data-science names; keep the row’s story coherent). Never edit supporting or peripheral project ids.",
            "- Other layout keys only if the user message explicitly includes them; omit `skills` entirely.",
            "",
            "ATS / keyword: weave JD-aligned terms from **evidencedKeywordAlignment** into summary and hero text where the resume already supports them—use standard spellings. **Do not fabricate** employers, dates, degrees, or responsibilities.",
            "",
            "**Row-local identity:** The user message includes per-row `rowFactAnchor` and, for **projects**, `rowProseOnly` (title + description only). If `tech_stack` lists tools that **never** appear in `rowProseOnly`, treat that as **stale**—**drop** them from the `tech_stack` you return and **never** add those names to bullets. **Project bullets:** new proper-noun tools must appear in `rowProseOnly` or in your **corrected** `tech_stack` (aligned with the prose). **Experience rows:** use `rowFactAnchor` for named tools. **One coherent story per row**—no mixing unrelated stack families unless the prose already does.",
            "",
            "**Anti-fluff:** avoid empty resume filler—e.g. “actively participated,” “enhancing user experience,” “robust,” “seamless,” “delivering value” without concrete mechanism. Prefer **artifact, service boundary, data path, scale, or stack** the row can support.",
            "",
            "**Strong lines:** if a bullet **already** names a capability that matches the JD (APIs, LLM usage, a named stack), keep that evidence **clear and explicit** in the retarget—do not replace it with generic language for the sake of change.",
            "",
            "For each **included** hero row: return a **full** `description` bullet block when the block needs a real retarget. **If a bullet is already a strong JD match**, prefer **tightening** (lead, clarity, keyword adjacency) over rewriting it into generic polish. Otherwise: reorder bullets, change the lead, refocus outcomes **from facts on the row**.",
            "",
            "STRUCTURAL DEPTH: change lead emphasis and/or bullet order on edited blocks so the reader sees a deliberate shift—**without** rewriting every line when some are already high-signal for this posting.",
            "",
            "SUMMARY: no empty brochure phrases. For **named** tools in prose, draw from `resumeSkillVocabulary` and existing summary + hero anchors—do not import a JD-only product name as a skill you used.",
            "",
            "Sparse `edits`: only keys you change. **Truth:** no new employers, dates, or degrees. Follow the narrative when it does not ask you to invent facts.",
            "",
            "Output valid JSON only—no markdown, no fences.",
        ]
    )


def build_pass_a_user(payload, tailorContext, sectionDetails, relevantJDLines, narrativeBrief=None, ab_experiment=False):
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

    nb = narrativeBrief if isinstance(narrativeBrief, dict) else {}
    hero_exp = _narrative_id_list(nb, "heroExperience")
    hero_proj = _narrative_id_list(nb, "heroProjects")
    has_exp = len(hero_exp) > 0
    has_proj = len(hero_proj) > 0
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
    output_contract = {"edits": out_shape}

    prefsOneLine = (
        f"Prefs: focus={focus}, tone={tone}. "
        "Ground every claim in the resume; the JD may **reorder emphasis and phrasing** only. "
        + {
            "impact": "Foreground measurable outcomes the resume already states.",
            "technical": "Foreground depth and stack that appear on the row.",
            "leadership": "Foreground scope and people/system ownership where the row supports it.",
        }.get(focus, "Balance impact, depth, leadership.")
        + " "
        + {"concise": "Tight, high-signal bullets.", "detailed": "Richer detail where the row has substance."}.get(
            tone, "Balanced length."
        )
    )
    tc = tailorContext if isinstance(tailorContext, dict) else {}
    ats_hits = list(tc.get("resumeHits") or [])[:24]
    ats_jd_top = top_keyword_terms(tc.get("keywords") or [], limit=12)
    evidenced_keyword_alignment = {
        "resumeLiteralHits": ats_hits,
        "jdKeywordPriority": ats_jd_top,
    }
    narrative_json = json.dumps(nb, ensure_ascii=False, indent=2)
    rewrite_focus = build_stage_a_rewrite_focus(resumeData, nb)
    truth_anchor = build_resume_truth_anchor_compact(resumeData, nb)
    strict_truth = bool(payload.get("strict_truth", True))

    lines = [
        "## Pass 1 — profile summary and hero rows only (no skills in `edits`)",
        f"Target role: {roleLabel}",
        f"Company (context only): {company or 'Not specified'}",
        prefsOneLine,
        f"strict_truth (from request): {strict_truth}",
        "",
        "### Task",
        "Return **only** `edits` with `summarySection` and/or `experience` and/or `projects` as needed. **Never** put `skills` in `edits` here—pass 2 will handle skills.",
        "Set `edits.summarySection` so the professional summary fits this target role. Use the narrative’s `summaryGoal` / `rewriteGoals` and real evidence on the resume.",
    ]
    if not has_summary_text:
        lines.append("If the summary is empty or very thin, add a strong opening that only states what the experience and projects on this resume can support.")
    else:
        lines.append("If a summary already exists, reframe for this role and keep the same factual roots; change focus, not made-up history.")
    if has_exp:
        lines.append("Include `edits.experience`: one row object per `allowedExperienceEditIds`, each with a full `description` bullet block. **Make the retargeting obvious**—re-lead and reorder so this role’s reader sees why the job fits.")
    if has_proj:
        lines.append(
            "Include `edits.projects`: one object per `allowedProjectEditIds`. For each, you may set **`tech_stack`** first (Strings only) so labels match the project’s real work—**remove** names that only appeared in a bloated or wrong `tech_stack` and never in `rowProseOnly` for that id; then set **`description`** to match. Same **assertive** refocus for this job; do not edit rows outside the allowed id lists. Supporting and peripheral project ids are context only."
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
    return "\n".join(
        [
            "You are editing **only** the `skills` section of a resume for one target role. Nothing else in the resume is in scope for this call.",
            "**Required:** respond with **exactly one** JSON object. It **must** include `edits` → `skills` as a **non-empty** array of `{id, name, category}` rows (in display order) listing every skill line to show. **Do not** return `{}`, do not omit `edits` or `skills`, and do not return only an empty object unless the user context truly has zero skill rows (rare in this call).",
            "**Selected toolkit:** the JD is a **compass**—what leads, how categories read—not the **exclusive** keep roster. Start from **`skillsRows`**: **reorder + recategorize**, **demote** Supporting depth, then **light trim** (**noise**, **wrong archetype**, sparse **redundant** tail when the bank is busy). **Keep** plausible archetype skills—including strong lines **without** verbatim JD overlap—so the section reads like a **credible senior toolkit**, not a JD strip.",
            "Return **only** `{\"edits\": { \"skills\": [ ... ] } }`. Exactly one top-level key: `edits`, and only `skills` under it.",
            "**Decision order:** (a) **`category`** / **`categoryStrategy`**. (b) **Lead** (JD+hero emphasis when supported) then **Supporting** (honest breadth for this role family). (c) **Trim last:** **light**—after reorder, drop **obvious** clutter / duplicates / wrong-role fluff **plus** a **few** weakest **redundant** Supporting lines when the bank is long (same story told twice, or tail tools that don’t fit this role family). Still **truthful**: no fabricated skills.",
            "**If unsure:** **demote first** (order or category). If still borderline: **keep** when plausible for this role family; **omit** only when the line is **clearly redundant** with stronger lines above or clearly **off-archetype** for this job (per narrative + evidence).",
            "**Languages / Frameworks / Libraries / Databases / Cloud/primitives:** **reorder** first so JD heroes lead; **keep** the credible core. **Omit sparingly**—duplicate names, weakest **redundant** peripherals at the tail, or narrative **`avoid`**—**not** because a token is absent from JD text. **Fluff/grouping** buckets (Focus Areas, etc.) may tighten a bit more.",
            "**skillsStrategy** lines: named skills in examples are **illustrative**; default **keep** unless the brief or role fit clearly excludes a row.",
            "Truth & names: **start from** existing skill rows (pass-1 merged resume). **Recategorize** when it helps scan. **Add** rows only for **conservative prerequisites** in line with `skillsStrategy` and **repeated** project/experience evidence (examples: JavaScript with React-heavy work, SQL with PostgreSQL/MySQL, Python with FastAPI, HTML/CSS with UI work).",
            "**Do not** add neighboring or substitute stack (e.g. TypeScript from React alone; warehouse DBs from SQL; Django→Flask; LangChain from API use alone; k8s from a lone host; broad AWS from one service). **Focus-area** phrasing only when the body supports it. Light casing fixes on **existing** lines are fine.",
            "**JD terms / `jdKeywordPriority`:** order and prominence—**not** “delete if not listed.”",
            "Implement **`skillsStrategy`** (+ `categoryStrategy` when non-empty). Prefer **most** of the bank with **light** trims busy lists can carry; avoid over-pruning **and** avoid JD-only echo lists.",
            "For **new** prerequisite lines only: use a **new unique numeric `id`** not used in the list; add **sparingly**.",
            "If only one category label makes sense, a single category is OK.",
            "**JSON shape:** each skill object closes with **one** `}` before the next `,` or the `]` that ends `skills`; do not insert an extra `}` right before that `]` (validate that the output parses as JSON).",
            "Output valid JSON only—no markdown, no fences, no leading commentary before the JSON object.",
        ]
    )


def build_pass_b_user(payload, tailorContext, relevantJDLines, narrativeBrief, fitSignals):
    companyRaw = payload.get("company")
    company = companyRaw if isinstance(companyRaw, str) else ""
    resumeRaw = payload.get("resume_data")
    resumeData = resumeRaw if isinstance(resumeRaw, dict) else {}
    roleLabel = (tailorContext.get("targetRole", "") or "").strip() or "this role"
    styleRaw = payload.get("style_preferences")
    stylePreferences = styleRaw if isinstance(styleRaw, dict) else {}
    focusRaw = stylePreferences.get("focus")
    focus = focusRaw if isinstance(focusRaw, str) else "balanced"
    toneRaw = stylePreferences.get("tone")
    tone = toneRaw if isinstance(toneRaw, str) else "balanced"
    prefsOneLine = f"Target role: {roleLabel}. Company: {company or 'Not specified'}. Prefs: focus={focus}, tone={tone}."
    tc = tailorContext if isinstance(tailorContext, dict) else {}
    ats_hits = list(tc.get("resumeHits") or [])[:24]
    ats_jd_top = top_keyword_terms(tc.get("keywords") or [], limit=12)
    evidenced_keyword_alignment = {
        "resumeLiteralHits": ats_hits,
        "jdKeywordPriority": ats_jd_top,
    }
    nb = narrativeBrief if isinstance(narrativeBrief, dict) else {}
    narrative_json = json.dumps(nb, ensure_ascii=False, indent=2)
    skills_focus = build_stage_a_rewrite_focus(resumeData, nb)
    return "\n".join(
        [
            "## Pass 2 — skills only",
            prefsOneLine,
            "**Skill bank:** start from **`skillsRows`**. **Default: keep most rows**—reorder / recategorized first—then allow **a handful** of omissions on **busy** lists for **redundant** Supporting or **off-archetype** lines (not JD keyword matching).",
            "**Follow** **`skillsStrategy`**: Lead → Supporting breadth → **light trim** at the tail. **Do not** shrink the list to JD keywords.",
            "**Languages & Frameworks (similar tool rows):** **reorder** heavily; **omit** only **weak redundant** tail entries or duplicates—**not** absence from JD text.",
            "If the narrative **explicitly keeps** a named skill, **retain** it.",
            "Return `{id, name, category}` in display order. Demote **before** drop.",
            "",
            "### Precomputed fit checklist (code — not a delete list)",
            "Explains category↔JD overlap density; use with **`skillsStrategy`**. Low overlap does **not** mean delete non-keyword skills—usually **regroup** or **Supporting** placement. Read the embedded `note`: label-based scores do **not** reflect whether Python/React/etc. fit the JD.",
            json.dumps(fitSignals, ensure_ascii=False, indent=2),
            "",
            "### Narrative (same as pass 1)",
            narrative_json,
            "",
            "### Evidenced keyword alignment (ordering + ATS—not membership)",
            "`jdKeywordPriority` ranks what should **lead** when supported on the resume; **`resumeLiteralHits`** are supporting signals. Neither list is the full roster of allowed skills.",
            json.dumps(evidenced_keyword_alignment, ensure_ascii=False, indent=2),
            "",
            "### Current skills + rewrite_focus.skillsRows (after pass 1 merge)",
            json.dumps(skills_focus, ensure_ascii=False, indent=2),
            "",
            "### JD excerpts",
            json.dumps(relevantJDLines, ensure_ascii=False, indent=2),
            "",
            "### Output contract (shape—not length)",
            "**Bracket discipline:** `{` `\"edits\"` `{` `\"skills\"` `[` rows… `]` `}` `}` — the `]` closes **only** the array; the next **`}` closes the `edits` object** (not doubled before `]`). If your JSON checker fails validation, rewrite until it parses.",
            "**Typical output:** **most** `skillsRows` ids, reordered; on long lists, **a few** purposeful drops are OK. Example shape:",
            "{\"edits\": {\"skills\": [{\"id\": 1, \"name\": \"Python\", \"category\": \"Languages\"}, {\"id\": 8, \"name\": \"React\", \"category\": \"Frameworks\"}]}}",
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
