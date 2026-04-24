from __future__ import annotations

# --- narrative pre-pass: one cheap JSON-only completion so the main tailor pass gets an explicit editorial spine. --- #

# ===== imports ===== #
import json
import re
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
    """One cheap JSON-only call: editorial spine (angle, section/skills/summary strategy, hero rows, guardrails). Rewrite pass stays separate."""
    # --- default shape when the model is skipped or returns garbage; main prompt still accepts this. --- #
    empty = {
        "candidateAngle": "",
        "primaryStory": [],
        "secondaryStory": [],
        "summaryGoal": "",
        "skillsStrategy": [],
        # --- categoryStrategy: optional tactics for broad/fluffy skill-like groupings *if* the resume has them ("Focus Areas" is one possible label—never assumed). Use [] when N/A. --- #
        "categoryStrategy": [],
        "sectionStrategy": {},
        "heroProjects": [],
        "supportingProjects": [],
        "peripheralProjects": [],
        "heroExperience": [],
        "rewriteGoals": [],
        "avoid": [],
    }

    # if openai is off, skip the second call—the main prompt still gets padded defaults via normalize.
    if not is_openai_enabled():
        resume_data_early = payload.get("resume_data") if isinstance(payload.get("resume_data"), dict) else {}
        kw_early = tailorContext.get("keywords") or []
        primary_early = top_keyword_terms(kw_early, limit=8)
        proj_rank_early = build_project_rank_list({}, resume_data_early)
        normalized_skip = normalize_narrative_brief(
            {},
            empty,
            resume_data_early,
            keyword_hints=primary_early,
            project_rank=proj_rank_early,
        )
        if debug:
            write_narrative_debug(
                {
                    "skipped": "openai_disabled",
                    "normalized": normalized_skip,
                }
            )
        return normalized_skip

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

    # --- system: editorial plan for the rewrite pass—full-resume signal, not project-only. --- #
    system = "\n".join(
        [
            "Return JSON only. No markdown, no text outside the object.",
            "You are writing a sharp editorial plan for the next pass—not a keyword summary, not a rewrite of the resume here.",
            "The plan must drive full-resume shaping: summary opening, experience emphasis, project tiers, skills regrouping, and per-section intensity. Success is downstream: a role-specific resume version, not a safe base with spot edits.",
            "",
            "Editorial questions the plan must answer:",
            "What version of this candidate is foregrounded? Which rows carry the story? How should the summary open and what technical signal leads? How should skills be rebalanced? What must never be implied?",
            "",
            "candidateAngle: one sentence, max ~28 words—sharp role positioning (what kind of engineer/builder for this job). Lead with concrete work shapes: backend, APIs, dashboards, data workflows, full-stack product delivery, internal tooling—not vague value language (no \"driving impactful solutions,\" generic \"user-facing applications\" without technical anchor, \"impactful outcomes\"). Not a comma list of every tool. Not meta about evidence. Must not contradict avoid. Ban: well-suited, versatile, passionate, detail-oriented, strong communication, highly motivated, results-driven, self-starter, dynamic, adept at, proven track record, and similar fluff.",
            "primaryStory: 2–4 short phrases—strong impression pillars (e.g. production backend and API delivery, full-stack workflow ownership, data-intensive systems)—not topic buckets or JD echoes.",
            "secondaryStory: 0–3 phrases only if additive. No healthcare/health-solutions/clinical/practitioner/patient framing unless the resume explicitly supports that domain—prefer safe themes (dashboard/ops visibility, internal tooling, pipelines, real-time analytics, cross-functional delivery). Drop generic culture glue.",
            "rewriteGoals: 2–4 row-local strings—how the row lands and which technical signal leads; Make/Land/Use. No vague \"impactful\" filler; no domain drift beyond the row; match contribution level—no ownership inflation or sweeping AI/product claims beyond bullets. No bare Highlight/Emphasize. No new facts.",
            "",
            "summaryGoal: one sentence, max ~32 words—how updatedResumeData.summary should read (opening story + technical lead + safe role fit). Must not restate candidateAngle verbatim; must not contradict avoid. Say what to foreground and what not to imply (e.g. no unsupported domain/stack) when gaps warrant.",
            "skillsStrategy: 2–4 strings—directional, not a final org chart: rise vs sink/trim, whether consolidation helps, rough bucket count (~3–4)—but do not prescribe exact category titles (no \"Backend Development, Data Engineering, Web Development\" schemes) unless copying labels already on the resume. No \"Focus Areas\" assumption. Both foreground and demotion required.",
            "categoryStrategy: [] unless the resume JSON actually has a broad/fluffy skill-like category to fix—then 1–3 lines with concrete verbs: merge, rename, trim, deprioritize, collapse. No placeholder \"if a grouping exists.\" No assumption that any brand name (e.g. Focus Areas) appears.",
            "sectionStrategy: short values for summary, experience, projects, skills (required); education if needed. experience must be operational: e.g. on heroExperience tighten scope/systems/outcomes on weak or under-targeted bullets only; leave strong bullets; do not force edits on every line. Align with hero ids; skills react to the role.",
            "",
            "Projects (tiers—still required):",
            "Review every project row in resume JSON. Classify each project id exactly once across heroProjects, supportingProjects, peripheralProjects.",
            "Tier 1 heroProjects (max 3 ids): strongest role fit—plan for the heaviest edits; when a hero anchors the story, expect most or all bullets to be in play for truthful sharpening.",
            "Tier 2 supportingProjects: few ids only—still role-relevant and worth light tailoring (cap instinct to dump every non-hero row here).",
            "Tier 3 peripheralProjects: most non-hero projects default here—preserve; little or no tailoring unless a sharp truthful fix appears.",
            "rewriteGoals must drive how Tier 1 (and selective Tier 2) rows land—not \"highlight\" with no destination.",
            "",
            "Consistency: anything in avoid (e.g. do not imply healthcare) must not appear as positioning in candidateAngle, summaryGoal, skillsStrategy, or rewriteGoals.",
            "Evidence-first: infer angle, summaryGoal, skillsStrategy, sectionStrategy, and tier ids from evidenceRows first. JD terms tune emphasis only—not new identity, stack, or domain.",
            "resumeGaps → avoid; keep angle and summaryGoal compatible with those guardrails.",
            "",
            "Anti-overreach: do not plan positioning that implies healthcare, finance-industry, mobile-native, Ruby/Rails, TypeScript, or other unproven domain/stack just because the JD mentions them.",
            "Prefer angles the evidence rows can support (backend, APIs, dashboards, data workflows, full-stack delivery, AI/LLM when on-row, real-time systems, internal tooling).",
            "",
            "Hard limits (keep the brief short):",
            "candidateAngle: exactly one sentence, max ~28 words.",
            "primaryStory: 2–4 phrases.",
            "secondaryStory: 0–3 phrases.",
            "rewriteGoals: 2–4 strings; each must be doable without new facts.",
            "summaryGoal: one sentence, max ~32 words.",
            "skillsStrategy: 2–4 strings; categoryStrategy: 0–3 or [].",
            "sectionStrategy: include at least summary, experience, projects, skills; education if non-trivial.",
            "heroExperience: at most 2 numeric ids; heroProjects: at most 3—from the resume JSON only.",
            "supportingProjects + peripheralProjects: every other project id on the resume (partition with heroProjects; no id in more than one list).",
            "avoid: 2–6 concrete guardrails. Never empty: name unsupported JD stack/domain/platform asks; forbid swapping project tech for JD keywords; forbid fluffy user/product strategy language unless a row proves it. Skills trimming for JD relevance is fine in the rewrite pass—do not forbid it here.",
            "",
            "Example (illustrative; ids and names are placeholders):",
            '{"candidateAngle":"Full-stack engineer centered on production backend, APIs, dashboards, and data-backed product delivery.","primaryStory":["production backend and API delivery","full-stack product and dashboard work","data-intensive application systems"],"secondaryStory":["operational visibility through internal tooling"],"summaryGoal":"Open on shipped backend/API and dashboard work, then tie data workflows to the role—no industry claims the resume does not prove.","skillsStrategy":["Foreground Python, Django, React, PostgreSQL evidenced on hero rows","Sink thin buzzwords and low-signal items for this JD","Consider fewer, denser buckets (~3–4) without renaming to new formal category titles"],"categoryStrategy":[],"sectionStrategy":{"summary":"Full rewrite per summaryGoal; lead with proof, not adjectives","experience":"Hero jobs: sharpen scope, systems, outcomes on weak bullets only; leave strong lines; no full-row forced rewrite","projects":"Heavy on heroProjects—most bullets in play; supporting lighter","skills":"Regroup per skillsStrategy; visible role reaction","education":"Light; credentials unchanged"},"heroExperience":[1],"heroProjects":[1,2],"supportingProjects":[3],"peripheralProjects":[4,5],"rewriteGoals":["Make BitGo read more like hands-on backend services and internal tooling delivery","Make Centi read more like scoped full-stack build with concrete integrations","Use SentimentTrader to reinforce pipeline and near-real-time analytics where bullets support it"],"avoid":["Do not imply healthcare domain experience","Do not use user-centric or product-strategy language unless the row supports it concretely","Do not add unsupported stack such as Ruby, Rails, or TypeScript","Do not replace real project technologies with JD technologies","Do not drop skills that anchor a kept hero row unless clearly redundant for this JD"]}',
        ]
    )

    # --- trim JD here so this call stays smaller; full JD is still in the main tailor user prompt. --- #
    jd_clip = jd[:5000] + ("…" if len(jd) > 5000 else "")

    gaps_preview = list(gaps)[:24]

    user = "\n".join(
        [
            "Produce one editorial plan JSON. Downstream success = a fully reshaped resume for this role, not a lightly edited base.",
            "summaryGoal must guide the summary rewrite specifically (opening story, technical lead, safe fit)—do not copy-paste candidateAngle.",
            "skillsStrategy must include both foregrounding and demotion/trim guidance—what rises and what sinks—plus regroup/consolidation when useful.",
            "sectionStrategy.experience: operational (hero job weak bullets vs leave strong lines), not vague \"enhance impactful bullets.\"",
            "rewriteGoals: executable landing only; no ownership or scope beyond the row; no sweeping AI/UI claims; no vague \"impactful\"; Make/Land/Use; weak \"highlight X\" alone is unacceptable.",
            "categoryStrategy: [] unless the resume JSON shows a real fluffy/broad skill grouping to merge, rename, or trim.",
            "Required: candidateAngle, primaryStory, summaryGoal, skillsStrategy, sectionStrategy, heroExperience, full project tier partition, rewriteGoals, avoid. secondaryStory optional; omit filler.",
            "Strict consistency: candidateAngle, summaryGoal, skillsStrategy, and rewriteGoals must obey every line in avoid.",
            "Projects: every id exactly once—heroProjects (max 3), supportingProjects (few; light-touch only), peripheralProjects (default for remaining). Do not park every non-hero project in supporting.",
            "sectionStrategy: per-section aggression; align with heroes; preserve content that is already strong.",
            "JD terms are emphasis hints only—not license for unsupported stack or domain.",
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
            '{"candidateAngle":"","primaryStory":[],"secondaryStory":[],"summaryGoal":"","skillsStrategy":[],"categoryStrategy":[],"sectionStrategy":{},"heroProjects":[],"supportingProjects":[],"peripheralProjects":[],"heroExperience":[],"rewriteGoals":[],"avoid":[]}',
        ]
    )

    text, _ = ai_chat_completion(system_prompt=system, user_prompt=user, temperature=0.25)
    # --- parse_chat_json tolerates fences/empty; normalization caps lists and drops bogus hero ids. --- #
    raw = parse_chat_json(text)
    project_rank = build_project_rank_list(rows_ranked, resume_data)
    normalized = normalize_narrative_brief(
        raw, empty, resume_data, keyword_hints=primary, project_rank=project_rank
    )

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


