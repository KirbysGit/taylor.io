from __future__ import annotations

import re
from typing import Any

from ..processing.alias_map import canonicalize_term, get_term_aliases
from ..shared.text_utils import normalize_term


TRANSFERABLE_SIGNAL_GROUPS = {
    "compliance / standards": {
        "compliance",
        "secure",
        "security",
        "policy",
        "policies",
        "regulatory",
        "standards",
        "protected",
        "safety",
    },
    "metrics / reporting": {
        "metric",
        "metrics",
        "dashboard",
        "dashboards",
        "visibility",
        "benchmark",
        "benchmarked",
        "analytics",
        "tracking",
        "reporting",
    },
    "workflow / automation": {
        "workflow",
        "workflows",
        "automation",
        "automated",
        "pipeline",
        "pipelines",
        "processing",
        "streamline",
        "streamlined",
        "optimize",
        "optimized",
    },
    "coordination / communication": {
        "collaborated",
        "collaboration",
        "cross-functional",
        "communication",
        "teams",
        "team",
        "requirements",
        "guests",
        "kitchen",
        "bar",
        "stakeholders",
    },
    "pace / issue response": {
        "high-pressure",
        "pressure",
        "fast-paced",
        "alerts",
        "real time",
        "near real time",
        "latency",
        "reliable",
        "operational",
    },
}


CLIENT_RELATION_TERMS = {
    "account management",
    "client",
    "clients",
    "customer",
    "customers",
    "customer service",
    "relationship",
    "relationships",
    "marketing",
    "campaign",
    "campaigns",
    "sales",
    "service",
    "communicate",
    "communication",
}

CLIENT_FACING_ROW_TERMS = {
    "customer",
    "customers",
    "guest",
    "guests",
    "client",
    "clients",
    "communication",
    "communicate",
    "service",
    "served",
    "restaurant",
    "retail",
    "bar",
    "kitchen",
}

PRODUCT_ACCOUNT_ROW_TERMS = {
    "user account",
    "user accounts",
    "account management",
    "account aggregation",
    "authentication",
    "auth",
    "oauth",
    "jwt",
    "transaction",
    "transactions",
    "dashboard",
    "dashboards",
    "api",
    "apis",
    "schema",
    "schemas",
    "plaid",
}

ROLE_ACTION_CUES = {
    "support",
    "maintain",
    "assist",
    "execute",
    "communicate",
    "track",
    "collaborate",
    "develop",
    "manage",
    "coordinate",
    "build",
    "drive",
    "resolve",
    "follow",
    "outreach",
    "prospect",
    "sell",
}

REQUIREMENT_CUES = {
    "looking for",
    "what we're looking for",
    "requirements",
    "required",
    "skills",
    "ability",
    "experience is a plus",
    "plus",
    "work ethic",
    "team-oriented",
    "coachable",
    "motivated",
}

PRODUCT_CONTEXT_CUES = {
    "company",
    "portfolio",
    "platform",
    "product",
    "software",
    "technology",
    "technologies",
    "artificial intelligence",
    "ai",
    "architecture",
    "infrastructure",
    "msp",
    "msps",
    "model",
    "data",
}

BACKGROUND_OR_BENEFIT_CUES = {
    "no previous",
    "not required",
    "training",
    "paid training",
    "mentorship",
    "compensation",
    "incentives",
    "growth",
    "opportunities",
    "full-time",
    "schedule",
    "entry-level",
}

PRODUCT_CONTEXT_TERMS = {
    "artificial intelligence",
    "ai",
    "architecture",
    "pipeline",
    "pipelines",
    "msp",
    "msps",
    "platform",
    "software",
    "technology",
    "infrastructure",
    "data",
    "model",
}

