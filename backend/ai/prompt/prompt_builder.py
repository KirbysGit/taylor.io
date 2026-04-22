import json


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


def build_system_prompt():
    return "\n".join(
        [
            "You are a truth-first resume strategist for one role: selective, confident, recruiter-aware—never timid, never JD-literal, never inventing.",
            "",
            "Priority: (1) truth (2) full preservation (3) sharper bullets where evidence supports (4) minimal truthful patchDiff (5) concise JSON.",
            "If the user message includes a \"Narrative target\" JSON block, use it as the editorial spine for emphasis and rewrite goals—it never overrides truth, preservation, stack, or domain rules.",
            "",
            "Role & volume:",
            "Infer what the role rewards; foreground the best on-resume proof with order and emphasis—not keyword mirroring.",
            "When a row is a good candidate, make ~1–3 grounded improvements; skip cosmetic synonym swaps, polish-only edits, and warnings-only output.",
            "If nothing material should change, say so in the top-level summary string (not resume.summary).",
            "",
            "Bullets (grounded, recruiter-effective):",
            "Edit weak, vague, repetitive, or under-targeted bullets only. If a line is already strong, specific, and well aligned, do not touch it.",
            "A rewrite must add bite: stronger verb; clearer scope (what system, who used it, constraint); concrete technical nouns; why the work mattered; role relevance—more specific, scannable, and compelling, not merely smoother.",
            "Do not rewrite to paraphrase. Do not replace strong concrete phrasing with softer generic language.",
            "Never bury metrics or hard technical facts in vague wrappers (facilitated, supported, enhanced, improved clarity, effective, leveraged, robust as filler). Keep numbers and facts verbatim; tighten the lead or framing around them.",
            "",
            "Truth (no new facts):",
            "Never invent companies, titles, dates, metrics, certifications, users, domains, ownership, or technologies.",
            "Tools/stack only if already on that row or trusted skill pool (including hidden skills). JD steers priority and wording, not new claims; missing JD skills → warnings, not bullets or tech_stack.",
            "Do not imply domain experience (healthcare, finance, AI/ML product, mobile, etc.) unless the resume directly supports it on that row or summary.",
            "",
            "Projects (review all; tiered depth—no forced touch count):",
            "Review every project row. Tailor role-relevant projects with meaning: stronger framing of what the project is, clearer technical scope, why it mattered, recruiter-friendly wording, deliberate bullet order—only when the resume already supports it.",
            "Tier 1 (usually 2–3): the strongest role fit—expect the heaviest, most substantive edits (still truth-bound).",
            "Tier 2: supporting relevance—lighter edits for clarity, emphasis, framing, or scanability when a real improvement exists.",
            "Tier 3: weak fit or already strong—preserve; at most minor cleanup. Do not rewrite just to show every project was edited.",
            "Rewrite a project only when the new version is sharper, more specific, more scannable, or more role-relevant—not synonym polish.",
            "Never import tools, frameworks, outcomes, or claims from another project. Preserve truthful tech_stack; extend it only when that row or the trusted skill pool already supports the addition—never JD-shaped stack swaps or unsupported tech.",
            "",
            "Preservation & breadth:",
            "updatedResumeData = complete final resume (same keys/rows/ids; removals only with grounded warnings).",
            "Keep one-page strength and breadth—not an overly compressed subset. Skills: full pool by default; reorder/regroup first; trim only clearly redundant or low-value items.",
            "Projects: keep all rows unless clearly irrelevant (warn). Education: keep every row; never remove or hide for targeting.",
            "",
            "patchDiff (structured, minimal):",
            "Only true deltas. Per changed row: id, fieldsChanged with before/after for each touched field only, row reason. Omit unchanged sections (including skills); omit unchanged keys inside fieldsChanged; no no-op rows; no identical before/after.",
            "",
            "Top-level summary & reasons:",
            "Summary: name real edits or state none warranted—no vague alignment/fit/optimized.",
            "changeReasons and patch row reasons: cite substance (e.g. clarified API surface and consumers; foregrounded production backend; improved scanability)—never \"improved wording,\" \"refined language,\" or \"enhanced alignment.\"",
            "",
            "Examples (pattern only):",
            "Weak: \"Worked on APIs for the team.\"",
            "Stronger (same facts, no inflated ownership): \"Built and refined REST APIs for internal workflows; collaborated on service boundaries and data models with senior engineers.\"",
            "Gap: JD wants Rails, row shows Django → warn; do not add Rails to stack or skills.",
            "",
            "Return valid JSON only—no markdown outside the object.",
        ]
    )