def build_project_rank_list(rows_ranked, resume_data):
    # --- Plan-ranked project ids first, then remaining resume ids—stable tier capping uses this order. --- #
    valid = collect_row_ids("projects", resume_data)
    if not valid:
        return []
    out = []
    seen = set()
    rp = rows_ranked.get("projects") if isinstance(rows_ranked, dict) else None
    if isinstance(rp, list):
        for row in rp:
            if not isinstance(row, dict):
                continue
            rid = row.get("id")
            if isinstance(rid, float) and rid == int(rid):
                rid = int(rid)
            if isinstance(rid, int) and rid in valid and rid not in seen:
                seen.add(rid)
                out.append(rid)
    for pid in sorted(valid):
        if pid not in seen:
            out.append(pid)
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


# --- Keys for sectionStrategy; values are one-line rewrite-pass intensity hints (not a global edit budget). --- #
sectionStrategyKeys = ("summary", "experience", "projects", "skills", "education")


def normalize_section_strategy_obj(raw_val: Any) -> dict:
    out = {}
    if not isinstance(raw_val, dict):
        return out
    for k in sectionStrategyKeys:
        v = raw_val.get(k)
        if isinstance(v, str) and v.strip():
            s = v.strip().replace("\n", " ")
            if len(s) > 180:
                s = s[:177] + "…"
            out[k] = s
    return out


