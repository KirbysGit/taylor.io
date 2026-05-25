# --- human-facing changelog, changeReasons, narrative omission checks, rewrite audit. --- #

from __future__ import annotations

from .resume_patch_shared import asDict, listById, summaryInner


def _clean_text(value, limit=120):
    text = " ".join(str(value or "").strip().split())
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "..."


def _dedupe_keep_order(items, limit=6):
    out = []
    seen = set()
    for item in items or []:
        text = _clean_text(item, limit=80)
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(text)
        if len(out) >= limit:
            break
    return out


def _join_human(items):
    items = [x for x in items or [] if x]
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return ", ".join(items[:-1]) + f", and {items[-1]}"


def _display_term(term):
    text = _clean_text(term, limit=60)
    known = {
        "api": "API",
        "apis": "APIs",
        "aws": "AWS",
        "ec2": "EC2",
        "etl": "ETL",
        "fastapi": "FastAPI",
        "gcp": "GCP",
        "javascript": "JavaScript",
        "jwt": "JWT",
        "mongodb": "MongoDB",
        "mysql": "MySQL",
        "nlp": "NLP",
        "node.js": "Node.js",
        "openai": "OpenAI",
        "postgresql": "PostgreSQL",
        "python": "Python",
        "react": "React",
        "rest": "REST",
        "sql": "SQL",
        "ci/cd": "CI/CD",
        "google cloud platform": "Google Cloud Platform",
        "amazon bedrock": "Amazon Bedrock",
        "dialogflow": "Dialogflow",
    }
    return known.get(text.lower(), text)


def _display_terms(terms):
    return [_display_term(t) for t in terms or []]


def _section_phrase(changed_sections):
    friendly = {
        "summary": "the summary",
        "experience": "experience",
        "projects": "projects",
        "skills": "skills",
        "education": "education",
        "section order": "the section order",
        "section visibility": "which sections show",
        "header": "the header",
        "contact layout": "contact layout",
    }
    items = [friendly.get(x, x) for x in changed_sections or []]
    return _join_human(items)


def _summary_is_hidden_for_draft(patch, narrative_brief):
    if isinstance(patch, dict):
        sv = patch.get("sectionVisibility")
        if isinstance(sv, dict):
            after = sv.get("after") if isinstance(sv.get("after"), dict) else sv
            if isinstance(after, dict) and isinstance(after.get("summary"), bool):
                return after.get("summary") is False
    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    vis = nb.get("layoutSectionVisibility") if isinstance(nb.get("layoutSectionVisibility"), dict) else {}
    if isinstance(vis.get("summary"), bool):
        return vis.get("summary") is False
    sd = nb.get("summaryDecision") if isinstance(nb.get("summaryDecision"), dict) else {}
    return str(sd.get("action") or "").strip().lower() == "hide"


def _visible_changed_sections(patch, narrative_brief):
    sections = _changed_sections_from_patch(patch)
    if _summary_is_hidden_for_draft(patch, narrative_brief):
        sections = [s for s in sections if s != "summary"]
    return sections


def _main_moves(changed_sections):
    moves = []
    changed = set(changed_sections or [])
    if "projects" in changed:
        moves.append("kept the projects that best prove the role fit")
    if "experience" in changed:
        moves.append("reframed your experience around the job's strongest signals")
    if "summary" in changed:
        moves.append("gave the summary a clearer role-specific angle")
    if "skills" in changed:
        moves.append("moved the most relevant skills higher")
    if "section order" in changed or "section visibility" in changed:
        moves.append("adjusted the layout so the strongest sections show up sooner")
    return moves[:3]


def _layout_phrase(patch):
    if not isinstance(patch, dict):
        return ""
    bits = []
    if "sectionOrder" in patch:
        bits.append("section order")
    if "sectionVisibility" in patch:
        bits.append("summary/section visibility")
    if not bits:
        return ""
    return _join_human(bits)


def _patch_row_label(section, entry):
    if not isinstance(entry, dict):
        return ""
    before = entry.get("before") if isinstance(entry.get("before"), dict) else {}
    after = entry.get("after") if isinstance(entry.get("after"), dict) else {}
    if not after and isinstance(entry.get("fieldsChanged"), dict):
        fc = entry.get("fieldsChanged") or {}
        after = {}
        for key in ("title", "company", "name", "school"):
            delta = fc.get(key)
            if isinstance(delta, dict) and delta.get("after"):
                after[key] = delta.get("after")
    row = after or before
    if section == "experience":
        company = _clean_text(row.get("company") if isinstance(row, dict) else "", limit=40)
        title = _clean_text(row.get("title") if isinstance(row, dict) else "", limit=50)
        return f"{company} {title}".strip()
    if section == "projects":
        return _clean_text(row.get("title") if isinstance(row, dict) else "", limit=70)
    if section == "skills":
        return _clean_text(row.get("name") if isinstance(row, dict) else "", limit=60)
    if section == "education":
        return _clean_text(row.get("school") if isinstance(row, dict) else "", limit=60)
    return ""


