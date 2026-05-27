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
    apply_archetype_project_pruning_guard,
    apply_strategy_selection_guard,
    enforce_project_quality_repairs,
    enforce_strategy_skill_preserve,
    enforce_surviving_project_quality_cleanup,
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


def test_surviving_project_cleanup_removes_placeholder_even_when_not_opened_for_repair():
    stage = {
        "edits": {
            "summarySection": {"summary": "Data Engineer with Python and SQL project experience."},
            "removedProjectIds": [17],
        }
    }

    repaired = enforce_surviving_project_quality_cleanup(stage, _resume_with_placeholder_project())
    project_edits = repaired["edits"]["projects"]
    centi = next(row for row in project_edits if row["id"] == 9)

    assert "Made it secure n stuff" not in centi["description"]
    assert "Built account aggregation" in centi["description"]
    assert all(row.get("id") != 17 for row in project_edits)
    assert "Quality guard removed placeholder bullets from surviving projects:9." in repaired["warnings"]


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


def test_strategy_skill_preserve_restores_existing_supported_rows():
    resume_mid = {
        "skills": [
            {"id": 1, "name": "AWS (EC2)", "category": "Data Tools"},
            {"id": 2, "name": "REST API Design", "category": "Focus Areas"},
            {"id": 3, "name": "Python", "category": "Languages"},
        ]
    }
    stage = {"edits": {"skills": [{"id": 3, "name": "Python", "category": "Languages"}]}}
    tailor_context = {"jobStrategy": {"skillPreserve": ["AWS EC2", "REST API Design"]}}

    repaired = enforce_strategy_skill_preserve(stage, resume_mid, tailor_context)
    repaired_ids = [row["id"] for row in repaired["edits"]["skills"]]

    assert repaired_ids == [3, 1, 2]
    assert any("Strategy skills guard restored 2 preserved skill row(s)" in w for w in repaired["warnings"])


def test_strategy_skill_preserve_does_not_restore_deprioritized_rows():
    resume_mid = {
        "skills": [
            {"id": 1, "name": "Python", "category": "Languages"},
            {"id": 2, "name": "Customer Service", "category": "Focus Areas"},
        ]
    }
    stage = {"edits": {"skills": [{"id": 1, "name": "Python", "category": "Languages"}]}}
    tailor_context = {"jobStrategy": {"skillPreserve": [], "skillDeprioritize": ["Customer Service"]}}

    repaired = enforce_strategy_skill_preserve(stage, resume_mid, tailor_context)

    assert repaired is stage


def test_strategy_selection_guard_keeps_service_rows_for_customer_archetype():
    narrative = {
        "dropExperience": [7, 8],
        "keepExperience": [5],
        "rewriteExperience": [],
        "selectionRationale": [],
    }
    resume_data = {
        "experience": [
            {"id": 5, "title": "Software Engineering Intern", "company": "BitGo"},
            {
                "id": 7,
                "title": "Server",
                "company": "Bar Louie",
                "description": "Served guests and coordinated with kitchen and bar teams.",
            },
            {
                "id": 8,
                "title": "Host / Expo",
                "company": "Hawkers",
                "description": "Managed customer communication and delivery team coordination.",
            },
        ]
    }
    tailor_context = {
        "jobStrategy": {
            "persona": "sales_growth",
            "roleArchetype": "financial_customer_education",
        }
    }

    updated, debug = apply_strategy_selection_guard(narrative, resume_data, tailor_context)

    assert debug["strategySelectionGuard"] is True
    assert updated["dropExperience"] == []
    assert updated["keepExperience"] == [5, 7, 8]
    assert updated["rewriteExperience"] == [7, 8]


def _resume_with_many_projects():
    return {
        "projects": [
            {"id": 9, "title": "Centi"},
            {"id": 10, "title": "Taylor.io"},
            {"id": 12, "title": "SecureScape"},
            {"id": 17, "title": "ShelfVision"},
        ],
        "experience": [
            {"id": 7, "title": "Server", "description": "Served guests."},
            {"id": 8, "title": "Host", "description": "Welcomed guests."},
        ],
    }


def _project_section_scores():
    return {
        "rowsPerSectionRanked": {
            "projects": [
                {"id": 10, "score": 9, "hits": 3, "matchedTerms": ["openai"]},
                {"id": 9, "score": 7, "hits": 2, "matchedTerms": ["postgresql"]},
                {"id": 17, "score": 5, "hits": 1, "matchedTerms": ["metrics"]},
                {"id": 12, "score": 1, "hits": 0, "matchedTerms": []},
            ]
        }
    }


def test_archetype_pruning_drops_all_projects_for_hospitality():
    narrative = {
        "keepProjects": [9, 10],
        "maybeProjects": [12, 17],
        "dropProjects": [],
        "heroProjects": [9],
        "rewriteProjects": [9],
    }
    tailor_context = {"jobStrategy": {"roleArchetype": "hospitality_customer_service"}}

    updated, debug = apply_archetype_project_pruning_guard(
        narrative,
        _resume_with_many_projects(),
        tailor_context,
        _project_section_scores(),
    )

    assert debug["archetypeProjectPruning"] is True
    assert updated["keepProjects"] == []
    assert updated["maybeProjects"] == []
    assert set(updated["dropProjects"]) == {9, 10, 12, 17}
    assert updated["layoutSectionVisibility"]["projects"] is False