GAP_SUPPORT_CLUSTERS = [
    {
        "name": "data systems",
        "targetTerms": {
            "data engineering",
            "data-focused development",
            "data pipelines",
            "data pipeline",
            "data workflows",
            "etl",
            "data integration",
            "data infrastructure",
        },
        "evidenceTerms": {
            "pipeline",
            "pipelines",
            "etl",
            "sql",
            "postgresql",
            "data processing",
            "processing",
            "data ingestion",
            "ingestion",
            "transformation",
            "normalized data",
            "schemas",
        },
        "guidance": "Use as related data-focused development evidence; avoid claiming a formal data engineer title unless the resume directly supports it.",
    },
    {
        "name": "analysis and validation",
        "targetTerms": {
            "data analysis",
            "analysis",
            "validation",
            "data validation",
            "analytics",
            "metrics",
            "reporting",
        },
        "evidenceTerms": {
            "analytics",
            "metrics",
            "dashboard",
            "dashboards",
            "feature engineering",
            "predictive features",
            "benchmark",
            "benchmarked",
            "roc-auc",
            "validation",
            "tracking",
        },
        "guidance": "Use as related analytics or validation evidence; phrase the claim around the actual metrics, dashboards, benchmarks, or features shown.",
    },
    {
        "name": "interfaces and presentation",
        "targetTerms": {
            "frontend",
            "front-end",
            "front end",
            "ui",
            "user interface",
            "interface",
            "dashboards",
            "dashboard",
        },
        "evidenceTerms": {
            "react",
            "dashboard",
            "dashboards",
            "interface",
            "interfaces",
            "ui",
            "responsive",
            "live editing",
            "preview",
        },
        "guidance": "Use as related interface/frontend evidence; describe the actual dashboards or UI surfaces rather than overclaiming broad frontend ownership.",
    },
    {
        "name": "customer and stakeholder communication",
        "targetTerms": {
            "customer service",
            "client",
            "clients",
            "customer",
            "customers",
            "communication",
            "communicate",
            "stakeholders",
            "interpersonal",
        },
        "evidenceTerms": {
            "guests",
            "customer",
            "customers",
            "communication",
            "teams",
            "team",
            "kitchen",
            "bar",
            "stakeholders",
            "requirements",
            "collaborated",
            "cross-functional",
        },
        "guidance": "Use as related communication evidence; keep claims tied to the audience and setting the resume actually shows.",
    },
    {
        "name": "coordination and ownership",
        "targetTerms": {
            "leadership",
            "ownership",
            "coordination",
            "project management",
            "manage",
            "manager",
            "collaboration",
            "team-oriented",
        },
        "evidenceTerms": {
            "collaborated",
            "coordination",
            "communication",
            "teams",
            "requirements",
            "system design",
            "architecture",
            "workflows",
            "owned",
            "led",
        },
        "guidance": "Use as related ownership or coordination evidence; avoid implying formal management unless the title or bullets prove it.",
    },
    {
        "name": "cloud and deployment",
        "targetTerms": {
            "cloud",
            "infrastructure",
            "deployment",
            "deploy",
            "deployed",
            "gcp",
            "azure",
            "aws",
            "containerized",
            "docker",
            "kubernetes",
            "ci/cd",
        },
        "evidenceTerms": {
            "aws",
            "ec2",
            "deployed",
            "deploy",
            "deployment",
            "production",
            "cloud",
            "ci/cd",
            "containerized",
        },
        "guidance": "Use as related deployment/cloud evidence only for providers or deployment work actually present; do not name missing platforms.",
    },
    {
        "name": "ai and machine learning",
        "targetTerms": {
            "ai",
            "artificial intelligence",
            "ml",
            "machine learning",
            "llm",
            "models",
            "model",
            "nlp",
            "prompt",
        },
        "evidenceTerms": {
            "openai",
            "ai",
            "ml",
            "machine learning",
            "model",
            "models",
            "nlp",
            "finbert",
            "xgboost",
            "pytorch",
            "tensorflow",
            "content generation",
        },
        "guidance": "Use as related AI/ML evidence; keep claims to the model/API/workflow types the resume actually includes.",
    },
    {
        "name": "security and compliance",
        "targetTerms": {
            "security",
            "secure",
            "compliance",
            "privacy",
            "data privacy",
            "governance",
            "auth",
            "authentication",
        },
        "evidenceTerms": {
            "secure",
            "security",
            "compliance",
            "protected",
            "oauth",
            "jwt",
            "authentication",
            "financial data",
            "access",
        },
        "guidance": "Use as related security/compliance evidence; avoid regulated-domain claims beyond the resume facts.",
    },
]