def _row_label_from_resume(resume_data, section, rid):
    if not isinstance(resume_data, dict) or rid is None:
        return ""
    rows = resume_data.get(section)
    if not isinstance(rows, list):
        return ""
    for row in rows:
        if not isinstance(row, dict) or row.get("id") != rid:
            continue
        if section == "experience":
            return f"{_clean_text(row.get('company'), limit=40)} {_clean_text(row.get('title'), limit=50)}".strip()
        if section == "projects":
            return _clean_text(row.get("title"), limit=70)
        if section == "skills":
            return _clean_text(row.get("name"), limit=60)
        if section == "education":
            return _clean_text(row.get("school"), limit=60)
    return ""


def _labels_from_patch(patch, section, *, removed=False, limit=4, resume_data=None):
    entries = (patch.get(section) or []) if isinstance(patch, dict) else []
    labels = []
    for entry in entries:
        if not isinstance(entry, dict) or bool(entry.get("removed")) != removed:
            continue
        label = _patch_row_label(section, entry)
        if not label and not removed:
            label = _row_label_from_resume(resume_data, section, entry.get("id"))
        if label:
            labels.append(label)
    return _dedupe_keep_order(labels, limit=limit)


def _detail_items_from_patch(
    patch,
    narrative_brief,
    gaps,
    flags,
    target_label,
    updated_resume_data=None,
    job_strategy=None,
):
    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    js = job_strategy if isinstance(job_strategy, dict) else {}
    target_story = nb.get("targetStory") if isinstance(nb.get("targetStory"), dict) else {}
    groups = []

    why_items = []
    strategy_goal = _clean_text(js.get("readerGoal"), limit=180)
    proof_style = _strategy_items(js, "proofStyle", limit=6)
    keep_priorities = _strategy_items(js, "keepPriorities", limit=5)
    if strategy_goal or proof_style:
        items = []
        if strategy_goal:
            items.append(strategy_goal)
        if proof_style:
            items.append("I prioritized " + _join_human(_display_terms(proof_style)) + ".")
        groups.append({"title": "What I prioritized", "items": items[:2]})

    takeaway = _clean_text(target_story.get("readerTakeaway") if isinstance(target_story, dict) else "", limit=180)
    if takeaway:
        why_items.append(f"Target story: {takeaway}")
    elif keep_priorities:
        why_items.append("Target story: lean on " + _join_human(_display_terms(keep_priorities[:3])) + ".")
    elif target_label:
        why_items.append(f"Targeted the draft toward {target_label}.")
    themes = target_story.get("evidenceThemes") if isinstance(target_story, dict) else []
    themes = _dedupe_keep_order(themes or [], limit=3)
    if themes:
        why_items.append("Main evidence themes: " + _join_human(themes) + ".")
    if why_items:
        groups.append({"title": "Why it changed", "items": why_items})

    alignment_mode = _clean_text(nb.get("alignmentMode"), limit=24).lower()
    alignment_guidance = _clean_text(nb.get("alignmentGuidance"), limit=220)
    fit_risk = nb.get("fitRisk") if isinstance(nb.get("fitRisk"), dict) else {}
    fit_risk_level = _clean_text(fit_risk.get("level"), limit=24).lower()
    transferable = nb.get("transferableEvidence") if isinstance(nb.get("transferableEvidence"), list) else []
    if fit_risk_level in ("extreme", "high"):
        items = []
        reason = _clean_text(fit_risk.get("reason"), limit=240)
        guidance = _clean_text(fit_risk.get("claimGuidance"), limit=240)
        unsupported_scope = _dedupe_keep_order(fit_risk.get("unsupportedSeniorityTerms") or [], limit=4)
        if reason:
            items.append(reason)
        if unsupported_scope:
            items.append("Core scope not evidenced: " + _join_human(unsupported_scope) + ".")
        if guidance:
            items.append(guidance)
        if items:
            groups.append({"title": "Fit risk", "items": items[:3]})
    if alignment_mode in ("adjacent", "stretch"):
        items = []
        if alignment_guidance:
            items.append(alignment_guidance)
        labels = []
        for item in transferable:
            if not isinstance(item, dict):
                continue
            label = _clean_text(item.get("label"), limit=70)
            if label:
                labels.append(label)
            if len(labels) >= 3:
                break
        if labels:
            items.append("Transferable evidence I considered: " + _join_human(_dedupe_keep_order(labels, limit=3)) + ".")
        if items:
            groups.append({"title": "Fit read", "items": items[:2]})

    summary_decision = nb.get("summaryDecision") if isinstance(nb.get("summaryDecision"), dict) else {}
    summary_action = _clean_text(summary_decision.get("action"), limit=20).lower()
    summary_reason = _clean_text(summary_decision.get("reason"), limit=180)
    summary_hidden = _summary_is_hidden_for_draft(patch, nb)
    if summary_hidden and "summary" in (patch or {}):
        item = "I kept the professional summary out of the visible draft because the stronger proof was already easier to scan in experience, projects, and skills."
        groups.append({"title": "Summary choice", "items": [item]})
    elif summary_action in ("show", "hide"):
        verb = "showed" if summary_action == "show" else "hid"
        item = f"I {verb} the professional summary because {summary_reason[0].lower() + summary_reason[1:] if summary_reason else 'that fit this draft better.'}"
        groups.append({"title": "Summary choice", "items": [item]})

    spotlight = []
    planned_spotlight_ids = {
        "experience": set(),
        "projects": set(),
    }
    for key, section in (
        ("heroExperience", "experience"),
        ("rewriteExperience", "experience"),
        ("heroProjects", "projects"),
        ("rewriteProjects", "projects"),
    ):
        for rid in nb.get(key) or []:
            try:
                planned_spotlight_ids[section].add(int(rid))
            except (TypeError, ValueError):
                continue
    for section in ("experience", "projects"):
        entries = (patch.get(section) or []) if isinstance(patch, dict) else []
        for entry in entries:
            if not isinstance(entry, dict) or entry.get("removed"):
                continue
            if fit_risk_level == "extreme" and entry.get("id") not in planned_spotlight_ids.get(section, set()):
                continue
            label = _patch_row_label(section, entry)
            if not label:
                label = _row_label_from_resume(updated_resume_data, section, entry.get("id"))
            if label:
                spotlight.append(label)
    spotlight = _dedupe_keep_order(spotlight, limit=5)
    if spotlight:
        groups.append({"title": "What I spotlighted", "items": spotlight})

    removed = []
    for section in ("experience", "projects", "skills", "education"):
        entries = (patch.get(section) or []) if isinstance(patch, dict) else []
        for entry in entries:
            if not isinstance(entry, dict) or not entry.get("removed"):
                continue
            label = _patch_row_label(section, entry)
            if label:
                removed.append(label)
    removed = _dedupe_keep_order(removed, limit=8)
    if removed:
        groups.append({"title": "What I trimmed", "items": removed})

    category_strategy = _dedupe_keep_order(nb.get("categoryStrategy") or [], limit=3)
    if category_strategy:
        groups.append(
            {
                "title": "Skill groups",
                "items": [
                    "I treated broad skill buckets like Focus Areas as flexible positioning space: "
                    + _join_human(category_strategy)
                    + "."
                ],
            }
        )

    gap_support = nb.get("gapSupport") if isinstance(nb.get("gapSupport"), list) else []
    conceptual = []
    unsupported_exact = []
    context_only = []
    for item in gap_support:
        if not isinstance(item, dict):
            continue
        term = _clean_text(item.get("term"), limit=60)
        if item.get("status") == "unsupported_exact" and term:
            unsupported_exact.append(term)
            continue
        if item.get("status") == "context_only" and term:
            context_only.append(term)
            continue
        if item.get("status") != "conceptual":
            continue
        evidence = _dedupe_keep_order(item.get("supportingEvidence") or [], limit=3)
        if term and evidence:
            conceptual.append(f"{term}: related evidence includes {_join_human(evidence)}.")
    if conceptual:
        groups.append({"title": "Related evidence", "items": conceptual[:3]})
    if unsupported_exact:
        groups.append(
            {
                "title": "Not directly evidenced",
                "items": [
                    "I did not claim "
                    + _join_human(_display_terms(_dedupe_keep_order(unsupported_exact, limit=5)))
                    + " because those exact tools or platforms were not in the resume."
                ],
            }
        )
    if context_only:
        groups.append(
            {
                "title": "Company context",
                "items": [
                    _join_human(_display_terms(_dedupe_keep_order(context_only, limit=4)))
                    + " looked like job/company context, so I kept it out of the main resume claims."
                ],
            }
        )

    review = []
    claim_rules = _strategy_items(js, "claimRules", limit=2)
    for rule in claim_rules:
        review.append(rule)
    if gaps:
        review.append("Some JD terms were not directly evidenced: " + _join_human(gaps[:4]) + ".")
    if flags.get("suspicious_protected_skill_removals"):
        review.append("Review the skills list; a few useful-but-lower-priority skills may have been trimmed.")
    if flags.get("minor_expected_rewrites"):
        review.append("A row may still be close to the original even after repair, so it is worth a quick read.")
    if flags.get("filler_phrase_hits"):
        review.append("Some generic phrasing may still be worth tightening.")
    if review:
        groups.append({"title": "Worth checking", "items": review[:4]})

    return groups


