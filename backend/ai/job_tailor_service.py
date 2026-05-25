from __future__ import annotations

import copy
import hashlib
import logging
import os
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List
import re

from dotenv import load_dotenv

# Load backend/.env even when the process cwd is not `backend/` (e.g. some uvicorn launches).
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# in use.
from .debugging import build_tailor_review_snapshot
from .extraction import extract_keywords
from .processing import build_tailor_context
from .planning import build_alignment_context, build_tailor_plan
from .strategy import build_job_strategy
from .narrative import request_narrative_brief
from fastapi import HTTPException

from .prompt import (
    build_pass_b_system,
    build_pass_b_user,
    build_prompt,
    normalize_tailor_preferences,
    project_quality_repair_debug,
    project_quality_repair_ids_for_narrative,
    skillsFitSignals,
    tailor_ab_experiment_enabled,
)
from .openai import ai_chat_completion, completion_usage_to_dict, get_openai_model, usage_tokens_compact
from .post_processing import parse_chat_json, parse_pass_b_completion
from .post_processing.resume_diff import apply_sparse_resume_edits, assemble_tailor_result
from .processing.alias_map import get_term_aliases

# schemas.
from .schemas import JobTailorSuggestRequest, JobTailorSuggestResponse

debug = True

logger = logging.getLogger(__name__)

# A/B / compare log (qualitative, opt-in): without TAILOR_AB_LOG, no tailor_ab_runs file is created.
#   TAILOR_AB_LOG=1 — append one line to backend/ai/debug_out/tailor_ab_runs.jsonl with identity,
#       change_reasons, warnings, patch_preview (before/after text from patchDiff), merge_fell_back.
#   TAILOR_AB_EXPERIMENT=1 — use prompt text from prompt_builder.TAILOR_AB_EXPERIMENT_APPEND
#   TAILOR_SAVE_SAMPLES=1 — append to backend/ai/samples/job_samples.jsonl (opt-in); skips if role_fingerprint already present.
#   Pair rows by job_fingerprint (target_role + job_description hash).
#   Each line includes `patch_preview`: before/after strings from `patchDiff` (truncated) to compare real edits.
#   TAILOR_TOKEN_LOG — default on: append one JSON object per tailor run to backend/ai/debug_out/token_cost.jsonl
#       (narrative + pass A + pass B token counts, char sizes, job_fingerprint, model). Set TAILOR_TOKEN_LOG=0 to disable.


def usageToJson(usage):
    # OpenAI CompletionUsage (and friends) are not json.dumps-friendly; we store a plain dict in debug.
    d = completion_usage_to_dict(usage)
    if d is not None:
        return d
    if usage is None:
        return None
    return str(usage)


def _preview_trunc(s, max_chars):
    if s is None:
        return ""
    t = str(s).strip()
    if len(t) <= max_chars:
        return t
    return t[: max_chars - 1] + "…"


def _patch_text_preview_for_log(patch, max_field_chars=480):
    """
    Pull string before/after from existing patchDiff; no second diff. Full lists in skills are not inlined.
    """
    if not isinstance(patch, dict) or not patch:
        return None
    out = {}
    sm = patch.get("summary")
    if isinstance(sm, dict) and "before" in sm and "after" in sm:
        out["summary"] = {
            "before": _preview_trunc(sm.get("before"), max_field_chars),
            "after": _preview_trunc(sm.get("after"), max_field_chars),
        }
    for sec in ("experience", "projects", "education"):
        rows = patch.get(sec)
        if not isinstance(rows, list):
            continue
        block = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            rid = row.get("id")
            fc = row.get("fieldsChanged")
            if not isinstance(fc, dict):
                continue
            one = {"id": rid}
            for fk, delta in fc.items():
                if not isinstance(delta, dict) or "before" not in delta or "after" not in delta:
                    continue
                b, a = delta.get("before"), delta.get("after")
                if isinstance(b, (dict, list)) and isinstance(a, (dict, list)):
                    continue
                if isinstance(b, (dict, list)) or isinstance(a, (dict, list)):
                    one[fk] = {"before": None, "after": None, "note": "non-string field; see tailor_05_result.json"}
                    continue
                one[fk] = {
                    "before": _preview_trunc(b, max_field_chars),
                    "after": _preview_trunc(a, max_field_chars),
                }
            if len(one) > 1:
                block.append(one)
        if block:
            out[sec] = block
    sk = patch.get("skills")
    if isinstance(sk, list) and sk:
        if any(isinstance(x, dict) and x.get("id") == "_orderOrFullReplace" for x in sk):
            out["skills"] = [
                {
                    "id": "_orderOrFullReplace",
                    "note": "skills reordered or full replace; see tailor_05_result.json for full list",
                }
            ]
        else:
            sk_block = []
            for row in sk:
                if not isinstance(row, dict):
                    continue
                rid = row.get("id")
                fc = row.get("fieldsChanged")
                if not isinstance(fc, dict):
                    continue
                one = {"id": rid}
                for fk, delta in fc.items():
                    if not isinstance(delta, dict) or "before" not in delta or "after" not in delta:
                        continue
                    b, a = delta.get("before"), delta.get("after")
                    if isinstance(b, (dict, list)) or isinstance(a, (dict, list)):
                        one[fk] = {
                            "note": "complex skill row delta; see tailor_05_result.json",
                        }
                        continue
                    one[fk] = {
                        "before": _preview_trunc(b, max_field_chars),
                        "after": _preview_trunc(a, max_field_chars),
                    }
                if len(one) > 1:
                    sk_block.append(one)
            if sk_block and "skills" not in out:
                out["skills"] = sk_block
    return out if out else None


