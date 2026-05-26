from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_FIXTURE = Path("backend/ai/debug_out/tailor_eval.json")
DEFAULT_REVIEW = Path("backend/ai/debug_out/tailor_06_review.json")
DEFAULT_RUNS_DIR = Path("backend/ai/evaluation/runs")
DEFAULT_LATEST_SCORE = Path("backend/ai/debug_out/tailor_07_eval_score.json")
DEFAULT_HISTORY_LOG = Path("backend/ai/debug_out/tailor_eval_scores.jsonl")
RUBRIC_VERSION = 2
SCORE_WEIGHTS = {
    "strategy": 25,
    "selection": 30,
    "skills": 15,
    "warningsClaims": 10,
    "tailorAssist": 15,
    "summaryTone": 5,
}


def _norm(value: Any) -> str:
    text = str(value or "").lower()
    text = text.replace("&", " and ")
    return re.sub(r"[^a-z0-9+#]+", " ", text).strip()


def _flatten_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    except TypeError:
        return str(value)


def _contains(blob: Any, term: Any) -> bool:
    needle = _norm(term)
    haystack = f" {_norm(_flatten_text(blob))} "
    return bool(needle and f" {needle} " in haystack)


def _dedupe(items: list[str], limit: int | None = None) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for item in items:
        text = " ".join(str(item or "").split())
        key = text.lower()
        if not text or key in seen:
            continue
        seen.add(key)
        out.append(text)
        if limit is not None and len(out) >= limit:
            break
    return out


def _points(passed: bool, points: float) -> float:
    return float(points if passed else 0)


def _section(name: str, score: float, max_score: float, checks: list[dict[str, Any]], issues: list[str]) -> dict[str, Any]:
    return {
        "score": round(score, 2),
        "max": max_score,
        "checks": checks,
        "issues": _dedupe(issues),
    }


def _as_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _case_rows(case: dict[str, Any], key: str, section: str) -> list[dict[str, Any]]:
    expected = case.get("expected") if isinstance(case.get("expected"), dict) else {}
    block = expected.get(key) if isinstance(expected.get(key), dict) else {}
    rows = block.get(section)
    if not isinstance(rows, list):
        return []
    out = []
    for row in rows:
        if isinstance(row, dict):
            out.append(row)
        else:
            out.append({"id": None, "label": str(row)})
    return out


def _row_id(row: dict[str, Any]) -> Any:
    rid = row.get("id")
    if isinstance(rid, float) and rid == int(rid):
        return int(rid)
    return rid


def _row_label(row: dict[str, Any]) -> str:
    return str(row.get("label") or row.get("name") or row.get("title") or row.get("id") or "").strip()


def _id_set(rows: Any) -> set[Any]:
    out = set()
    for row in _as_list(rows):
        if isinstance(row, dict):
            rid = _row_id(row)
        else:
            rid = row
        if rid is not None:
            out.add(rid)
    return out


def _label_set(rows: Any) -> set[str]:
    out = set()
    for row in _as_list(rows):
        if isinstance(row, dict):
            label = _row_label(row)
        else:
            label = str(row or "")
        if label:
            out.add(_norm(label))
    return out


def _score_fraction(
    *,
    name: str,
    items: list[Any],
    max_score: float,
    predicate,
    missing_message,
) -> tuple[float, list[dict[str, Any]], list[str]]:
    if not items:
        return max_score, [{"name": name, "passed": True, "points": max_score, "note": "no expectations"}], []
    per_item = max_score / len(items)
    score = 0.0
    checks: list[dict[str, Any]] = []
    issues: list[str] = []
    for item in items:
        passed = bool(predicate(item))
        points = _points(passed, per_item)
        score += points
        label = item if not isinstance(item, dict) else _row_label(item)
        checks.append({"name": name, "item": label, "passed": passed, "points": round(points, 2)})
        if not passed:
            issues.append(missing_message(item))
    return score, checks, issues


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_eval_case(fixture_path: Path, case_id: str) -> dict[str, Any]:
    data = load_json(fixture_path)
    cases = data.get("cases") if isinstance(data, dict) else data
    if not isinstance(cases, list):
        raise ValueError(f"Fixture must be a list or an object with a cases list: {fixture_path}")
    for case in cases:
        if isinstance(case, dict) and case.get("id") == case_id:
            return case
    available = ", ".join(str(c.get("id")) for c in cases if isinstance(c, dict) and c.get("id"))
    raise ValueError(f"Unknown case id '{case_id}'. Available cases: {available}")