def _keyword_terms_from_context(tailor_context, limit=3):
    tc = tailor_context if isinstance(tailor_context, dict) else {}
    ac = tc.get("alignmentContext") if isinstance(tc.get("alignmentContext"), dict) else {}
    unsupported = {str(x or "").strip().lower() for x in (ac.get("unsupportedTerms") or []) if str(x or "").strip()}
    hits = {str(x or "").strip().lower() for x in (tc.get("resumeHits") or []) if str(x or "").strip()}
    terms = []
    for entry in tc.get("keywords") or []:
        if not isinstance(entry, dict):
            continue
        term = entry.get("term")
        if not isinstance(term, str) or not term.strip():
            continue
        low = term.strip().lower()
        signal_type = str(entry.get("signalType") or "").strip().lower()
        if low in unsupported or signal_type in ("context", "generic_fragment", "noise"):
            continue
        if hits and low not in hits:
            continue
        terms.append(term)
    if not terms:
        for entry in tc.get("keywords") or []:
            if not isinstance(entry, dict):
                continue
            term = entry.get("term")
            signal_type = str(entry.get("signalType") or "").strip().lower()
            if isinstance(term, str) and term.strip() and signal_type not in ("context", "generic_fragment", "noise"):
                terms.append(term)
    return _dedupe_keep_order(terms, limit=limit)


