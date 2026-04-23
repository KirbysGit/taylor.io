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
            "Priority: (1) truth (2) ATS-honest keyword lift (3) recruiter-scannable story (4) section-shaped tailoring per the user’s Narrative target (5) minimal truthful patchDiff (6) concise JSON.",
            "The user message’s Narrative target JSON is the primary editorial plan—execute it unless it conflicts with on-resume facts. It never overrides truth, frozen identity fields, stack, or domain rules.",
            "",
            "Tailoring goal: safe output that still reads intentionally shaped for this role—visible improvement in summary, hero rows, and skills when facts allow. A good run is not \"correct JSON plus a few polish lines.\"",
            "Follow Narrative sectionStrategy and summaryGoal; rewrite updatedResumeData.summary when facts support it.",
            "",
            "Hero project execution (narrative heroProjects): minimum bar—for a story-central hero project, one tiny bullet touch-up or one-word substitution is not enough when stronger grounded reframes exist; expect multi-bullet rewriting in that case. Substantial hero execution is not satisfied by the insufficiency patterns below.",
            "Hero insufficiency (does not count as substantial hero-row work when deeper, evidence-backed edits are available): punctuation-only or comma-only cleanup; conjunction swaps; shorthand→spelled numbers only; metric formatting/restyling without clearer scope/consumers/systems; one-word verb swaps; scan-only tidy-ups; single-bullet-only edits when the rest of the row could be truthfully reframed. If that is all you did: say changes were narrow in the top-level summary, or treat the row as mis-tiered—do not present trivial edits as major tailoring.",
            "Hero experience execution (narrative heroExperience): spend the budget on weak bullets with stronger framing—systems, scope, downstream use/consumers, technical depth, why the work mattered. Strong bullets: leave them. Do not burn hero budget on comma cleanup, conjunction swaps, or number formatting alone.",
            "Supporting projects: lighter; peripheral: preserve (true tech_stack).",
            "",
            "Skills execution: implement Narrative skillsStrategy decisively within truth—actively raise role-relevant items, demote or trim low-signal or role-misaligned items when evidence allows, regroup/rename categories for scan/ATS clarity. Do not keep fluffy or theme buckets (e.g. vague \"focus\" groupings) just because they existed; apply categoryStrategy when non-empty; when skillsStrategy implies consolidation or cleanup, do it. Preserve breadth—no invented skills—but do not leave off-role noise prominent (e.g. AI-heavy lines floating for a non-AI target when trimming is justified).",
            "Preserve already-strong, on-strategy lines; skip paraphrase-for-polish.",
            "If nothing material should change, say so plainly in the top-level summary (changelog—not updatedResumeData.summary).",
            "",
            "Bullets (grounded, recruiter-effective):",
            "Edit weak, vague, repetitive, or under-targeted bullets. On narrative hero rows, treat under-targeted broadly—bullets that are fine in isolation but do not carry the role story usually warrant a rewrite; hero work typically revisits most bullets on that row. If a line is already strong, specific, and on-strategy for this role, do not touch it.",
            "A rewrite must add bite: stronger verb; clearer scope (what system, who used it, constraint); concrete technical nouns; why the work mattered; role relevance—more specific, scannable, and compelling, not merely smoother.",
            "Do not rewrite to paraphrase. Do not replace strong concrete phrasing with softer generic language.",
            "Never bury metrics or hard technical facts in vague wrappers (facilitated, supported, enhanced, improved clarity, effective, leveraged, robust as filler). Preserve numeric meaning; you may rephrase or reorder around metrics for ATS and scanability.",
            "",
            "Truth (no new facts):",
            "Never invent companies, employment dates, locations, schools, degrees, certification names, metrics, users, domains, ownership, or technologies.",
            "Experience job title may be rephrased for clarity or ATS when still accurate to the role; do not upgrade seniority or misstate the position.",
            "Tools/stack only if already on that row or trusted skill pool (including hidden skills). JD steers priority and wording, not new claims; missing JD skills → verbose warnings, not fabricated bullets or tech_stack.",
            "Do not imply domain experience (healthcare, finance, AI/ML product, mobile, etc.) unless the resume directly supports it on that row or summary.",
            "Implied scope is OK in moderation (e.g. \"backend\" when APIs and data stores are on-row); do not jump to a specific stack (e.g. Node) unless that stack is evidenced.",
            "",
            "Project tech stacks: preserve truthful tech_stack; add only when supported; never swap real tech for JD-shaped replacements.",
            "",
            "Editable vs frozen:",
            "Tailor when truthful: resume summary; header tagline; header visibility toggles; sectionOrder; experience title, skills, description; project title, tech_stack, description; skills categories and items (including hidden skills); education highlights/subsections; certifications and languages when present—relevance-first.",
            "Frozen identity (do not change factual identity): company names; employment dates and locations; school names; degree credential lines as given (type + discipline); contact URLs and raw contact values (email, phone)—visibility toggles only.",
            "Links: do not swap or invent URLs; user owns how they are reached.",
            "",
            "Rows and breadth:",
            "updatedResumeData = full resume after editing. You may omit entire experience rows that add little signal for this role (e.g. unrelated work when projects carry the story); explain verbosely in warnings.",
            "Projects—mandatory default: every Narrative heroProjects id must appear in updatedResumeData.projects; supportingProjects ids should almost always appear. If you omit any heroProjects or supportingProjects row that exists in input resume_data.projects: mandatory verbose warning (id + title), concrete rationale in that warning, same omission stated plainly in the top-level changelog, and an explicit patchDiff.projects entry for that id documenting the removal (reason + accountable before/after)—zero silent drops.",
            "Peripheral / non-narrative projects: omit only with strong cause, warning, changelog mention, and patchDiff trace—still no silent removals.",
            "Education: always keep the single highest-level degree row (doctorate > master > bachelor > associate > other non-degree); keep it even if unrelated—it proves education. Additional education rows: keep when role-relevant; omit lesser rows when redundant or low-signal for this JD—warn when omitting. Never drop the top credential.",
            "Skills: JD- and evidence-driven; reorder/regroup; aim for 3 categories (4 typical max, 5 only if needed). Preserve truthful breadth unless role relevance clearly justifies trimming; do not list skills with no evidence.",
            "Certs/languages (if present): include what helps this role; omit low-signal lines with a warning—never invent credentials.",
            "",
            "patchDiff (structured, minimal):",
            "Only true deltas. Per changed row: id, fieldsChanged with before/after for each touched field only, row reason. Omit unchanged keys inside fieldsChanged; no no-op rows; no identical before/after.",
            "Skills accountability: material change includes category regrouping, renaming, item removal, consolidation, compression, or demotion via move/delete/hide. If updatedResumeData.skills differs materially from input, patchDiff.skills must be a non-empty array of real per-row before/after deltas—same discipline as experience/projects. patchDiff.skills: [] is unacceptable when skills changed; absent/null/empty while skills changed is a hard miss. Omit the patchDiff.skills key only when skills are truly unchanged.",
            "",
            "Two different summaries—do not merge:",
            "updatedResumeData.summary = profile paragraph on the resume (rewrite per Narrative summaryGoal).",
            "Top-level JSON key summary = tailoring changelog for the user—never the profile text.",
            "",
            "Changelog & reasons:",
            "Top-level summary: conservative and tied to patchDiff—describe real scope only. Narrow edits → say narrow. Do not claim broad project work if only light cleanup or one project nudged; do not claim skills reprioritization if patchDiff.skills is missing, empty, or token while skills changed. If a narrative-listed project was dropped, say so here. Accurate, not flattering.",
            "Top-level summary: name real edits or state none warranted—no vague alignment/fit/optimized.",
            "warnings: verbose—unsupported JD items, omitted rows, gaps the user could fill with real data.",
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

    roleLabel = (targetRole or "").strip() or "this role"

    output_contract = {
        "summary": "Top-level ONLY: honest tailoring changelog—scope must match actual edits in patchDiff (no overselling).",
        "updatedResumeData": {
            "header": {
                "tagline": "optional; preserve bold/italic markers pattern from source if any",
                "visibility": {
                    "showTagline": True,
                    "showEmail": True,
                    "showPhone": True,
                    "showLocation": True,
                    "showLinkedin": True,
                    "showGithub": True,
                    "showPortfolio": True,
                },
            },
            "sectionOrder": ["summary", "education", "experience", "projects", "skills"],
            "summary": "Profile/summary text ON the resume (not the top-level changelog).",
            "experience": [],
            "projects": [],
            "education": [],
            "skills": [
                {
                    "id": 1,
                    "category": "Category label",
                    "name": "Skills text for this row (same list-of-rows shape as input resume_data.skills)",
                }
            ],
        },
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
            "skills": [
                {
                    "id": 0,
                    "fieldsChanged": {
                        "category": {"before": "", "after": ""},
                        "name": {"before": "", "after": ""},
                    },
                    "reason": "non-empty per touched skill row when skills changed materially—never [] or omit if skills differ from input",
                }
            ],
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
        "### Narrative target — primary editorial plan",
        "Execute this JSON first. Everything below (terms, gaps, JD, resume) supports facts and constraints only—it does not replace this plan. Do not re-center the rewrite on raw keyword lists after reading the narrative.",
        "Truth and frozen fields still win over the narrative when they conflict.",
        narrative_json,
        "",
        "### Supporting context (evidence; not a second plan)",
        f"Strong rows for {roleLabel}: {', '.join(bestEvidence) if bestEvidence else 'infer from resume'}",
        f"Theme cues from full JD (do not treat token lists as the plan): primaryJDTerms {primaryJDTerms if primaryJDTerms else '—'}; secondaryJDTerms {secondaryJDTerms if secondaryJDTerms else '—'}; resumeHits {hitsPreview if hitsPreview else '—'}; gaps {gapsLine}",
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
        "Accountability: heroProjects → multi-bullet grounded reframes when central—trivial hero edits must be admitted as narrow in the changelog or treated as mis-tier; heroExperience → framing on weak bullets, not comma/conjunction/number cleanup; keep all narrative heroProjects + usually supportingProjects—any omission of those input ids → warning + summary + patchDiff.projects removal row.",
        "Skills → skillsStrategy/categoryStrategy; material skills change → non-empty patchDiff.skills with real before/after per touched row—[] forbidden if skills differ from input.",
        "Else: Narrative sectionStrategy; may drop low-signal experience (warn); education per rules; job–project overlap: same story, different wording.",
        "",
        "## Output",
        "JSON only. Mirror input schema: updatedResumeData.skills = list of category rows like input—not one object.",
        "Keys: top-level summary = changelog (conservative; match patchDiff); updatedResumeData.summary = profile on resume.",
        "patchDiff: true deltas; omit unchanged sections; no no-ops; dropped narrative project → explicit projects patch row; material skills change → non-empty patchDiff.skills (omit skills key only if unchanged).",
        "changeReasons: concrete substance; no vague improved/refined/enhanced alignment.",
        "warnings: verbose for gaps and omissions.",
        "If changes were light: say so in top-level summary—do not imply a full-resume overhaul.",
        "Success: reader should see intentional shaping for this role in summary, heroes, and skills when opportunities existed—not a lightly polished base.",
        "",
        "JSON shape (example; fill updatedResumeData from real resume). If skills did not change, omit patchDiff.skills entirely—do not copy the example block.",
        json.dumps(output_contract, ensure_ascii=False, indent=2),
    ]

    return "\n".join(lines)


def build_prompt(payload, tailorContext, sectionDetails, relevantJDLines, narrativeBrief=None):
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(
        payload, tailorContext, sectionDetails, relevantJDLines, narrativeBrief=narrativeBrief
    )
    return system_prompt, user_prompt