def _term_aliases(term: str) -> set[str]:
    normalized = normalize_term(term)
    if not normalized:
        return set()
    aliases = set(get_term_aliases(normalized) or set())
    aliases.add(normalized)
    canonical = canonicalize_term(normalized)
    if canonical:
        aliases.add(canonical)
    out = set()
    for alias in aliases:
        a = normalize_term(alias)
        if a:
            out.add(a)
    return out


def _contains_term(text: str, term: str) -> bool:
    if not text or not term:
        return False
    for alias in _term_aliases(term):
        if re.search(r"(?<![a-z0-9])" + re.escape(alias) + r"(?![a-z0-9])", text):
            return True
    return False


def _row_text(row: dict[str, Any], section: str) -> str:
    if not isinstance(row, dict):
        return ""
    parts = []
    if section == "experience":
        keys = ("title", "company", "location", "skills", "description")
    elif section == "projects":
        keys = ("title", "description", "url")
    elif section == "skills":
        keys = ("name", "category")
    else:
        keys = ("school", "degree", "discipline", "minor", "location", "gpa")
    for key in keys:
        value = row.get(key)
        if isinstance(value, str) and value.strip():
            parts.append(value.strip())
        elif isinstance(value, list):
            joined = " ".join(str(x).strip() for x in value if str(x).strip())
            if joined:
                parts.append(joined)
        elif isinstance(value, dict):
            joined = " ".join(str(x).strip() for x in value.values() if str(x).strip())
            if joined:
                parts.append(joined)
    return normalize_term(" ".join(parts))


def _job_intents(top_terms: list[str]) -> list[str]:
    blob = " ".join(normalize_term(t) for t in top_terms if str(t or "").strip())
    intents = []
    if any(term in blob for term in CLIENT_RELATION_TERMS):
        intents.append("client_relations")
    return intents


def _line_has_any(line: str, cues: set[str]) -> bool:
    low = normalize_term(line)
    return any(cue in low for cue in cues)


def _term_lines(term: str, relevant_jd_lines: list[str]) -> list[str]:
    lines = []
    for line in relevant_jd_lines or []:
        if not isinstance(line, str) or not line.strip():
            continue
        low = normalize_term(line)
        if _contains_term(low, term):
            lines.append(line.strip())
    return lines


def _jd_signal_intent(top_terms: list[str], target_role: str = "", relevant_jd_lines: list[str] | None = None) -> list[dict[str, Any]]:
    role = normalize_term(target_role)
    out = []
    seen = set()
    for raw in top_terms[:12]:
        term = canonicalize_term(raw)
        if not term or term in seen:
            continue
        seen.add(term)
        lines = _term_lines(term, relevant_jd_lines or [])
        blob = normalize_term(" ".join(lines))
        in_role_title = _contains_term(role, term)
        has_role_action = _line_has_any(blob, ROLE_ACTION_CUES)
        has_requirement = _line_has_any(blob, REQUIREMENT_CUES)
        has_product_context = _line_has_any(blob, PRODUCT_CONTEXT_CUES) or term in PRODUCT_CONTEXT_TERMS
        has_background = _line_has_any(blob, BACKGROUND_OR_BENEFIT_CUES)
        sales_pipeline = term in {"pipeline", "pipelines"} and any(
            cue in blob for cue in ("sales pipeline", "lead pipeline", "prospect pipeline", "outreach pipeline")
        )

        if in_role_title or sales_pipeline or (has_role_action and not (has_product_context and term in PRODUCT_CONTEXT_TERMS)):
            intent = "role_responsibility"
            priority = 3
            reason = "Role/action signal: use this to shape hero selection and lead bullets when resume evidence supports it."
        elif has_requirement:
            intent = "candidate_requirement"
            priority = 2
            reason = "Candidate requirement: use as bridge/skills emphasis when supported by resume behavior."
        elif has_product_context:
            intent = "company_product_context"
            priority = 1
            reason = "Company/product context: useful for wording and domain awareness, but should not drive hero selection by itself."
        elif has_background:
            intent = "background_or_benefit"
            priority = 0
            reason = "Background, benefit, or role framing: rarely a resume claim target."
        else:
            intent = "role_responsibility" if in_role_title else "candidate_requirement"
            priority = 2 if not in_role_title else 3
            reason = "Inferred from keyword rank; use with evidence classification rather than as a standalone claim."

        out.append(
            {
                "term": term,
                "intent": intent,
                "priority": priority,
                "reason": reason,
                "linePreview": lines[:2],
            }
        )
    return out


