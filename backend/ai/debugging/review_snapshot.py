from __future__ import annotations

from typing import Any


def _clean(value: Any, limit: int = 160) -> str:
    text = " ".join(str(value or "").strip().split())
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "..."


def _dedupe(items: Any, limit: int = 12) -> list:
    out = []
    seen = set()
    for item in items or []:
        if item in (None, "", [], {}):
            continue
        key = str(item).strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(item)
        if len(out) >= limit:
            break
    return out


def _term_entry(entry: Any) -> dict[str, Any] | None:
    if not isinstance(entry, dict):
        return None
    term = _clean(entry.get("term"), limit=80)
    if not term:
        return None
    out = {
        "term": term,
        "signalType": _clean(entry.get("signalType"), limit=40) or None,
        "score": entry.get("score"),
    }
    line_kinds = entry.get("lineKinds")
    if isinstance(line_kinds, list):
        out["lineKinds"] = _dedupe([_clean(x, limit=40) for x in line_kinds], limit=4)
    line_preview = entry.get("linePreview")
    if isinstance(line_preview, list):
        out["linePreview"] = [_clean(x, limit=140) for x in line_preview[:2] if _clean(x)]
    return out


def _terms(entries: Any, limit: int = 12) -> list[dict[str, Any]]:
    out = []
    seen = set()
    for entry in entries or []:
        item = _term_entry(entry)
        if not item:
            continue
        key = str(item.get("term") or "").lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
        if len(out) >= limit:
            break
    return out


def _terms_by_signal(entries: Any, limit: int = 6) -> dict[str, list[str]]:
    buckets: dict[str, list[str]] = {}
    for item in _terms(entries, limit=60):
        signal = item.get("signalType") or "unknown"
        buckets.setdefault(signal, [])
        if len(buckets[signal]) < limit:
            buckets[signal].append(item["term"])
    return buckets


def _rows_ranked(section_details: dict, section: str, limit: int = 8) -> list[dict[str, Any]]:
    rows = (((section_details or {}).get("rowsPerSectionRanked") or {}).get(section) or [])
    if not isinstance(rows, list):
        return []
    out = []
    for row in rows[:limit]:
        if not isinstance(row, dict):
            continue
        out.append(
            {
                "id": row.get("id"),
                "score": row.get("score") or row.get("jdEvidenceScore"),
                "hits": row.get("hits") or row.get("jdKeywordHits"),
                "matchedTerms": _dedupe(row.get("matchedTerms") or row.get("jdKeywordHitsList") or [], limit=8),
            }
        )
    return out


def _label_from_row(row: dict, section: str) -> str:
    if section == "experience":
        return _clean(f"{row.get('company') or ''} {row.get('title') or ''}".strip(), limit=90)
    if section == "projects":
        return _clean(row.get("title"), limit=90)
    if section == "skills":
        return _clean(row.get("name"), limit=80)
    if section == "education":
        return _clean(row.get("school"), limit=80)
    return ""


def _resume_labels_by_id(resume_data: dict, section: str) -> dict[Any, str]:
    rows = resume_data.get(section) if isinstance(resume_data, dict) else None
    if not isinstance(rows, list):
        return {}
    out = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        rid = row.get("id")
        label = _label_from_row(row, section)
        if rid is not None and label:
            out[rid] = label
    return out


def _patch_rows(patch: dict, resume_data: dict, section: str, *, removed: bool | None = None) -> list[dict[str, Any]]:
    entries = patch.get(section) if isinstance(patch, dict) else None
    if not isinstance(entries, list):
        return []
    labels = _resume_labels_by_id(resume_data, section)
    out = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if removed is not None and bool(entry.get("removed")) is not removed:
            continue
        rid = entry.get("id")
        before = entry.get("before") if isinstance(entry.get("before"), dict) else {}
        after = entry.get("after") if isinstance(entry.get("after"), dict) else {}
        label = _label_from_row(after or before, section) or labels.get(rid) or str(rid)
        fields_changed = entry.get("fieldsChanged") if isinstance(entry.get("fieldsChanged"), dict) else {}
        out.append(
            {
                "id": rid,
                "label": label,
                "removed": bool(entry.get("removed")),
                "fieldsChanged": sorted(fields_changed.keys()),
            }
        )
    return out


