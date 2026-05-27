import json
import sys
import tempfile
import types
from pathlib import Path


if "openai" not in sys.modules:
    openai_stub = types.ModuleType("openai")
    openai_stub.OpenAI = object
    sys.modules["openai"] = openai_stub

from backend.ai.evaluation.score_tailor_run import (
    load_eval_case,
    main,
    score_extraction_diagnostic,
    score_selection,
    score_skills,
    score_strategy,
    score_tailor_assist,
    score_tailor_run,
    score_warnings,
    write_debug_score,
)


def _case():
    return {
        "id": "demo_full_stack",
        "role": "Full Stack Developer",
        "company": "ExampleCo",
        "expected": {
            "lane": "technical",
            "persona": "technical_engineering",
            "roleArchetype": "full_stack_product_engineering",
            "mustKeep": {
                "experience": [{"id": 5, "label": "BitGo Software Engineering Intern"}],
                "projects": [{"id": 10, "label": "Taylor.io"}],
            },
            "shouldDrop": {
                "experience": [{"id": 7, "label": "Bar Louie Server"}],
                "projects": [{"id": 20, "label": "SentimentTrader"}],
            },
            "skillsToPreserve": ["REST API Design", "AWS (EC2)"],
            "skillsToSuggestOrReframe": ["Backend/API Development"],
            "skillsToDeprioritize": ["Customer Service"],
            "unsupportedWarnings": ["GraphQL", "CI/CD"],
            "tailorAssistShouldMention": ["backend APIs", "React"],
            "tailorAssistShouldNotMention": ["customer-facing growth"],
            "summaryTone": {"avoidPhrases": ["dynamic professional"]},
            "expectedExtraction": {
                "priorityShouldInclude": ["React", "backend APIs", "GraphQL"],
                "priorityShouldExclude": ["benefits"],
                "contextTerms": ["healthcare"],
                "unsupportedExactTools": ["GraphQL"],
                "genericSuppressed": ["solutions"],
            },
        },
    }


def _review():
    return {
        "strategy": {
            "lane": "technical",
            "persona": "technical_engineering",
            "roleArchetype": "full_stack_product_engineering",
            "claimRules": ["Do not claim GraphQL or CI/CD unless evidenced."],
            "skillPreserve": ["REST API Design", "AWS EC2", "React"],
            "skillReframeTargets": ["Backend/API Development"],
            "supportedSignals": ["React", "backend APIs"],
            "gapSignals": ["GraphQL"],
        },
        "alignment": {"unsupportedTerms": ["GraphQL", "CI/CD"]},
        "selection": {
            "narrativePlan": {
                "keepExperience": [5],
                "dropExperience": [7],
                "keepProjects": [10],
                "dropProjects": [20],
            },
            "changedRows": {
                "experience": [{"id": 5, "label": "BitGo Software Engineering Intern"}],
                "projects": [{"id": 10, "label": "Taylor.io"}],
                "skills": [{"id": 60, "label": "REST API Design"}],
            },
            "removedRows": {
                "experience": [{"id": 7, "label": "Bar Louie Server"}],
                "projects": [{"id": 20, "label": "SentimentTrader"}],
            },
        },
        "warningsByCategory": {"claims_or_gaps": ["GraphQL and CI/CD are not directly evidenced."]},
        "tailorAssist": {
            "paragraph": "I focused on backend APIs and React product work.",
            "details": [{"title": "Before you send", "items": ["GraphQL is not directly evidenced."]}],
            "jobPriorityTerms": ["React", "backend APIs"],
        },
        "changeReasons": [],
        "quality": {},
    }


def _extraction():
    return {
        "priority_keywords": [
            {"term": "React", "signalType": "tool_platform"},
            {"term": "backend APIs", "signalType": "role_capability"},
            {"term": "GraphQL", "signalType": "tool_platform"},
        ],
        "top_keywords": [
            {"term": "React", "signalType": "tool_platform"},
            {"term": "healthcare", "signalType": "context"},
        ],
        "suppressed_terms": [
            {"term": "solutions", "signalType": "generic_fragment"},
            {"term": "benefits", "signalType": "noise"},
        ],
        "top_known_phrases": [{"term": "backend APIs"}],
        "top_stack_terms": {"concrete": [{"term": "GraphQL"}], "capability": []},
    }


def test_load_eval_case_finds_case_in_list_fixture():
    with tempfile.TemporaryDirectory(dir=Path.cwd()) as tmp:
        fixture = Path(tmp) / "tailor_eval.json"
        fixture.write_text(json.dumps([_case()]), encoding="utf-8")

        case = load_eval_case(fixture, "demo_full_stack")

    assert case["company"] == "ExampleCo"