def test_archetype_pruning_limits_financial_customer_project_to_one():
    narrative = {"keepProjects": [9, 10], "maybeProjects": [12, 17], "dropProjects": []}
    tailor_context = {"jobStrategy": {"roleArchetype": "financial_customer_education"}}

    updated, debug = apply_archetype_project_pruning_guard(
        narrative,
        _resume_with_many_projects(),
        tailor_context,
        _project_section_scores(),
    )

    assert debug["projectBudget"] == 1
    assert updated["keepProjects"] == [10]
    assert set(updated["dropProjects"]) == {9, 12, 17}
    assert updated["maybeProjects"] == []


def test_archetype_pruning_limits_functional_analyst_to_two_projects():
    narrative = {"keepProjects": [9, 10, 12], "maybeProjects": [17], "dropProjects": []}
    tailor_context = {"jobStrategy": {"roleArchetype": "functional_analyst_bridge"}}

    updated, debug = apply_archetype_project_pruning_guard(
        narrative,
        _resume_with_many_projects(),
        tailor_context,
        _project_section_scores(),
    )

    assert debug["projectBudget"] == 2
    assert updated["keepProjects"] == [10, 9]
    assert set(updated["dropProjects"]) == {12, 17}


def test_archetype_pruning_allows_three_technical_projects():
    narrative = {"keepProjects": [9, 10, 12, 17], "maybeProjects": [], "dropProjects": []}
    tailor_context = {"jobStrategy": {"roleArchetype": "full_stack_product_engineering"}}

    updated, debug = apply_archetype_project_pruning_guard(
        narrative,
        _resume_with_many_projects(),
        tailor_context,
        _project_section_scores(),
    )

    assert debug["projectBudget"] == 3
    assert updated["keepProjects"] == [10, 9, 17]
    assert updated["dropProjects"] == [12]


def test_full_stack_product_pruning_boosts_ai_native_full_stack_project():
    resume_data = {
        "projects": [
            {
                "id": 9,
                "title": "Centi",
                "description": "React dashboards with FastAPI services, PostgreSQL schemas, user account workflows, and auth.",
                "tech_stack": ["React", "FastAPI", "PostgreSQL"],
            },
            {
                "id": 10,
                "title": "Taylor.io",
                "description": "React editing interface with FastAPI backend services, PostgreSQL storage, OpenAI API content generation, and user preview workflows.",
                "tech_stack": ["React", "FastAPI", "PostgreSQL", "OpenAI API"],
            },
            {
                "id": 18,
                "title": "Tizirsso",
                "description": "Next.js and React portfolio UI with animated sections.",
                "tech_stack": ["Next.js", "React"],
            },
            {
                "id": 20,
                "title": "SentimentTrader",
                "description": "Python and SQL sentiment pipeline for analytics.",
                "tech_stack": ["Python", "SQL"],
            },
        ]
    }
    section_details = {
        "rowsPerSectionRanked": {
            "projects": [
                {"id": 9, "score": 5, "hits": 2, "matchedTerms": ["React"]},
                {"id": 10, "score": 3, "hits": 2, "matchedTerms": ["React"]},
                {"id": 18, "score": 6, "hits": 2, "matchedTerms": ["React"]},
                {"id": 20, "score": 6, "hits": 2, "matchedTerms": ["SQL"]},
            ]
        }
    }
    narrative = {"keepProjects": [9, 18, 20], "maybeProjects": [], "dropProjects": [10]}
    tailor_context = {"jobStrategy": {"roleArchetype": "full_stack_product_engineering"}}

    updated, debug = apply_archetype_project_pruning_guard(narrative, resume_data, tailor_context, section_details)

    assert 10 in updated["keepProjects"]
    assert updated["keepProjects"][0] == 10
    assert debug["projectScores"]["10"]["archetypeBonus"] > debug["projectScores"]["18"]["archetypeBonus"]


def test_ai_backend_pruning_prefers_openai_api_project_over_generic_full_stack():
    resume_data = {
        "projects": [
            {
                "id": 9,
                "title": "Centi",
                "description": "React dashboard with FastAPI backend and PostgreSQL account workflows.",
                "tech_stack": ["React", "FastAPI", "PostgreSQL"],
            },
            {
                "id": 10,
                "title": "Taylor.io",
                "description": "FastAPI backend with OpenAI API content generation, parsing workflows, React editing, and PostgreSQL storage.",
                "tech_stack": ["FastAPI", "OpenAI API", "React", "PostgreSQL"],
            },
        ]
    }
    section_details = {
        "rowsPerSectionRanked": {
            "projects": [
                {"id": 9, "score": 5, "hits": 2, "matchedTerms": ["FastAPI"]},
                {"id": 10, "score": 5, "hits": 2, "matchedTerms": ["FastAPI"]},
            ]
        }
    }
    narrative = {"keepProjects": [9], "maybeProjects": [10], "dropProjects": []}
    tailor_context = {"jobStrategy": {"roleArchetype": "ai_backend_integration"}}

    updated, debug = apply_archetype_project_pruning_guard(narrative, resume_data, tailor_context, section_details)

    assert updated["keepProjects"][0] == 10
    assert debug["projectScores"]["10"]["archetypeBonus"] > debug["projectScores"]["9"]["archetypeBonus"]