def _experience_strategy_operational_default():
    return (
        "On heroExperience: sharpen scope, systems touched, and outcomes on weak or under-targeted bullets only; "
        "leave already-strong bullets; do not force edits across every line; lighter touch on non-hero jobs."
    )


def pad_section_strategy_partial(d: dict) -> dict:
    # --- Fills missing section keys so the main pass always gets explicit section-level intent. --- #
    defaults = {
        "summary": "Full rewrite: open per summaryGoal; technical proof first; nothing avoid forbids.",
        "experience": _experience_strategy_operational_default(),
        "projects": "Heavy on heroProjects—most bullets fair game when story-rich; supporting lighter; peripheral preserve.",
        "skills": "Visible regroup per skillsStrategy; ~3–4 dense categories; sink junk without row proof.",
        "education": "Light—credentials frozen; trim highlights only if they sharpen scan.",
    }
    merged = dict(d)
    for k, v in defaults.items():
        if k not in merged:
            merged[k] = v
    return merged


# --- Strip common résumé clichés from brief text so the editorial plan stays sharp and actionable. --- #
_cliche_patterns = (
    re.compile(r"\bwell[- ]suited\b", re.I),
    re.compile(r"\bversatile\b", re.I),
    re.compile(r"\bstrong communication\b", re.I),
    re.compile(r"\bteam player\b", re.I),
    re.compile(r"\bpassionate about\b", re.I),
    re.compile(r"\bhighly motivated\b", re.I),
    re.compile(r"\bdetail[- ]oriented\b", re.I),
    re.compile(r"\bresults[- ]driven\b", re.I),
    re.compile(r"\bself[- ]starter\b", re.I),
    re.compile(r"\bdynamic professional\b", re.I),
    re.compile(r"\badept at\b", re.I),
    re.compile(r"\bproven track record\b", re.I),
)