def _resume_hits_from_context(tailor_context, limit=4):
    tc = tailor_context if isinstance(tailor_context, dict) else {}
    return _dedupe_keep_order(tc.get("resumeHits") or [], limit=limit)


def _resume_gaps_from_context(tailor_context, limit=4):
    tc = tailor_context if isinstance(tailor_context, dict) else {}
    ac = tc.get("alignmentContext") if isinstance(tc.get("alignmentContext"), dict) else {}
    if isinstance(ac.get("unsupportedTerms"), list):
        return _dedupe_keep_order(ac.get("unsupportedTerms") or [], limit=limit)
    return _dedupe_keep_order(tc.get("resumeGaps") or [], limit=limit)


def _job_strategy_from_context(tailor_context):
    tc = tailor_context if isinstance(tailor_context, dict) else {}
    js = tc.get("jobStrategy")
    return js if isinstance(js, dict) else {}


def _strategy_items(job_strategy, key, limit=5):
    if not isinstance(job_strategy, dict):
        return []
    return _dedupe_keep_order(job_strategy.get(key) or [], limit=limit)


def _changed_sections_from_patch(patch):
    if not isinstance(patch, dict) or not patch:
        return []
    labels = {
        "summary": "summary",
        "experience": "experience",
        "projects": "projects",
        "skills": "skills",
        "education": "education",
        "header": "header",
        "sectionOrder": "section order",
        "sectionVisibility": "section visibility",
        "sectionLabels": "section labels",
        "contactOrder": "contact layout",
        "hiddenSkills": "hidden skills",
    }
    order = [
        "summary",
        "experience",
        "projects",
        "skills",
        "education",
        "header",
        "sectionOrder",
        "sectionVisibility",
        "sectionLabels",
        "contactOrder",
        "hiddenSkills",
    ]
    return [labels[k] for k in order if k in patch]


def _chip(label, tone="neutral"):
    return {"label": label, "tone": tone}


def _preference_chips(style_preferences, strict_truth):
    prefs = style_preferences if isinstance(style_preferences, dict) else {}
    chips = []
    if prefs.get("length_target") == "one_page":
        chips.append(_chip("One-page target"))
    elif prefs.get("length_target") == "detailed":
        chips.append(_chip("More detail"))
    if prefs.get("rewrite_freedom") == "strong":
        chips.append(_chip("Strong retarget"))
    elif prefs.get("rewrite_freedom") == "light":
        chips.append(_chip("Light rewrite"))
    if prefs.get("tone") == "concise":
        chips.append(_chip("Concise tone"))
    elif prefs.get("tone") == "detailed":
        chips.append(_chip("Detailed tone"))
    if prefs.get("focus") and prefs.get("focus") != "balanced":
        chips.append(_chip(f"{str(prefs.get('focus')).title()} focus"))
    if strict_truth:
        chips.append(_chip("Strict truth", "safe"))
    if prefs.get("custom_instructions"):
        chips.append(_chip("Custom notes"))
    return chips


