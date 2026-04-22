from __future__ import annotations

# --- narrative pre-pass: one cheap JSON-only completion so the main tailor pass gets an explicit editorial spine. --- #

# ===== imports ===== #
import json
from pathlib import Path
from typing import Any

# --- local imports.
from ..openai import ai_chat_completion, is_openai_enabled
from ..post_processing import parse_chat_json
from ..prompt import best_evidence_labels, secondary_terms, top_keyword_terms

# ===== debug ===== #
# --- flip off in prod if you do not want extra debug_out writes from this module. --- #
debug = True

# --- same debug_out root as job_tailor_service (this file lives in ai/narrative/). --- #
narrativeDebugOutBase = Path(__file__).resolve().parent.parent / "debug_out"
narrativeDebugFileName = "narrative_brief_latest.json"


# ===== main ===== #
def request_narrative_brief(*, payload: dict, tailorContext: dict, sectionDetails: dict) -> dict:
    """One cheap JSON-only call: editorial spine (angle, hero rows, goals, guardrails). Rewrite pass stays separate."""
    # --- default shape when the model is skipped or returns garbage; main prompt still accepts this. --- #
    empty = {
        "candidateAngle": "",
        "primaryStory": [],
        "secondaryStory": [],
        "heroProjects": [],
        "heroExperience": [],
        "rewriteGoals": [],
        "avoid": [],
    }

    # if openai is off, skip the second call—the main prompt still runs with an empty narrative block.
    if not is_openai_enabled():
        if debug:
            write_narrative_debug(
                {
                    "skipped": "openai_disabled",
                    "normalized": dict(empty),
                }
            )
        return dict(empty)

    # --- unpack inputs used to steer the brief (same signals as the main prompt, minus full JD). --- #
    resume_data = payload.get("resume_data") if isinstance(payload.get("resume_data"), dict) else {}
    keywords = tailorContext.get("keywords") or []
    active_domains = tailorContext.get("activeDomains") or []
    hits = tailorContext.get("resumeHits") or []
    gaps = tailorContext.get("resumeGaps") or []
    rows_ranked = sectionDetails.get("rowsPerSectionRanked") or {}

    # --- reuse prompt_builder helpers so narrative and rewrite steps see the same term/evidence hints. --- #
    primary = top_keyword_terms(keywords, limit=8)
    secondary = secondary_terms(active_domains, keywords, primary, limit=6)
    evidence = best_evidence_labels(resume_data, rows_ranked)

    target = (payload.get("target_role") or tailorContext.get("targetRole") or "").strip()
    company = (payload.get("company") or "").strip() if isinstance(payload.get("company"), str) else ""
    jd = payload.get("job_description") if isinstance(payload.get("job_description"), str) else ""

    # --- system: editing strategy, not inventory—still evidence-first and bounded. --- #
    system = "\n".join(
        [
            "Return JSON only. No markdown, no text outside the object.",
            "You are producing an editing strategy for the next pass—you are not rewriting the resume here.",
            "",
            "Editorial target (not a skill list):",
            "Answer: What version of this candidate should be foregrounded? Which rows carry that story? How should each hero row land with a recruiter after editing? What must never be implied?",
            "candidateAngle: one sentence—how the candidate should read to a recruiter for this role (positioning), not a flat inventory of technologies on the resume.",
            "primaryStory: 2–4 short phrases that are recruiter-facing impression pillars (e.g. production backend, full-stack delivery, data-intensive systems)—grounded in evidence rows, not generic JD vocabulary.",
            "secondaryStory: 0–3 supporting themes that shape wording and emphasis without dominating the headline.",
            "rewriteGoals: 2–4 strings that say how rows should feel after editing—prefer \"Make [company/project] read more like …\" or \"Land as …\" (production tooling, product delivery, pipeline depth). Avoid weak \"highlight X\" unless you add the intended impression. Prioritize Tier 1 (hero) projects in rewriteGoals; the main pass still reviews every project—non-heroes may get lighter Tier 2 edits or Tier 3 preservation.",
            "",
            "heroProjects: Tier 1—at most 3 numeric ids from the resume; these should receive the heaviest substantive edits in the rewrite pass. Other projects may be Tier 2 (lighter clarity/framing) or Tier 3 (mostly unchanged) by relevance—never imply every project must be rewritten.",
            "",
            "Evidence-first: infer angle, stories, hero ids, and rewriteGoals from evidenceRows first. JD keyword lists only tune emphasis and ordering—not new identity, stack, or domain.",
            "Use resumeGaps in avoid when the JD asks for things the resume does not prove.",
            "",
            "Anti-overreach: do not position the candidate as having healthcare, finance-industry, mobile-native, Ruby/Rails, TypeScript, or other domain/stack experience just because those appear in the JD.",
            "Prefer presentation angles that the evidence rows can actually support (backend, APIs, dashboards, data workflows, full-stack delivery, AI/LLM product work, real-time systems, internal tooling).",
            "",
            "Hard limits (keep the brief short):",
            "candidateAngle: exactly one sentence, max ~28 words.",
            "primaryStory: 2–4 phrases.",
            "secondaryStory: 0–3 phrases.",
            "rewriteGoals: 2–4 strings; each must be doable without new facts.",
            "heroExperience: at most 2 numeric ids; heroProjects: at most 3—from the resume JSON only.",
            "avoid: 2–6 concrete guardrails. Never empty: name unsupported JD stack/domain/platform asks; forbid thinning skills or swapping project stacks for keywords; forbid fluffy user/product strategy language unless a row proves it.",
            "",
            "Example (illustrative; ids and names are placeholders):",
            '{"candidateAngle":"Product-minded full-stack engineer with strong backend, API, dashboard, and data-workflow experience, best positioned for roles centered on building real user-facing systems.","primaryStory":["production backend and API development","full-stack dashboard and workflow delivery","data-intensive application architecture"],"secondaryStory":["internal tooling and operational visibility","real-time analytics and pipeline optimization"],"heroExperience":[1],"heroProjects":[1,2],"rewriteGoals":["Make BitGo read more like production backend and internal product tooling work","Make Centi read more like full-stack product delivery with real data integration and user workflows","Use SentimentTrader to reinforce data pipeline and real-time analytics depth where it supports the role"],"avoid":["Do not imply healthcare domain experience","Do not use user-centric or product-strategy language unless the row supports it concretely","Do not add unsupported stack such as Ruby, Rails, or TypeScript","Do not replace real project technologies with JD technologies","Do not thin the skills section just to appear more targeted"]}',
        ]
    )

    # --- trim JD here so this call stays smaller; full JD is still in the main tailor user prompt. --- #
    jd_clip = jd[:5000] + ("…" if len(jd) > 5000 else "")

    gaps_preview = list(gaps)[:24]

    user = "\n".join(
        [
            "Produce an editing strategy: how the candidate should read, how hero rows should land, what story dominates—ground everything in evidenceRows first.",
            "For projects: heroProjects flag Tier 1 (heaviest edits); the rewrite pass must still consider every project row—Tier 2 lighter tailoring where it helps, Tier 3 preserve when fit is weak or text is already strong. No forced cosmetic rewrites.",
            "Do not output a keyword inventory; output presentation guidance the rewrite pass can execute without new facts.",
            "JD terms below are secondary (emphasis), not a license to imply unsupported experience.",
            "",
            f"target_role: {target or 'Not specified'}",
            f"company: {company or 'Not specified'}",
            "",
            "evidenceRows (strongest matching rows—primary input):",
            json.dumps(evidence[:12], ensure_ascii=False),
            "",
            "resumeGaps (JD terms not evidenced—use in avoid and caution):",
            json.dumps(gaps_preview, ensure_ascii=False),
            "",
            "primaryJDTerms (emphasis hints only):",
            json.dumps(primary, ensure_ascii=False),
            "secondaryJDTerms:",
            json.dumps(secondary, ensure_ascii=False),
            "resumeHits (canonical hits—supporting only):",
            json.dumps(list(hits)[:24], ensure_ascii=False),
            "",
            "job_description (trimmed; full JD is in the main pass):",
            jd_clip,
            "",
            "resume JSON:",
            json.dumps(resume_data, ensure_ascii=False, indent=2),
            "",
            "Return exactly this shape:",
            '{"candidateAngle":"","primaryStory":[],"secondaryStory":[],"heroProjects":[],"heroExperience":[],"rewriteGoals":[],"avoid":[]}',
        ]
    )

    text, _ = ai_chat_completion(system_prompt=system, user_prompt=user, temperature=0.25)
    # --- parse_chat_json tolerates fences/empty; normalization caps lists and drops bogus hero ids. --- #
    raw = parse_chat_json(text)
    normalized = normalize_narrative_brief(raw, empty, resume_data)

    if debug:
        # --- write prompts + parsed + final brief + raw completion snippet for inspecting parse failures. --- #
        preview = text if isinstance(text, str) else ""
        if len(preview) > 12000:
            preview = preview[:12000] + "\n… [truncated]"
        write_narrative_debug(
            {
                "system_prompt": system,
                "user_prompt": user,
                "completion_text": preview,
                "model_raw": raw,
                "normalized": normalized,
            }
        )

    return normalized


