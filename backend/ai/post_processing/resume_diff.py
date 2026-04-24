# --- merge sparse edits, structural patchDiff, noop strip, assemble tailor API response. --- #

from __future__ import annotations

import copy
import json
from typing import Optional

from .resume_patch_shared import asDict, listById, summaryInner
from .resume_tailor_report import (
    SKILLS_EXPECTED_BUT_UNCHANGED_WARNING,
    build_change_reasons_from_patch,
    build_changelog_from_patch,
    build_rewrite_quality_audit,
    collect_narrative_omission_warnings,
    mergeChangelog,
    patchRowCounts,
    previewText,
)


def jnorm(v):
    try:
        return json.dumps(v, sort_keys=True, default=str, ensure_ascii=False)
    except (TypeError, ValueError):
        return str(v)


def jsonEqual(a, b):
    return jnorm(a) == jnorm(b)


def asDict(v):
    return v if isinstance(v, dict) else {}


def mergeValues(base, patch):
    if isinstance(base, dict) and isinstance(patch, dict):
        out = copy.deepcopy(base)
        for k, v in patch.items():
            if k in out and isinstance(out[k], dict) and isinstance(v, dict):
                out[k] = mergeValues(out[k], v)
            else:
                out[k] = copy.deepcopy(v)
        return out
    return copy.deepcopy(patch)