def _action_chips(changed_sections):
    labels = {
        "summary": "Summary updated",
        "experience": "Experience reframed",
        "projects": "Projects prioritized",
        "skills": "Skills reordered",
        "education": "Education adjusted",
    }
    return [_chip(labels[s], "action") for s in changed_sections if s in labels]


def build_tailor_explanation(
    *,
    patch,
    narrative_brief,
    target_role="",
    company="",
    style_preferences=None,
    strict_truth=True,
    tailor_context=None,
    quality_audit=None,
    updated_resume_data=None,
):
    nb = narrative_brief if isinstance(narrative_brief, dict) else {}
    prefs = style_preferences if isinstance(style_preferences, dict) else {}
    qa = quality_audit if isinstance(quality_audit, dict) else {}
    job_strategy = _job_strategy_from_context(tailor_context)
    role = _clean_text(target_role, limit=80) or "this role"
    co = _clean_text(company, limit=80)
    jd_terms = _display_terms(_keyword_terms_from_context(tailor_context, limit=3))
    matched_terms = _display_terms(_resume_hits_from_context(tailor_context, limit=4))
    gaps = _resume_gaps_from_context(tailor_context, limit=4)
    changed_sections = _visible_changed_sections(patch, nb)
    primary_story = _dedupe_keep_order(nb.get("primaryStory") or [], limit=3)
    candidate_angle = _clean_text(nb.get("candidateAngle"), limit=160)
    alignment_mode = _clean_text(nb.get("alignmentMode"), limit=24).lower()
    alignment_guidance = _clean_text(nb.get("alignmentGuidance"), limit=220)
    kept_projects = _labels_from_patch(patch, "projects", removed=False, limit=3, resume_data=updated_resume_data)
    trimmed_experience = _labels_from_patch(patch, "experience", removed=True, limit=2)
    trimmed_projects = _labels_from_patch(patch, "projects", removed=True, limit=3)
    summary_hidden = _summary_is_hidden_for_draft(patch, nb)
    evidence_classes = nb.get("evidenceClassification") if isinstance(nb.get("evidenceClassification"), list) else []
    jd_signal_intent = nb.get("jdSignalIntent") if isinstance(nb.get("jdSignalIntent"), list) else []
    gap_support = nb.get("gapSupport") if isinstance(nb.get("gapSupport"), list) else []
    fit_risk = nb.get("fitRisk") if isinstance(nb.get("fitRisk"), dict) else {}
    fit_risk_level = _clean_text(fit_risk.get("level"), limit=24).lower()
    strategy_fit_mode = _clean_text(job_strategy.get("fitMode"), limit=24).lower()
    if not alignment_mode and strategy_fit_mode:
        alignment_mode = strategy_fit_mode
    direct_class_terms = _dedupe_keep_order(
        [
            str(term).strip()
            for item in evidence_classes
            if isinstance(item, dict) and item.get("evidenceType") == "direct_role_evidence"
            for term in (item.get("terms") or [])
            if str(term).strip()
        ],
        limit=4,
    )
    bridge_class_labels = _dedupe_keep_order(
        [
            _clean_text(item.get("label"), limit=80)
            for item in evidence_classes
            if isinstance(item, dict) and item.get("evidenceType") == "transferable_behavior"
        ],
        limit=3,
    )
    domain_class_labels = _dedupe_keep_order(
        [
            _clean_text(item.get("label"), limit=80)
            for item in evidence_classes
            if isinstance(item, dict) and item.get("evidenceType") == "domain_tool_evidence"
        ],
        limit=2,
    )
    role_signal_terms = _dedupe_keep_order(
        [
            str(item.get("term") or "").strip()
            for item in jd_signal_intent
            if isinstance(item, dict) and item.get("intent") in ("role_responsibility", "candidate_requirement")
        ],
        limit=4,
    )
    context_signal_terms = _dedupe_keep_order(
        [
            str(item.get("term") or "").strip()
            for item in jd_signal_intent
            if isinstance(item, dict) and item.get("intent") in ("company_product_context", "background_or_benefit")
        ],
        limit=3,
    )
    conceptual_gap_terms = _dedupe_keep_order(
        [
            str(item.get("term") or "").strip()
            for item in gap_support
            if isinstance(item, dict) and item.get("status") == "conceptual"
        ],
        limit=4,
    )

    sentences = []
    target_label = f"{role} at {co}" if co else role
    strategy_goal = _clean_text(job_strategy.get("readerGoal"), limit=180)
    strategy_proof = _display_terms(_strategy_items(job_strategy, "proofStyle", limit=4))
    if fit_risk_level == "extreme":
        sentences.append(
            f"This is a very large stretch for {target_label}, so I kept the draft cautious instead of trying to make your resume sound like it already proves that level of responsibility."
        )
        risk_reason = _clean_text(fit_risk.get("reason"), limit=220)
        if risk_reason:
            sentences.append(risk_reason)
    elif alignment_mode in ("adjacent", "stretch"):
        bridge_word = "stretch" if alignment_mode == "stretch" else "adjacent"
        article = "a" if bridge_word == "stretch" else "an"
        sentences.append(
            f"I treated this as {article} {bridge_word} match for {target_label}, so I focused on transferable proof instead of pretending every JD term was already in your background."
        )
    elif jd_terms:
        sentences.append(f"I treated this as a {target_label} draft and made {_join_human(jd_terms)} easy to find.")
    else:
        sentences.append(f"I used the job description to shape this draft for {target_label}.")

    if fit_risk_level == "extreme":
        if bridge_class_labels:
            sentences.append(
                f"The usable bridge evidence is {_join_human(bridge_class_labels)}, but that should read as transferable support rather than executive-level proof."
            )
        unsupported_scope = _dedupe_keep_order(fit_risk.get("unsupportedSeniorityTerms") or [], limit=4)
        if unsupported_scope:
            sentences.append(
                f"The main things to review before sending are {_join_human(_display_terms(unsupported_scope))}, because those are not clearly evidenced in the resume."
            )
    elif alignment_mode in ("adjacent", "stretch"):
        if direct_class_terms:
            sentences.append(f"The strongest direct overlap I found was {_join_human(_display_terms(direct_class_terms))}; the rest of the draft bridges from nearby evidence where your resume supports it.")
        elif bridge_class_labels:
            sentences.append(f"The strongest bridge evidence I found was {_join_human(bridge_class_labels)}; I used exact keyword matches more carefully when the resume context was different from the job context.")
        elif matched_terms:
            sentences.append(f"The direct overlap I found was {_join_human(matched_terms)}; the rest of the draft bridges from nearby evidence like metrics, workflows, coordination, or operating pace where your resume supports it.")
        if domain_class_labels:
            sentences.append(f"I treated {_join_human(domain_class_labels)} as supporting proof, not direct ownership of the target role.")
        if role_signal_terms and context_signal_terms:
            sentences.append(
                f"I prioritized role signals like {_join_human(_display_terms(role_signal_terms))} over company/product context like {_join_human(_display_terms(context_signal_terms))}."
            )
        if conceptual_gap_terms:
            sentences.append(
                f"A few terms were not named exactly, but related resume evidence supports {_join_human(_display_terms(conceptual_gap_terms))}."
            )
    elif matched_terms:
        if kept_projects:
            sentences.append(f"You already had the right raw material: {_join_human(matched_terms)}. I pushed that proof forward in {_join_human(kept_projects)}.")
        elif primary_story or candidate_angle:
            story_part = _join_human(primary_story) if primary_story else candidate_angle
            sentences.append(f"You already had good proof for {_join_human(matched_terms)}, so I pulled that evidence forward instead of forcing unsupported claims.")
        else:
            sentences.append(f"You already had good proof for {_join_human(matched_terms)}, so I kept the rewrite grounded in those strengths.")
    else:
        sentences.append(
            "I found fewer direct keyword matches in your saved profile, so I kept the rewrite closer to your existing evidence instead of forcing claims that were not there."
        )

    if strategy_goal and fit_risk_level != "extreme":
        sentences.append(strategy_goal)
    elif strategy_proof and fit_risk_level != "extreme":
        sentences.append("The strategy was to foreground " + _join_human(strategy_proof) + ".")

    trimmed = _dedupe_keep_order(trimmed_experience + trimmed_projects, limit=4)
    if trimmed:
        sentences.append(f"I trimmed {_join_human(trimmed)} because they were weaker signals for this read.")
    if summary_hidden and "summary" in (patch or {}):
        sentences.append("I also kept the summary out of the visible draft so the strongest sections can do the talking.")

    moves = _main_moves(changed_sections)
    if moves:
        sentences.append("The biggest help here: " + _join_human(moves) + ".")

    if changed_sections:
        sentences.append(f"Under the hood, I changed {_section_phrase(changed_sections)} based on those signals.")
    else:
        sentences.append("No major structural changes were detected, so review the draft and adjust manually if you want a stronger shift.")

    pref_notes = []
    if prefs.get("length_target") == "one_page":
        pref_notes.append("kept the wording tighter for a one-page-friendly draft")
    elif prefs.get("length_target") == "detailed":
        pref_notes.append("allowed more detail where the resume evidence supported it")
    if prefs.get("rewrite_freedom") == "strong":
        pref_notes.append("used a stronger retargeting pass")
    elif prefs.get("rewrite_freedom") == "light":
        pref_notes.append("used a lighter touch")
    if prefs.get("tone") == "concise":
        pref_notes.append("favored concise phrasing")
    elif prefs.get("tone") == "detailed":
        pref_notes.append("favored fuller phrasing")
    if pref_notes:
        sentences.append("I also followed your setup choices: " + _join_human(pref_notes) + ".")

    flags = qa.get("flags") if isinstance(qa.get("flags"), dict) else {}
    chips = _preference_chips(prefs, strict_truth) + _action_chips(changed_sections)
    if fit_risk_level == "extreme":
        chips.append(_chip("Large stretch", "caution"))
    elif fit_risk_level == "high":
        chips.append(_chip("High fit risk", "caution"))
    if alignment_mode in ("adjacent", "stretch"):
        chips.append(_chip("Bridge fit", "caution"))
    if gaps:
        chips.append(_chip("Some JD terms not evidenced", "caution"))
    if flags.get("skills_expected_but_unchanged") or flags.get("suspicious_protected_skill_removals"):
        chips.append(_chip("Review skills", "caution"))
    if flags.get("minor_expected_rewrites") or flags.get("missing_expected_rewrites") or flags.get("filler_phrase_hits"):
        chips.append(_chip("Review rewrite strength", "caution"))

    paragraph = " ".join(s for s in sentences if s).strip()
    return {
        "paragraph": paragraph,
        "chips": chips[:10],
        "details": _detail_items_from_patch(
            patch,
            nb,
            gaps,
            flags,
            target_label,
            updated_resume_data=updated_resume_data,
            job_strategy=job_strategy,
        ),
        "evidence": {
            "alignmentMode": alignment_mode,
            "jobStrategy": job_strategy,
            "evidenceClassification": evidence_classes[:8],
            "jdSignalIntent": jd_signal_intent[:10],
            "gapSupport": gap_support[:10],
            "fitRisk": fit_risk,
            "matchedTerms": matched_terms,
            "jobPriorityTerms": jd_terms,
            "resumeGaps": gaps,
            "changedSections": changed_sections,
            "mainMoves": moves,
            "layoutChanged": _layout_phrase(patch),
            "preferencesUsed": [
                k
                for k in ("length_target", "rewrite_freedom", "tone", "focus", "custom_instructions")
                if prefs.get(k) and prefs.get(k) != "balanced"
            ]
            + (["strict_truth"] if strict_truth else []),
        },
    }

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

