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


def build_alignment_context(resume_data: dict, tailor_context: dict, section_details: dict) -> dict[str, Any]:
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
        "unsupportedTerms": resume_gaps[:8],
        "topJobTerms": top_terms[:8],
        "guidance": guidance,
    }