def score_strategy(case: dict[str, Any], review: dict[str, Any]) -> dict[str, Any]:
    expected = case.get("expected") if isinstance(case.get("expected"), dict) else {}
    actual = review.get("strategy") if isinstance(review.get("strategy"), dict) else {}
    fields = [
        ("lane", 8),
        ("persona", 7),
        ("roleArchetype", 10),
    ]
    score = 0.0
    checks: list[dict[str, Any]] = []
    issues: list[str] = []
    for field, points in fields:
        exp = expected.get(field)
        act = actual.get(field)
        passed = bool(exp and act and exp == act)
        score += _points(passed, points)
        checks.append(
            {
                "name": field,
                "expected": exp,
                "actual": act,
                "passed": passed,
                "points": _points(passed, points),
            }
        )
        if not act:
            issues.append(f"Missing actual strategy.{field}; rerun this case after the latest strategy/debug changes.")
        elif exp != act:
            issues.append(f"{field} expected {exp}, got {act}.")
    return _section("Strategy", score, SCORE_WEIGHTS["strategy"], checks, issues)


def _selection_sets(review: dict[str, Any], section: str) -> dict[str, set[Any] | set[str]]:
    selection = review.get("selection") if isinstance(review.get("selection"), dict) else {}
    narrative = selection.get("narrativePlan") if isinstance(selection.get("narrativePlan"), dict) else {}
    removed = selection.get("removedRows") if isinstance(selection.get("removedRows"), dict) else {}
    changed = selection.get("changedRows") if isinstance(selection.get("changedRows"), dict) else {}
    suffix = "Experience" if section == "experience" else "Projects"
    visible_ids = set()
    for key in (f"keep{suffix}", f"maybe{suffix}", f"rewrite{suffix}", f"hero{suffix}"):
        visible_ids.update(_id_set(narrative.get(key) or []))
    visible_ids.update(_id_set(changed.get(section) or []))
    return {
        "removed_ids": _id_set(removed.get(section) or []),
        "removed_labels": _label_set(removed.get(section) or []),
        "drop_ids": _id_set(narrative.get(f"drop{suffix}") or []),
        "visible_ids": visible_ids,
        "visible_labels": _label_set(changed.get(section) or []),
    }


def _row_matches(row: dict[str, Any], ids: set[Any], labels: set[str]) -> bool:
    rid = _row_id(row)
    label = _norm(_row_label(row))
    return (rid is not None and rid in ids) or (label and label in labels)


def _row_visible(row: dict[str, Any], ids: set[Any], labels: set[str]) -> bool:
    rid = _row_id(row)
    label = _norm(_row_label(row))
    return (rid is not None and rid in ids) or (label and label in labels)


def score_selection(case: dict[str, Any], review: dict[str, Any]) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    issues: list[str] = []
    score = 0.0
    must_rows = []
    drop_rows = []
    for section in ("experience", "projects"):
        must_rows.extend({**row, "section": section} for row in _case_rows(case, "mustKeep", section))
        drop_rows.extend({**row, "section": section} for row in _case_rows(case, "shouldDrop", section))

    def must_predicate(row):
        sets = _selection_sets(review, row["section"])
        return not _row_matches(row, sets["removed_ids"] | sets["drop_ids"], sets["removed_labels"])

    def drop_predicate(row):
        sets = _selection_sets(review, row["section"])
        return _row_matches(row, sets["removed_ids"] | sets["drop_ids"], sets["removed_labels"])

    pts, cks, iss = _score_fraction(
        name="mustKeep",
        items=must_rows,
        max_score=18,
        predicate=must_predicate,
        missing_message=lambda row: f"Missing or dropped must-keep {row['section']}: {_row_label(row)}.",
    )
    score += pts
    checks.extend(cks)
    issues.extend(iss)

    pts, cks, iss = _score_fraction(
        name="shouldDrop",
        items=drop_rows,
        max_score=12,
        predicate=drop_predicate,
        missing_message=lambda row: f"Expected lower/removed {row['section']} was not explicitly dropped: {_row_label(row)}.",
    )
    score += pts
    checks.extend(cks)
    issues.extend(iss)
    return _section("Selection", score, SCORE_WEIGHTS["selection"], checks, issues)