tailorFillerPhrases = (
    "seamless",
    "seamlessly",
    "robust",
    "enhanced",
    "enhancing",
    "efficient data handling",
    "best practices",
    "streamlining",
    "streamlined",
    "system responsiveness",
    "ensuring efficient",
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


def findFillerPhrasesInText(text):
    if not text or not str(text).strip():
        return []
    low = str(text).lower()
    return [p for p in tailorFillerPhrases if p in low]


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
    before = entry.get("before") if isinstance(entry.get("before"), dict) else {}
    after = entry.get("after") if isinstance(entry.get("after"), dict) else {}
    row = after or before
    label = ""
    if section == "experience":
        company = _clean_text(row.get("company") if isinstance(row, dict) else "", limit=40)
        title = _clean_text(row.get("title") if isinstance(row, dict) else "", limit=50)
        label = f"{company} {title}".strip() or f"experience row {rid}"
    elif section == "projects":
        title = _clean_text(row.get("title") if isinstance(row, dict) else "", limit=70)
        label = title or f"project {rid}"
    elif section == "education":
        school = _clean_text(row.get("school") if isinstance(row, dict) else "", limit=60)
        label = school or f"education row {rid}"
    elif section == "skills":
        name = _clean_text(row.get("name") if isinstance(row, dict) else "", limit=60)
        label = name or f"skill row {rid}"

    if entry.get("removed"):
        return {
            "experience": f"Removed {label} because it was less relevant for this draft.",
            "projects": f"Removed {label} because stronger project evidence fit this role better.",
            "education": f"Removed {label}.",
            "skills": f"Trimmed {label} from the visible skills list.",
        }[section]
    if entry.get("added"):
        return {
            "experience": f"Added {label}.",
            "projects": f"Added {label}.",
            "education": f"Added {label}.",
            "skills": f"Added {label} to the visible skills list.",
        }[section]
    i = patchEntryIntensity(entry)
    if section == "experience":
        if i == "minor":
            return f"{label}: light wording pass; the core scope stayed the same."
        if i == "moderate":
            return f"{label}: updated the bullets to foreground the role-relevant work."
        return f"{label}: substantially reframed the scope, systems, and details toward the role."
    if section == "projects":
        if i == "minor":
            return f"{label}: light cleanup to the description or stack."
        if i == "moderate":
            return f"{label}: revised the description and stack so the fit is easier to scan."
        return f"{label}: strongly reframed the bullets to foreground scope, systems, and fit."
    if section == "education":
        if i == "minor":
            return f"{label}: small education text tweak."
        if i == "moderate":
            return f"{label}: updated education details."
        return f"{label}: materially rewrote education details."
    if i == "minor":
        return f"{label}: label or category cleanup."
    if i == "moderate":
        return f"{label}: renamed or re-categorized for scanability."
    return f"{label}: materially changed the skill label or group for the target story."


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
            {"section": "layout", "reason": f"Adjusted the resume layout ({', '.join(segs)}) so the strongest evidence is easier to find."}
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


def countSkillPatchActivity(patch):
    # --- Reorder, removals, and adds all count; full-list replace is one “activity” for intensity. --- #
    rows = (patch or {}).get("skills") or []
    if not isinstance(rows, list):
        return 0
    n = 0
    for row in rows:
        if not isinstance(row, dict):
            continue
        if row.get("id") == "_orderOrFullReplace":
            return max(n, 1)
        if row.get("removed") or row.get("added") or row.get("fieldsChanged"):
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
    rewrite_proj_ids = []
    for x in nb.get("rewriteProjects") or []:
        try:
            rewrite_proj_ids.append(int(x))
        except (TypeError, ValueError):
            continue
    rewrite_exp_ids = []
    for x in nb.get("rewriteExperience") or []:
        try:
            rewrite_exp_ids.append(int(x))
        except (TypeError, ValueError):
            continue

    minor_rewrite_rows = []
    missing_rewrite_rows = []
    for section, expected_ids in (("experience", rewrite_exp_ids), ("projects", rewrite_proj_ids)):
        patched_by_id = {}
        for row in p.get(section) or []:
            if isinstance(row, dict) and row.get("id") is not None:
                try:
                    patched_by_id[int(row.get("id"))] = row
                except (TypeError, ValueError):
                    patched_by_id[row.get("id")] = row
        for rid in expected_ids:
            row = patched_by_id.get(rid)
            if not row:
                missing_rewrite_rows.append({"section": section, "id": rid})
                continue
            if row.get("removed") or row.get("added"):
                continue
            if patchEntryIntensity(row) == "minor":
                minor_rewrite_rows.append({"section": section, "id": rid})

    filler_hits = []
    for section in ("experience", "projects"):
        for row in p.get(section) or []:
            if not isinstance(row, dict) or row.get("removed"):
                continue
            fc = row.get("fieldsChanged")
            if not isinstance(fc, dict):
                continue
            for field, delta in fc.items():
                if field not in ("description", "summary"):
                    continue
                hits = findFillerPhrasesInText((delta or {}).get("after"))
                if hits:
                    filler_hits.append({"section": section, "id": row.get("id"), "phrases": hits[:5]})
    after_summary = summaryInner(u)
    gen_found = findGenericPhrasesInText(after_summary)
    summary_filler = findFillerPhrasesInText(after_summary)
    n_exp_ch = countRowsWithFieldChanges(p, "experience")
    n_pr_ch = countRowsWithFieldChanges(p, "projects")
    n_sk_ch = countSkillPatchActivity(p)
    n_removed = len(re_sk) + len(re_pr) + len(re_ex)
    skills_expected = skills_change_expected_from_context(nb, o)
    # --- Field-only diffs undercounted reorder/drop/trim before; any skills patch means work landed. --- #
    skills_changed = n_sk_ch > 0
    skills_expected_but_unchanged = bool(skills_expected and not skills_changed)
    return {
        "target_role": tr or None,
        "flags": {
            "aggressive_skill_prune": aggressive,
            "suspicious_protected_skill_removals": susp,
            "summary_has_generic_phrase_hits": bool(gen_found and ("summary" in p)),
            "filler_phrase_hits": bool(filler_hits or summary_filler),
            "skills_expected_but_unchanged": skills_expected_but_unchanged,
            "minor_expected_rewrites": bool(minor_rewrite_rows),
            "missing_expected_rewrites": bool(missing_rewrite_rows),
        },
        "summary": {
            "changed": "summary" in p,
            "after_preview": previewText(after_summary, 280),
            "generic_phrases_matched": gen_found,
            "filler_phrases_matched": summary_filler,
        },
        "rewrite_quality": {
            "expected_experience_rewrite_ids": rewrite_exp_ids,
            "expected_project_rewrite_ids": rewrite_proj_ids,
            "minor_rewrite_rows": minor_rewrite_rows,
            "missing_rewrite_rows": missing_rewrite_rows,
            "filler_phrase_hits": filler_hits,
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
