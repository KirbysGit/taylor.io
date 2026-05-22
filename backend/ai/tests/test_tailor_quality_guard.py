import sys
import types


if "openai" not in sys.modules:
    openai_stub = types.ModuleType("openai")
    openai_stub.OpenAI = object
    sys.modules["openai"] = openai_stub


from backend.ai.prompt.prompt_builder import (
    build_stage_a_rewrite_focus,
    project_quality_repair_debug,
    project_quality_repair_ids_for_narrative,
)
from backend.ai.job_tailor_service import (
    enforce_project_quality_repairs,
    focus_adjacent_project_selection_for_strong_retarget,
)


def _resume_with_placeholder_project():
    return {
        "summary": {"summary": "Engineer with backend and data project experience."},
        "experience": [],
        "projects": [
            {
                "id": 9,
                "title": "Centi - Personal Finance App",
                "description": (
                    "Built account aggregation and transaction tracking dashboards.\n"
                    "Designed FastAPI services and PostgreSQL schemas for Plaid integrations.\n"
                    "Made it secure n stuff."
                ),
                "tech_stack": ["FastAPI", "React", "PostgreSQL", "Plaid API"],
            },
            {
                "id": 17,
                "title": "ShelfVision",
                "description": "Benchmarked object detection models and tracked SKU-level metrics.",
                "tech_stack": ["Python", "PyTorch"],
            },
        ],
        "skills": [],
    }


def test_quality_guard_flags_casual_placeholder_bullet_on_non_hero_project():
    narrative = {
        "heroProjects": [17],
        "rewriteProjects": [17],
        "keepProjects": [17],
        "maybeProjects": [9],
        "peripheralProjects": [9],
        "dropProjects": [],
    }

    assert project_quality_repair_ids_for_narrative(_resume_with_placeholder_project(), narrative) == [9]


def test_quality_guard_flags_placeholder_bullet_on_promoted_keep_project():
    narrative = {
        "heroProjects": [17],
        "rewriteProjects": [17],
        "keepProjects": [17, 9],
        "maybeProjects": [],
        "peripheralProjects": [],
        "dropProjects": [],
    }

    assert project_quality_repair_ids_for_narrative(_resume_with_placeholder_project(), narrative) == [9]


def test_stage_a_opens_placeholder_project_for_thin_bullet_repair():
    narrative = {
        "heroProjects": [17],
        "rewriteProjects": [17],
        "keepProjects": [17],
        "maybeProjects": [9],
        "peripheralProjects": [9],
        "dropProjects": [],
    }

    focus = build_stage_a_rewrite_focus(_resume_with_placeholder_project(), narrative, {})

    assert focus["allowedProjectEditIds"] == [17, 9]
    assert focus["thinBulletRepairProjectIds"] == [9]


def test_quality_guard_debug_names_repaired_project():
    narrative = {
        "heroProjects": [17],
        "rewriteProjects": [17],
        "maybeProjects": [9],
        "peripheralProjects": [9],
    }

    debug = project_quality_repair_debug(_resume_with_placeholder_project(), narrative)

    assert debug["weakBulletRepair"] is True
    assert debug["repairProjectIds"] == [9]
    assert debug["repairProjectTitles"] == ["Centi - Personal Finance App"]


def test_one_page_maybe_project_is_not_opened_when_it_would_be_dropped():
    narrative = {
        "heroProjects": [17],
        "rewriteProjects": [17],
        "keepProjects": [17],
        "maybeProjects": [9],
        "peripheralProjects": [9],
        "dropProjects": [],
    }

    ids = project_quality_repair_ids_for_narrative(
        _resume_with_placeholder_project(),
        narrative,
        {"length_target": "one_page"},
    )

    assert ids == []


def test_quality_repair_fallback_appends_missing_project_edit():
    narrative = {
        "heroProjects": [17],
        "rewriteProjects": [17],
        "keepProjects": [17],
        "maybeProjects": [9],
        "peripheralProjects": [9],
    }
    stage = {
        "edits": {
            "projects": [
                {
                    "id": 17,
                    "description": "• Benchmarked object detection models and tracked SKU-level metrics.",
                }
            ]
        }
    }

    repaired = enforce_project_quality_repairs(stage, _resume_with_placeholder_project(), narrative, {})
    project_edits = repaired["edits"]["projects"]
    centi = next(row for row in project_edits if row["id"] == 9)

    assert "Made it secure n stuff" not in centi["description"]
    assert "Designed FastAPI services" in centi["description"]
    assert "Quality guard removed placeholder bullets from projects:9." in repaired["warnings"]


def test_strong_adjacent_retarget_focuses_visible_projects():
    narrative = {
        "alignmentMode": "adjacent",
        "keepProjects": [17],
        "rewriteProjects": [17],
        "heroProjects": [17],
        "maybeProjects": [9, 10, 12, 18, 20],
        "dropProjects": [],
        "transferableEvidence": [
            {"section": "projects", "id": 9, "label": "Centi", "themes": [{"theme": "compliance / standards", "terms": ["secure"]}, {"theme": "metrics / reporting", "terms": ["dashboard"]}, {"theme": "workflow / automation", "terms": ["processing"]}]},
            {"section": "projects", "id": 10, "label": "Taylor.io", "themes": [{"theme": "workflow / automation", "terms": ["automated"]}]},
            {"section": "projects", "id": 12, "label": "SecureScape", "themes": [{"theme": "coordination / communication", "terms": ["communication"]}]},
            {"section": "projects", "id": 18, "label": "Tizirsso", "themes": [{"theme": "coordination / communication", "terms": ["team"]}]},
            {"section": "projects", "id": 20, "label": "SentimentTrader", "themes": [{"theme": "metrics / reporting", "terms": ["analytics"]}, {"theme": "workflow / automation", "terms": ["pipeline"]}]},
        ],
    }
    payload = {"style_preferences": {"rewrite_freedom": "strong", "length_target": "balanced"}}

    updated, debug = focus_adjacent_project_selection_for_strong_retarget(narrative, payload)

    assert debug["strongAdjacentProjectFocus"] is True
    assert updated["keepProjects"] == [17, 9, 20]
    assert updated["maybeProjects"] == []
    assert set(updated["dropProjects"]) == {10, 12, 18}