def _env_truthy(name):
    v = (os.getenv(name) or "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _token_log_enabled():
    # Opt-in: keep debug_out focused on the five current run files by default.
    v = (os.getenv("TAILOR_TOKEN_LOG") or "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _sum_usage_compacts(*parts) -> dict:
    inp = out = tot = 0
    for p in parts:
        if not p or not isinstance(p, dict):
            continue
        inp += int(p.get("input") or 0)
        out += int(p.get("output") or 0)
        tot += int(p.get("total") or 0)
    return {"input": inp, "output": out, "total": tot}


def _append_token_cost_jsonl(
    *,
    payload: dict,
    model: str,
    usage_narr,
    usage_a,
    usage_b,
    pass_b_ran: bool,
    text_a: str,
    system_a: str,
    user_a: str,
    text_b: str,
    system_b: str,
    user_b: str,
    narr_char_meta: dict,
):
    if not _token_log_enabled():
        return
    tr = (payload.get("target_role") or "") if isinstance(payload, dict) else ""
    jd = (payload.get("job_description") or "") if isinstance(payload, dict) else ""
    fp = hashlib.sha256(f"{tr}\n{jd}".encode("utf-8")).hexdigest()[:12]
    nt = usage_tokens_compact(usage_narr) or {"input": 0, "output": 0, "total": 0}
    at = usage_tokens_compact(usage_a) or {"input": 0, "output": 0, "total": 0}
    bt = usage_tokens_compact(usage_b) if pass_b_ran and usage_b else None
    if pass_b_ran:
        total = _sum_usage_compacts(nt, at, bt or {"input": 0, "output": 0, "total": 0})
    else:
        total = _sum_usage_compacts(nt, at)

    def _merge_tokens_and_chars(triple, ch):
        d = {**triple}
        if ch and isinstance(ch, dict):
            for k, v in ch.items():
                if v is not None:
                    d[k] = v
            if ch.get("system_chars") is not None and ch.get("user_chars") is not None:
                d["prompt_chars"] = int(ch.get("system_chars") or 0) + int(ch.get("user_chars") or 0)
        return d

    n_ch = {k: v for k, v in (narr_char_meta or {}).items() if v is not None} if narr_char_meta else {}
    if n_ch.get("system_chars") is not None and n_ch.get("user_chars") is not None:
        n_ch["prompt_chars"] = int(n_ch.get("system_chars") or 0) + int(n_ch.get("user_chars") or 0)
    a_ch = {
        "system_chars": len(system_a) if isinstance(system_a, str) else 0,
        "user_chars": len(user_a) if isinstance(user_a, str) else 0,
        "completion_chars": len(text_a) if isinstance(text_a, str) else 0,
    }
    a_ch["prompt_chars"] = a_ch["system_chars"] + a_ch["user_chars"]
    b_block = None
    if pass_b_ran:
        b_tok = bt if bt is not None else {"input": 0, "output": 0, "total": 0}
        b_ch = {
            "system_chars": len(system_b) if isinstance(system_b, str) else 0,
            "user_chars": len(user_b) if isinstance(user_b, str) else 0,
            "completion_chars": len(text_b) if isinstance(text_b, str) else 0,
        }
        b_ch["prompt_chars"] = b_ch["system_chars"] + b_ch["user_chars"]
        b_block = _merge_tokens_and_chars(b_tok, b_ch)

    row = {
        "ts_utc": datetime.now(timezone.utc).isoformat(),
        "job_fingerprint": fp,
        "model": (model or "").strip() or None,
        "total": total,
        "narrative": _merge_tokens_and_chars(nt, n_ch),
        "passA": _merge_tokens_and_chars(at, a_ch),
        "passB": b_block,
        "passB_skipped": None if pass_b_ran else "no_skill_rows",
    }
    base = Path(__file__).resolve().parent / "debug_out"
    base.mkdir(parents=True, exist_ok=True)
    path = base / "token_cost.jsonl"
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    logger.info(
        "token_cost: job_fingerprint=%s total_tokens=%s (in=%s out=%s)",
        fp,
        total.get("total"),
        total.get("input"),
        total.get("output"),
    )


def _job_sample_fingerprint(target_role, company, job_description):
    tr = (target_role or "").strip()
    co = (company or "").strip() if isinstance(company, str) else ""
    jd = (job_description or "").strip() if isinstance(job_description, str) else ""
    raw = f"{tr}\n{co}\n{jd}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]


def _next_jsonl_line_id(path):
    if not path.is_file():
        return 1
    n = 0
    with path.open("r", encoding="utf-8") as f:
        for _ in f:
            n += 1
    return n + 1


def _job_sample_fingerprint_exists(path, fp):
    if not path.is_file():
        return False
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except json.JSONDecodeError:
                continue
            if o.get("role_fingerprint") == fp:
                return True
    return False


def _append_job_sample(payload) -> None:
    if not _env_truthy("TAILOR_SAVE_SAMPLES"):
        return
    if not isinstance(payload, dict):
        return
    tr = payload.get("target_role") or ""
    co = payload.get("company")
    if not isinstance(co, str):
        co = co or ""
    jd = payload.get("job_description") or ""
    if not (str(jd).strip() or str(tr).strip()):
        return
    base = Path(__file__).resolve().parent / "samples"
    base.mkdir(parents=True, exist_ok=True)
    path = base / "job_samples.jsonl"
    fp = _job_sample_fingerprint(tr, co, jd)
    if _job_sample_fingerprint_exists(path, fp):
        return
    line_id = _next_jsonl_line_id(path)
    row = {
        "id": line_id,
        "role_fingerprint": fp,
        "target_role": tr[:240] if tr else "",
        "company": (co[:180] if co else "") or "",
        "job_description": str(jd) if jd is not None else "",
        "saved_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    logger.info(
        "job_samples: id=%s role_fingerprint=%s title=%r company=%r",
        line_id,
        fp,
        (tr[:60] + "…") if len(tr) > 60 else tr,
        (co[:40] + "…") if len(co) > 40 else co,
    )


def _append_tailor_ab_log(*, payload, diff_audit, final_out):
    if not _env_truthy("TAILOR_AB_LOG"):
        return
    if diff_audit is None:
        return
    base = Path(__file__).resolve().parent / "debug_out"
    base.mkdir(parents=True, exist_ok=True)
    path = base / "tailor_ab_runs.jsonl"
    tr = (payload.get("target_role") or "") if isinstance(payload, dict) else ""
    jd = (payload.get("job_description") or "") if isinstance(payload, dict) else ""
    co = (payload.get("company") or "") if isinstance(payload, dict) else ""
    fp = hashlib.sha256(f"{tr}\n{jd}".encode("utf-8")).hexdigest()[:12]
    warn = final_out.get("warnings") or [] if isinstance(final_out, dict) else []
    cr = final_out.get("changeReasons") or [] if isinstance(final_out, dict) else []
    merge = (diff_audit or {}).get("merge") or {}
    pdiff = (final_out.get("patchDiff") or {}) if isinstance(final_out, dict) else {}
    row = {
        "ts_utc": datetime.now(timezone.utc).isoformat(),
        "ab_experiment": tailor_ab_experiment_enabled(),
        "job_fingerprint": fp,
        "target_role": tr[:240] if tr else "",
        "company": (co[:120] if isinstance(co, str) else ""),
        "change_reasons": cr if isinstance(cr, list) else [],
        "warnings": warn if isinstance(warn, list) else [],
        "patch_preview": _patch_text_preview_for_log(pdiff),
        "merge_fell_back": merge.get("fell_back"),
    }
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    logger.info("tailor_ab_runs: experiment=%s fp=%s", row["ab_experiment"], fp)


def editsDropSkills(stage):
    e = (stage or {}).get("edits")
    if not isinstance(e, dict):
        return stage
    e2 = {k: v for k, v in e.items() if k != "skills"}
    s = dict(stage) if isinstance(stage, dict) else {}
    s["edits"] = e2
    return s


def _row_id(row):
    if not isinstance(row, dict):
        return None
    rid = row.get("id")
    if isinstance(rid, float) and rid == int(rid):
        return int(rid)
    return rid if isinstance(rid, int) else rid


def _row_text(row):
    if not isinstance(row, dict):
        return ""
    parts = []
    for key in ("title", "description", "tech_stack", "skills", "company"):
        value = row.get(key)
        if isinstance(value, list):
            parts.extend(str(x) for x in value if str(x).strip())
        elif isinstance(value, str) and value.strip():
            parts.append(value)
    return " ".join(parts).lower()


def _split_role_terms(value):
    if not isinstance(value, str):
        return []
    chunks = re.findall(r"[a-zA-Z][a-zA-Z0-9+#./-]{2,}", value.lower())
    stop = {
        "the",
        "and",
        "for",
        "with",
        "from",
        "role",
        "job",
        "developer",
        "manager",
        "specialist",
        "associate",
        "coordinator",
        "engineer",
        "analyst",
    }
    return [c for c in chunks if c not in stop]


def _priority_selection_terms(tailor_context, payload=None, limit=24):
    weighted = []
    tc = tailor_context if isinstance(tailor_context, dict) else {}
    payload = payload if isinstance(payload, dict) else {}

    for idx, entry in enumerate(tc.get("keywords") or []):
        if not isinstance(entry, dict):
            continue
        term = str(entry.get("term") or "").strip().lower()
        if term:
            weighted.append({"term": term, "weight": max(2.0, 5.0 - (idx * 0.2)), "source": "jd_keyword"})
    for hit in tc.get("resumeHits") or []:
        term = str(hit or "").strip().lower()
        if term:
            weighted.append({"term": term, "weight": 3.5, "source": "resume_hit"})
    for domain in tc.get("activeDomains") or []:
        term = str(domain or "").strip().lower()
        if term:
            weighted.append({"term": term, "weight": 1.5, "source": "active_domain"})
    for term in _split_role_terms(str(payload.get("target_role") or tc.get("targetRole") or "")):
        weighted.append({"term": term, "weight": 1.25, "source": "target_role"})

    out = []
    seen = set()
    for item in weighted:
        term = item["term"]
        key = term.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
        if len(out) >= limit:
            break
    return out


def _term_in_text(term, text):
    if not term or not text:
        return False
    aliases = set(get_term_aliases(term) or set())
    normalized = str(term or "").strip().lower()
    if normalized == "sql":
        aliases.update({"postgres", "postgresql", "mysql", "sqlite", "sql queries"})
    expanded = set()
    for alias in aliases or {term}:
        a = str(alias or "").strip().lower()
        if not a:
            continue
        expanded.add(a)
        if a.endswith("s") and len(a) > 4:
            expanded.add(a[:-1])
        elif len(a) > 3:
            expanded.add(a + "s")
    for a in expanded:
        if re.search(r"(?<![a-z0-9])" + re.escape(a) + r"(?![a-z0-9])", text):
            return True
    return False


def _project_fit_score(row, priority_terms):
    text = _row_text(row)
    if not text:
        return {"score": 0.0, "matchedTerms": [], "evidenceDensity": "none"}
    score = 0.0
    matched = []
    for item in priority_terms:
        term = item.get("term") if isinstance(item, dict) else str(item or "")
        weight = float(item.get("weight") or 1.0) if isinstance(item, dict) else 1.0
        if _term_in_text(term, text):
            score += weight
            matched.append(term)
    unique_matched = []
    seen = set()
    for term in matched:
        key = term.lower()
        if key in seen:
            continue
        seen.add(key)
        unique_matched.append(term)
    if score >= 8 or len(unique_matched) >= 4:
        density = "high"
    elif score >= 4 or len(unique_matched) >= 2:
        density = "medium"
    elif score > 0:
        density = "low"
    else:
        density = "none"
    return {"score": round(score, 3), "matchedTerms": unique_matched[:8], "evidenceDensity": density}


def _int_id_list(value):
    out = []
    if not isinstance(value, list):
        return out
    for item in value:
        if isinstance(item, int):
            out.append(item)
        elif isinstance(item, float) and item == int(item):
            out.append(int(item))
        elif isinstance(item, str) and item.strip().lstrip("-").isdigit():
            out.append(int(item.strip()))
    return list(dict.fromkeys(out))


def _project_scores_from_plan(section_details):
    rows = (((section_details or {}).get("rowsPerSectionRanked") or {}).get("projects") or [])
    out = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        rid = row.get("id")
        if isinstance(rid, float) and rid == int(rid):
            rid = int(rid)
        if not isinstance(rid, int):
            continue
        try:
            score = float(row.get("score") or row.get("jdEvidenceScore") or row.get("hits") or 0)
        except (TypeError, ValueError):
            score = 0.0
        out[rid] = {
            "score": score,
            "hits": int(row.get("hits") or 0),
            "matchedTerms": row.get("matchedTerms") if isinstance(row.get("matchedTerms"), list) else [],
        }
    return out


def _project_title_by_id(resume_data):
    out = {}
    for row in (resume_data or {}).get("projects") or []:
        if not isinstance(row, dict):
            continue
        rid = _row_id(row)
        if isinstance(rid, int):
            out[rid] = str(row.get("title") or f"Project {rid}").strip() or f"Project {rid}"
    return out


def repair_narrative_project_selection(narrative_brief, resume_data, section_details, payload):
    """
    Deterministic guard before Pass A: if one-page mode + weighted project rank says
    a dropped project is stronger than a kept/maybe row, make selection explicit before
    the rewrite model ever runs.
    """
    if not isinstance(narrative_brief, dict) or not isinstance(resume_data, dict):
        return narrative_brief, None
    prefs = (payload or {}).get("style_preferences") if isinstance(payload, dict) else {}
    one_page = isinstance(prefs, dict) and prefs.get("length_target") == "one_page"
    if not one_page:
        return narrative_brief, None

    projects = [r for r in (resume_data.get("projects") or []) if isinstance(r, dict)]
    valid_ids = [_row_id(r) for r in projects if isinstance(_row_id(r), int)]
    valid_ids = [x for x in valid_ids if isinstance(x, int)]
    if len(valid_ids) <= 1:
        return narrative_brief, None

    plan_scores = _project_scores_from_plan(section_details)
    priority_terms = _priority_selection_terms({}, payload)
    by_id = {_row_id(row): row for row in projects}
    scored = {}
    for pid in valid_ids:
        plan = plan_scores.get(pid) or {}
        if plan:
            scored[pid] = {
                "score": round(float(plan.get("score") or 0), 3),
                "hits": int(plan.get("hits") or 0),
                "matchedTerms": list(plan.get("matchedTerms") or []),
                "source": "plan",
            }
        else:
            fit = _project_fit_score(by_id.get(pid), priority_terms)
            scored[pid] = {
                "score": float(fit.get("score") or 0),
                "hits": len(fit.get("matchedTerms") or []),
                "matchedTerms": list(fit.get("matchedTerms") or []),
                "source": "fallback",
            }

    ranked_ids = sorted(
        valid_ids,
        key=lambda pid: (-(scored.get(pid, {}).get("score") or 0), -(scored.get(pid, {}).get("hits") or 0), valid_ids.index(pid)),
    )
    existing_keep = _int_id_list(narrative_brief.get("keepProjects"))
    existing_drop = _int_id_list(narrative_brief.get("dropProjects"))
    existing_maybe = _int_id_list(narrative_brief.get("maybeProjects"))
    keep_target = max(len(existing_keep), min(3, len(valid_ids)))
    if not existing_keep and len(valid_ids) >= 4:
        keep_target = 3
    keep_target = min(4, max(1, keep_target))

    selected = []
    for pid in ranked_ids:
        score = scored.get(pid, {}).get("score") or 0
        hits = scored.get(pid, {}).get("hits") or 0
        if score <= 0 and hits <= 0 and len(selected) >= max(1, len(existing_keep)):
            continue
        selected.append(pid)
        if len(selected) >= keep_target:
            break
    if not selected:
        return narrative_brief, None

    selected_set = set(selected)
    old_kept_set = set(existing_keep)
    promoted = [pid for pid in selected if pid in set(existing_drop) | set(existing_maybe)]
    demoted = [pid for pid in existing_keep if pid not in selected_set]
    maybe_dropped = [pid for pid in existing_maybe if pid not in selected_set]
    if not promoted and not demoted and not maybe_dropped:
        return narrative_brief, None

    updated = copy.deepcopy(narrative_brief)
    updated["keepProjects"] = selected
    updated["dropProjects"] = [pid for pid in valid_ids if pid not in selected_set]
    updated["maybeProjects"] = []
    updated["heroProjects"] = selected[:4]
    updated["rewriteProjects"] = selected[:4]
    updated["supportingProjects"] = []
    updated["peripheralProjects"] = [pid for pid in valid_ids if pid not in selected_set]

    titles = _project_title_by_id(resume_data)
    rationale = list(updated.get("selectionRationale") or [])
    for pid in promoted[:3]:
        terms = ", ".join((scored.get(pid) or {}).get("matchedTerms") or [])
        label = titles.get(pid, f"Project {pid}")
        if terms:
            rationale.append(f"Selection guard kept {label} because it carries stronger weighted evidence for this posting ({terms}).")
        else:
            rationale.append(f"Selection guard kept {label} because it ranked above a previously kept project for this posting.")
    for pid in demoted[:3]:
        label = titles.get(pid, f"Project {pid}")
        rationale.append(f"Selection guard moved {label} out of the one-page draft because stronger project evidence ranked ahead of it.")
    for pid in maybe_dropped[:3]:
        label = titles.get(pid, f"Project {pid}")
        rationale.append(f"Selection guard dropped maybe project {label} for one-page focus.")
    updated["selectionRationale"] = list(dict.fromkeys([x for x in rationale if isinstance(x, str) and x.strip()]))[:8]

    debug_payload = {
        "onePageSelectionGuard": True,
        "keepTarget": keep_target,
        "oldKeepProjects": existing_keep,
        "oldDropProjects": existing_drop,
        "oldMaybeProjects": existing_maybe,
        "newKeepProjects": updated["keepProjects"],
        "newDropProjects": updated["dropProjects"],
        "promotedProjectIds": promoted,
        "demotedProjectIds": demoted,
        "maybeDroppedProjectIds": maybe_dropped,
        "projectScores": {
            str(pid): {
                **(scored.get(pid) or {}),
                "title": titles.get(pid, f"Project {pid}"),
            }
            for pid in ranked_ids
        },
    }
    return updated, debug_payload


def _append_stage_warning(stage, warning):
    if not warning:
        return stage
    out = dict(stage) if isinstance(stage, dict) else {}
    warnings = out.get("warnings")
    if not isinstance(warnings, list):
        warnings = []
    if warning not in warnings:
        warnings.append(warning)
    out["warnings"] = warnings
    return out


def protect_transferable_experience_for_bridge(narrative_brief):
    """For adjacent/stretch pivots, keep one non-keyword experience row when it proves transferable work shape."""
    if not isinstance(narrative_brief, dict):
        return narrative_brief, None
    mode = str(narrative_brief.get("alignmentMode") or "").strip().lower()
    if mode not in ("adjacent", "stretch"):
        return narrative_brief, None
    dropped = _int_id_list(narrative_brief.get("dropExperience"))
    if not dropped:
        return narrative_brief, None
    transferable = narrative_brief.get("transferableEvidence")
    if not isinstance(transferable, list):
        return narrative_brief, None

    signal_blob = " ".join(
        str(x or "")
        for x in (
            list(narrative_brief.get("primaryStory") or [])
            + list(narrative_brief.get("secondaryStory") or [])
            + list(narrative_brief.get("skillsStrategy") or [])
            + [str(narrative_brief.get("candidateAngle") or "")]
            + [
                str((item or {}).get("term") or "")
                for item in (narrative_brief.get("jdSignalIntent") or [])
                if isinstance(item, dict)
            ]
        )
    ).lower()
    service_bridge_cues = {
        "account",
        "client",
        "customer",
        "guest",
        "hospitality",
        "interpersonal",
        "operations",
        "outreach",
        "phone",
        "relationship",
        "restaurant",
        "sales",
        "scheduling",
        "service",
    }
    if not any(cue in signal_blob for cue in service_bridge_cues):
        return narrative_brief, None

    promoted = []
    for item in transferable:
        if not isinstance(item, dict) or item.get("section") != "experience":
            continue
        rid = item.get("id")
        if isinstance(rid, float) and rid == int(rid):
            rid = int(rid)
        if rid not in dropped:
            continue
        themes = item.get("themes") if isinstance(item.get("themes"), list) else []
        theme_text = " ".join(str((x or {}).get("theme") or "") for x in themes if isinstance(x, dict)).lower()
        if any(key in theme_text for key in ("coordination", "communication", "pace", "response", "metrics", "compliance")):
            promoted.append({"id": rid, "label": item.get("label") or f"experience {rid}", "themes": theme_text})
        if promoted:
            break
    if not promoted:
        return narrative_brief, None

    updated = copy.deepcopy(narrative_brief)
    promoted_ids = [x["id"] for x in promoted]
    updated["dropExperience"] = [rid for rid in _int_id_list(updated.get("dropExperience")) if rid not in promoted_ids]
    keep = _int_id_list(updated.get("keepExperience"))
    for rid in promoted_ids:
        if rid not in keep:
            keep.append(rid)
    updated["keepExperience"] = keep

    rewrite = _int_id_list(updated.get("rewriteExperience"))
    for rid in promoted_ids:
        if rid not in rewrite and len(rewrite) < 2:
            rewrite.append(rid)
    updated["rewriteExperience"] = rewrite

    rationale = list(updated.get("selectionRationale") or [])
    for item in promoted:
        rationale.append(
            f"Bridge guard kept {item['label']} because this adjacent-role draft needs transferable coordination or pace evidence, not only exact keyword matches."
        )
    updated["selectionRationale"] = list(dict.fromkeys([x for x in rationale if isinstance(x, str) and x.strip()]))[:8]
    return updated, {"bridgeExperienceGuard": True, "promotedExperienceIds": promoted_ids}


def _strategy_wants_service_experience(job_strategy):
    if not isinstance(job_strategy, dict):
        return False
    archetype = str(job_strategy.get("roleArchetype") or "").strip().lower()
    persona = str(job_strategy.get("persona") or "").strip().lower()
    if archetype in {
        "sales_growth_outreach",
        "financial_customer_education",
        "hospitality_customer_service",
    }:
        return True
    if persona == "sales_growth":
        return True
    if persona == "operations_admin":
        blob = " ".join(
            str(x or "")
            for x in (
                list(job_strategy.get("proofStyle") or [])
                + list(job_strategy.get("keepPriorities") or [])
                + list(job_strategy.get("skillPreserve") or [])
            )
        ).lower()
        return any(cue in blob for cue in ("communication", "coordination", "customer", "service", "client"))
    return False


def _is_service_experience_row(row):
    text = _row_text(row)
    if not text:
        return False
    cues = {
        "bar",
        "customer",
        "delivery",
        "expo",
        "guest",
        "hospitality",
        "host",
        "interpersonal",
        "kitchen",
        "phone",
        "restaurant",
        "sales",
        "server",
        "service",
        "store",
        "team",
    }
    return any(re.search(r"(?<![a-z0-9])" + re.escape(cue) + r"(?![a-z0-9])", text) for cue in cues)


def apply_strategy_selection_guard(narrative_brief, resume_data, tailor_context):
    if not isinstance(narrative_brief, dict):
        return narrative_brief, None
    tc = tailor_context if isinstance(tailor_context, dict) else {}
    job_strategy = tc.get("jobStrategy") if isinstance(tc.get("jobStrategy"), dict) else {}
    if not _strategy_wants_service_experience(job_strategy):
        return narrative_brief, None

    dropped = _int_id_list(narrative_brief.get("dropExperience"))
    if not dropped:
        return narrative_brief, None
    experience_rows = (resume_data or {}).get("experience") if isinstance(resume_data, dict) else []
    if not isinstance(experience_rows, list):
        return narrative_brief, None

    row_by_id = {_row_id(row): row for row in experience_rows if isinstance(row, dict)}
    promoted = []
    for rid in dropped:
        row = row_by_id.get(rid)
        if not row or not _is_service_experience_row(row):
            continue
        promoted.append(
            {
                "id": rid,
                "label": str(row.get("title") or row.get("company") or f"experience {rid}").strip(),
            }
        )
        if len(promoted) >= 2:
            break
    if not promoted:
        return narrative_brief, None

    promoted_ids = [item["id"] for item in promoted]
    updated = copy.deepcopy(narrative_brief)
    updated["dropExperience"] = [rid for rid in _int_id_list(updated.get("dropExperience")) if rid not in promoted_ids]
    keep = _int_id_list(updated.get("keepExperience"))
    for rid in promoted_ids:
        if rid not in keep:
            keep.append(rid)
    updated["keepExperience"] = keep
    rewrite = _int_id_list(updated.get("rewriteExperience"))
    for rid in promoted_ids:
        if rid not in rewrite and len(rewrite) < 3:
            rewrite.append(rid)
    updated["rewriteExperience"] = rewrite

    rationale = list(updated.get("selectionRationale") or [])
    archetype = str(job_strategy.get("roleArchetype") or job_strategy.get("persona") or "this strategy").strip()
    for item in promoted:
        rationale.append(
            f"Strategy guard kept {item['label']} because {archetype} needs people-facing or coordination evidence."
        )
    updated["selectionRationale"] = list(dict.fromkeys([x for x in rationale if isinstance(x, str) and x.strip()]))[:8]
    return updated, {
        "strategySelectionGuard": True,
        "roleArchetype": job_strategy.get("roleArchetype"),
        "promotedExperienceIds": promoted_ids,
        "reason": "protected service/customer-facing experience for this strategy",
    }


def focus_adjacent_project_selection_for_strong_retarget(narrative_brief, payload):
    """
    Strong adjacent/stretch retargets need visible selection, not just rewritten heroes.

    Balanced length can still be focused: keep the best transferable project proof and
    drop low-signal maybe projects so the final draft actually reads role-shaped.
    """
    if not isinstance(narrative_brief, dict):
        return narrative_brief, None
    prefs = (payload or {}).get("style_preferences") if isinstance(payload, dict) else {}
    if not isinstance(prefs, dict):
        return narrative_brief, None
    mode = str(narrative_brief.get("alignmentMode") or "").strip().lower()
    freedom = str(prefs.get("rewrite_freedom") or "").strip().lower()
    length_target = str(prefs.get("length_target") or "").strip().lower()
    if mode not in ("adjacent", "stretch") or freedom not in ("strong", "transform"):
        return narrative_brief, None
    if length_target == "detailed":
        target_count = 4
    else:
        target_count = 3

    existing_keep = _int_id_list(narrative_brief.get("keepProjects"))
    existing_drop = _int_id_list(narrative_brief.get("dropProjects"))
    existing_maybe = _int_id_list(narrative_brief.get("maybeProjects"))
    visible = list(dict.fromkeys(existing_keep + existing_maybe))
    if len(visible) <= target_count:
        return narrative_brief, None

    theme_weights = {
        "compliance": 3.0,
        "standards": 3.0,
        "metrics": 3.0,
        "reporting": 3.0,
        "workflow": 2.5,
        "automation": 2.5,
        "coordination": 2.0,
        "communication": 2.0,
        "pace": 1.5,
        "response": 1.5,
    }
    transfer = narrative_brief.get("transferableEvidence") if isinstance(narrative_brief.get("transferableEvidence"), list) else []
    scored = {}
    labels = {}
    for item in transfer:
        if not isinstance(item, dict) or item.get("section") != "projects":
            continue
        rid = item.get("id")
        if isinstance(rid, float) and rid == int(rid):
            rid = int(rid)
        if not isinstance(rid, int):
            continue
        labels[rid] = str(item.get("label") or f"Project {rid}").strip() or f"Project {rid}"
        themes = item.get("themes") if isinstance(item.get("themes"), list) else []
        score = 0.0
        matched = []
        for theme in themes:
            if not isinstance(theme, dict):
                continue
            text = str(theme.get("theme") or "").lower()
            terms = " ".join(str(x or "") for x in (theme.get("terms") or [])).lower()
            blob = f"{text} {terms}"
            for key, weight in theme_weights.items():
                if key in blob:
                    score += weight
                    matched.append(key)
        scored[rid] = {"score": score, "matched": list(dict.fromkeys(matched))}

    selected = []
    for pid in existing_keep:
        if pid in visible and pid not in selected:
            selected.append(pid)
    ranked_maybe = sorted(
        [pid for pid in existing_maybe if pid not in selected],
        key=lambda pid: (-(scored.get(pid, {}).get("score") or 0), visible.index(pid)),
    )
    for pid in ranked_maybe:
        if len(selected) >= target_count:
            break
        if (scored.get(pid, {}).get("score") or 0) <= 0 and len(selected) >= max(1, len(existing_keep)):
            continue
        selected.append(pid)
    if not selected or set(selected) == set(visible):
        return narrative_brief, None

    selected_set = set(selected)
    newly_dropped = [pid for pid in visible if pid not in selected_set]
    if not newly_dropped:
        return narrative_brief, None

    updated = copy.deepcopy(narrative_brief)
    updated["keepProjects"] = selected
    updated["maybeProjects"] = []
    updated["dropProjects"] = list(dict.fromkeys(existing_drop + newly_dropped))
    updated["rewriteProjects"] = [pid for pid in _int_id_list(updated.get("rewriteProjects")) if pid in selected_set]
    updated["repairProjects"] = [pid for pid in _int_id_list(updated.get("repairProjects")) if pid in selected_set]
    updated["heroProjects"] = [pid for pid in _int_id_list(updated.get("heroProjects")) if pid in selected_set]
    updated["supportingProjects"] = [pid for pid in _int_id_list(updated.get("supportingProjects")) if pid in selected_set]
    updated["peripheralProjects"] = newly_dropped

    rationale = list(updated.get("selectionRationale") or [])
    kept_names = [labels.get(pid, f"Project {pid}") for pid in selected if pid not in existing_keep]
    dropped_names = [labels.get(pid, f"Project {pid}") for pid in newly_dropped]
    if kept_names:
        rationale.append("Strong retarget kept transferable project proof: " + ", ".join(kept_names[:3]) + ".")
    if dropped_names:
        rationale.append("Strong retarget moved lower-fit maybe projects out of this adjacent-role draft: " + ", ".join(dropped_names[:4]) + ".")
    updated["selectionRationale"] = list(dict.fromkeys([x for x in rationale if isinstance(x, str) and x.strip()]))[:8]

    return updated, {
        "strongAdjacentProjectFocus": True,
        "targetProjectCount": target_count,
        "oldVisibleProjectIds": visible,
        "newKeepProjectIds": selected,
        "newDropProjectIds": updated["dropProjects"],
        "projectScores": {str(pid): scored.get(pid, {"score": 0, "matched": []}) for pid in visible},
    }


def protect_high_fit_project_drops(stage, resume_data, tailor_context, payload=None):
    """Keep rows with strong current-JD evidence unless kept rows clearly cover the same story better."""
    if not isinstance(stage, dict) or not isinstance(stage.get("edits"), dict):
        return stage
    edits = dict(stage.get("edits") or {})
    drop_ids = edits.get("removedProjectIds")
    if not isinstance(drop_ids, list) or not drop_ids:
        return stage
    projects = resume_data.get("projects") if isinstance(resume_data, dict) else []
    by_id = {_row_id(row): row for row in projects or [] if isinstance(row, dict)}
    priority_terms = _priority_selection_terms(tailor_context, payload)
    all_ids = [_row_id(row) for row in projects or [] if isinstance(row, dict)]
    drop_set = {x for x in drop_ids}
    kept_ids = [pid for pid in all_ids if pid not in drop_set]
    scored = {pid: _project_fit_score(by_id.get(pid), priority_terms) for pid in all_ids}
    kept_scores = [scored.get(pid, {}).get("score", 0) for pid in kept_ids]
    best_kept = max(kept_scores or [0])
    protected = []
    for pid in drop_ids:
        fit = scored.get(pid, {})
        score = float(fit.get("score") or 0)
        density = fit.get("evidenceDensity")
        # Strong current-JD evidence should not disappear unless several kept projects are materially stronger.
        if (density in ("medium", "high") or score >= 4) and not (len(kept_ids) >= 3 and best_kept >= score + 3):
            protected.append(pid)
    if not protected:
        return stage
    protected_set = set(protected)
    edits["removedProjectIds"] = [pid for pid in drop_ids if pid not in protected_set]

    prefs = (payload or {}).get("style_preferences") if isinstance(payload, dict) else {}
    one_page = isinstance(prefs, dict) and prefs.get("length_target") == "one_page"
    replacement_removed = []
    edited_ids = {
        _row_id(row)
        for row in edits.get("projects") or []
        if isinstance(row, dict) and _row_id(row) is not None
    }
    if one_page and protected:
        current_kept = [pid for pid in all_ids if pid not in set(edits.get("removedProjectIds") or [])]
        for pid in protected:
            p_score = float(scored.get(pid, {}).get("score") or 0)
            candidates = [
                kid
                for kid in current_kept
                if kid != pid and kid not in protected_set and kid not in edited_ids
            ]
            if len(current_kept) <= 3 or not candidates:
                continue
            weakest = min(candidates, key=lambda kid: float(scored.get(kid, {}).get("score") or 0))
            weakest_score = float(scored.get(weakest, {}).get("score") or 0)
            if p_score >= weakest_score + 3 and weakest_score <= 2:
                replacement_removed.append(weakest)
                current_kept = [x for x in current_kept if x != weakest]
        if replacement_removed:
            existing = list(edits.get("removedProjectIds") or [])
            for rid in replacement_removed:
                if rid not in existing:
                    existing.append(rid)
            edits["removedProjectIds"] = existing

    if not edits["removedProjectIds"]:
        edits.pop("removedProjectIds", None)
    out = dict(stage)
    out["edits"] = edits
    details = []
    for pid in protected:
        title = str((by_id.get(pid) or {}).get("title") or pid).strip()
        matched = ", ".join((scored.get(pid) or {}).get("matchedTerms") or [])
        details.append(f"{title} ({matched})" if matched else title)
    out = _append_stage_warning(
        out,
        "Selection guard kept high-fit project(s) for this JD: " + ", ".join(details[:4]) + ".",
    )
    if replacement_removed:
        names = [str((by_id.get(pid) or {}).get("title") or pid).strip() for pid in replacement_removed]
        out = _append_stage_warning(
            out,
            "Selection guard removed weaker project(s) to preserve one-page focus: " + ", ".join(names[:4]) + ".",
        )
    return out


def countSkillRows(resume):
    rows = (resume or {}).get("skills") if isinstance(resume, dict) else None
    if not isinstance(rows, list):
        return 0
    n = 0
    for x in rows:
        if isinstance(x, dict) and (x.get("id") is not None or (str(x.get("name") or "")).strip()):
            n += 1
    return n


def passBOnlySkills(stage):
    if not stage or not isinstance((stage or {}).get("edits"), dict):
        return None
    e = (stage or {}).get("edits")
    if "skills" not in e:
        return None
    out = {"edits": {"skills": e["skills"]}}
    if isinstance(stage.get("warnings"), list):
        out["warnings"] = stage.get("warnings")
    return out


def _skill_deletion_budget(n_skill_rows):
    if n_skill_rows <= 0:
        return {"minSurvivorsTarget": 0, "maxOmissionsBudget": 0}
    if n_skill_rows >= 20:
        min_pct = 0.75
    elif n_skill_rows >= 12:
        min_pct = 0.82
    else:
        min_pct = 0.88
    min_survivors = max(1, int((n_skill_rows * min_pct) + 0.9999))
    max_omit = min(5, max(0, n_skill_rows - min_survivors))
    if n_skill_rows < 14:
        max_omit = min(max_omit, 3)
    return {"minSurvivorsTarget": max(min_survivors, n_skill_rows - max_omit), "maxOmissionsBudget": max_omit}


def enforce_pass_b_skill_budget(stage, resume_mid):
    if not isinstance(stage, dict) or not isinstance(stage.get("edits"), dict):
        return stage
    skills = (stage.get("edits") or {}).get("skills")
    original = resume_mid.get("skills") if isinstance(resume_mid, dict) else []
    if not isinstance(skills, list) or not isinstance(original, list):
        return stage
    original_rows = [r for r in original if isinstance(r, dict) and r.get("id") is not None]
    budget = _skill_deletion_budget(len(original_rows))
    min_survivors = int(budget.get("minSurvivorsTarget") or 0)
    if len(skills) >= min_survivors:
        return stage
    seen = {r.get("id") for r in skills if isinstance(r, dict)}
    repaired = list(skills)
    for row in original_rows:
        rid = row.get("id")
        if rid in seen:
            continue
        repaired.append(row)
        seen.add(rid)
        if len(repaired) >= min_survivors:
            break
    out = dict(stage)
    edits = dict(stage.get("edits") or {})
    edits["skills"] = repaired
    out["edits"] = edits
    return _append_stage_warning(
        out,
        f"Skills guard restored {len(repaired) - len(skills)} skill row(s) because Pass B exceeded the deletion budget.",
    )


def _skill_policy_text(row):
    if not isinstance(row, dict):
        return ""
    parts = []
    for key in ("name", "category", "label", "description", "skills"):
        value = row.get(key)
        if isinstance(value, list):
            parts.extend(str(x) for x in value if str(x).strip())
        elif isinstance(value, str) and value.strip():
            parts.append(value)
    return " ".join(parts)


def _skill_policy_norm(value):
    text = str(value or "").lower()
    text = text.replace("&", " and ")
    return re.sub(r"[^a-z0-9+#]+", " ", text).strip()


def _skill_policy_aliases(term):
    aliases = set(get_term_aliases(str(term or "").lower()) or set())
    raw = str(term or "").strip()
    if raw:
        aliases.add(raw)
    norm = _skill_policy_norm(raw)
    if norm in {"aws ec2", "amazon web services ec2"}:
        aliases.update({"aws", "ec2", "aws ec2", "amazon web services"})
    if norm in {"rest api design", "rest apis", "rest api"}:
        aliases.update({"rest api", "rest APIs", "api design", "REST API Design"})
    if norm in {"api integrations", "api integration"}:
        aliases.update({"api integration", "api integrations", "rest api", "third-party api"})
    if norm in {"etl pipelines", "etl pipeline"}:
        aliases.update({"etl", "etl pipeline", "etl pipelines", "data pipelines"})
    if norm in {"data pipelines", "data pipeline"}:
        aliases.update({"data pipeline", "data pipelines", "etl pipelines"})
    return aliases


def _skill_row_matches_policy(row, terms):
    haystack = f" {_skill_policy_norm(_skill_policy_text(row))} "
    if not haystack.strip():
        return False
    for term in terms or []:
        for alias in _skill_policy_aliases(term):
            needle = _skill_policy_norm(alias)
            if needle and f" {needle} " in haystack:
                return True
    return False


def enforce_strategy_skill_preserve(stage, resume_mid, tailor_context):
    if not isinstance(stage, dict) or not isinstance(stage.get("edits"), dict):
        return stage
    skills = (stage.get("edits") or {}).get("skills")
    original = resume_mid.get("skills") if isinstance(resume_mid, dict) else []
    if not isinstance(skills, list) or not isinstance(original, list):
        return stage
    tc = tailor_context if isinstance(tailor_context, dict) else {}
    strategy = tc.get("jobStrategy") if isinstance(tc.get("jobStrategy"), dict) else {}
    preserve_terms = strategy.get("skillPreserve") if isinstance(strategy.get("skillPreserve"), list) else []
    if not preserve_terms:
        return stage

    original_rows = [row for row in original if isinstance(row, dict) and row.get("id") is not None]
    seen = {_row_id(row) for row in skills if isinstance(row, dict)}
    restored = []
    for row in original_rows:
        rid = _row_id(row)
        if rid in seen:
            continue
        if not _skill_row_matches_policy(row, preserve_terms):
            continue
        restored.append(row)
        seen.add(rid)

    if not restored:
        return stage

    out = dict(stage)
    edits = dict(stage.get("edits") or {})
    edits["skills"] = list(skills) + restored
    out["edits"] = edits
    restored_names = [str(row.get("name") or row.get("label") or row.get("category") or row.get("id")) for row in restored]
    preview = ", ".join(restored_names[:4])
    if len(restored_names) > 4:
        preview += f", +{len(restored_names) - 4} more"
    return _append_stage_warning(
        out,
        f"Strategy skills guard restored {len(restored)} preserved skill row(s): {preview}.",
    )


def _rows_by_id(rows):
    out = {}
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        rid = _row_id(row)
        if isinstance(rid, int):
            out[rid] = row
    return out


def _rewrite_repair_targets(diff_audit, max_rows=4):
    quality = (diff_audit or {}).get("quality") or {}
    rw = quality.get("rewrite_quality") or {}
    targets = {"experience": [], "projects": []}

    for item in rw.get("minor_rewrite_rows") or []:
        if not isinstance(item, dict):
            continue
        section = item.get("section")
        rid = item.get("id")
        if section in targets and isinstance(rid, int) and rid not in targets[section]:
            targets[section].append(rid)

    for item in rw.get("filler_phrase_hits") or []:
        if not isinstance(item, dict):
            continue
        section = item.get("section")
        rid = item.get("id")
        if section in targets and isinstance(rid, int) and rid not in targets[section]:
            targets[section].append(rid)

    for item in rw.get("missing_rewrite_rows") or []:
        if not isinstance(item, dict):
            continue
        section = item.get("section")
        rid = item.get("id")
        if section in targets and isinstance(rid, int) and rid not in targets[section]:
            targets[section].append(rid)

    flat = []
    for section in ("experience", "projects"):
        for rid in targets[section]:
            flat.append((section, rid))
    flat = flat[:max_rows]
    return flat


def _repair_row_bundle(section, rid, original_resume, current_resume):
    before_rows = _rows_by_id((original_resume or {}).get(section) or [])
    after_rows = _rows_by_id((current_resume or {}).get(section) or [])
    before = before_rows.get(rid)
    after = after_rows.get(rid)
    if not isinstance(before, dict) or not isinstance(after, dict):
        return None
    keys = ["id", "title", "company", "skills", "tech_stack", "description"]
    return {
        "section": section,
        "id": rid,
        "original": {k: before.get(k) for k in keys if k in before},
        "weakRewrite": {k: after.get(k) for k in keys if k in after},
    }


def build_rewrite_repair_prompt(original_resume, current_resume, diff_audit, narrative_brief, tailor_context, relevant_jd_lines):
    targets = _rewrite_repair_targets(diff_audit)
    bundles = []
    for section, rid in targets:
        bundle = _repair_row_bundle(section, rid, original_resume, current_resume)
        if bundle:
            bundles.append(bundle)
    if not bundles:
        return None, None

    rw = (((diff_audit or {}).get("quality") or {}).get("rewrite_quality") or {})
    system = "\n".join(
        [
            "Return JSON only. You are repairing weak resume tailoring output.",
            "Rewrite only the listed rows. Do not edit skills, removals, dates, employers, schools, or unrelated rows.",
            "Every repaired row must change the first bullet and bullet order/grouping versus weakRewrite.",
            "Remove filler phrases such as robust, enhanced, enhancing, seamless, efficient data handling, and best practices.",
            "Preserve true numbers, tools, employers, project names, and claims from original/weakRewrite. No invented facts.",
            "Output exactly {\"edits\":{\"experience\":[...],\"projects\":[...]}} with only sections you repair.",
        ]
    )
    payload = {
        "targetRole": (tailor_context or {}).get("targetRole"),
        "narrative": {
            "candidateAngle": (narrative_brief or {}).get("candidateAngle"),
            "primaryStory": (narrative_brief or {}).get("primaryStory"),
            "rewriteGoals": (narrative_brief or {}).get("rewriteGoals"),
            "avoid": (narrative_brief or {}).get("avoid"),
        },
        "jdPriorityTerms": [
            str((entry or {}).get("term") or "")
            for entry in ((tailor_context or {}).get("keywords") or [])[:12]
            if isinstance(entry, dict) and str(entry.get("term") or "").strip()
        ],
        "resumeLiteralHits": list((tailor_context or {}).get("resumeHits") or [])[:20],
        "audit": {
            "minorRewriteRows": rw.get("minor_rewrite_rows") or [],
            "fillerPhraseHits": rw.get("filler_phrase_hits") or [],
        },
        "rowsToRepair": bundles,
        "jdExcerpts": relevant_jd_lines,
        "outputShape": {
            "edits": {
                "experience": [{"id": 0, "description": "full repaired bullet block"}],
                "projects": [{"id": 0, "tech_stack": ["optional"], "description": "full repaired bullet block"}],
            }
        },
    }
    user = json.dumps(payload, ensure_ascii=False, indent=2)
    return system, user


def _merge_section_rows(existing_rows, repair_rows):
    if not isinstance(repair_rows, list):
        return existing_rows if isinstance(existing_rows, list) else []
    out = []
    by_id = {}
    for row in existing_rows or []:
        if isinstance(row, dict) and row.get("id") is not None:
            by_id[row.get("id")] = len(out)
        out.append(copy.deepcopy(row))
    for row in repair_rows:
        if not isinstance(row, dict) or row.get("id") is None:
            continue
        rid = row.get("id")
        if rid in by_id:
            merged = dict(out[by_id[rid]]) if isinstance(out[by_id[rid]], dict) else {}
            merged.update(copy.deepcopy(row))
            out[by_id[rid]] = merged
        else:
            by_id[rid] = len(out)
            out.append(copy.deepcopy(row))
    return out


_PLACEHOLDER_PROJECT_BULLET_RE = re.compile(
    r"(?i)\b(stuff|n\s+stuff|and\s+stuff|things|and\s+things|etc\.?|"
    r"made\s+it\s+\w+\s+(?:and|n)\s+stuff|made\s+it\s+\w+\s+(?:and|n)\s+things)\b"
)


def _description_lines(desc):
    if not isinstance(desc, str) or not desc.strip():
        return []
    lines = []
    for raw in re.split(r"[\n\r]+", desc):
        line = raw.strip()
        if not line:
            continue
        text = re.sub(r"^[\-\*\u2022\u25cf\u25cb\d]+[\.\)\s]*", "", line).strip()
        if text:
            lines.append(text)
    return lines


def _remove_placeholder_project_bullets(desc):
    lines = _description_lines(desc)
    if not lines:
        return None, []
    kept = []
    removed = []
    for line in lines:
        if _PLACEHOLDER_PROJECT_BULLET_RE.search(line):
            removed.append(line)
        else:
            kept.append(line)
    if not removed or not kept:
        return None, []
    return "\n".join(f"• {line}" for line in kept), removed


def enforce_project_quality_repairs(stage, resume_data, narrative_brief, style_preferences=None):
    """Fallback when the model ignores thin-bullet repair ids: never let obvious placeholder bullets survive."""
    repair_ids = project_quality_repair_ids_for_narrative(resume_data, narrative_brief, style_preferences)
    if not repair_ids or not isinstance(stage, dict):
        return stage
    projects = (resume_data or {}).get("projects") if isinstance(resume_data, dict) else []
    by_id = _rows_by_id(projects)
    out = copy.deepcopy(stage)
    edits = out.setdefault("edits", {})
    project_edits = edits.get("projects")
    if not isinstance(project_edits, list):
        project_edits = []
    else:
        project_edits = copy.deepcopy(project_edits)

    edit_index = {}
    for idx, row in enumerate(project_edits):
        if isinstance(row, dict) and isinstance(row.get("id"), int):
            edit_index[row.get("id")] = idx

    repaired = []
    for pid in repair_ids:
        source_row = by_id.get(pid)
        if not isinstance(source_row, dict):
            continue
        idx = edit_index.get(pid)
        current_desc = ""
        if idx is not None and isinstance(project_edits[idx], dict):
            current_desc = project_edits[idx].get("description") or ""
        if not current_desc:
            current_desc = source_row.get("description") or ""
        cleaned_desc, removed = _remove_placeholder_project_bullets(current_desc)
        if not cleaned_desc and current_desc != source_row.get("description"):
            cleaned_desc, removed = _remove_placeholder_project_bullets(source_row.get("description") or "")
        if not cleaned_desc:
            continue
        if idx is None:
            edit = {"id": pid, "description": cleaned_desc}
            if isinstance(source_row.get("tech_stack"), list):
                edit["tech_stack"] = copy.deepcopy(source_row.get("tech_stack"))
            project_edits.append(edit)
            edit_index[pid] = len(project_edits) - 1
        else:
            project_edits[idx] = {**project_edits[idx], "description": cleaned_desc}
        repaired.append({"id": pid, "removed": removed[:3]})

    if not repaired:
        return stage
    edits["projects"] = project_edits
    repaired_ids = ", ".join(f"projects:{x['id']}" for x in repaired)
    out = _append_stage_warning(out, f"Quality guard removed placeholder bullets from {repaired_ids}.")
    return out


def enforce_surviving_project_quality_cleanup(stage, resume_data):
    """
    Final deterministic cleanup: any project that survives the tailored draft should not
    keep casual placeholder bullets, even if it was not selected as a hero/repair row.
    """
    if not isinstance(stage, dict) or not isinstance(resume_data, dict):
        return stage
    current_resume = apply_sparse_resume_edits(resume_data, stage)
    projects = current_resume.get("projects") if isinstance(current_resume, dict) else []
    if not isinstance(projects, list):
        return stage

    out = copy.deepcopy(stage)
    edits = out.setdefault("edits", {})
    project_edits = edits.get("projects")
    if not isinstance(project_edits, list):
        project_edits = []
    else:
        project_edits = copy.deepcopy(project_edits)

    edit_index = {}
    for idx, row in enumerate(project_edits):
        if isinstance(row, dict) and isinstance(row.get("id"), int):
            edit_index[row.get("id")] = idx

    repaired = []
    for row in projects:
        if not isinstance(row, dict) or not isinstance(row.get("id"), int):
            continue
        desc = row.get("description") or ""
        cleaned_desc, removed = _remove_placeholder_project_bullets(desc)
        if not cleaned_desc:
            continue
        pid = row.get("id")
        idx = edit_index.get(pid)
        if idx is None:
            project_edits.append({"id": pid, "description": cleaned_desc})
            edit_index[pid] = len(project_edits) - 1
        else:
            project_edits[idx] = {**project_edits[idx], "description": cleaned_desc}
        repaired.append({"id": pid, "removed": removed[:3]})

    if not repaired:
        return stage
    edits["projects"] = project_edits
    repaired_ids = ", ".join(f"projects:{x['id']}" for x in repaired)
    out = _append_stage_warning(out, f"Quality guard removed placeholder bullets from surviving {repaired_ids}.")
    return out


def merge_rewrite_repair(base_stage, repair_stage):
    if not isinstance(repair_stage, dict) or not isinstance(repair_stage.get("edits"), dict):
        return base_stage
    out = copy.deepcopy(base_stage) if isinstance(base_stage, dict) else {"edits": {}}
    edits = out.setdefault("edits", {})
    repair_edits = repair_stage.get("edits") or {}
    for section in ("experience", "projects"):
        if isinstance(repair_edits.get(section), list):
            edits[section] = _merge_section_rows(edits.get(section), repair_edits.get(section))
    warnings = out.get("warnings") if isinstance(out.get("warnings"), list) else []
    repaired_ids = []
    for section in ("experience", "projects"):
        for row in repair_edits.get(section) or []:
            if isinstance(row, dict) and row.get("id") is not None:
                repaired_ids.append(f"{section}:{row.get('id')}")
    if repaired_ids:
        msg = "Rewrite repair pass strengthened weak tailored rows: " + ", ".join(repaired_ids[:6]) + "."
        if msg not in warnings:
            warnings.append(msg)
    if warnings:
        out["warnings"] = warnings
    return out


def _normalize_section_order(value, current=None):
    allowed = ["header", "summary", "experience", "projects", "skills", "education"]
    source = value if isinstance(value, list) and value else current
    if not isinstance(source, list):
        source = []
    out = []
    for item in source:
        key = str(item or "").strip().lower()
        if key in allowed and key not in out:
            out.append(key)
    if not out:
        out = ["header", "summary", "education", "experience", "projects", "skills"]
    if "header" in out:
        out = ["header"] + [x for x in out if x != "header"]
    else:
        out.insert(0, "header")
    for key in allowed:
        if key not in out:
            out.append(key)
    return out


def _normalize_section_visibility(value, resume_data):
    if not isinstance(value, dict):
        return {}
    current = (resume_data or {}).get("sectionVisibility") if isinstance(resume_data, dict) else {}
    current = current if isinstance(current, dict) else {}
    out = {}
    for key in ("summary", "education", "experience", "projects", "skills"):
        if key not in value:
            continue
        raw = value.get(key)
        if isinstance(raw, bool):
            out[key] = raw
        elif isinstance(raw, str):
            low = raw.strip().lower()
            if low in ("true", "yes", "show", "visible", "1"):
                out[key] = True
            elif low in ("false", "no", "hide", "hidden", "0"):
                out[key] = False
    # Never let layout planning hide non-empty core evidence sections.
    for key in ("education", "experience", "projects", "skills"):
        rows = (resume_data or {}).get(key) if isinstance(resume_data, dict) else None
        if isinstance(rows, list) and rows and out.get(key) is False:
            out[key] = bool(current.get(key, True))
    return out


def inject_layout_edits(stage, narrative_brief, resume_data):
    if not isinstance(stage, dict):
        return stage
    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    order = _normalize_section_order(nb.get("layoutSectionOrder"), (resume_data or {}).get("sectionOrder") if isinstance(resume_data, dict) else None) if nb.get("layoutSectionOrder") else []
    visibility = _normalize_section_visibility(nb.get("layoutSectionVisibility"), resume_data)
    summary_decision = nb.get("summaryDecision") if isinstance(nb.get("summaryDecision"), dict) else {}
    summary_action = str(summary_decision.get("action") or "").strip().lower()
    if summary_action in ("show", "hide") and "summary" not in visibility:
        visibility["summary"] = summary_action == "show"
    if not order and not visibility:
        return stage
    out = copy.deepcopy(stage)
    edits = out.setdefault("edits", {})
    if order:
        edits["sectionOrder"] = order
    if visibility:
        current = (resume_data or {}).get("sectionVisibility") if isinstance(resume_data, dict) else {}
        current = current if isinstance(current, dict) else {}
        edits["sectionVisibility"] = {**current, **visibility}
    return out


def maybe_run_rewrite_repair(original_resume, combined_stage, diff_audit, narrative_brief, tailor_context, relevant_jd_lines):
    flags = ((((diff_audit or {}).get("quality") or {}).get("flags")) or {})
    if not (flags.get("minor_expected_rewrites") or flags.get("filler_phrase_hits") or flags.get("missing_expected_rewrites")):
        return None, None, None
    current_resume = apply_sparse_resume_edits(original_resume, combined_stage)
    system, user = build_rewrite_repair_prompt(
        original_resume,
        current_resume,
        diff_audit,
        narrative_brief,
        tailor_context,
        relevant_jd_lines,
    )
    if not system or not user:
        return None, None, None
    text, usage = ai_chat_completion(system_prompt=system, user_prompt=user, max_tokens=4096)
    parsed = parse_chat_json(text)
    if not isinstance(parsed, dict) or not isinstance(parsed.get("edits"), dict):
        return None, {"assistantText": text or "", "parseError": "missing edits"}, usage
    # The repair pass is intentionally narrow.
    edits = parsed.get("edits") or {}
    parsed["edits"] = {
        k: v
        for k, v in edits.items()
        if k in ("experience", "projects") and isinstance(v, list)
    }
    if not parsed["edits"]:
        return None, {"assistantText": text or "", "parseError": "no repairable sections"}, usage
    return parsed, {"assistantText": text or "", "parsed": parsed}, usage


def mergePassEdits(out_a, out_b):
    ea = (out_a or {}).get("edits")
    if not isinstance(ea, dict):
        ea = {}
    ea = {k: v for k, v in ea.items() if k != "skills"}
    warnings = []
    for part in (out_a, out_b):
        ws = (part or {}).get("warnings") if isinstance(part, dict) else None
        if isinstance(ws, list):
            for w in ws:
                if w and w not in warnings:
                    warnings.append(w)
    if not out_b or not isinstance((out_b or {}).get("edits"), dict):
        merged = {"edits": ea} if ea else (out_a or {"edits": {}})
        if warnings:
            merged = {**merged, "warnings": warnings}
        return merged
    sk = (out_b.get("edits") or {}).get("skills")
    if sk is not None:
        ea = {**ea, "skills": sk}
    merged = {"edits": ea}
    if warnings:
        merged["warnings"] = warnings
    return merged


def tailor_resume(JobTailorSuggestRequest: JobTailorSuggestRequest, user_id):
    payload = JobTailorSuggestRequest.model_dump()
    payload["style_preferences"] = normalize_tailor_preferences(payload.get("style_preferences"))
    _append_job_sample(payload)

    ext_result = extract_keywords(
        payload["job_description"],
        payload["target_role"],
        numKeywords=12,
        company=payload.get("company") or "",
    )
    
    # get the keywords and active domains from our extraction result.
    keywords = ext_result["keywords"]
    rawKeywords = ext_result.get("rawKeywords") or keywords
    suppressedKeywords = ext_result.get("suppressedKeywords") or []
    activeDomains = ext_result["activeDomains"]
    relevantJDLines = ext_result["relevantJDLines"]

    # get the resume data.
    resumeData = payload["resume_data"] if isinstance(payload["resume_data"], dict) else {}

    # build the tailor context.
    tailorContext = build_tailor_context(
        targetRole=payload["target_role"],
        activeDomains=activeDomains,
        keywords=keywords,
        rawKeywords=rawKeywords,
        suppressedKeywords=suppressedKeywords,
        resumeData=resumeData,
    )

    # get what we want to focus on per section and row.
    sectionDetails = build_tailor_plan(resumeData=resumeData, tailorContext=tailorContext)
    tailorContext["alignmentContext"] = build_alignment_context(
        resumeData,
        tailorContext,
        sectionDetails,
        relevant_jd_lines=relevantJDLines,
        target_role=payload.get("target_role") or "",
    )
    tailorContext["jobStrategy"] = build_job_strategy(payload, tailorContext, sectionDetails)

    # narrative spine: one brief for both passes; not recomputed after pass 1.
    narrative_brief, usage_narr, narrative_char_meta = request_narrative_brief(
        payload=payload, tailorContext=tailorContext, sectionDetails=sectionDetails
    )
    narrative_selection_guard = None
    narrative_brief, narrative_selection_guard = repair_narrative_project_selection(
        narrative_brief, resumeData, sectionDetails, payload
    )
    narrative_bridge_guard = None
    narrative_brief, narrative_bridge_guard = protect_transferable_experience_for_bridge(narrative_brief)
    narrative_strategy_guard = None
    narrative_brief, narrative_strategy_guard = apply_strategy_selection_guard(
        narrative_brief,
        resumeData,
        tailorContext,
    )
    narrative_retarget_guard = None
    narrative_brief, narrative_retarget_guard = focus_adjacent_project_selection_for_strong_retarget(
        narrative_brief,
        payload,
    )
    narrative_quality_guard = project_quality_repair_debug(
        resumeData,
        narrative_brief,
        payload.get("style_preferences") if isinstance(payload, dict) else {},
    )

    # pass 1: summary + hero experience + hero projects (no skills in edits).
    system_a, user_a = build_prompt(
        payload=payload,
        tailorContext=tailorContext,
        sectionDetails=sectionDetails,
        relevantJDLines=relevantJDLines,
        narrativeBrief=narrative_brief,
    )
    text_a, usage_a = ai_chat_completion(system_prompt=system_a, user_prompt=user_a)
    out1 = parse_chat_json(text_a)
    if "edits" not in out1 or not isinstance(out1.get("edits"), dict):
        raise HTTPException(status_code=502, detail="Tailor pass 1 did not return valid JSON with an `edits` object.")
    out1 = editsDropSkills(out1)
    out1 = enforce_project_quality_repairs(
        out1,
        resumeData,
        narrative_brief,
        payload.get("style_preferences") if isinstance(payload, dict) else {},
    )
    out1 = inject_layout_edits(out1, narrative_brief, resumeData)
    out1 = protect_high_fit_project_drops(out1, resumeData, tailorContext, payload)
    resume_mid = apply_sparse_resume_edits(resumeData, out1)
    out2_parsed = None
    usage_b = None
    text_b = None
    system_b = None
    user_b = None
    if countSkillRows(resume_mid) > 0:
        fit = skillsFitSignals(
            resume_mid,
            tailorContext,
            (payload.get("job_description") or "") if isinstance(payload, dict) else "",
        )
        p2 = {**payload, "resume_data": resume_mid}
        system_b = build_pass_b_system()
        user_b = build_pass_b_user(
            p2,
            tailorContext,
            relevantJDLines,
            narrative_brief,
            fit,
        )
        # Long `edits.skills` JSON needs headroom; default completion cap can truncate and yield unparseable output -> {}.
        text_b, usage_b = ai_chat_completion(
            system_prompt=system_b, user_prompt=user_b, max_tokens=8192
        )
        out2_parsed = parse_pass_b_completion(text_b)
        out2_parsed = enforce_pass_b_skill_budget(out2_parsed, resume_mid)
        out2_parsed = enforce_strategy_skill_preserve(out2_parsed, resume_mid, tailorContext)
    out2 = passBOnlySkills(out2_parsed) if out2_parsed is not None else None
    out = mergePassEdits(out1, out2)
    out = enforce_surviving_project_quality_cleanup(out, resumeData)
    usage = usage_b if usage_b is not None else usage_a
    usage_repair = None
    rewrite_repair_debug = None
    rewrite_repair_stage = None
    target_role_str = str((payload or {}).get("target_role") or "") if isinstance(payload, dict) else ""

    want_audit = debug or _env_truthy("TAILOR_AB_LOG")
    if want_audit:
        final_out, diff_audit = assemble_tailor_result(
            original_resume=resumeData,
            stage_a=out,
            narrative_brief=narrative_brief,
            target_role=target_role_str,
            company=str((payload or {}).get("company") or "") if isinstance(payload, dict) else "",
            style_preferences=payload.get("style_preferences") if isinstance(payload, dict) else {},
            strict_truth=bool(payload.get("strict_truth", True)) if isinstance(payload, dict) else True,
            tailor_context=tailorContext,
            return_audit_debug=True,
            rows_per_section_ranked=(sectionDetails or {}).get("rowsPerSectionRanked") or {},
        )
        rewrite_repair_stage, rewrite_repair_debug, usage_repair = maybe_run_rewrite_repair(
            resumeData,
            out,
            diff_audit,
            narrative_brief,
            tailorContext,
            relevantJDLines,
        )
        if rewrite_repair_stage is not None:
            out = merge_rewrite_repair(out, rewrite_repair_stage)
            out = enforce_surviving_project_quality_cleanup(out, resumeData)
            final_out, diff_audit = assemble_tailor_result(
                original_resume=resumeData,
                stage_a=out,
                narrative_brief=narrative_brief,
                target_role=target_role_str,
                company=str((payload or {}).get("company") or "") if isinstance(payload, dict) else "",
                style_preferences=payload.get("style_preferences") if isinstance(payload, dict) else {},
                strict_truth=bool(payload.get("strict_truth", True)) if isinstance(payload, dict) else True,
                tailor_context=tailorContext,
                return_audit_debug=True,
                rows_per_section_ranked=(sectionDetails or {}).get("rowsPerSectionRanked") or {},
            )
    else:
        final_out = assemble_tailor_result(
            original_resume=resumeData,
            stage_a=out,
            narrative_brief=narrative_brief,
            target_role=target_role_str,
            company=str((payload or {}).get("company") or "") if isinstance(payload, dict) else "",
            style_preferences=payload.get("style_preferences") if isinstance(payload, dict) else {},
            strict_truth=bool(payload.get("strict_truth", True)) if isinstance(payload, dict) else True,
            tailor_context=tailorContext,
            return_audit_debug=False,
            rows_per_section_ranked=(sectionDetails or {}).get("rowsPerSectionRanked") or {},
        )
        diff_audit = None

    if debug:
        # create the debug output directory.
        base = Path(__file__).resolve().parent / "debug_out"
        base.mkdir(parents=True, exist_ok=True)
        # write the debug output.
        def write_debug(name, obj):
            (base / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

        write_debug(
            "tailor_00_extraction.json",
            ext_result.get("debug") if isinstance(ext_result, dict) else {},
        )
        write_debug(
            "tailor_01_input.json",
            {
                "target_role": payload.get("target_role"),
                "company": payload.get("company"),
                "style_preferences": payload.get("style_preferences") or {},
                "strict_truth": bool(payload.get("strict_truth", True)),
                "model": get_openai_model(),
                "job_description_chars": len(str(payload.get("job_description") or "")),
                "resume_counts": {
                    "experience": len(resumeData.get("experience") or []) if isinstance(resumeData, dict) else 0,
                    "projects": len(resumeData.get("projects") or []) if isinstance(resumeData, dict) else 0,
                    "skills": len(resumeData.get("skills") or []) if isinstance(resumeData, dict) else 0,
                    "education": len(resumeData.get("education") or []) if isinstance(resumeData, dict) else 0,
                },
                "extracted_keywords": keywords,
                "raw_extracted_keywords": rawKeywords,
                "suppressed_keywords": suppressedKeywords,
                "resume_hits": tailorContext.get("resumeHits"),
                "resume_gaps": tailorContext.get("resumeGaps"),
                "alignment_context": tailorContext.get("alignmentContext"),
                "job_strategy": tailorContext.get("jobStrategy"),
                "relevant_jd_lines": relevantJDLines,
            },
        )
        write_debug(
            "tailor_02_plan.json",
            {
                "section_details": sectionDetails,
                "narrative": narrative_brief,
                "selection_guard": narrative_selection_guard or {"onePageSelectionGuard": False},
                "bridge_guard": narrative_bridge_guard or {"bridgeExperienceGuard": False},
                "strategy_guard": narrative_strategy_guard or {"strategySelectionGuard": False},
                "retarget_guard": narrative_retarget_guard or {"strongAdjacentProjectFocus": False},
                "quality_guard": narrative_quality_guard,
            },
        )
        write_debug(
            "tailor_03_prompts.json",
            {
                "pass_a": {
                    "system": system_a,
                    "user": user_a,
                    "assistant_text": text_a if isinstance(text_a, str) else "",
                    "usage": usageToJson(usage_a),
                },
                "pass_b": None
                if system_b is None and user_b is None
                else {
                    "system": system_b,
                    "user": user_b,
                    "assistant_text": text_b if isinstance(text_b, str) else "",
                    "usage": usageToJson(usage_b),
                },
                "repair": rewrite_repair_debug,
            },
        )
        write_debug(
            "tailor_04_edits.json",
            {
                "stage_a": out1,
                "stage_b": out2_parsed,
                "rewrite_repair": rewrite_repair_stage,
                "combined": out,
            },
        )
        if diff_audit is not None:
            diff_audit = {
                **diff_audit,
                "llm_usage_pass1": usageToJson(usage_a),
                "llm_usage_pass2": usageToJson(usage_b),
            }
            if usage is not None:
                diff_audit = {**diff_audit, "llm_usage_rewrite_pass": usageToJson(usage)}
            if usage_repair is not None:
                diff_audit = {**diff_audit, "llm_usage_repair_pass": usageToJson(usage_repair)}
        write_debug(
            "tailor_05_result.json",
            {
                "final": final_out,
                "audit": diff_audit,
            },
        )
        write_debug(
            "tailor_06_review.json",
            build_tailor_review_snapshot(
                payload=payload,
                ext_result=ext_result,
                tailor_context=tailorContext,
                section_details=sectionDetails,
                narrative_brief=narrative_brief,
                final_out=final_out,
                diff_audit=diff_audit,
                model=get_openai_model(),
            ),
        )
        text_meta = (diff_audit or {}).get("text") or {}
        rw_chars = text_meta.get("rewrite_note_chars")
        if rw_chars is None and diff_audit is not None:
            rw_chars = (diff_audit.get("rewrite_note") or {}).get("chars")
        wq = (diff_audit or {}).get("quality") or (diff_audit or {}).get("rewrite_quality") or {}
        wint = wq.get("rewrite_intensity") or {}
        wflags = wq.get("flags") or {}
        phf = (diff_audit or {}).get("plan_hero_fit") or {}
        p_proj = phf.get("projects") or {}
        hsg = phf.get("hero_slot_gap") or {}
        seg = phf.get("segment") or {}
        logger.info(
            "tailor diff_audit: patch_sections=%s change_reasons=%d warnings=%d rewrite_note_chars=%s fell_back=%s "
            "intensity exp=%s proj=%s sk=%s heroes_proj=%s heroes_exp=%s low_intensity=%s removed_rows=%s flags=%s "
            "plan_hero_in_top_k=%s plan_hero_ratio_proj=%s plan_inversions=%s "
            "hero_slot_gap_proj=%s segment_proj_heroes=%s",
            list((final_out.get("patchDiff") or {}).keys()),
            len(final_out.get("changeReasons") or []),
            len(final_out.get("warnings") or []),
            rw_chars if rw_chars is not None else "n/a",
            ((diff_audit or {}).get("merge") or {}).get("fell_back")
            if diff_audit is not None
            else "n/a",
            wint.get("experience_rows_touched"),
            wint.get("project_rows_touched"),
            wint.get("skill_rows_touched"),
            wint.get("hero_projects_edited_count"),
            wint.get("hero_experience_edited_count"),
            wint.get("low_intensity_hint"),
            wint.get("rows_removed_total"),
            {k: v for k, v in wflags.items() if v},
            p_proj.get("in_top_k"),
            p_proj.get("ratio"),
            phf.get("inversion_pair_count"),
            hsg.get("projects"),
            seg.get("narrative_had_project_heroes"),
        )

    _append_tailor_ab_log(payload=payload, diff_audit=diff_audit, final_out=final_out)

    pass_b_ran = countSkillRows(resume_mid) > 0
    _append_token_cost_jsonl(
        payload=payload if isinstance(payload, dict) else {},
        model=get_openai_model(),
        usage_narr=usage_narr,
        usage_a=usage_a,
        usage_b=usage_b,
        pass_b_ran=pass_b_ran,
        text_a=text_a if isinstance(text_a, str) else "",
        system_a=system_a if isinstance(system_a, str) else "",
        user_a=user_a if isinstance(user_a, str) else "",
        text_b=text_b if isinstance(text_b, str) else "",
        system_b=system_b if isinstance(system_b, str) else "",
        user_b=user_b if isinstance(user_b, str) else "",
        narr_char_meta=narrative_char_meta if isinstance(narrative_char_meta, dict) else {},
    )

    ch = (final_out.get("summary") or "").strip()
    return JobTailorSuggestResponse(
        summary=ch,
        tailorExplanation=final_out.get("tailorExplanation") or {},
        updatedResumeData=final_out["updatedResumeData"],
        patchDiff=final_out["patchDiff"],
        changeReasons=final_out["changeReasons"],
        warnings=final_out["warnings"],
    )


if __name__ == "__main__":

    job_description = """
        About the job
        ABOUT THE ROLE

        Interval Partners is a multi-billion-dollar alternative investment firm located in midtown Manhattan. We are seeking a Full Stack Analytics Engineer to join our team. This is a hands‑on, ownership‑oriented role: you will build and maintain alternative data pipelines, develop forward‑looking KPI estimates, and design analytics and tools that directly support portfolio managers and analysts. The ideal candidate is intellectually rigorous, comfortable working end‑to‑end across data, modeling, and tooling, and motivated by turning complex datasets into clear, actionable investment insight.


        KEY RESPONSIBILITIES

        Data Pipelines & KPI Estimation

        Collaborate with the data team to build and maintain robust ingestion pipelines for alternative datasets. 
        Transform raw vendor data into clean, analysis-ready outputs that map to fundamental KPIs such as revenue, same store sales, GMV, and others.


        Analyst and Portfolio Manager Support

        Dig into the "why" behind trends you and the analysts see in the data.
        Translate analyst hypotheses into testable frameworks and deliver clear, well-documented findings with appropriate statistical context and caveats.
        Proactively surface insights and data-driven alerts that may be relevant to existing or prospective positions. 
        Implement requests from Analysts and PM’s for their reporting needs.


        Dashboards & Visual Analytics

        Design and maintain custom web applications that allow analysts to explore, compare, combine, and benchmark signals across multiple alternative data providers for a given company or sector. Own the full lifecycle from backend data layer through frontend UI. Collaborate with vendor to ensure product meets business needs.
        Build intuitive, interactive visualizations of trends, seasonal adjustments, revision histories, and cross-provider discrepancies within the firm's custom analytics platform. 
        Work with the investment team to iterate on dashboard design and ensure outputs align with how PMs and analysts make decisions. 
        Architect and maintain the firm's alternative data web application, including backend APIs, data models, and frontend components, iterating on design with the investment team to ensure outputs map to how PMs and analysts make decisions. 


        AI Agent Integration

        Structure and expose processed alternative data outputs in formats consumable by internal AI/LLM-based research agents (e.g., retrieval-augmented generation pipelines, structured APIs). 
        Collaborate with the data and technology teams to ensure data is contextualized, well-documented, and retrievable in ways that maximize its utility for automated research workflows. 
        Build and maintain MCP servers and AI Agents to allow analysts to query, explore, and synthesize alternative data conversationally. 
        Design and implement LLM-powered research workflows on cloud infrastructure (Azure), including retrieval-augmented generation pipelines, structured tool-use agents, and conversational interfaces over alternative data. 
        Drive the transition of alternative data consumption from static, report-based delivery toward interactive, on-demand access through LLM agents, custom dashboards, and web applications  


        Multi-Source Forecasting Models

        Develop quantitative models that combine signals from multiple alternative data providers to generate forward-looking KPI estimates (e.g., quarterly revenue nowcasts, consensus-relative surprise probabilities). 
        Rigorously evaluate model performance, document assumptions, and communicate confidence intervals and known limitations to the investment team. 
        Continuously improve models by incorporating new data sources, refining aggregation methodologies, and learning from forecast errors.


        Data Scouting, Backtesting & Onboarding

        Proactively identify and evaluate new alternative data vendors and datasets through independent research, industry conferences, and broker relationships. 
        Conduct thorough back tests of candidate datasets: assess coverage, historical depth, survivorship bias, look-ahead bias, and signal-to-noise ratio versus public benchmarks. 
        Manage vendor relationships, trial negotiations, and technical onboarding for approved datasets; maintain a living catalogue of the fund’s alt data assets.


        QUALIFICATIONS

        Required

        4–6 years of experience in a data analysis, data science, quantitative research, or data engineering role.
        Proficiency in Python (pandas, numpy, scikit-learn, statsmodels), comfortable working with large datasets. 
        Familiarity with cloud platforms (Azure preferred) for deploying data pipelines, APIs, and LLM-based workflows. 
        Experience with containerized deployments (Docker) and CI/CD practices. 
        Demonstrated experience building and owning end-to-end data pipelines in a production environment. 
        Ability to map alternative data observations to fundamental drivers. 
        Solid grasp of statistical methods, time-series analysis, and the pitfalls of backtesting (overfitting, multiple testing, survivorship bias). 
        Excellent written and verbal communication skills; ability to present complex quantitative work clearly to non-technical stakeholders. 
        Experience building web applications (e.g., React, Next.js, FastAPI, Flask, or similar frameworks) with both backend and frontend components. 
        Highly organized, self-directed, and comfortable managing multiple concurrent projects in a fast-paced investment environment.


        Preferred

        Direct prior experience working with alternative data vendors. 
        Familiarity with equity research, the earnings estimate process, and sell-side consensus data providers (FactSet, IBES, Bloomberg). 
        Experience building LLM-integrated data products or retrieval-augmented generation (RAG) pipelines. 
        Advanced degree (MS or PhD) in Statistics, Computer Science, Applied Mathematics, Engineering, or related quantitative discipline.


        This is a fully onsite 5 days a week role based in our Midtown office. Benefits: Full medical & vision, 401k. 

        Compensation range is 120k-150k
    """

    target_role = "Full Stack Analytics Engineer"

    resume_data = {'header': {'first_name': 'Colin', 'last_name': 'Kirby', 'email': 'kirbycolin26@gmail.com', 'phone': '407-876-8172', 'location': 'Orlando, FL', 'linkedin': 'https://linkedin.com/in/colinwkirby/', 'github': 'https://github.com/KirbysGit', 'portfolio': 'https://colinkirby.dev', 'tagline': '**Software Engineer** | _Product_ * _Design_ * _Development_', 'visibility': {'showEmail': True, 'showPhone': True, 'showLocation': True, 'showLinkedin': True, 'showGithub': True, 'showPortfolio': True, 'showTagline': False}, 'contactOrder': ['email', 'phone', 'location', 'linkedin', 'github', 'portfolio']}, 'education': [{'id': 1, 'school': 'University of Central Florida', 'degree': 'Bachelor of Science', 'discipline': 'Computer Engineering', 'location': 'Orlando, FL', 'start_date': '2021-05-01', 'end_date': '2025-05-01', 'current': False, 'gpa': '3.7 / 4.0', 'minor': 'FinTech', 'subsections': {'Honors & Awards': "Dean's List 2021, President's Honor Roll 2023 - 2025, Pegasus Gold Scholarship", 'Clubs & Extracurriculars': 'AI @ UCF , Knight Hacks , SHPE @ UCF', 'Relevant Coursework': 'Massive Storage & Big Data, Enterprise Computing, Object-Oriented Software Design'}}], 'experience': [{'id': 1, 'title': 'Software Engineering Intern', 'company': 'BitGo', 'description': '• Designed and maintained backend services and REST APIs in Python/Django supporting secure data flows across internal financial/compliance systems.\n• Collaborated with senior engineers on system design, requirements, and architecture, contributing to scalable service patterns and data modeling.\n• Built internal dashboards using React + Django APIs, enabling real-time visibility into backend data workflows and operational metrics.\n• Optimized Python data-processing pipelines and PostgreSQL queries, improving system scalability and reducing latency by ~40%.', 'start_date': '2024-05-01', 'end_date': '2025-06-01', 'current': False, 'location': 'Remote', 'skills': 'Python, Django, React, PostgreSQL, AWS EC2'}], 'projects': [{'id': 1, 'title': 'Centi – Personal Finance Web App', 'description': '• Built FastAPI backend services deployed in production, integrating financial data via ETL pipelines and normalized SQL schemas to support real-time account analytics.\n• Implemented scalable API endpoints, caching, and data modeling patterns for high-volume financial transactions.\n• Developed React dashboards for insights and authentication; deployed via containerized services and cloud-based CI/CD.', 'tech_stack': ['Python', 'SQL', 'FinBERT', 'XGBoost'], 'url': 'https://centi.dev'}, {'id': 2, 'title': 'SentimentTrader – Real-Time Stock Sentiment Pipeline ', 'description': '• Designed and implemented a full ML-driven data pipeline for real-time sentiment analytics, processing 1K+ Reddit finance posts per run via multi-stage ETL.\n• Applied NLP models (FinBERT) and feature engineering to build 40+ predictive features per ticker; trained XGBoost models achieving 55–70% ROC-AUC.\n• Built modular components for data ingestion, transformation, model inference, and distributed-style batching, aligned with message-driven architectures.\n• Automated end-to-end data collection, preprocessing, and model inference workflows, enabling scalable real-time analytics.', 'tech_stack': [], 'url': ''}, {'id': 3, 'title': 'ShelfVision – Dense Retail Shelf Object Detector ', 'description': '• Implemented a custom deep learning object detection pipeline using PyTorch with dynamic IoU matching and modular training loops.\n• Handled large-scale vision datasets (11K+ images) via optimized data loaders and GPU-accelerated training.\n• Applied ML engineering workflows including dataset preprocessing, hyperparameter tuning, checkpointing, and analysis.', 'tech_stack': [], 'url': ''}, {'id': 4, 'title': 'SecureScape – Portable Smart Security System ', 'description': '• Designed async communication layers for distributed IoT nodes, ensuring near real-time (<3.5 s) alert propagation and cross-node synchronization.\n• Built fault-tolerant Python backend supporting message handling and system reliability across constrained devices.', 'tech_stack': [], 'url': ''}], 'skills': [{'id': 1, 'name': 'Python', 'category': 'Languages'}, {'id': 2, 'name': 'JavaScript', 'category': 'Languages'}, {'id': 4, 'name': 'SQL', 'category': 'Languages'}, {'id': 5, 'name': 'Java', 'category': 'Languages'}, {'id': 6, 'name': 'Django', 'category': 'Frameworks'}, {'id': 7, 'name': 'FastAPI', 'category': 'Frameworks'}, {'id': 8, 'name': 'React', 'category': 'Frameworks'}, {'id': 9, 'name': 'Node.js', 'category': 'Frameworks'}, {'id': 10, 'name': 'PyTorch', 'category': 'Frameworks'}, {'id': 11, 'name': 'TensorFlow Lite', 'category': 'Frameworks'}, {'id': 12, 'name': 'PostgreSQL', 'category': 'Data Tools'}, {'id': 13, 'name': 'MySQL', 'category': 'Data Tools'}, {'id': 14, 'name': 'MongoDB', 'category': 'Data Tools'}, {'id': 15, 'name': 'Pandas', 'category': 'Data Tools'}, {'id': 16, 'name': 'NumPy', 'category': 'Data Tools'}, {'id': 17, 'name': 'AWS (EC2)', 'category': 'Data Tools'}, {'id': 18, 'name': 'ETL Pipelines', 'category': 'Data Tools'}, {'id': 19, 'name': 'Backend Development', 'category': 'Focus Areas'}, {'id': 20, 'name': 'Data Pipelines', 'category': 'Focus Areas'}, {'id': 21, 'name': 'ML / NLP Engineering', 'category': 'Focus Areas'}, {'id': 22, 'name': 'Rest API Design', 'category': 'Focus Areas'}], 'hiddenSkills': [], 'summary': {'summary': 'Full-stack engineer specializing in scalable data pipelines, platforms, and backend services. Skilled in React, Python, and Java, with strong database and API expertise. Passionate about turning complex data into reliable, user-focused applications.'}, 'sectionVisibility': {'summary': False, 'education': True, 'experience': True, 'projects': True, 'skills': True}, 'sectionOrder': ['header', 'summary', 'education', 'skills', 'experience', 'projects'], 'sectionLabels': {'summary': 'Professional Summary', 'education': 'Education', 'experience': 'Experience', 'projects': 'Projects', 'skills': 'Skills'}}

    payload = {
        "job_description": job_description,
        "company": "Interval Partners",
        "target_role": target_role,
        "resume_data": resume_data,
    }

    tailor_resume(
        JobTailorSuggestRequest=JobTailorSuggestRequest(
            job_description=job_description,
            company="Interval Partners",
            target_role=target_role,
            resume_data=resume_data,
        ),
        user_id=1,
    )