def _selection_snapshot(final_out: dict, resume_data: dict, narrative: dict) -> dict[str, Any]:
    patch = final_out.get("patchDiff") if isinstance(final_out, dict) else {}
    patch = patch if isinstance(patch, dict) else {}
    return {
        "narrativePlan": {
            "keepExperience": narrative.get("keepExperience") or [],
            "dropExperience": narrative.get("dropExperience") or [],
            "rewriteExperience": narrative.get("rewriteExperience") or [],
            "keepProjects": narrative.get("keepProjects") or [],
            "dropProjects": narrative.get("dropProjects") or [],
            "maybeProjects": narrative.get("maybeProjects") or [],
            "rewriteProjects": narrative.get("rewriteProjects") or [],
            "heroExperience": narrative.get("heroExperience") or [],
            "heroProjects": narrative.get("heroProjects") or [],
        },
        "changedRows": {
            "experience": _patch_rows(patch, resume_data, "experience", removed=False),
            "projects": _patch_rows(patch, resume_data, "projects", removed=False),
            "skills": _patch_rows(patch, resume_data, "skills", removed=False),
        },
        "removedRows": {
            "experience": _patch_rows(patch, resume_data, "experience", removed=True),
            "projects": _patch_rows(patch, resume_data, "projects", removed=True),
            "skills": _patch_rows(patch, resume_data, "skills", removed=True),
        },
    }


def _warning_buckets(warnings: Any) -> dict[str, list[str]]:
    buckets = {
        "rewrite": [],
        "skills": [],
        "claims_or_gaps": [],
        "quality": [],
        "other": [],
    }
    for warning in warnings or []:
        text = _clean(warning, limit=260)
        low = text.lower()
        if not text:
            continue
        if "rewrite audit" in low or "rewrite repair" in low:
            buckets["rewrite"].append(text)
        elif "skills" in low:
            buckets["skills"].append(text)
        elif "not directly evidenced" in low or "unsupported" in low or "gap" in low:
            buckets["claims_or_gaps"].append(text)
        elif "quality guard" in low or "filler" in low or "placeholder" in low:
            buckets["quality"].append(text)
        else:
            buckets["other"].append(text)
    return {key: value for key, value in buckets.items() if value}


def _likely_issue_hints(snapshot: dict[str, Any]) -> list[str]:
    hints = []
    extraction = snapshot.get("extraction") or {}
    priority = extraction.get("priorityTerms") or []
    noisy_priority = [
        item.get("term")
        for item in priority[:8]
        if item.get("signalType") in {"context", "generic_fragment", "noise"}
    ]
    if noisy_priority:
        hints.append("extraction: context/generic terms reached priority terms: " + ", ".join(noisy_priority[:4]))

    strategy = snapshot.get("strategy") or {}
    if strategy.get("persona") in {"sales_growth", "operations_admin"}:
        removed_exp = ((snapshot.get("selection") or {}).get("removedRows") or {}).get("experience") or []
        service_removed = [
            row.get("label")
            for row in removed_exp
            if any(word in str(row.get("label") or "").lower() for word in ("server", "host", "expo"))
        ]
        if service_removed:
            hints.append("selection: service/customer experience was removed for a people-facing lane.")

    warnings = snapshot.get("warningsByCategory") or {}
    if warnings.get("rewrite"):
        hints.append("rewrite: audit warnings suggest weak, missing, or filler-heavy rewrites.")
    if warnings.get("skills"):
        hints.append("skills: skills pass needed repair or may not reflect the intended strategy.")
    if warnings.get("claims_or_gaps"):
        hints.append("claims: unsupported terms or gaps need review before sending.")
    return hints


def _review_template(strategy: dict) -> dict[str, Any]:
    return {
        "scores_0_to_2": {
            "extraction": None,
            "strategy": None,
            "selection": None,
            "rewrite": None,
            "summary_and_skills": None,
            "tailor_assist": None,
        },
        "expected": {
            "lane": strategy.get("lane") or "",
            "persona": strategy.get("persona") or "",
            "role_archetype": strategy.get("roleArchetype") or "",
            "must_keep": [],
            "maybe_keep": [],
            "should_drop": [],
            "questionable_terms": [],
            "summary_should_feel_like": [],
            "biggest_concern": "",
        },
        "observations": {
            "what_worked": [],
            "what_felt_wrong": [],
            "likely_root_causes": [],
            "notes_for_next_rule_or_prompt": "",
        },
    }


