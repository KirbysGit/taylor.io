# --- human-facing changelog, changeReasons, narrative omission checks, rewrite audit. --- #

from __future__ import annotations

from .resume_patch_shared import asDict, listById, summaryInner

# ===== constants (audit / summary heuristics only) ===== #

summaryGenericPhrases = (
    "scalable solutions",
    "operational visibility",
    "user experience",
    "stakeholder",
    "drove impact",
    "cross-functional",
    "results-driven",
    "passionate about",
    "leverage ",
    "synerg",
    "operational excellence",
    "innovative solutions",
    "end-to-end",
    "proven track record of",
    "excellent communication",
    "strong communication",
    "agile environment",
    "fast-paced",
)

protectedSkillNameHints = (
    "fastapi",
    "flask",
    "django",
    "postgresql",
    "postgres",
    "mysql",
    "mongodb",
    "redis",
    "sql",
    "etl",
    "pipeline",
    "aws",
    "gcp",
    "azure",
    "kubernetes",
    "docker",
    "kafka",
    "api",
    "node",
    "react",
    "next",
)


def findGenericPhrasesInText(text):
    if not text or not str(text).strip():
        return []
    low = str(text).lower()
    return [p for p in summaryGenericPhrases if p in low]


def roleSuggestsBackendOrData(target_role):
    t = (target_role or "").lower()
    return any(
        k in t
        for k in (
            "backend",
            "full stack",
            "fullstack",
            "full-stack",
            "data",
            "engineer",
            "devops",
            "cloud",
            "platform",
            "api",
            "analytics",
            "pipeline",
            "software",
            "developer",
        )
    )


def skillRowName(r):
    if not isinstance(r, dict):
        return ""
    n = r.get("name")
    c = r.get("category")
    if n is not None and str(n).strip():
        return f"{c or ''} {n}".lower()
    return ""


def protectedSkillNameHit(name_l):
    s = (name_l or "").lower()
    return any(p in s for p in protectedSkillNameHints)


def patchEntryIntensity(entry):
    fc = entry.get("fieldsChanged")
    if not isinstance(fc, dict) or not fc:
        return "minor"
    total = 0
    for _k, d in fc.items():
        if not isinstance(d, dict) or "before" not in d or "after" not in d:
            total += 30
            continue
        a, b = d.get("before"), d.get("after")
        sa, sb = (str(a) if a is not None else ""), (str(b) if b is not None else "")
        total += abs(len(sb) - len(sa)) + min(len(sb), len(sa), 12)
    n_fields = len(fc)
    if n_fields == 1 and total < 55:
        return "minor"
    if n_fields <= 2 and total < 200:
        return "moderate"
    if n_fields == 1 and total < 220:
        return "moderate"
    return "substantial"


def reasonForRow(section, rid, entry):
    if entry.get("removed"):
        return {
            "experience": f"Removed experience row (id {rid}) from the resume.",
            "projects": f"Removed project (id {rid}) from the resume.",
            "education": f"Removed education row (id {rid}).",
            "skills": f"Removed skill row (id {rid}).",
        }[section]
    if entry.get("added"):
        return {
            "experience": f"Added new experience row (id {rid}).",
            "projects": f"Added new project (id {rid}).",
            "education": f"Added education row (id {rid}).",
            "skills": f"Added skill row (id {rid}).",
        }[section]
    i = patchEntryIntensity(entry)
    if section == "experience":
        if i == "minor":
            return f"Experience (id {rid}): small wording or line-level tweak; scope unchanged."
        if i == "moderate":
            return f"Experience (id {rid}): updated bullets and/or skills string for role fit."
        return f"Experience (id {rid}): substantial reframing of scope, systems, and details toward the role."
    if section == "projects":
        if i == "minor":
            return f"Project (id {rid}): light edit to one field (title, description, or stack)."
        if i == "moderate":
            return f"Project (id {rid}): revised description and/or stack for clearer role alignment."
        return f"Project (id {rid}): strong reframing of multiple bullets/fields to foreground systems, scope, and fit."
    if section == "education":
        if i == "minor":
            return f"Education (id {rid}): small text tweak."
        if i == "moderate":
            return f"Education (id {rid}): updated subsections or details."
        return f"Education (id {rid}): material rewrite of subsections or details."
    if i == "minor":
        return f"Skill (id {rid}): label or category cleanup."
    if i == "moderate":
        return f"Skill (id {rid}): renamed or re-categorized for scanability."
    return f"Skill (id {rid}): material change to name or group for the target story."