def test_strategy_scores_exact_and_missing_fields():
    exact = score_strategy(_case(), _review())
    missing = score_strategy(_case(), {"strategy": {}})

    assert exact["score"] == 25
    assert missing["score"] == 0
    assert any("rerun this case" in issue for issue in missing["issues"])


def test_selection_scores_must_keep_and_should_drop_ids():
    section = score_selection(_case(), _review())

    assert section["score"] == 30
    assert not section["issues"]


def test_selection_requires_should_drop_rows_to_be_explicitly_dropped():
    review = _review()
    review["selection"]["narrativePlan"]["dropProjects"] = []
    review["selection"]["removedRows"]["projects"] = []

    section = score_selection(_case(), review)

    assert section["score"] < 30
    assert any("was not explicitly dropped" in issue for issue in section["issues"])


def test_skills_score_splits_preserve_reframe_and_deprioritize():
    section = score_skills(_case(), _review())

    assert section["score"] == 15
    assert not section["issues"]


def test_skills_score_keeps_v2_fixture_compatibility_without_reframe_targets():
    case = _case()
    case["expected"].pop("skillsToSuggestOrReframe")

    section = score_skills(case, _review())

    assert section["score"] == 15
    assert not section["issues"]


def test_warnings_score_surfaces_unsupported_terms_and_avoids_claiming_them():
    section = score_warnings(_case(), _review())

    assert section["score"] == 10
    assert not section["issues"]


def test_extraction_diagnostic_scores_expected_terms_and_suppression():
    section = score_extraction_diagnostic(_case(), _extraction())

    assert section["score"] == 20
    assert not section["issues"]


def test_extraction_diagnostic_surfaces_missing_priority_terms():
    extraction = _extraction()
    extraction["priority_keywords"] = [{"term": "React", "signalType": "tool_platform"}]
    extraction["top_keywords"] = []
    extraction["top_known_phrases"] = []
    extraction["top_stack_terms"] = {"concrete": [], "capability": []}

    section = score_extraction_diagnostic(_case(), extraction)

    assert section["score"] < 20
    assert any("missing expected priority term" in issue.lower() for issue in section["issues"])


def test_tailor_assist_scores_positive_and_negative_language():
    section = score_tailor_assist(_case(), _review())

    assert section["score"] == 15
    assert not section["issues"]


def test_score_tailor_run_returns_total_and_human_review_stub():
    result = score_tailor_run(_case(), _review())

    assert result["totalScore"] == 100
    assert result["grade"] == "strong"
    assert result["rubricVersion"] == 3
    assert result["scoreWeights"]["selection"] == 30
    assert result["diagnostics"]["extraction"]["score"] == 0
    assert result["humanReview"]["humanScore_0_to_10"] is None


def test_write_debug_score_writes_latest_and_history():
    result = score_tailor_run(_case(), _review())
    with tempfile.TemporaryDirectory(dir=Path.cwd()) as tmp:
        latest = Path(tmp) / "tailor_07_eval_score.json"
        history = Path(tmp) / "tailor_eval_scores.jsonl"

        latest_path, history_path = write_debug_score(result, latest_path=latest, history_path=history)

        saved = json.loads(latest_path.read_text(encoding="utf-8"))
        history_rows = [json.loads(line) for line in history_path.read_text(encoding="utf-8").splitlines()]

    assert saved["caseId"] == "demo_full_stack"
    assert history_rows[0]["caseId"] == "demo_full_stack"
    assert history_rows[0]["totalScore"] == 100
    assert history_rows[0]["rubricVersion"] == 3
    assert "diagnosticScores" in history_rows[0]


def test_cli_smoke_prints_and_saves_score(capsys, monkeypatch):
    original_cwd = Path.cwd()
    with tempfile.TemporaryDirectory(dir=Path.cwd()) as tmp:
        tmp_path = Path(tmp)
        fixture = tmp_path / "tailor_eval.json"
        review = tmp_path / "tailor_06_review.json"
        fixture.write_text(json.dumps([_case()]), encoding="utf-8")
        extraction = tmp_path / "tailor_00_extraction.json"
        review.write_text(json.dumps(_review()), encoding="utf-8")
        extraction.write_text(json.dumps(_extraction()), encoding="utf-8")
        monkeypatch.chdir(tmp_path)

        code = main(
            [
                "--case",
                "demo_full_stack",
                "--fixture",
                str(fixture),
                "--review",
                str(review),
                "--extraction",
                str(extraction),
                "--save-run",
                "unit_test_run",
            ]
        )
        monkeypatch.chdir(original_cwd)

    captured = capsys.readouterr()
    assert code == 0
    assert "Full Stack Developer: 100.0/100 strong" in captured.out
    assert "Wrote latest score JSON" in captured.out
    assert "Appended score history" in captured.out
    assert "Saved score JSON" in captured.out