def score_skills(case: dict[str, Any], review: dict[str, Any]) -> dict[str, Any]:
    expected = case.get("expected") if isinstance(case.get("expected"), dict) else {}
    strategy = review.get("strategy") if isinstance(review.get("strategy"), dict) else {}
    selection = review.get("selection") if isinstance(review.get("selection"), dict) else {}
    skills_blob = {
        "skillPreserve": strategy.get("skillPreserve") or [],
        "changedSkills": ((selection.get("changedRows") or {}).get("skills") or []),
        "warnings": review.get("warningsByCategory") or {},
        "tailorAssist": review.get("tailorAssist") or {},
    }
    prominent_blob = {
        "skillPreserve": strategy.get("skillPreserve") or [],
        "jobPriorityTerms": ((review.get("tailorAssist") or {}).get("jobPriorityTerms") or []),
    }
    preserve = _as_list(expected.get("skillsToPreserve"))
    deprioritize = _as_list(expected.get("skillsToDeprioritize"))
    score = 0.0
    checks: list[dict[str, Any]] = []
    issues: list[str] = []

    pts, cks, iss = _score_fraction(
        name="skillsToPreserve",
        items=preserve,
        max_score=10,
        predicate=lambda term: _contains(skills_blob, term),
        missing_message=lambda term: f"Preserve skill not surfaced: {term}.",
    )
    score += pts
    checks.extend(cks)
    issues.extend(iss)

    pts, cks, iss = _score_fraction(
        name="skillsToDeprioritize",
        items=deprioritize,
        max_score=5,
        predicate=lambda term: not _contains(prominent_blob, term),
        missing_message=lambda term: f"Deprioritized skill still prominent: {term}.",
    )
    score += pts
    checks.extend(cks)
    issues.extend(iss)
    return _section("Skills", score, SCORE_WEIGHTS["skills"], checks, issues)


def score_warnings(case: dict[str, Any], review: dict[str, Any]) -> dict[str, Any]:
    expected = case.get("expected") if isinstance(case.get("expected"), dict) else {}
    terms = _as_list(expected.get("unsupportedWarnings"))
    strategy = review.get("strategy") if isinstance(review.get("strategy"), dict) else {}
    alignment = review.get("alignment") if isinstance(review.get("alignment"), dict) else {}
    surfaced_blob = {
        "warnings": review.get("warningsByCategory") or {},
        "claimRules": strategy.get("claimRules") or [],
        "alignmentUnsupported": alignment.get("unsupportedTerms") or [],
        "gapSignals": strategy.get("gapSignals") or [],
        "tailorAssist": review.get("tailorAssist") or {},
    }
    supported_blob = {
        "supportedSignals": strategy.get("supportedSignals") or [],
        "jobPriorityTerms": ((review.get("tailorAssist") or {}).get("jobPriorityTerms") or []),
    }
    score = 0.0
    checks: list[dict[str, Any]] = []
    issues: list[str] = []
    pts, cks, iss = _score_fraction(
        name="unsupportedWarningsSurfaced",
        items=terms,
        max_score=7,
        predicate=lambda term: _contains(surfaced_blob, term),
        missing_message=lambda term: f"Unsupported warning not surfaced: {term}.",
    )
    score += pts
    checks.extend(cks)
    issues.extend(iss)
    pts, cks, iss = _score_fraction(
        name="unsupportedWarningsNotClaimed",
        items=terms,
        max_score=3,
        predicate=lambda term: not _contains(supported_blob, term),
        missing_message=lambda term: f"Unsupported term appears as supported/priority proof: {term}.",
    )
    score += pts
    checks.extend(cks)
    issues.extend(iss)
    return _section("Warnings / Claims", score, SCORE_WEIGHTS["warningsClaims"], checks, issues)