def build_change_reasons_from_patch(patch, target_role=""):
    role = (target_role or "the target role").strip()
    out = []
    if not patch:
        return out

    if "summary" in patch:
        s = patch.get("summary")
        after_txt = ""
        if isinstance(s, dict):
            after_txt = s.get("after")
        g = findGenericPhrasesInText(str(after_txt or ""))
        if g:
            out.append(
                {
                    "section": "summary",
                    "reason": (
                        f"Profile summary updated for {role}; audit flagged common generic "
                        f"phrasing in the new text ({', '.join(g[:5])}{'…' if len(g) > 5 else ''})—tighten to concrete systems and evidence from the resume."
                    ),
                }
            )
        else:
            out.append(
                {
                    "section": "summary",
                    "reason": f"Repositioned the professional summary toward {role} using concrete, on-resume evidence where possible.",
                }
            )
    if (
        "header" in patch
        or "sectionOrder" in patch
        or "sectionVisibility" in patch
        or "sectionLabels" in patch
        or "contactOrder" in patch
    ):
        segs = []
        if "header" in patch:
            segs.append("header and contact layout")
        if "sectionOrder" in patch:
            segs.append("section order")
        if "sectionVisibility" in patch:
            segs.append("section visibility")
        if "sectionLabels" in patch:
            segs.append("section labels")
        if "contactOrder" in patch:
            segs.append("contact order")
        out.append(
            {
                "section": "layout",
                "reason": f"Updated resume structure ({', '.join(segs)}).",
            }
        )

    for ex in patch.get("experience") or []:
        eid = ex.get("id")
        out.append({"section": "experience", "id": eid, "reason": reasonForRow("experience", eid, ex)})
    for pr in patch.get("projects") or []:
        pid = pr.get("id")
        out.append({"section": "projects", "id": pid, "reason": reasonForRow("projects", pid, pr)})
    for ed in patch.get("education") or []:
        eid = ed.get("id")
        out.append({"section": "education", "id": eid, "reason": reasonForRow("education", eid, ed)})
    for sk in patch.get("skills") or []:
        sid = sk.get("id")
        if sid == "_orderOrFullReplace":
            out.append(
                {"section": "skills", "reason": "Regrouped or reordered skills to prioritize role-relevant items."}
            )
            break
        out.append({"section": "skills", "id": sid, "reason": reasonForRow("skills", sid, sk)})
    if "hiddenSkills" in patch:
        out.append({"section": "hiddenSkills", "reason": "Adjusted hidden or supplemental skills list."})
    return out


def changelogLineForRow(section, row):
    rid = row.get("id")
    if row.get("removed"):
        return {
            "experience": f"- Experience id {rid}: removed from resume.",
            "projects": f"- Project id {rid}: removed from resume.",
            "education": f"- Education id {rid}: removed.",
            "skills": f"- Skills id {rid}: row removed.",
        }[section]
    if row.get("added"):
        return {
            "experience": f"- Experience id {rid}: new row added.",
            "projects": f"- Project id {rid}: new project added.",
            "education": f"- Education id {rid}: added.",
            "skills": f"- Skills id {rid}: row added.",
        }[section]
    it = patchEntryIntensity(row)
    if section == "experience":
        if it == "minor":
            return f"- Experience id {rid}: small text tweak (minor)."
        if it == "moderate":
            return f"- Experience id {rid}: moderate update to bullets and/or line items."
        return f"- Experience id {rid}: substantial reframing of story and details (major)."
    if section == "projects":
        if it == "minor":
            return f"- Project id {rid}: light edit to one part of the project (minor)."
        if it == "moderate":
            return f"- Project id {rid}: moderate description/stack revision."
        return f"- Project id {rid}: strong multi-field or multi-bullet reframing (major)."
    if section == "education":
        tag = "minor" if it == "minor" else "moderate" if it == "moderate" else "major"
        return f"- Education id {rid}: text updated ({tag})."
    if it == "minor":
        return f"- Skills id {rid}: minor name/category touch-up."
    if it == "moderate":
        return f"- Skills id {rid}: reworded or re-categorized."
    return f"- Skills id {rid}: material change to line or group for the role story."