def build_user_prompt(payload, tailorContext, sectionDetails, relevantJDLines, narrativeBrief=None):
    targetRole = tailorContext.get("targetRole", "")
    activeDomains = tailorContext.get("activeDomains", [])
    keywords = tailorContext.get("keywords", [])
    resumeHits = tailorContext.get("resumeHits", [])
    resumeGaps = tailorContext.get("resumeGaps", [])

    rowsPerSectionRanked = sectionDetails.get("rowsPerSectionRanked", {})

    companyRaw = payload.get("company")
    company = companyRaw if isinstance(companyRaw, str) else ""
    jdRaw = payload.get("job_description")
    jobDescription = jdRaw if isinstance(jdRaw, str) else ""
    resumeRaw = payload.get("resume_data")
    resumeData = resumeRaw if isinstance(resumeRaw, dict) else {}

    styleRaw = payload.get("style_preferences")
    stylePreferences = styleRaw if isinstance(styleRaw, dict) else {}
    focusRaw = stylePreferences.get("focus")
    focus = focusRaw if isinstance(focusRaw, str) else "balanced"
    toneRaw = stylePreferences.get("tone")
    tone = toneRaw if isinstance(toneRaw, str) else "balanced"

    # JD keyword extraction (not interpreted themes); upstream may later supply real theme phrases.
    primaryJDTerms = top_keyword_terms(keywords, limit=8)
    secondaryJDTerms = secondary_terms(activeDomains, keywords, primaryJDTerms, limit=6)
    bestEvidence = best_evidence_labels(resumeData, rowsPerSectionRanked)
    gapsLine = real_gaps_line(resumeGaps)
    hitsPreview = resumeHits[:18] if isinstance(resumeHits, list) else []

    evidenceStr = ", ".join(bestEvidence[:5]) if bestEvidence else "infer from the resume"
    roleLabel = (targetRole or "").strip() or "this role"

    output_contract = {
        "summary": "Named concrete edits (sections + what got sharper) or: No material changes warranted. (Tailoring narrative—not resume.summary.)",
        "updatedResumeData": {},
        "patchDiff": {
            "summary": {
                "before": "",
                "after": "",
                "reason": "Why the new text is more specific or role-relevant",
            },
            "experience": [
                {
                    "id": 0,
                    "fieldsChanged": {
                        "description": {"before": "", "after": ""},
                        "skills": {"before": "", "after": ""},
                    },
                    "reason": "e.g. clarified API scope and kept existing metrics verbatim",
                }
            ],
            "projects": [
                {
                    "id": 0,
                    "fieldsChanged": {
                        "title": {"before": "", "after": ""},
                        "description": {"before": "", "after": ""},
                        "tech_stack": {"before": [], "after": []},
                    },
                    "reason": "short concrete reason",
                }
            ],
            "skills": None,
        },
        "changeReasons": [
            {
                "section": "experience",
                "id": 0,
                "reason": "Good: clarified API scope and downstream consumers; kept 40% metric verbatim. Bad: improved wording / refined language / enhanced alignment.",
            }
        ],
        "warnings": [],
    }

    prefsOneLine = (
        f"Prefs: focus={focus}, tone={tone}. "
        "Strict truth: always—no invented facts; unsupported JD items → warnings. "
        + {
            "impact": "Weight outcomes the resume can substantiate.",
            "technical": "Weight on-row depth; no JD stack imports.",
            "leadership": "Weight leadership only where supported.",
        }.get(focus, "Balance impact, depth, leadership.")
        + " "
        + {"concise": "Tight bullets.", "detailed": "Richer detail, no filler."}.get(tone, "Balanced length.")
    )

    nb = narrativeBrief if isinstance(narrativeBrief, dict) else {}
    narrative_json = json.dumps(nb, ensure_ascii=False, indent=2)

    lines = [
        "## Editor brief",
        f"Target role: {roleLabel}",
        f"Company (context only): {company or 'Not specified'}",
        prefsOneLine,
        "",
        "### Narrative target (strategy pre-pass)",
        "Align ~1–3 rewrites and emphasis with this JSON; if it conflicts with on-resume facts, obey the resume and put gaps in warnings.",
        narrative_json,
        "",
        "### Role interpretation",
        f"Foreground {evidenceStr} for {roleLabel}; infer role theme phrases from the full JD (not from the token lists alone).",
        f"primaryJDTerms (extracted): {', '.join(primaryJDTerms) if primaryJDTerms else 'none—derive from JD'}",
        f"secondaryJDTerms (extracted): {', '.join(secondaryJDTerms) if secondaryJDTerms else 'none extracted'}",
        f"Resume hits (canonical): {', '.join(hitsPreview) if hitsPreview else 'none listed'}",
        f"Strongest evidence rows: {', '.join(bestEvidence) if bestEvidence else 'infer from resume'}",
        f"Real gaps (unsupported JD keywords): {gapsLine}",
        "",
        "### JD excerpts (highest-signal lines)",
        json.dumps(relevantJDLines, ensure_ascii=False, indent=2),
        "",
        "### Full job description",
        jobDescription.strip(),
        "",
        "### Current resume (JSON)",
        json.dumps(resumeData, ensure_ascii=False, indent=2),
        "",
        "## Section guide",
        "Experience: stand-alone rows; upgrade only weak/vague bullets—add scope, impact, stronger verbs; never synonym-only polish; never import tools/outcomes from elsewhere.",
        "Projects: keep all rows in updatedResumeData. Review every project; tailor all role-relevant ones—with the heaviest edits on the top 2–3 (Tier 1). Supporting projects: lighter edits for clarity and relevance only when warranted. Skip forced edits when wording is already strong or fit is weak; prefer meaningful sharpening over cosmetic paraphrasing. Never import cross-project facts; never JD-swap stacks.",
        "Skills: full pool by default; reorder/regroup first; trim only clearly redundant or low-value items.",
        "Education: keep all rows; no invented credentials; never drop or hide for targeting.",
        "Aim for a strong one-page resume: full breadth in updatedResumeData, not a thin subset.",
        "",
        "## Output",
        "JSON only. updatedResumeData = full edited resume (complete structure, same breadth intent).",
        "patchDiff: id + fieldsChanged (before/after per touched field only) + row reason; omit unchanged sections/keys; omit patchDiff.skills if unchanged; no identical before/after, no empty no-ops.",
        "changeReasons: one per edit; concrete substance only—e.g. clarified scope, surfaced production impact, better scan order. Forbidden vague: improved wording, refined language, enhanced alignment, better fit.",
        "If summary states no material changes were warranted: patchDiff omitted or empty, changeReasons [], warnings only real unsupported gaps (or [] if none).",
        "When opportunities are clear, 1–3 edits that add specificity or bite—not polish-only.",
        "",
        "JSON shape (example structure; omit unused keys; replace updatedResumeData {} with full resume):",
        json.dumps(output_contract, ensure_ascii=False, indent=2),
    ]

    return "\n".join(lines)


def build_prompt(payload, tailorContext, sectionDetails, relevantJDLines, narrativeBrief=None):
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(
        payload, tailorContext, sectionDetails, relevantJDLines, narrativeBrief=narrativeBrief
    )
    return system_prompt, user_prompt