# --- Drop secondaryStory lines that read like generic culture filler, not evidence-backed themes. --- #
_weak_secondary_theme_re = re.compile(
    r"collaborative engineering practices|excellent communication|interpersonal skills|strong work ethic|"
    r"team collaboration\b|detail-oriented team|proven ability to work",
    re.I,
)

_weak_rewrite_opening_re = re.compile(
    r"^\s*(highlight|emphasize|emphasise|enhance|showcase|feature)\b",
    re.I,
)


def strip_resume_cliche_phrases(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""
    t = text
    for p in _cliche_patterns:
        t = p.sub("", t)
    t = re.sub(r"\s+", " ", t).strip(" ,;—-")
    return t


# --- Remove evidence-meta tails so candidateAngle reads as positioning, not a proof footnote. --- #
_angle_meta_tail_res = (
    re.compile(r"\s*[—,;]\s*grounded in\b.*$", re.I),
    re.compile(r"\s*[—,;]\s*anchored in\b.*$", re.I),
    re.compile(r"\s*[—,;]\s*based on\b.*$", re.I),
    re.compile(r"\s*[—,;]\s*with evidence from\b.*$", re.I),
    re.compile(r"\s*[—,;]\s*evidenced on\b.*$", re.I),
    re.compile(r"\s*[—,;]\s*from internships and projects\b.*$", re.I),
)


def strip_candidate_angle_meta(text):
    if not text or not isinstance(text, str):
        return ""
    t = text.strip()
    for pat in _angle_meta_tail_res:
        t = pat.sub("", t)
    t = re.sub(r"\s+", " ", t).strip(" ,;—-")
    return t


def strip_vague_angle_wording(text):
    # --- Replace soft outcome phrasing with concrete delivery shapes where it appears. --- #
    if not text or not isinstance(text, str):
        return ""
    t = text
    t = re.sub(
        r"(?i)\bdriving impactful solutions?\b",
        "shipping backend, API, and product work",
        t,
    )
    t = re.sub(r"(?i)\bimpactful solutions?\b", "concrete delivery", t)
    t = re.sub(r"(?i)\bimpactful outcomes?\b", "concrete outcomes", t)
    t = re.sub(
        r"(?i)\buser-facing applications?\b",
        "web and API-backed product surfaces",
        t,
    )
    return re.sub(r"\s+", " ", t).strip(" ,;—-")


_health_domain_signal_re = re.compile(
    r"health\s*care|healthcare|health\s+solutions?|\bclinical\b|practitioner|\bpatient\b|"
    r"\bhipaa\b|\bhospital\b|\bmedical\b",
    re.I,
)


def resume_mentions_health_domain(resume_data):
    if not isinstance(resume_data, dict):
        return False
    return _health_domain_signal_re.search(json.dumps(resume_data, default=str)) is not None


def secondary_story_line_keep(line, resume_has_health):
    if not line or not isinstance(line, str):
        return False
    if _health_domain_signal_re.search(line) and not resume_has_health:
        return False
    return True


def skills_strategy_line_too_prescriptive(line):
    # --- Drop lines that hardcode a final category scheme the model invented. --- #
    if not line or not isinstance(line, str):
        return False
    low = line.lower()
    if re.search(
        r"\binto\s+(the\s+)?(three|four|five|six|3|4|5|6)\b[^.:]{0,48}\bcategor",
        line,
        re.I,
    ) and ":" in line:
        return True
    if re.search(r":\s*[A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+(\s*,\s*[A-Z][a-zA-Z]+){2,}", line):
        return True
    if (
        "backend development" in low
        and "data engineering" in low
        and ("web development" in low or "frontend" in low)
    ):
        return True
    if "consolidate" in low and "focus areas" in low and "development" in low:
        return True
    return False


def cap_supporting_projects(support_proj, periph_proj, hero_set, project_rank_eff, max_supporting):
    # --- Keep supporting small; overflow to peripheral (plan order wins for who stays supporting). --- #
    if max_supporting <= 0:
        merged = dedupe_preserve_order(list(periph_proj) + [p for p in support_proj if p not in periph_proj])
        return [], merged
    rank_idx = {pid: i for i, pid in enumerate(project_rank_eff)}
    sup = [p for p in support_proj if p not in hero_set]
    sup = sorted(sup, key=lambda x: rank_idx.get(x, 10**9))
    if len(sup) <= max_supporting:
        return dedupe_preserve_order(sup), dedupe_preserve_order(periph_proj)
    overflow = sup[max_supporting:]
    sup = sup[:max_supporting]
    periph_merged = list(periph_proj)
    for p in overflow:
        if p not in periph_merged:
            periph_merged.append(p)
    return dedupe_preserve_order(sup), dedupe_preserve_order(periph_merged)


_vague_experience_strategy_re = re.compile(
    r"enhance\s+impactful|impactful\s+bullet|polish\s+bullet|improve\s+all\s+bullets",
    re.I,
)


def sharpen_section_strategy_experience(sec):
    # --- Replace vague experience lines ("enhance impactful bullets") with operational defaults. --- #
    if not isinstance(sec, dict):
        return
    exp = sec.get("experience")
    if not isinstance(exp, str) or not exp.strip():
        sec["experience"] = _experience_strategy_operational_default()
        return
    if _vague_experience_strategy_re.search(exp):
        sec["experience"] = _experience_strategy_operational_default()


_rise_skill_re = re.compile(
    r"\b(raise|foreground|elevate|lead with|front-?load|prioritize|put\b.*\bfirst)\b",
    re.I,
)
_fall_skill_re = re.compile(
    r"\b(sink|demote|depriorit|trim|drop|weak|ornamental|junk|bottom|thin evidence|low-?signal|low-?value|one-?off)\b",
    re.I,
)


def ensure_skills_strategy_rise_and_fall(lines, keyword_hints):
    # --- Guarantee both foreground and demotion/trim guidance when the model under-specifies. --- #
    out = [x for x in lines if x]
    has_rise = any(_rise_skill_re.search(x) for x in out)
    has_fall = any(_fall_skill_re.search(x) for x in out)
    if not has_fall:
        line = "Demote or trim items with thin JD fit or no row proof; sink decorative one-offs that do not reinforce the primary story."
        if line not in out:
            out.append(line)
    if not has_rise:
        hints = ", ".join(
            str(h).strip() for h in (keyword_hints or [])[:5] if h and str(h).strip()
        )
        if hints:
            line = (
                f"Foreground evidenced stacks and tools that match this role (e.g. {hints}) near the top when on hero rows or projects."
            )
        else:
            line = "Foreground role-relevant stacks that appear on hero experience or projects; order for recruiter scan."
        if line not in out:
            out.insert(0, line)
    return dedupe_preserve_order(out)[:4]


def soften_rewrite_goal_scope(line):
    # --- Nudge common inflation in landing phrases while keeping Make/Land/Use structure. --- #
    if not line or not isinstance(line, str):
        return ""
    s = line.strip()
    s = re.sub(r"(?i)(read more like)\s+owned\s+", r"\1 hands-on ", s)
    s = re.sub(r"(?i)(read more like)\s+sole\s+", r"\1 scoped ", s)
    s = re.sub(r"(?i)\bend-to-end\s+product\s+build\b", "scoped product build", s)
    s = re.sub(r"(?i)\bai-?driven\s+workflows?\b", "workflows the row actually names (stack/UI/ML)", s)
    s = re.sub(r"(?i)\bimpactful\b", "concrete", s)
    s = re.sub(r"\s+,", ",", s)
    s = re.sub(r"\s{2,}", " ", s).strip()
    return s


def skill_category_row_count(resume_data: dict) -> int:
    skills = resume_data.get("skills") if isinstance(resume_data, dict) else None
    if not isinstance(skills, list):
        return 0
    return len([r for r in skills if isinstance(r, dict)])


def category_strategy_line_is_placeholder(line: str) -> bool:
    # --- Drop meta "if such a grouping exists" lines—categoryStrategy should be concrete or []. --- #
    low = line.lower().strip()
    if low.startswith("if ") and ("exists" in low or "vague" in low):
        return True
    return False


_fluffy_category_fragments = (
    "focus area",
    "focus ",
    "theme",
    "interests",
    "strengths",
    "soft skill",
    "general",
    "misc",
    "other skill",
    "highlights",
    "additional skill",
    "personal interest",
)


def resume_has_fluffy_skill_category(resume_data: dict) -> bool:
    skills = resume_data.get("skills") if isinstance(resume_data, dict) else None
    if not isinstance(skills, list) or len(skills) < 2:
        return False
    for row in skills:
        if not isinstance(row, dict):
            continue
        cat = str(row.get("category") or row.get("name") or row.get("title") or "").lower()
        for frag in _fluffy_category_fragments:
            if frag in cat:
                return True
    return len(skills) >= 6


def category_line_is_concrete(line: str) -> bool:
    low = line.strip().lower()
    return any(
        low.startswith(p)
        for p in (
            "merge",
            "rename",
            "trim",
            "collapse",
            "consolidate",
            "move ",
            "deprioritize",
            "sink ",
            "fold ",
            "split ",
        )
    )


def skills_strategy_line_is_generic(line: str) -> bool:
    low = line.lower().strip()
    if len(low) < 14:
        return True
    generic = (
        "prioritize relevant skills",
        "prioritize relevant skill",
        "group similar skills",
        "trim less relevant",
        "trim irrelevant",
        "reorganize skills",
        "organize skills",
        "focus on relevant",
        "emphasize key skills",
        "highlight important skills",
        "list relevant technologies",
    )
    return any(p in low for p in generic)


def rewrite_goal_has_landing_language(line: str) -> bool:
    low = line.lower()
    return (
        "more like" in low
        or low.startswith("land ")
        or low.startswith("make ")
        or low.startswith("use ")
    )


def filter_rewrite_goals(lines):
    out = []
    for line in lines:
        s = str(line).strip()
        if not s:
            continue
        if _weak_rewrite_opening_re.match(s) and not rewrite_goal_has_landing_language(s):
            continue
        out.append(soften_rewrite_goal_scope(s))
    return out


def summaries_too_similar(summary_goal: str, angle: str) -> bool:
    if not summary_goal or not angle:
        return False
    na = re.sub(r"\s+", " ", summary_goal.lower().strip())
    nb = re.sub(r"\s+", " ", angle.lower().strip())
    if na == nb:
        return True
    shorter, longer = (na, nb) if len(na) <= len(nb) else (nb, na)
    if len(shorter) > 18 and shorter in longer:
        return True
    return False


def differentiate_summary_goal(summary_goal: str, angle: str, primary_story: list) -> str:
    # --- summaryGoal should steer the opening summary, not duplicate candidateAngle. --- #
    if not summaries_too_similar(summary_goal, angle):
        return summary_goal
    lead = primary_story[0] if primary_story else "the strongest evidence-backed thread"
    alt = (
        f"Open on {lead}; foreground concrete scope from hero rows; "
        f"state role fit without any claim avoid rules out."
    )
    words = alt.split()
    if len(words) > 32:
        alt = " ".join(words[:32]).rstrip(",;:")
    return alt


def pad_skills_strategy_lines(lines: list, keyword_hints: list) -> list:
    # --- Ensure 2–4 actionable lines; fold JD emphasis terms when the model under-specifies. --- #
    out = dedupe_preserve_order([x for x in lines if x])
    if len(out) >= 2:
        return out[:4]
    hints = ", ".join(
        str(h).strip() for h in (keyword_hints or [])[:6] if h and str(h).strip()
    )
    if hints:
        line = (
            "Foreground evidenced skills that match these JD emphasis terms when they appear on hero rows or projects: "
            + hints
            + "."
        )
        if line not in out:
            out.append(line)
    if len(out) < 2:
        out.append(
            "Fewer, denser categories; trim items with no on-resume evidence or JD line of sight; sink generic theme items."
        )
    if len(out) < 2:
        out.append(
            "Regroup related tools under the tightest accurate labels; rename categories when it improves scanability."
        )
    return dedupe_preserve_order(out)[:4]


def normalize_narrative_brief(raw, empty, resume_data, keyword_hints=None, project_rank=None):
    # coerce model JSON into stable keys; cap lengths; filter hero ids; pad thin strategy fields without inventing category fluff.
    if not isinstance(raw, dict):
        raw = {}
    hints = keyword_hints if isinstance(keyword_hints, list) else []

    out = dict(empty)
    resume_has_health = resume_mentions_health_domain(resume_data)
    valid_proj = collect_row_ids("projects", resume_data)
    base_rank = project_rank if isinstance(project_rank, list) else []
    project_rank_eff = []
    seen_rank = set()
    for p in base_rank:
        if isinstance(p, float) and p == int(p):
            p = int(p)
        if isinstance(p, int) and p in valid_proj and p not in seen_rank:
            seen_rank.add(p)
            project_rank_eff.append(p)
    for pid in sorted(valid_proj):
        if pid not in seen_rank:
            project_rank_eff.append(pid)

    def str_list(key):
        v = raw.get(key)
        if not isinstance(v, list):
            return []
        return [str(x).strip() for x in v if str(x).strip()]

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

    # --- avoid first so angle/summaryGoal can stay consistent with guardrails we will pad if thin. --- #
    out["avoid"] = dedupe_preserve_order(str_list("avoid"))[:6]
    default_avoid = [
        "Do not add JD-only stack or tools unless that row or skill pool already proves them.",
        "Do not imply industry/domain experience (healthcare, finance vertical, mobile-only product, etc.) without explicit resume proof.",
        "Do not use user-centric or product-strategy phrasing unless the row supports it with concrete facts.",
        "Do not swap truthful project tech_stack for JD keywords; skills may be trimmed for relevance in the rewrite pass.",
    ]
    if len(out["avoid"]) < 2:
        for line in default_avoid:
            if len(out["avoid"]) >= 6:
                break
            if line not in out["avoid"]:
                out["avoid"].append(line)
    out["avoid"] = out["avoid"][:6]

    ca = raw.get("candidateAngle")
    angle = strip_resume_cliche_phrases(ca.strip() if isinstance(ca, str) else "")
    words = angle.split()
    if len(words) > 28:
        angle = " ".join(words[:28]).rstrip(",;:")
    angle = strip_candidate_angle_meta(angle)
    angle = strip_vague_angle_wording(angle)
    out["candidateAngle"] = angle

    primary = [
        strip_resume_cliche_phrases(x)
        for x in dedupe_preserve_order(str_list("primaryStory"))[:4]
    ]
    out["primaryStory"] = [x for x in primary if x]

    sec_lines = []
    for x in dedupe_preserve_order(str_list("secondaryStory"))[:3]:
        c = strip_resume_cliche_phrases(x)
        if (
            c
            and not _weak_secondary_theme_re.search(c)
            and secondary_story_line_keep(c, resume_has_health)
        ):
            sec_lines.append(c)
    out["secondaryStory"] = sec_lines[:3]

    sg_raw = raw.get("summaryGoal")
    summary_goal = strip_resume_cliche_phrases(sg_raw.strip() if isinstance(sg_raw, str) else "")

    cat_candidates = dedupe_preserve_order(str_list("categoryStrategy"))[:3]
    if skill_category_row_count(resume_data) < 2:
        out["categoryStrategy"] = []
    else:
        built_cat = []
        for line in cat_candidates:
            if category_strategy_line_is_placeholder(line):
                continue
            cleaned = strip_resume_cliche_phrases(line)
            if cleaned:
                built_cat.append(cleaned)
        if not resume_has_fluffy_skill_category(resume_data):
            built_cat = [x for x in built_cat if category_line_is_concrete(x)]
        out["categoryStrategy"] = built_cat[:3]

    out["sectionStrategy"] = pad_section_strategy_partial(
        normalize_section_strategy_obj(raw.get("sectionStrategy"))
    )
    sharpen_section_strategy_experience(out["sectionStrategy"])

    valid_exp = collect_row_ids("experience", resume_data)

    hero_exp = [i for i in int_ids("heroExperience") if i in valid_exp][:2]
    hero_proj = [i for i in int_ids("heroProjects") if i in valid_proj][:3]
    hero_set = set(hero_proj)

    support_proj = [i for i in int_ids("supportingProjects") if i in valid_proj and i not in hero_set]
    support_proj = dedupe_preserve_order(support_proj)
    periph_proj = [i for i in int_ids("peripheralProjects") if i in valid_proj and i not in hero_set]
    periph_proj = dedupe_preserve_order([i for i in periph_proj if i not in support_proj])
    classified = hero_set | set(support_proj) | set(periph_proj)
    for pid in sorted(valid_proj):
        if pid not in classified:
            periph_proj.append(pid)
    periph_proj = dedupe_preserve_order(periph_proj)

    non_hero_n = len(valid_proj) - len(hero_set)
    max_supporting = min(2, non_hero_n) if non_hero_n > 0 else 0
    support_proj, periph_proj = cap_supporting_projects(
        support_proj, periph_proj, hero_set, project_rank_eff, max_supporting
    )

    out["heroExperience"] = hero_exp
    out["heroProjects"] = hero_proj
    out["supportingProjects"] = support_proj
    out["peripheralProjects"] = periph_proj

    if not summary_goal.strip():
        if out["primaryStory"]:
            summary_goal = (
                "Lead with "
                + out["primaryStory"][0]
                + "; fold in secondary proof from hero rows—nothing avoid forbids."
            )
        elif angle:
            summary_goal = (
                "Open on the strongest hero-row proof; state scope the resume actually shows—aligned with avoid."
            )
        else:
            summary_goal = (
                "Open with concrete proof from the resume; no new facts; honor every avoid line."
            )
    summary_goal = strip_resume_cliche_phrases(summary_goal)
    summary_goal = differentiate_summary_goal(summary_goal, angle, out["primaryStory"])
    summary_goal = strip_resume_cliche_phrases(summary_goal)
    sg_words = summary_goal.split()
    if len(sg_words) > 32:
        summary_goal = " ".join(sg_words[:32]).rstrip(",;:")
    out["summaryGoal"] = summary_goal

    sk_raw = [strip_resume_cliche_phrases(x) for x in str_list("skillsStrategy")]
    sk_raw = [
        x
        for x in sk_raw
        if x and not skills_strategy_line_is_generic(x) and not skills_strategy_line_too_prescriptive(x)
    ]
    out["skillsStrategy"] = ensure_skills_strategy_rise_and_fall(
        pad_skills_strategy_lines(sk_raw, hints), hints
    )

    rg = filter_rewrite_goals(dedupe_preserve_order(str_list("rewriteGoals"))[:4])
    out["rewriteGoals"] = rg

    default_rewrite = [
        "Make hero experience rows read as scoped delivery with concrete stack and outcomes—only on-row facts.",
        "Land hero project bullets as the primary proof of the role story; rework most bullets there when evidence is rich.",
    ]
    if len(out["rewriteGoals"]) < 2:
        for line in default_rewrite:
            if len(out["rewriteGoals"]) >= 2:
                break
            softened = soften_rewrite_goal_scope(line)
            if softened not in out["rewriteGoals"]:
                out["rewriteGoals"].append(softened)
    out["rewriteGoals"] = [soften_rewrite_goal_scope(g) for g in out["rewriteGoals"][:4]]

    return out