def build_changelog_from_patch(patch, target_role=""):
    role = (target_role or "the role").strip()
    if not patch:
        return f"No structural changes detected compared to the previous resume (target: {role})."

    lines = [f"Tailoring log for: {role}.", ""]

    if "summary" in patch:
        s = patch.get("summary")
        a = ""
        if isinstance(s, dict):
            a = str(s.get("after") or "")
        g = findGenericPhrasesInText(a)
        if g:
            lines.append(
                f"- Profile summary: revised (heuristic: generic-leaning phrasing present: {', '.join(g[:3])}{'…' if len(g) > 3 else ''})."
            )
        else:
            lines.append("- Profile summary: updated toward role; favor concrete systems and evidence from the resume.")
    for key in ("header", "sectionOrder", "sectionVisibility", "sectionLabels", "contactOrder"):
        if key in patch:
            lines.append(f"- {key}: structure or presentation updated.")
    for ex in patch.get("experience") or []:
        lines.append(changelogLineForRow("experience", ex))
    for pr in patch.get("projects") or []:
        lines.append(changelogLineForRow("projects", pr))
    for ed in patch.get("education") or []:
        lines.append(changelogLineForRow("education", ed))
    for sk in patch.get("skills") or []:
        if sk.get("id") == "_orderOrFullReplace":
            lines.append("- Skills: list structure or order changed.")
            break
        lines.append(changelogLineForRow("skills", sk))
    if "hiddenSkills" in patch:
        lines.append("- Hidden skills: updated.")

    return "\n".join(lines).strip()


build_gen_summary_from_patch = build_changelog_from_patch


def mergeChangelog(rewrite_changelog, code_changelog):
    a = (rewrite_changelog or "").strip()
    b = (code_changelog or "").strip()
    if a and b:
        return f"{a}\n\n---\n{b}"
    return a or b


def collect_narrative_omission_warnings(original, updated, narrative_brief):
    if not isinstance(narrative_brief, dict):
        return []
    out = []
    o_proj = listById(original.get("projects"))
    u_proj = listById(updated.get("projects"))
    o_exp = listById(original.get("experience"))
    u_exp = listById(updated.get("experience"))

    for key in ("heroProjects", "supportingProjects"):
        for pid in narrative_brief.get(key) or []:
            if not isinstance(pid, int):
                try:
                    pid = int(pid)
                except (TypeError, ValueError):
                    continue
            if pid in o_proj and pid not in u_proj:
                t = str(o_proj[pid].get("title") or pid)
                out.append(
                    f"Narrative-listed {key} (project id {pid}, {t}) no longer appears in the resume. Confirm omission was intentional."
                )
    for eid in narrative_brief.get("heroExperience") or []:
        if not isinstance(eid, int):
            try:
                eid = int(eid)
            except (TypeError, ValueError):
                continue
        if eid in o_exp and eid not in u_exp:
            t = str(o_exp[eid].get("title") or o_exp[eid].get("company") or eid)
            out.append(
                f"Narrative-listed heroExperience (experience id {eid}, {t}) was removed. Confirm that was intentional."
            )
    return out


def countRowsWithFieldChanges(patch, section):
    n = 0
    for row in patch.get(section) or []:
        if not isinstance(row, dict) or row.get("removed") or row.get("added"):
            continue
        if row.get("fieldsChanged"):
            n += 1
    return n


