import json

def build_rules(strictTruth, focus, tone):
    rules = [
        "Use only details present in user resume data and job description.",
        "Keep output ATS-friendly with clear, concrete language.",
        "Return recommendations at section level and line-edit level.",
    ]

    # if we are in strict truth mode.
    if strictTruth:
        rules.append(
            "Do not invent facts, companies, titles, dates, metrics, or certifications."
        )
        rules.append(
            "Only use VERIFIED resume evidence in rewritten resume text. "
            "Do not include unsupported target skills in rewrites."
        )
        rules.append(
            "If a target term is missing from evidence, mention it only as a gap/warning, "
            "not as claimed experience."
        )
    else:
        rules.append(
            "If information is missing, suggest placeholders clearly marked for user confirmation."
        )

    # --- focus (either impact, technical, or leadership) --- #
    if focus == "impact":
        rules.append("Prioritize measurable outcomes, ownership, and business impact.")
    elif focus == "technical":
        rules.append("Prioritize technical depth, systems, tools, and implementation details.")
    elif focus == "leadership":
        rules.append("Prioritize leadership, mentoring, and cross-functional collaboration.")
    else:
        rules.append("Balance impact, technical detail, and leadership signals.")

    # --- tone (either concise, detailed, or balanced) --- #
    if tone == "concise":
        rules.append("Prefer concise rewrites with short, high-signal bullets.")
    elif tone == "detailed":
        rules.append("Prefer richer detail while preserving readability and scanability.")
    else:
        rules.append("Use a balanced professional tone suitable for modern resume formats.")

    return rules

def build_system_prompt(rules):
    lines = [
        "You are a resume tailoring engine.",
        "Your job is to transform the user's current resumeData into a stronger, more role-targeted resume while staying grounded in the user's actual background.",
        "",
        "Primary objective:",
        "Produce a better tailored resume for the target role using the provided resume data, job description, and extracted tailoring signals.",
        "",
        "Core behavior:",
        "- Optimize for ATS clarity, recruiter scanability, and stronger role alignment.",
        "- Strengthen and sharpen existing evidence before inventing new framing.",
        "- Prefer specific, concrete, role-relevant wording over generic language.",
        "- Use the strongest aligned experience and project entries as the main narrative anchors.",
        "- Use skills mainly to reorder, regroup, emphasize, and expand from available verified user skill data.",
        "- Use lower-priority entries as opportunities for more substantial improvement.",
        "- Keep higher-priority entries closer to existing truth, with lighter optimization.",
        "",
        "Truth policy:",
        "- Do not fabricate companies, titles, dates, metrics, certifications, ownership, or technologies with no support.",
        "- Grounded inference is allowed when the user's existing resume data strongly supports it.",
        "- Missing JD terms may influence phrasing, ordering, emphasis, and careful generalization, but unsupported hard claims must not be introduced.",
        "- If a gap cannot be supported, do not present it as direct experience.",
        "",
        "Editing scope:",
        "You may update:",
        "- summary",
        "- experience descriptions",
        "- experience skills",
        "- project titles",
        "- project descriptions",
        "- project tech_stack",
        "- skills, including reorder, regroup, category updates, and additions from available user data such as hidden skills or other verified resume evidence",
        "",
        "Dynamic rules:",
    ]

    lines.extend(f"- {rule}" for rule in rules)

    lines.extend([
        "",
        "Output rules:",
        "- Return valid JSON only.",
        "- Do not return markdown.",
        "- Do not return commentary outside the JSON.",
        "- Return both a full updated resumeData object and a structured patch diff.",
        "- Return short reasons per changed item.",
    ])

    return "\n".join(lines)