def applyRowPatch(base_row, patch_row):
    out = copy.deepcopy(base_row)
    for k, v in patch_row.items():
        if k == "id":
            continue
        if k == "subsections" and isinstance(v, dict):
            if isinstance(out.get("subsections"), dict):
                out["subsections"] = mergeValues(out["subsections"], v)
            else:
                out["subsections"] = copy.deepcopy(v)
        elif isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = mergeValues(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


def apply_sparse_resume_edits(original_resume, stage_a):
    """
    Deep-copy the original resume and apply only the sparse `edits` object from stage A.
    Omitted fields mean 'leave unchanged'. Removals use explicit id lists.
    Legacy: if `edits` is absent but `updatedResumeData` is present, return a copy of that full object.
    """
    o = copy.deepcopy(asDict(original_resume))
    if not isinstance(stage_a, dict):
        return o

    if "edits" not in stage_a and stage_a.get("updatedResumeData"):
        return copy.deepcopy(asDict(stage_a.get("updatedResumeData")))

    e = asDict(stage_a.get("edits"))

    if "header" in e and isinstance(e["header"], dict):
        o.setdefault("header", {})
        for hk, hv in e["header"].items():
            if isinstance(hv, dict) and isinstance(o["header"].get(hk), dict):
                o["header"][hk] = mergeValues(o["header"][hk], hv)
            else:
                o["header"][hk] = copy.deepcopy(hv)

    for top in ("sectionOrder", "sectionVisibility", "sectionLabels", "contactOrder"):
        if top in e and e[top] is not None:
            o[top] = copy.deepcopy(e[top])

    if "summarySection" in e and isinstance(e["summarySection"], dict):
        o.setdefault("summary", {})
        o["summary"] = mergeValues(asDict(o.get("summary")), e["summarySection"])

    def applyList(section, merge_fn):
        lst = e.get(section)
        if not isinstance(lst, list):
            return
        by = listById(o.get(section))
        orig_ids = [
            x.get("id")
            for x in (o.get(section) or [])
            if isinstance(x, dict) and x.get("id") is not None
        ]
        for row in lst:
            if not isinstance(row, dict) or row.get("id") is None:
                continue
            rid = row.get("id")
            if rid in by:
                by[rid] = merge_fn(by[rid], row)
            else:
                by[rid] = copy.deepcopy(row)
        seen = set()
        out_list = []
        for iid in orig_ids:
            if iid in by:
                out_list.append(by[iid])
                seen.add(iid)
        for iid, row in by.items():
            if iid not in seen:
                out_list.append(row)
        o[section] = out_list

    applyList("experience", applyRowPatch)
    applyList("projects", applyRowPatch)
    applyList("education", applyRowPatch)
    applyList("skills", applyRowPatch)

    if "hiddenSkills" in e:
        o["hiddenSkills"] = copy.deepcopy(e["hiddenSkills"])

    for section, field in (
        ("experience", "removedExperienceIds"),
        ("projects", "removedProjectIds"),
        ("education", "removedEducationIds"),
        ("skills", "removedSkillIds"),
    ):
        raw = e.get(field)
        if not isinstance(raw, list) or not raw:
            continue
        drop = {x for x in raw}
        o[section] = [
            r
            for r in (o.get(section) or [])
            if not isinstance(r, dict) or r.get("id") is None or r.get("id") not in drop
        ]

    return o


def fieldDelta(before, after):
    if jsonEqual(before, after):
        return None
    return {"before": before, "after": after}


def diffDictFields(before, after, field_keys):
    out = {}
    for k in field_keys:
        b, a = before.get(k), after.get(k)
        if not jsonEqual(b, a):
            d = fieldDelta(b, a)
            if d:
                out[k] = d
    return out


def diffIdRows(before_list, after_list):
    lo, lu = listById(before_list), listById(after_list)
    rows = []
    for iid, row_o in lo.items():
        row_n = lu.get(iid)
        if row_n is None:
            rows.append(
                {"id": iid, "removed": True, "before": copy.deepcopy(row_o), "after": None}
            )
            continue
        keys = tuple(sorted((set(row_o.keys()) | set(row_n.keys())) - {"id"}))
        fields = diffDictFields(row_o, row_n, keys)
        if fields:
            rows.append({"id": iid, "fieldsChanged": fields})
    for iid, row_n in lu.items():
        if iid not in lo:
            rows.append({"id": iid, "added": True, "before": None, "after": copy.deepcopy(row_n)})
    return rows


def compute_patch_diff(original, updated):
    o = asDict(original)
    u = asDict(updated)
    diff = {}

    s_o, s_n = summaryInner(o), summaryInner(u)
    if s_o != s_n:
        diff["summary"] = {"before": s_o, "after": s_n}

    h_o, h_n = o.get("header"), u.get("header")
    if isinstance(h_o, dict) and isinstance(h_n, dict):
        h_changed = diffDictFields(h_o, h_n, tuple(sorted(set(h_o.keys()) | set(h_n.keys()))))
        if h_changed:
            diff["header"] = {"fieldsChanged": h_changed}
    elif not jsonEqual(h_o, h_n):
        diff["header"] = {"before": h_o, "after": h_n}

    for key in ("sectionOrder", "sectionVisibility", "sectionLabels", "contactOrder"):
        a, b = o.get(key), u.get(key)
        if not jsonEqual(a, b):
            d = fieldDelta(a, b)
            if d:
                diff[key] = d

    for sec in ("experience", "projects", "education"):
        exp_rows = diffIdRows(o.get(sec), u.get(sec))
        if exp_rows:
            diff[sec] = exp_rows

    sk_rows = diffIdRows(o.get("skills"), u.get("skills"))
    if sk_rows:
        diff["skills"] = sk_rows
    elif not jsonEqual(o.get("skills"), u.get("skills")):
        diff["skills"] = [
            {"id": "_orderOrFullReplace", "before": o.get("skills"), "after": u.get("skills")}
        ]

    hsk_o, hsk_n = o.get("hiddenSkills"), u.get("hiddenSkills")
    if not jsonEqual(hsk_o, hsk_n):
        d = fieldDelta(hsk_o, hsk_n)
        if d:
            diff["hiddenSkills"] = d

    return diff


def stripNoopValue(x):
    if isinstance(x, list):
        out_list = []
        for it in x:
            ni = stripNoopValue(it)
            if ni is not None:
                out_list.append(ni)
        return out_list if out_list else None
    if not isinstance(x, dict):
        return x
    if x.get("removed") is True or x.get("added") is True:
        return x
    if x.get("id") == "_orderOrFullReplace":
        if jsonEqual(x.get("before"), x.get("after")):
            return None
        return x
    if "fieldsChanged" in x and isinstance(x.get("fieldsChanged"), dict):
        fc_in = x["fieldsChanged"]
        fc_out = {}
        for fk, fv in fc_in.items():
            if (
                isinstance(fv, dict)
                and "before" in fv
                and "after" in fv
                and jsonEqual(fv.get("before"), fv.get("after"))
            ):
                continue
            c = stripNoopValue(fv)
            if c is not None:
                fc_out[fk] = c
        if not fc_out:
            return None
        out = {k: v for k, v in x.items() if k == "id"}
        out["fieldsChanged"] = fc_out
        return out
    if "before" in x and "after" in x and "fieldsChanged" not in x:
        if jsonEqual(x.get("before"), x.get("after")):
            return None
        return x
    out2 = {}
    for k, v in x.items():
        nv = stripNoopValue(v)
        if nv is not None:
            out2[k] = nv
    return out2 if out2 else None


def _norm_row_id(row):
    if not isinstance(row, dict):
        return None
    rid = row.get("id")
    if isinstance(rid, float) and rid == int(rid):
        return int(rid)
    return rid if isinstance(rid, int) else None


def _int_ids_from_nb(nb, key):
    out = []
    for x in (nb or {}).get(key) or []:
        if isinstance(x, int):
            out.append(x)
        elif isinstance(x, float) and x == int(x):
            out.append(int(x))
    return out


def _ids_from_resume_section(resume, key):
    rows = (resume or {}).get(key) if isinstance(resume, dict) else None
    if not isinstance(rows, list):
        return []
    out = []
    for r in rows:
        if not isinstance(r, dict):
            continue
        rid = r.get("id")
        if isinstance(rid, float) and rid == int(rid):
            rid = int(rid)
        if isinstance(rid, int):
            out.append(rid)
    return out


def _order_ids_from_plan_rows(rows):
    out = []
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        rid = _norm_row_id(row)
        if rid is not None:
            out.append(rid)
    return out


def _inversion_pair_count(plan_order, hero_ids, all_ids):
    # --- Pairs (non_hero, hero) where the non-hero ranks above the hero in plan order (higher plan signal skipped). --- #
    hset = {x for x in hero_ids if x is not None}
    all_s = [x for x in (all_ids or []) if isinstance(x, int)]
    non = [n for n in all_s if n not in hset]
    im = {iid: i for i, iid in enumerate(plan_order or [])}
    default = len(plan_order or []) + 1

    def pos(iid):
        return im.get(iid, default)

    n_pairs = 0
    for h in hero_ids:
        if h is None or h not in hset:
            continue
        ph = pos(h)
        for n in non:
            if pos(n) < ph:
                n_pairs += 1
    return n_pairs


def build_plan_hero_fit(rows_per_section, narrative_brief, resume, k_experience=2, k_projects=4):
    """
    Phase-1 fit metrics: overlap, inversions, segment flags, and hero_slot_gap (under-heroing vs plan+resume).
    rows_per_section: rowsPerSectionRanked from build_tailor_plan.
    """
    rows_per = rows_per_section if isinstance(rows_per_section, dict) else {}
    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    r = resume if isinstance(resume, dict) else {}

    exp_order = _order_ids_from_plan_rows(rows_per.get("experience") or [])
    proj_order = _order_ids_from_plan_rows(rows_per.get("projects") or [])

    hero_exp = _int_ids_from_nb(nb, "heroExperience")
    hero_proj = _int_ids_from_nb(nb, "heroProjects")

    all_exp = _ids_from_resume_section(r, "experience")
    all_proj = _ids_from_resume_section(r, "projects")

    top_e = set(exp_order[:k_experience]) if k_experience else set()
    top_p = set(proj_order[:k_projects]) if k_projects else set()
    he, hp = set(hero_exp), set(hero_proj)

    in_k_e = len(he & top_e) if he else 0
    in_k_p = len(hp & top_p) if hp else 0
    r_e = round(in_k_e / max(1, len(he)), 3) if he else None
    r_p = round(in_k_p / max(1, len(hp)), 3) if hp else None

    inv_e = _inversion_pair_count(exp_order, hero_exp, all_exp) if all_exp and hero_exp else 0
    inv_p = _inversion_pair_count(proj_order, hero_proj, all_proj) if all_proj and hero_proj else 0

    exp_plan_len = len(exp_order)
    proj_plan_len = len(proj_order)
    n_exp_resume = len(all_exp)
    n_proj_resume = len(all_proj)

    segment = {
        "has_ranked_experience": exp_plan_len > 0,
        "has_project_plan": proj_plan_len > 0,
        "narrative_had_project_heroes": len(hero_proj) > 0,
        "narrative_had_experience_heroes": len(hero_exp) > 0,
    }
    # --- hero_slot_gap: how many hero “slots” the narrative could still fill (under-heroing), e.g. one project hero when plan+resume could support 4. suggested_max = min(narrative cap, plan ranked count, rows on resume); gap = max(0, suggested_max − chosen heroes). --- #
    suggested_proj_heroes = min(k_projects, proj_plan_len, n_proj_resume) if n_proj_resume else 0
    suggested_exp_heroes = min(k_experience, exp_plan_len, n_exp_resume) if n_exp_resume else 0
    hero_slot_gap = {
        "projects": max(0, suggested_proj_heroes - len(hero_proj)),
        "experience": max(0, suggested_exp_heroes - len(hero_exp)),
    }

    return {
        "segment": segment,
        "hero_slot_gap": hero_slot_gap,
        "experience": {
            "k": k_experience,
            "plan_len": exp_plan_len,
            "top_k_ids": exp_order[:k_experience] if k_experience else [],
            "hero_ids": list(hero_exp),
            "in_top_k": in_k_e,
            "ratio": r_e,
        },
        "projects": {
            "k": k_projects,
            "plan_len": proj_plan_len,
            "top_k_ids": proj_order[:k_projects] if k_projects else [],
            "hero_ids": list(hp),
            "in_top_k": in_k_p,
            "ratio": r_p,
        },
        "inversion_pair_count": int(inv_e + inv_p),
        "inversion_by_section": {
            "experience": int(inv_e),
            "projects": int(inv_p),
        },
    }


def strip_noop_from_patch_diff(patch):
    """
    Drop identical before/after leaves, empty fieldsChanged, row entries with no real deltas,
    and empty section lists. Preserves removed/added rows and skills full-list replacement when real.
    """
    if not isinstance(patch, dict) or not patch:
        return {}
    p = stripNoopValue(copy.deepcopy(patch))
    if not isinstance(p, dict):
        return {}
    for k in list(p.keys()):
        if p.get(k) in (None, [], {}):
            p.pop(k, None)
    return p


def assemble_tailor_result(
    *,
    original_resume: dict,
    stage_a: dict,
    narrative_brief: Optional[dict] = None,
    target_role: str = "",
    return_audit_debug: bool = False,
    rows_per_section_ranked: Optional[dict] = None,
):
    """
    Apply sparse stage A `edits` onto the original resume, then diff original vs merged.
    stage_a: `summary` / `tailorSummary` (editorial note), `warnings`, `edits` (sparse);
    legacy: full `updatedResumeData` if `edits` is absent.
    rows_per_section_ranked: from build_tailor_plan (for plan_hero_fit metrics when return_audit_debug).
    If return_audit_debug is True, returns (result_dict, audit_debug_dict) for logging / file dumps.
    """
    o = asDict(original_resume)
    stage_keys = sorted(stage_a.keys()) if isinstance(stage_a, dict) else []
    has_edits_key = isinstance(stage_a, dict) and "edits" in stage_a
    legacy_full = not has_edits_key and bool((stage_a or {}).get("updatedResumeData"))
    updated = apply_sparse_resume_edits(o, stage_a if isinstance(stage_a, dict) else {})
    fell_back = (
        not legacy_full
        and not has_edits_key
        and not (stage_a or {}).get("updatedResumeData")
    )

    rw_summary = str(
        stage_a.get("summary")
        or stage_a.get("tailorSummary")
        or stage_a.get("genSummary")
        or ""
    ).strip()
    w = stage_a.get("warnings")
    rewrite_warnings = []
    if isinstance(w, list):
        rewrite_warnings = [str(x) for x in w if str(x).strip()]
    elif w:
        rewrite_warnings = [str(w)]

    patch = compute_patch_diff(o, updated)
    patch = strip_noop_from_patch_diff(patch)
    code_summary = build_changelog_from_patch(patch, target_role=target_role)
    gen_summary = mergeChangelog(rw_summary, code_summary)
    change_reasons = build_change_reasons_from_patch(patch, target_role=target_role)
    omit = collect_narrative_omission_warnings(o, updated, narrative_brief)
    all_warnings = list(rewrite_warnings) + [x for x in omit if x]
    quality_audit = build_rewrite_quality_audit(o, updated, patch, narrative_brief, stage_a, target_role)
    if (quality_audit.get("flags") or {}).get("skills_expected_but_unchanged"):
        all_warnings.append(SKILLS_EXPECTED_BUT_UNCHANGED_WARNING)

    result = {
        "summary": gen_summary,
        "updatedResumeData": updated,
        "patchDiff": patch,
        "changeReasons": change_reasons,
        "warnings": all_warnings,
    }

    if not return_audit_debug:
        return result

    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    rpsr = rows_per_section_ranked if isinstance(rows_per_section_ranked, dict) else {}
    plan_fit = build_plan_hero_fit(rpsr, nb, o)
    narr_omit = [x for x in omit if x]
    audit = {
        "v": 1,
        "step": "diff_audit",
        "target_role": (target_role or "").strip() or None,
        "plan_hero_fit": plan_fit,
        "merge": {
            "mode": ("legacy_full" if legacy_full else "sparse" if has_edits_key else "from_original"),
            "fell_back": bool(fell_back),
            "had_edits_key": has_edits_key,
            "had_updated_resume_in_stage_a": bool((stage_a or {}).get("updatedResumeData")),
        },
        "stage_a": {"top_level_keys": stage_keys},
        "patch": {
            "section_keys": sorted(patch.keys()) if patch else [],
            "row_counts": patchRowCounts(patch),
        },
        "warnings": {
            "total": len(all_warnings),
            "from_rewrite": list(rewrite_warnings),
            "narrative_omission": narr_omit,
        },
        "change_reasons_count": len(change_reasons),
        "text": {
            "rewrite_note_chars": len(rw_summary),
            "rewrite_note_preview": previewText(rw_summary, 400),
            "merged_summary_preview": previewText(gen_summary, 500),
        },
        "quality": quality_audit,
    }
    return result, audit