# ===== debug io ===== #
def write_narrative_debug(obj: dict) -> None:
    # keeps narrative inspection separate from job_tailor_latest_* so you can diff the pre-pass alone.
    narrativeDebugOutBase.mkdir(parents=True, exist_ok=True)
    (narrativeDebugOutBase / narrativeDebugFileName).write_text(
        json.dumps(obj, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


# ===== normalization ===== #
def collect_row_ids(rows_key: str, resume_data: dict) -> set:
    rows = resume_data.get(rows_key) if isinstance(resume_data, dict) else None
    if not isinstance(rows, list):
        return set()
    out = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        rid = row.get("id")
        if isinstance(rid, int):
            out.add(rid)
        elif isinstance(rid, float) and rid == int(rid):
            out.add(int(rid))
    return out


def dedupe_preserve_order(items: list) -> list:
    seen = set()
    out = []
    for x in items:
        if x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


def normalize_narrative_brief(raw: Any, empty: dict, resume_data: dict) -> dict:
    # coerce model JSON into stable keys; cap lengths; filter hero ids to real resume rows; pad thin avoid/goals.
    if not isinstance(raw, dict):
        return dict(empty)
    out = dict(empty)
    ca = raw.get("candidateAngle")
    angle = ca.strip() if isinstance(ca, str) else ""
    words = angle.split()
    if len(words) > 28:
        angle = " ".join(words[:28]).rstrip(",;:")
    out["candidateAngle"] = angle

    def str_list(key):
        v = raw.get(key)
        if not isinstance(v, list):
            return []
        return [str(x).strip() for x in v if str(x).strip()]

    out["primaryStory"] = dedupe_preserve_order(str_list("primaryStory"))[:4]
    out["secondaryStory"] = dedupe_preserve_order(str_list("secondaryStory"))[:3]
    out["rewriteGoals"] = dedupe_preserve_order(str_list("rewriteGoals"))[:4]
    out["avoid"] = dedupe_preserve_order(str_list("avoid"))[:6]

    def int_ids(key):
        v = raw.get(key)
        if not isinstance(v, list):
            return []
        ids = []
        for x in v:
            if isinstance(x, int):
                ids.append(x)
            elif isinstance(x, float) and x == int(x):
                ids.append(int(x))
            elif isinstance(x, str) and x.strip().lstrip("-").isdigit():
                ids.append(int(x.strip()))
        return dedupe_preserve_order(ids)

    valid_exp = collect_row_ids("experience", resume_data)
    valid_proj = collect_row_ids("projects", resume_data)

    hero_exp = [i for i in int_ids("heroExperience") if i in valid_exp][:2]
    hero_proj = [i for i in int_ids("heroProjects") if i in valid_proj][:3]
    out["heroExperience"] = hero_exp
    out["heroProjects"] = hero_proj

    default_rewrite = [
        "Make hero experience and projects read as clear scope + impact for this role using only on-row facts.",
        "Land bullets as recruiter-scannable proof of the primary story—not a flat list of tools.",
    ]
    if len(out["rewriteGoals"]) < 2:
        for line in default_rewrite:
            if len(out["rewriteGoals"]) >= 2:
                break
            if line not in out["rewriteGoals"]:
                out["rewriteGoals"].append(line)
    out["rewriteGoals"] = out["rewriteGoals"][:4]

    default_avoid = [
        "Do not add JD-only stack or tools unless that row or skill pool already proves them.",
        "Do not imply industry/domain experience (healthcare, finance vertical, mobile-only product, etc.) without explicit resume proof.",
        "Do not use user-centric or product-strategy phrasing unless the row supports it with concrete facts.",
        "Do not thin the skills pool or swap truthful project tech_stack for JD keywords.",
    ]
    if len(out["avoid"]) < 2:
        for line in default_avoid:
            if len(out["avoid"]) >= 6:
                break
            if line not in out["avoid"]:
                out["avoid"].append(line)
    out["avoid"] = out["avoid"][:6]

    return out