def build_user_prompt(payload, tailorContext, sectionDetails, relevantJDLines):
    targetRole = tailorContext.get("targetRole", "")
    activeDomains = tailorContext.get("activeDomains", [])
    keywords = tailorContext.get("keywords", [])
    resumeHits = tailorContext.get("resumeHits", [])
    resumeGaps = tailorContext.get("resumeGaps", [])
    resumeSections = tailorContext.get("resumeSections", {})

    sectionScoresRanked = sectionDetails.get("sectionScoresRanked", {})
    rowsPerSectionRanked = sectionDetails.get("rowsPerSectionRanked", {})
    gapsPerSection = sectionDetails.get("gapsPerSection", {})

    company = payload["company"] if isinstance(payload["company"], str) else ""
    jobDescription = payload["job_description"] if isinstance(payload["job_description"], str) else ""
    resumeData = payload["resume_data"] if isinstance(payload["resume_data"], dict) else {}

    stylePreferences = payload["style_preferences"] if isinstance(payload["style_preferences"], dict) else {}
    focus = stylePreferences["focus"] if isinstance(stylePreferences["focus"], str) else "balanced"
    tone = stylePreferences["tone"] if isinstance(stylePreferences["tone"], str) else "balanced"
    strictTruth = payload["strict_truth"] if isinstance(payload["strict_truth"], bool) else False

    keyword_summary = [
        {
            "term": entry.get("term"),
            "score": entry.get("score"),
            "sources": entry.get("sources", []),
        }
        for entry in keywords[:15]
    ]

    output_contract = {
        "summary": "short overall summary of what changed and why",
        "updatedResumeData": {
            "summary": {},
            "experience": [],
            "projects": [],
            "skills": [],
            "education": [],
        },
        "patchDiff": {
            "summary": {
                "before": "",
                "after": "",
                "reason": ""
            },
            "experience": [
                {
                    "id": 0,
                    "fieldsChanged": {
                        "description": {
                            "before": "",
                            "after": ""
                        },
                        "skills": {
                            "before": "",
                            "after": ""
                        }
                    },
                    "reason": ""
                }
            ],
            "projects": [
                {
                    "id": 0,
                    "fieldsChanged": {
                        "title": {
                            "before": "",
                            "after": ""
                        },
                        "description": {
                            "before": "",
                            "after": ""
                        },
                        "tech_stack": {
                            "before": [],
                            "after": []
                        }
                    },
                    "reason": ""
                }
            ],
            "skills": {
                "before": [],
                "after": [],
                "reason": ""
            }
        },
        "changeReasons": [
            {
                "section": "experience",
                "id": 0,
                "reason": "short reason for this change"
            }
        ],
        "warnings": [
            "optional warning about unsupported gaps or weak evidence"
        ]
    }

    lines = [
        f"Target role: {targetRole or 'Not specified'}",
        f"Company: {company or 'Not specified'}",
        f"Active domains: {', '.join(activeDomains) if activeDomains else 'none'}",
        f"Focus: {focus}",
        f"Tone: {tone}",
        f"Strict truth mode: {'on' if strictTruth else 'off'}",
        "",
        "Goal:",
        "Generate a stronger, more tailored version of the current resumeData for the target role.",
        "Return a full updated resumeData object, a patch diff, and short reasons for each change.",
        "",
        "How to use the signals:",
        "- Resume hits are evidence already present in the user's resume and should be strengthened, surfaced, and used confidently.",
        "- Resume gaps are important JD targets that are not clearly present. Use them to guide emphasis and possible soft generalization, but do not fabricate unsupported claims.",
        "- Section hit totals show which sections align most strongly with the target role.",
        "- Entry hit counts show which specific experience or project entries are strongest and should be used as anchors.",
        "- Skills are not the main narrative proof section. Use skills mainly for reorder, regrouping, emphasis, and adding relevant verified skills from available user data.",
        "- Lower-priority entries may be rewritten more aggressively than high-priority entries, as long as changes remain grounded.",
        "",
        "Transformation strategy:",
        "1. Preserve and strengthen the strongest aligned evidence.",
        "2. Use the highest-hit experience and project entries as the main narrative anchors.",
        "3. Improve lower-hit entries so they contribute more to the target role.",
        "4. Reorder and regroup skills to prioritize the most relevant categories and skills.",
        "5. Use resume gaps as direction for better framing, but not for unsupported hard claims.",
        "",
        "Relevant JD lines:",
        f"{json.dumps(relevantJDLines, ensure_ascii=False, indent=2)}",
        "",
        "Structured tailoring signals:",
        f"Top keywords: {json.dumps(keyword_summary, ensure_ascii=False)}",
        f"Resume hits: {json.dumps(resumeHits, ensure_ascii=False)}",
        f"Resume gaps: {json.dumps(resumeGaps, ensure_ascii=False)}",
        f"Section hit totals: {json.dumps(sectionScoresRanked, ensure_ascii=False, indent=2)}",
        f"Entry hits by section: {json.dumps(rowsPerSectionRanked, ensure_ascii=False, indent=2)}",
        f"Gaps per section: {json.dumps(gapsPerSection, ensure_ascii=False, indent=2)}",
        "",
        "Current resume data:",
        json.dumps(resumeData, ensure_ascii=False, indent=2),
        "Required behavior:",
        "- Use the current resumeData as the base object.",
        "- Keep ids stable for experience, projects, education, and skills wherever they already exist.",
        "- Update only fields that improve role fit or readability.",
        "- Prefer strong, concise, ATS-friendly bullet language.",
        "- Preserve meaningful metrics, technical details, and real scope when present.",
        "- If a project or experience entry already strongly aligns, improve it lightly rather than rewriting it from scratch.",
        "- If a project or experience entry aligns weakly, improve it more substantially, while remaining grounded in the original evidence.",
        "- For skills, you may reorder, regroup, and add relevant verified skills from user data.",
        "- You may improve project titles if it helps clarify relevance, but keep them truthful and recognizable.",
        "- If a gap is unsupported, do not convert it into a hard claim.",
        "",
        "Decision guidance:",
        "- Experience and projects are the highest-value sections for narrative tailoring.",
        "- Skills are a support section and should reinforce the strongest narrative evidence.",
        "- Education is lower priority unless the role clearly benefits from the education signals.",
        "- When deciding what to change, use section and entry hit counts as the main prioritization signal.",
        "",
        "Output requirements:",
        "- Return valid JSON only.",
        "- Return one full updated resumeData object.",
        "- Return one patchDiff object that clearly shows what changed.",
        "- Return short per-change reasons suitable for UI display.",
        "- Keep reasoning short and practical.",
        "",
        "Return this exact JSON shape:",
        json.dumps(output_contract, ensure_ascii=False, indent=2),
    ]

    return "\n".join(lines)

def build_prompt(payload, tailorContext, sectionDetails, relevantJDLines):

    # payload context.
    stylePreferences = payload["style_preferences"] if isinstance(payload["style_preferences"], dict) else {}
    focus = stylePreferences["focus"] if isinstance(stylePreferences["focus"], str) else "balanced"
    tone = stylePreferences["tone"] if isinstance(stylePreferences["tone"], str) else "balanced"
    strictTruth = payload["strict_truth"] if isinstance(payload["strict_truth"], bool) else False
    
    # build our rules.
    rules = build_rules(strictTruth, focus, tone)

    # build system prompt.
    system_prompt = build_system_prompt(rules)

    # build user prompt.
    user_prompt = build_user_prompt(payload, tailorContext, sectionDetails, relevantJDLines)

    return system_prompt, user_prompt