def narrative_skills_strategy_nonempty(narrative_brief):
    # --- Non-empty skillsStrategy means the narrative already asked for rises/sinks — Stage A should reflect it. --- #
    ss = (narrative_brief or {}).get("skillsStrategy") if isinstance(narrative_brief, dict) else None
    if not isinstance(ss, list):
        return False
    return any(isinstance(x, str) and x.strip() for x in ss)


def resume_skills_layout_suggests_redistribution(resume_data):
    # --- ≥2 distinct categories or a Focus Areas–style bucket — room to reorder for the posting. --- #
    skills = (resume_data or {}).get("skills") if isinstance(resume_data, dict) else None
    if not isinstance(skills, list) or len(skills) < 2:
        return False
    cats = set()
    for row in skills:
        if not isinstance(row, dict):
            continue
        c = str(row.get("category") or "").strip()
        if not c:
            continue
        low = c.lower()
        cats.add(low)
        if "focus" in low and "area" in low:
            return True
    return len(cats) >= 2


def skills_change_expected_from_context(narrative_brief, resume_data):
    """True when we expect visible `edits.skills` (prompt + audit both use this)."""
    return narrative_skills_strategy_nonempty(narrative_brief) or resume_skills_layout_suggests_redistribution(
        resume_data
    )


SKILLS_EXPECTED_BUT_UNCHANGED_WARNING = (
    "Skills: regrouping or reorder was expected (narrative skillsStrategy and/or multi-category "
    "skills layout), but no skill rows changed. Edit skills manually or re-run tailoring."
)


def previewText(s, limit=320):
    t = (s or "").strip()
    if len(t) <= limit:
        return t
    return t[: limit - 1] + "…"