def build_tailor_review_snapshot(
    *,
    payload: dict,
    ext_result: dict,
    tailor_context: dict,
    section_details: dict,
    narrative_brief: dict,
    final_out: dict,
    diff_audit: dict | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    payload = payload if isinstance(payload, dict) else {}
    ext_result = ext_result if isinstance(ext_result, dict) else {}
    tailor_context = tailor_context if isinstance(tailor_context, dict) else {}
    section_details = section_details if isinstance(section_details, dict) else {}
    narrative_brief = narrative_brief if isinstance(narrative_brief, dict) else {}
    final_out = final_out if isinstance(final_out, dict) else {}
    resume_data = payload.get("resume_data") if isinstance(payload.get("resume_data"), dict) else {}
    strategy = tailor_context.get("jobStrategy") if isinstance(tailor_context.get("jobStrategy"), dict) else {}
    alignment = tailor_context.get("alignmentContext") if isinstance(tailor_context.get("alignmentContext"), dict) else {}
    explanation = final_out.get("tailorExplanation") if isinstance(final_out.get("tailorExplanation"), dict) else {}

    snapshot = {
        "schemaVersion": 1,
        "purpose": "Copy this file into notes after a run. Fill humanReview to score where the tailoring pipeline is likely going wrong.",
        "run": {
            "targetRole": payload.get("target_role"),
            "company": payload.get("company"),
            "model": model,
            "stylePreferences": payload.get("style_preferences") or {},
            "strictTruth": bool(payload.get("strict_truth", True)),
            "jobDescriptionChars": len(str(payload.get("job_description") or "")),
            "resumeCounts": {
                "experience": len(resume_data.get("experience") or []),
                "projects": len(resume_data.get("projects") or []),
                "skills": len(resume_data.get("skills") or []),
                "education": len(resume_data.get("education") or []),
            },
        },
        "extraction": {
            "activeDomains": ext_result.get("activeDomains") or [],
            "rawTopTerms": _terms(ext_result.get("rawKeywords") or ((ext_result.get("debug") or {}).get("top_keywords")), limit=14),
            "priorityTerms": _terms(ext_result.get("keywords") or ((ext_result.get("debug") or {}).get("priority_keywords")), limit=14),
            "suppressedTerms": _terms(ext_result.get("suppressedKeywords") or ((ext_result.get("debug") or {}).get("suppressed_terms")), limit=12),
            "termsBySignalType": _terms_by_signal(ext_result.get("keywords") or [], limit=8),
            "includedLineSamples": ((ext_result.get("debug") or {}).get("included_line_samples") or [])[:6],
        },
        "strategy": {
            "lane": strategy.get("lane"),
            "persona": strategy.get("persona"),
            "roleArchetype": strategy.get("roleArchetype"),
            "fitMode": strategy.get("fitMode"),
            "lengthMode": strategy.get("lengthMode"),
            "readerGoal": strategy.get("readerGoal"),
            "proofStyle": strategy.get("proofStyle") or [],
            "keepPriorities": strategy.get("keepPriorities") or [],
            "trimPriorities": strategy.get("trimPriorities") or [],
            "claimRules": strategy.get("claimRules") or [],
            "skillPreserve": strategy.get("skillPreserve") or [],
            "skillDeprioritize": strategy.get("skillDeprioritize") or [],
            "summaryGuardrails": strategy.get("summaryGuardrails") or [],
            "supportedSignals": strategy.get("supportedSignals") or [],
            "gapSignals": strategy.get("gapSignals") or [],
        },
        "alignment": {
            "mode": alignment.get("mode"),
            "unsupportedTerms": alignment.get("unsupportedTerms") or [],
            "fitRisk": alignment.get("fitRisk") or {},
            "gapSupport": (alignment.get("gapSupport") or [])[:10],
            "jdSignalIntent": (alignment.get("jdSignalIntent") or [])[:12],
        },
        "ranking": {
            "experience": _rows_ranked(section_details, "experience"),
            "projects": _rows_ranked(section_details, "projects"),
        },
        "selection": _selection_snapshot(final_out, resume_data, narrative_brief),
        "tailorAssist": {
            "paragraph": explanation.get("paragraph"),
            "chips": explanation.get("chips") or [],
            "details": explanation.get("details") or [],
            "jobPriorityTerms": ((explanation.get("evidence") or {}).get("jobPriorityTerms") or []),
        },
        "warningsByCategory": _warning_buckets(final_out.get("warnings") or []),
        "changeReasons": final_out.get("changeReasons") or [],
        "quality": ((diff_audit or {}).get("quality") if isinstance(diff_audit, dict) else {}) or {},
        "humanReview": _review_template(strategy),
    }
    snapshot["likelyIssueHints"] = _likely_issue_hints(snapshot)
    return snapshot