def score_tailor_assist(case: dict[str, Any], review: dict[str, Any]) -> dict[str, Any]:
    expected = case.get("expected") if isinstance(case.get("expected"), dict) else {}
    assist = review.get("tailorAssist") if isinstance(review.get("tailorAssist"), dict) else {}
    should_mention = _as_list(expected.get("tailorAssistShouldMention"))
    should_not = _as_list(expected.get("tailorAssistShouldNotMention"))
    score = 0.0
    checks: list[dict[str, Any]] = []
    issues: list[str] = []
    pts, cks, iss = _score_fraction(
        name="tailorAssistShouldMention",
        items=should_mention,
        max_score=9,
        predicate=lambda term: _contains(assist, term),
        missing_message=lambda term: f"Tailor Assist missing expected idea: {term}.",
    )
    score += pts
    checks.extend(cks)
    issues.extend(iss)
    pts, cks, iss = _score_fraction(
        name="tailorAssistShouldNotMention",
        items=should_not,
        max_score=6,
        predicate=lambda term: not _contains(assist, term),
        missing_message=lambda term: f"Tailor Assist contains off-lane idea: {term}.",
    )
    score += pts
    checks.extend(cks)
    issues.extend(iss)
    return _section("Tailor Assist", score, SCORE_WEIGHTS["tailorAssist"], checks, issues)


def score_summary_tone(case: dict[str, Any], review: dict[str, Any]) -> dict[str, Any]:
    expected = case.get("expected") if isinstance(case.get("expected"), dict) else {}
    summary = expected.get("summaryTone") if isinstance(expected.get("summaryTone"), dict) else {}
    avoid = _as_list(summary.get("avoidPhrases"))
    text_blob = {
        "tailorAssist": review.get("tailorAssist") or {},
        "changeReasons": review.get("changeReasons") or [],
        "quality": review.get("quality") or {},
    }
    score, checks, issues = _score_fraction(
        name="avoidPhrases",
        items=avoid,
        max_score=SCORE_WEIGHTS["summaryTone"],
        predicate=lambda phrase: not _contains(text_blob, phrase),
        missing_message=lambda phrase: f"Avoid phrase appears in available text: {phrase}.",
    )
    return _section("Summary Tone", score, SCORE_WEIGHTS["summaryTone"], checks, issues)


def grade_for_score(score: float) -> str:
    if score >= 85:
        return "strong"
    if score >= 70:
        return "usable"
    if score >= 55:
        return "needs review"
    return "not usable"


def score_tailor_run(case: dict[str, Any], review: dict[str, Any]) -> dict[str, Any]:
    sections = {
        "strategy": score_strategy(case, review),
        "selection": score_selection(case, review),
        "skills": score_skills(case, review),
        "warningsClaims": score_warnings(case, review),
        "tailorAssist": score_tailor_assist(case, review),
        "summaryTone": score_summary_tone(case, review),
    }
    total = round(sum(section["score"] for section in sections.values()), 2)
    top_issues = []
    for section in sections.values():
        top_issues.extend(section.get("issues") or [])
    return {
        "schemaVersion": 1,
        "rubricVersion": RUBRIC_VERSION,
        "scoreWeights": dict(SCORE_WEIGHTS),
        "caseId": case.get("id"),
        "role": case.get("role"),
        "company": case.get("company"),
        "scoredAtUtc": datetime.now(timezone.utc).isoformat(),
        "totalScore": total,
        "grade": grade_for_score(total),
        "sections": sections,
        "topIssues": _dedupe(top_issues, limit=12),
        "humanReview": {
            "humanScore_0_to_10": None,
            "humanNotes": "",
            "resumeFeelsSendable": None,
        },
    }


