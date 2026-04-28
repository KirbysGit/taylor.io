from __future__ import annotations

import hashlib
import logging
import os
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv

# Load backend/.env even when the process cwd is not `backend/` (e.g. some uvicorn launches).
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# in use.
from .extraction import extract_keywords
from .processing import build_tailor_context
from .planning import build_tailor_plan
from .narrative import request_narrative_brief
from fastapi import HTTPException

from .prompt import (
    build_pass_b_system,
    build_pass_b_user,
    build_prompt,
    skillsFitSignals,
    tailor_ab_experiment_enabled,
)
from .openai import ai_chat_completion, completion_usage_to_dict, get_openai_model, usage_tokens_compact
from .post_processing import parse_chat_json, parse_pass_b_completion
from .post_processing.resume_diff import apply_sparse_resume_edits, assemble_tailor_result

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
                    one[fk] = {"before": None, "after": None, "note": "non-string field; see job_tailor_latest_model.json"}
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
                    "note": "skills reordered or full replace; see job_tailor_latest_model.json for full list",
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
                            "note": "complex skill row delta; see job_tailor_latest_model.json",
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
    # --- Default: log each tailor run to debug_out/token_cost.jsonl. Set TAILOR_TOKEN_LOG=0 to disable. --- #
    v = (os.getenv("TAILOR_TOKEN_LOG") or "").strip().lower()
    if v in ("0", "false", "no", "off"):
        return False
    return True


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
    return {"edits": {"skills": e["skills"]}}


def mergePassEdits(out_a, out_b):
    ea = (out_a or {}).get("edits")
    if not isinstance(ea, dict):
        ea = {}
    ea = {k: v for k, v in ea.items() if k != "skills"}
    if not out_b or not isinstance((out_b or {}).get("edits"), dict):
        return {"edits": ea} if ea else (out_a or {"edits": {}})
    sk = (out_b.get("edits") or {}).get("skills")
    if sk is not None:
        ea = {**ea, "skills": sk}
    return {"edits": ea}


def tailor_resume(JobTailorSuggestRequest: JobTailorSuggestRequest, user_id):
    payload = JobTailorSuggestRequest.model_dump()
    _append_job_sample(payload)

    ext_result = extract_keywords(
        payload["job_description"],
        payload["target_role"],
        numKeywords=12,
        company=payload.get("company") or "",
    )
    
    # get the keywords and active domains from our extraction result.
    keywords = ext_result["keywords"]
    activeDomains = ext_result["activeDomains"]
    relevantJDLines = ext_result["relevantJDLines"]

    # get the resume data.
    resumeData = payload["resume_data"] if isinstance(payload["resume_data"], dict) else {}

    # build the tailor context.
    tailorContext = build_tailor_context(targetRole=payload["target_role"], activeDomains=activeDomains, keywords=keywords, resumeData=resumeData)

    # get what we want to focus on per section and row.
    sectionDetails = build_tailor_plan(resumeData=resumeData, tailorContext=tailorContext)

    # narrative spine: one brief for both passes; not recomputed after pass 1.
    narrative_brief, usage_narr, narrative_char_meta = request_narrative_brief(
        payload=payload, tailorContext=tailorContext, sectionDetails=sectionDetails
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
    out2 = passBOnlySkills(out2_parsed) if out2_parsed is not None else None
    out = mergePassEdits(out1, out2)
    usage = usage_b if usage_b is not None else usage_a
    target_role_str = str((payload or {}).get("target_role") or "") if isinstance(payload, dict) else ""

    want_audit = debug or _env_truthy("TAILOR_AB_LOG")
    if want_audit:
        final_out, diff_audit = assemble_tailor_result(
            original_resume=resumeData,
            stage_a=out,
            narrative_brief=narrative_brief,
            target_role=target_role_str,
            return_audit_debug=True,
            rows_per_section_ranked=(sectionDetails or {}).get("rowsPerSectionRanked") or {},
        )
    else:
        final_out = assemble_tailor_result(
            original_resume=resumeData,
            stage_a=out,
            narrative_brief=narrative_brief,
            target_role=target_role_str,
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

        write_debug("job_tailor_pass_a_system.json", {"prompt": system_a})
        write_debug("job_tailor_pass_a_user.json", {"prompt": user_a})
        if system_b is not None:
            write_debug("job_tailor_pass_b_system.json", {"prompt": system_b})
        if user_b is not None:
            write_debug("job_tailor_pass_b_user.json", {"prompt": user_b})
        if system_b is not None:
            write_debug(
                "job_tailor_pass_b_completion.json",
                {
                    "assistantText": text_b if isinstance(text_b, str) else "",
                    "parseNote": ""
                    if (isinstance(text_b, str) and text_b.strip())
                    else "empty_completion",
                },
            )
        write_debug("job_tailor_latest_system.json", {"pass1": system_a, "pass2": system_b})
        write_debug("job_tailor_latest_user.json", {"pass1": user_a, "pass2": user_b})
        write_debug("job_tailor_narrative.json", narrative_brief)
        write_debug("job_tailor_stage_a.json", out1)
        if out2_parsed is not None:
            write_debug("job_tailor_stage_b.json", out2_parsed)
        write_debug("job_tailor_combined_edits.json", out)
        write_debug("job_tailor_latest_model.json", final_out)
        if diff_audit is not None:
            diff_audit = {
                **diff_audit,
                "llm_usage_pass1": usageToJson(usage_a),
                "llm_usage_pass2": usageToJson(usage_b),
            }
            if usage is not None:
                diff_audit = {**diff_audit, "llm_usage_rewrite_pass": usageToJson(usage)}
            write_debug("job_tailor_diff_audit.json", diff_audit)
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