def _has_any(text: str, terms: set[str]) -> bool:
    return any(_contains_term(text, term) for term in terms)


def _resume_text(resume_data: dict) -> str:
    parts = []
    rd = resume_data if isinstance(resume_data, dict) else {}
    for section in ("summary", "experience", "projects", "skills", "education"):
        value = rd.get(section)
        if isinstance(value, dict):
            parts.append(_row_text(value, section))
        elif isinstance(value, list):
            for row in value:
                if isinstance(row, dict):
                    parts.append(_row_text(row, section))
    return normalize_term(" ".join(x for x in parts if x))


def _matches_term_family(term: str, candidates: set[str]) -> bool:
    t = normalize_term(term)
    if not t:
        return False
    for candidate in candidates:
        c = normalize_term(candidate)
        if not c:
            continue
        if t == c or _contains_term(t, c) or _contains_term(c, t):
            return True
    return False


def _matched_evidence_terms(text: str, evidence_terms: set[str]) -> list[str]:
    matched = []
    for term in sorted(evidence_terms, key=lambda x: (len(str(x)), str(x))):
        if _contains_term(text, term):
            matched.append(term)
    return matched


def _gap_support(
    gaps: list[str],
    resume_hits: list[str],
    resume_data: dict,
) -> list[dict[str, Any]]:
    resume_blob = _resume_text(resume_data)
    hit_set = {canonicalize_term(t) for t in resume_hits or [] if str(t or "").strip()}
    out = []
    seen = set()
    for raw in gaps or []:
        term = normalize_term(canonicalize_term(raw))
        if not term or term in seen:
            continue
        seen.add(term)
        if term in hit_set:
            out.append(
                {
                    "term": term,
                    "status": "direct",
                    "supportingEvidence": [term],
                    "capability": "direct match",
                    "claimGuidance": "Directly evidenced by resume wording.",
                }
            )
            continue

        best = None
        for cluster in GAP_SUPPORT_CLUSTERS:
            targets = cluster.get("targetTerms") or set()
            if not _matches_term_family(term, targets):
                continue
            evidence = _matched_evidence_terms(resume_blob, cluster.get("evidenceTerms") or set())
            if not evidence:
                continue
            item = {
                "term": term,
                "status": "conceptual",
                "supportingEvidence": evidence[:6],
                "capability": cluster.get("name") or "related capability",
                "claimGuidance": cluster.get("guidance") or "Use as related evidence, not as direct same-title experience.",
            }
            if best is None or len(item["supportingEvidence"]) > len(best["supportingEvidence"]):
                best = item
        if best is not None:
            out.append(best)
        else:
            out.append(
                {
                    "term": term,
                    "status": "unsupported",
                    "supportingEvidence": [],
                    "capability": "",
                    "claimGuidance": "Do not claim this directly; mention only as a gap or omit.",
                }
            )
    return out[:12]