def format_score_report(result: dict[str, Any]) -> str:
    lines = [
        f"{result.get('role') or result.get('caseId')}: {result.get('totalScore')}/100 {result.get('grade')}",
    ]
    labels = [
        ("strategy", "Strategy"),
        ("selection", "Selection"),
        ("skills", "Skills"),
        ("warningsClaims", "Warnings"),
        ("tailorAssist", "Tailor Assist"),
        ("summaryTone", "Summary Tone"),
    ]
    sections = result.get("sections") if isinstance(result.get("sections"), dict) else {}
    for key, label in labels:
        section = sections.get(key) if isinstance(sections.get(key), dict) else {}
        lines.append(f"{label}: {section.get('score', 0)}/{section.get('max', 0)}")
    issues = result.get("topIssues") if isinstance(result.get("topIssues"), list) else []
    if issues:
        lines.append("")
        lines.append("Top issues:")
        for issue in issues[:8]:
            lines.append(f"- {issue}")
    return "\n".join(lines)


def save_score(result: dict[str, Any], run_label: str, runs_dir: Path = DEFAULT_RUNS_DIR) -> Path:
    safe_label = re.sub(r"[^a-zA-Z0-9_.-]+", "_", str(run_label or "").strip()).strip("_")
    if not safe_label:
        raise ValueError("--save-run requires a non-empty label")
    case_id = re.sub(r"[^a-zA-Z0-9_.-]+", "_", str(result.get("caseId") or "case")).strip("_")
    out_dir = runs_dir / safe_label
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{case_id}.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path


def _section_score_summary(result: dict[str, Any]) -> dict[str, float]:
    sections = result.get("sections") if isinstance(result.get("sections"), dict) else {}
    out: dict[str, float] = {}
    for key, section in sections.items():
        if isinstance(section, dict):
            out[key] = float(section.get("score") or 0)
    return out


def write_debug_score(
    result: dict[str, Any],
    *,
    latest_path: Path = DEFAULT_LATEST_SCORE,
    history_path: Path = DEFAULT_HISTORY_LOG,
) -> tuple[Path, Path]:
    latest_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.parent.mkdir(parents=True, exist_ok=True)
    latest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    history_row = {
        "scoredAtUtc": result.get("scoredAtUtc"),
        "rubricVersion": result.get("rubricVersion"),
        "caseId": result.get("caseId"),
        "role": result.get("role"),
        "company": result.get("company"),
        "totalScore": result.get("totalScore"),
        "grade": result.get("grade"),
        "sectionScores": _section_score_summary(result),
        "topIssues": (result.get("topIssues") or [])[:5],
        "inputs": result.get("inputs") or {},
    }
    with history_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(history_row, ensure_ascii=False) + "\n")
    return latest_path, history_path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Score one Tailor AI review snapshot against an eval fixture case.")
    parser.add_argument("--case", required=True, help="Eval case id from tailor_eval.json")
    parser.add_argument("--fixture", default=str(DEFAULT_FIXTURE), help="Path to tailor_eval.json")
    parser.add_argument("--review", default=str(DEFAULT_REVIEW), help="Path to tailor_06_review.json")
    parser.add_argument("--save-run", default="", help="Optional run label to save JSON score output")
    parser.add_argument(
        "--no-debug-write",
        action="store_true",
        help="Do not write tailor_07_eval_score.json or append tailor_eval_scores.jsonl",
    )
    args = parser.parse_args(argv)

    fixture_path = Path(args.fixture)
    review_path = Path(args.review)
    case = load_eval_case(fixture_path, args.case)
    review = load_json(review_path)
    result = score_tailor_run(case, review)
    result["inputs"] = {
        "fixture": str(fixture_path),
        "review": str(review_path),
    }
    print(format_score_report(result))
    if not args.no_debug_write:
        latest_path, history_path = write_debug_score(result)
        print("")
        print(f"Wrote latest score JSON: {latest_path}")
        print(f"Appended score history: {history_path}")
    if args.save_run:
        out_path = save_score(result, args.save_run)
        print("")
        print(f"Saved score JSON: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