def build_rewrite_quality_audit(original, updated, patch, narrative_brief, stage_a, target_role):
    o = asDict(original)
    u = asDict(updated)
    p = asDict(patch) if patch else {}
    nb = asDict(narrative_brief)
    e = asDict((stage_a or {}).get("edits") if isinstance(stage_a, dict) else {})

    def removedIds(section_key):
        r = []
        for row in p.get(section_key) or []:
            if not isinstance(row, dict) or not row.get("removed"):
                continue
            rid = row.get("id")
            if rid is not None and rid != "_orderOrFullReplace":
                r.append(rid)
        return r

    re_sk = removedIds("skills")
    re_pr = removedIds("projects")
    re_ex = removedIds("experience")
    o_sk = listById(o.get("skills"))
    exp_list = o.get("skills") or []
    n_vis = len([x for x in exp_list if isinstance(x, dict) and x.get("id") is not None])
    n_removed_sk = len(re_sk)
    ratio = (n_removed_sk / n_vis) if n_vis else 0.0
    tr = (target_role or "").strip()
    backend = roleSuggestsBackendOrData(tr)
    aggressive = n_removed_sk > 5 or (n_vis > 0 and ratio > 0.25)
    protected_hits = []
    for sid in re_sk:
        row = o_sk.get(sid)
        nm = skillRowName(row)
        if protectedSkillNameHit(nm):
            protected_hits.append({"id": sid, "name": (row or {}).get("name")})
    susp = bool(backend and protected_hits)

    hero_p = nb.get("heroProjects") or []
    hpi = []
    for x in hero_p:
        try:
            hpi.append(int(x))
        except (TypeError, ValueError):
            continue
    hero_touched = []
    for row in p.get("projects") or []:
        if not isinstance(row, dict) or row.get("removed") or row.get("added"):
            continue
        pid = row.get("id")
        if pid in hpi and row.get("fieldsChanged"):
            try:
                hero_touched.append(int(pid))
            except (TypeError, ValueError):
                hero_touched.append(pid)
    pat_pids = set()
    for row in p.get("projects") or []:
        if isinstance(row, dict) and row.get("id") is not None:
            try:
                pat_pids.add(int(row.get("id")))
            except (TypeError, ValueError):
                pat_pids.add(row.get("id"))
    hero_untouched = [x for x in hpi if x not in pat_pids]

    hero_e = nb.get("heroExperience") or []
    hei = []
    for x in hero_e:
        try:
            hei.append(int(x))
        except (TypeError, ValueError):
            continue
    hero_ex_edited = []
    for row in p.get("experience") or []:
        if not isinstance(row, dict) or row.get("removed") or row.get("added"):
            continue
        eid = row.get("id")
        if eid is None or not row.get("fieldsChanged"):
            continue
        try:
            eid_i = int(eid)
        except (TypeError, ValueError):
            continue
        if eid_i in hei:
            hero_ex_edited.append(eid_i)
    hero_ex_untouched = [x for x in hei if x not in set(hero_ex_edited)]
    after_summary = summaryInner(u)
    gen_found = findGenericPhrasesInText(after_summary)
    n_exp_ch = countRowsWithFieldChanges(p, "experience")
    n_pr_ch = countRowsWithFieldChanges(p, "projects")
    n_sk_ch = countRowsWithFieldChanges(p, "skills")
    if p.get("skills") and any(
        isinstance(x, dict) and x.get("id") == "_orderOrFullReplace" for x in (p.get("skills") or [])
    ):
        n_sk_ch = max(n_sk_ch, 1)
    n_removed = len(re_sk) + len(re_pr) + len(re_ex)
    skills_expected = skills_change_expected_from_context(nb, o)
    skills_changed = n_sk_ch > 0
    skills_expected_but_unchanged = bool(skills_expected and not skills_changed)
    return {
        "target_role": tr or None,
        "flags": {
            "aggressive_skill_prune": aggressive,
            "suspicious_protected_skill_removals": susp,
            "summary_has_generic_phrase_hits": bool(gen_found and ("summary" in p)),
            "skills_expected_but_unchanged": skills_expected_but_unchanged,
        },
        "summary": {
            "changed": "summary" in p,
            "after_preview": previewText(after_summary, 280),
            "generic_phrases_matched": gen_found,
        },
        "removals": {
            "removedSkillIds": re_sk,
            "removedProjectIds": re_pr,
            "removedExperienceIds": re_ex,
            "visible_skill_count_before": n_vis,
            "removed_skill_count": n_removed_sk,
            "removal_ratio_skills": round(ratio, 3),
            "protected_skill_removals": protected_hits,
        },
        "narrative_heroes": {
            "hero_project_ids": hpi,
            "hero_project_ids_with_edits": hero_touched,
            "hero_project_ids_not_in_patch": hero_untouched,
            "only_one_hero_touched_while_several_listed": len(hpi) > 1 and len(hero_touched) == 1,
            "hero_experience_ids": hei,
            "hero_experience_ids_with_edits": hero_ex_edited,
            "hero_experience_ids_not_in_patch": hero_ex_untouched,
        },
        "stage_edits_removals": {
            "removedSkillIds": list(e.get("removedSkillIds") or []),
            "removedProjectIds": list(e.get("removedProjectIds") or []),
        },
        "rewrite_intensity": {
            "summary_changed": "summary" in p,
            "experience_rows_touched": n_exp_ch,
            "project_rows_touched": n_pr_ch,
            "skill_rows_touched": n_sk_ch,
            "skills_section_changed": n_sk_ch > 0,
            "rows_removed_total": n_removed,
            "hero_projects_edited_count": len(hero_touched),
            "hero_experience_edited_count": len(hero_ex_edited),
            "low_intensity_hint": (
                (len(hpi) > 0 and len(hero_touched) == 0)
                or (len(hpi) > 1 and len(hero_touched) < len(hpi))
                or (len(hei) > 0 and len(hero_ex_edited) == 0)
            ),
        },
    }


def patchRowCounts(patch):
    if not patch:
        return {}
    out = {}
    for k in ("experience", "projects", "education", "skills"):
        v = patch.get(k)
        if isinstance(v, list):
            out[k] = len(v)
    return out