def _classify_direct_item(
    item: dict[str, Any],
    row_text: str,
    job_intents: list[str],
    signal_by_term: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    terms = [canonicalize_term(t) for t in (item.get("terms") or []) if str(t or "").strip()]
    terms = [t for t in dict.fromkeys(terms) if t]
    label = str(item.get("label") or "").strip()
    signal_by_term = signal_by_term or {}

    evidence_type = "direct_role_evidence"
    claim_strength = "direct"
    guidance = "Can be used as direct role-fit evidence when rewriting this row."
    signal_intents = {str((signal_by_term.get(term) or {}).get("intent") or "") for term in terms}
    only_product_context = bool(terms) and signal_intents <= {"company_product_context", "background_or_benefit"}
    if only_product_context:
        evidence_type = "domain_tool_evidence"
        claim_strength = "supporting"
        guidance = "Matched term is company/product context; use as supporting domain fluency, not direct role responsibility."

    if "client_relations" in job_intents and not only_product_context:
        accountish_hit = any("account" in term for term in terms)
        client_context = _has_any(row_text, CLIENT_FACING_ROW_TERMS)
        product_context = _has_any(row_text, PRODUCT_ACCOUNT_ROW_TERMS)
        if accountish_hit and product_context and not client_context:
            evidence_type = "domain_tool_evidence"
            claim_strength = "supporting"
            guidance = (
                "Use as account/data workflow familiarity only; do not frame as client account ownership or relationship management."
            )
        elif client_context:
            evidence_type = "direct_role_evidence"
            claim_strength = "direct"
            guidance = "Use as customer/client-facing communication or service evidence."
        elif terms:
            evidence_type = "weak_lexical_overlap"
            claim_strength = "cautious"
            guidance = "Same-word overlap is weak here; use only as support and avoid direct role claims."

    return {
        "section": item.get("section"),
        "id": item.get("id"),
        "label": label,
        "terms": terms[:6],
        "evidenceType": evidence_type,
        "claimStrength": claim_strength,
        "guidance": guidance,
    }


def _classify_transferable_item(item: dict[str, Any]) -> dict[str, Any]:
    themes = item.get("themes") if isinstance(item.get("themes"), list) else []
    theme_names = [str((theme or {}).get("theme") or "").strip() for theme in themes if isinstance(theme, dict)]
    return {
        "section": item.get("section"),
        "id": item.get("id"),
        "label": item.get("label"),
        "terms": theme_names[:4],
        "evidenceType": "transferable_behavior",
        "claimStrength": "bridge",
        "guidance": "Use as transferable proof; phrase as communication, coordination, metrics, workflow, pace, or service support rather than direct target-role ownership.",
    }


def _row_label(row: dict[str, Any], section: str, rid: int | str) -> str:
    if not isinstance(row, dict):
        return f"{section} {rid}"
    if section == "experience":
        company = str(row.get("company") or "").strip()
        title = str(row.get("title") or "").strip()
        return " ".join(x for x in (company, title) if x) or f"experience {rid}"
    if section == "projects":
        return str(row.get("title") or "").strip() or f"project {rid}"
    if section == "skills":
        return str(row.get("name") or "").strip() or f"skill {rid}"
    return str(row.get("school") or "").strip() or f"{section} {rid}"


def _rows_by_id(rows: Any) -> dict[Any, dict[str, Any]]:
    out = {}
    if not isinstance(rows, list):
        return out
    for row in rows:
        if not isinstance(row, dict):
            continue
        rid = row.get("id")
        if rid is not None:
            out[rid] = row
    return out


def _direct_evidence(rows_ranked: dict, resume_data: dict) -> list[dict[str, Any]]:
    out = []
    for section in ("experience", "projects", "skills", "education"):
        ranked = rows_ranked.get(section) if isinstance(rows_ranked, dict) else None
        if isinstance(ranked, dict):
            iterable = []
            for cat in ranked.values():
                if isinstance(cat, dict):
                    iterable.extend(cat.get("rows") or [])
        else:
            iterable = ranked or []
        source_rows = _rows_by_id(resume_data.get(section) if isinstance(resume_data, dict) else [])
        for item in iterable:
            if not isinstance(item, dict):
                continue
            rid = item.get("id")
            terms = [str(t) for t in (item.get("matchedTerms") or []) if str(t).strip()]
            if not terms:
                continue
            row = source_rows.get(rid, {})
            out.append(
                {
                    "section": section,
                    "id": rid,
                    "label": _row_label(row, section, rid),
                    "terms": terms[:6],
                    "score": item.get("score", item.get("hits", 0)),
                }
            )
    out.sort(key=lambda item: float(item.get("score") or 0), reverse=True)
    return out[:8]


def _transferable_evidence(resume_data: dict) -> list[dict[str, Any]]:
    out = []
    for section in ("experience", "projects"):
        rows = resume_data.get(section) if isinstance(resume_data, dict) else []
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            rid = row.get("id")
            text = _row_text(row, section)
            groups = []
            for group, terms in TRANSFERABLE_SIGNAL_GROUPS.items():
                matched = sorted({term for term in terms if _contains_term(text, term)})
                if matched:
                    groups.append({"theme": group, "terms": matched[:5]})
            if not groups:
                continue
            out.append(
                {
                    "section": section,
                    "id": rid,
                    "label": _row_label(row, section, rid),
                    "themes": groups[:3],
                }
            )
    return out[:10]


def _alignment_mode(*, top_terms: list[str], resume_hits: list[str], direct_evidence: list[dict[str, Any]]) -> tuple[str, float]:
    top = [canonicalize_term(t) for t in top_terms if str(t or "").strip()]
    top = [t for t in dict.fromkeys(top) if t]
    hits = {canonicalize_term(t) for t in resume_hits or [] if str(t or "").strip()}
    denominator = max(1, min(len(top), 8))
    direct_hit_count = len([term for term in top[:8] if term in hits])
    coverage = direct_hit_count / denominator
    strong_rows = 0
    for item in direct_evidence:
        try:
            score = float(item.get("score") or 0)
        except (TypeError, ValueError):
            score = 0.0
        if score >= 8 or len(item.get("terms") or []) >= 2:
            strong_rows += 1
    if coverage >= 0.45 and strong_rows >= 2:
        return "direct", round(coverage, 3)
    if coverage >= 0.2 or strong_rows >= 1:
        return "adjacent", round(coverage, 3)
    return "stretch", round(coverage, 3)


def _evidence_classification(
    *,
    direct_evidence: list[dict[str, Any]],
    transferable_evidence: list[dict[str, Any]],
    resume_data: dict,
    top_terms: list[str],
    jd_signal_intent: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    intents = _job_intents(top_terms)
    signal_by_term = {
        str(item.get("term") or ""): item
        for item in (jd_signal_intent or [])
        if isinstance(item, dict) and str(item.get("term") or "").strip()
    }
    out = []
    rows_by_section = {
        section: _rows_by_id(resume_data.get(section) if isinstance(resume_data, dict) else [])
        for section in ("experience", "projects", "skills", "education")
    }
    seen = set()
    for item in direct_evidence or []:
        if not isinstance(item, dict):
            continue
        section = item.get("section")
        rid = item.get("id")
        row = (rows_by_section.get(section) or {}).get(rid, {})
        classified = _classify_direct_item(item, _row_text(row, section), intents, signal_by_term)
        key = (classified.get("section"), classified.get("id"), classified.get("evidenceType"))
        if key not in seen:
            seen.add(key)
            out.append(classified)

    for item in transferable_evidence or []:
        if not isinstance(item, dict):
            continue
        key_base = (item.get("section"), item.get("id"))
        if any(existing.get("section") == key_base[0] and existing.get("id") == key_base[1] for existing in out):
            continue
        classified = _classify_transferable_item(item)
        key = (classified.get("section"), classified.get("id"), classified.get("evidenceType"))
        if key not in seen:
            seen.add(key)
            out.append(classified)
    return out[:10]


def _remove_transfer_supported_gaps(gaps: list[str], transferable_evidence: list[dict[str, Any]], top_terms: list[str]) -> list[str]:
    intents = _job_intents(top_terms)
    if "client_relations" not in intents:
        return gaps[:8]
    blob_parts = []
    for item in transferable_evidence or []:
        if not isinstance(item, dict):
            continue
        for theme in item.get("themes") or []:
            if not isinstance(theme, dict):
                continue
            blob_parts.append(str(theme.get("theme") or ""))
            blob_parts.extend(str(term or "") for term in (theme.get("terms") or []))
    blob = normalize_term(" ".join(blob_parts))
    out = []
    for gap in gaps:
        g = canonicalize_term(gap)
        if g in {"customer service", "communicate", "communication", "service"} and any(
            term in blob for term in ("guests", "communication", "service", "teams", "bar", "kitchen")
        ):
            continue
        out.append(g)
    return out[:8]


def build_alignment_context(
    resume_data: dict,
    tailor_context: dict,
    section_details: dict,
    relevant_jd_lines: list[str] | None = None,
    target_role: str = "",
) -> dict[str, Any]:
    tc = tailor_context if isinstance(tailor_context, dict) else {}
    rd = resume_data if isinstance(resume_data, dict) else {}
    keywords = tc.get("keywords") if isinstance(tc.get("keywords"), list) else []
    top_terms = []
    for entry in keywords[:12]:
        if not isinstance(entry, dict):
            continue
        term = canonicalize_term(entry.get("term") or "")
        if term and term not in top_terms:
            top_terms.append(term)
    resume_hits = [canonicalize_term(t) for t in (tc.get("resumeHits") or []) if str(t or "").strip()]
    resume_gaps = [canonicalize_term(t) for t in (tc.get("resumeGaps") or []) if str(t or "").strip()]
    rows_ranked = (section_details or {}).get("rowsPerSectionRanked") or {}
    direct = _direct_evidence(rows_ranked, rd)
    transferable = _transferable_evidence(rd)
    mode, coverage = _alignment_mode(top_terms=top_terms, resume_hits=resume_hits, direct_evidence=direct)
    jd_signal_intent = _jd_signal_intent(
        top_terms,
        target_role=target_role or str(tc.get("targetRole") or ""),
        relevant_jd_lines=relevant_jd_lines or [],
    )
    evidence_classification = _evidence_classification(
        direct_evidence=direct,
        transferable_evidence=transferable,
        resume_data=rd,
        top_terms=top_terms,
        jd_signal_intent=jd_signal_intent,
    )
    gap_support = _gap_support(resume_gaps, resume_hits, rd)
    unsupported = [
        str(item.get("term") or "")
        for item in gap_support
        if isinstance(item, dict) and item.get("status") == "unsupported" and str(item.get("term") or "").strip()
    ][:8]
    if not gap_support:
        unsupported = _remove_transfer_supported_gaps(resume_gaps, transferable, top_terms)

    if mode == "direct":
        guidance = "Direct fit: lead with the role title and strongest JD-overlap evidence, while preserving resume-native breadth."
    elif mode == "adjacent":
        guidance = (
            "Adjacent fit: bridge from proven evidence into the target role. Use transferable language, but do not claim the candidate already owns JD-only duties."
        )
    else:
        guidance = (
            "Stretch fit: be transparent and conservative. Frame transferable strengths, keep useful non-keyword evidence, and explicitly avoid unsupported target-role claims."
        )

    return {
        "mode": mode,
        "coverage": coverage,
        "directEvidence": direct,
        "transferableEvidence": transferable,
        "evidenceClassification": evidence_classification,
        "jdSignalIntent": jd_signal_intent,
        "gapSupport": gap_support,
        "unsupportedTerms": unsupported,
        "topJobTerms": top_terms[:8],
        "guidance": guidance,
    }
