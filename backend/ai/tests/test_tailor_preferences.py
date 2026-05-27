import sys
import types


if "openai" not in sys.modules:
    openai_stub = types.ModuleType("openai")
    openai_stub.OpenAI = object
    sys.modules["openai"] = openai_stub


from backend.ai.narrative import narrative_brief as narrative_module
from backend.ai.prompt.preferences import (
    CUSTOM_INSTRUCTIONS_MAX_CHARS,
    build_tailor_preferences_block,
    normalize_tailor_preferences,
)
from backend.ai.prompt.prompt_builder import build_pass_a_user, build_pass_b_user
from backend.ai.post_processing.resume_tailor_report import build_tailor_explanation


def _resume_data():
    return {
        "summary": {"summary": "Backend engineer building APIs and data systems."},
        "experience": [
            {
                "id": 1,
                "title": "Software Engineer",
                "company": "Acme",
                "description": "Built Python APIs and PostgreSQL-backed workflows.",
                "skills": "Python, PostgreSQL",
            }
        ],
        "projects": [
            {
                "id": 2,
                "title": "Pipeline Tool",
                "description": "Built ETL automation with Python.",
                "tech_stack": ["Python"],
            }
        ],
        "skills": [{"id": 3, "name": "Python", "category": "Languages"}],
    }


def _payload(style_preferences=None):
    return {
        "job_description": "We need a backend engineer to build APIs, data systems, and automation workflows.",
        "resume_data": _resume_data(),
        "template_name": "classic",
        "target_role": "Backend Engineer",
        "company": "ExampleCo",
        "style_preferences": style_preferences,
        "strict_truth": True,
    }


def _tailor_context():
    return {
        "targetRole": "Backend Engineer",
        "keywords": [{"term": "backend APIs"}, {"term": "automation"}],
        "resumeHits": ["Python", "PostgreSQL"],
        "resumeGaps": [],
        "activeDomains": ["backend"],
    }


def _section_details():
    return {
        "rowsPerSectionRanked": {
            "experience": [{"id": 1, "jdKeywordHits": 3}],
            "projects": [{"id": 2, "jdKeywordHits": 2}],
        }
    }


def _narrative():
    return {
        "candidateAngle": "Backend engineer focused on APIs and data workflows.",
        "primaryStory": ["Python APIs", "data automation"],
        "summaryGoal": "Open on backend API and data workflow evidence.",
        "skillsStrategy": ["Lead with evidenced backend tools."],
        "sectionStrategy": {},
        "heroExperience": [1],
        "heroProjects": [2],
        "supportingProjects": [],
        "peripheralProjects": [],
        "rewriteGoals": ["Land Acme as backend API work."],
        "avoid": ["No unsupported tools."],
    }


def test_normalize_tailor_preferences_defaults_and_invalid_values():
    prefs = normalize_tailor_preferences(
        {
            "focus": "nonsense",
            "tone": "concise",
            "length_target": "one-page",
            "rewrite_freedom": "LOUD",
            "custom_instructions": "  Emphasize backend APIs.  ",
        }
    )

    assert prefs["focus"] == "balanced"
    assert prefs["tone"] == "concise"
    assert prefs["length_target"] == "one_page"
    assert prefs["rewrite_freedom"] == "balanced"
    assert prefs["custom_instructions"] == "Emphasize backend APIs."


def test_normalize_tailor_preferences_trims_custom_instructions():
    prefs = normalize_tailor_preferences({"custom_instructions": "x" * (CUSTOM_INSTRUCTIONS_MAX_CHARS + 20)})

    assert len(prefs["custom_instructions"]) == CUSTOM_INSTRUCTIONS_MAX_CHARS


def test_preferences_block_includes_core_controls_and_truth_guardrail():
    block = build_tailor_preferences_block(
        {
            "focus": "technical",
            "tone": "concise",
            "length_target": "one_page",
            "rewrite_freedom": "strong",
            "custom_instructions": "Emphasize Python backend APIs.",
        }
    )

    assert "length_target: one_page" in block
    assert "rewrite_freedom: strong" in block
    assert "Emphasize Python backend APIs." in block
    assert "truth rules" in block


def test_pass_a_and_pass_b_prompts_include_preferences_and_strict_truth():
    prefs = {
        "focus": "technical",
        "tone": "concise",
        "length_target": "one_page",
        "rewrite_freedom": "strong",
        "custom_instructions": "Emphasize backend APIs.",
    }
    payload = _payload(prefs)
    tailor_context = _tailor_context()
    tailor_context["jobStrategy"] = {
        "persona": "technical_engineering",
        "roleArchetype": "full_stack_product_engineering",
        "skillPreserve": ["REST API Design", "AWS EC2"],
        "skillReframeTargets": ["Backend/API Development"],
        "skillDeprioritize": ["Customer Service"],
        "summaryGuardrails": ["Do not overclaim unsupported tools."],
        "claimRules": ["Never add TypeScript unless it appears in resume evidence."],
    }
    pass_a = build_pass_a_user(
        payload,
        tailor_context,
        _section_details(),
        ["Build backend APIs."],
        narrativeBrief=_narrative(),
    )
    pass_b = build_pass_b_user(
        payload,
        tailor_context,
        ["Build backend APIs."],
        _narrative(),
        {"skillRowCount": 1},
    )

    assert "length_target: one_page" in pass_a
    assert "rewrite_freedom: strong" in pass_a
    assert "custom_instructions: Emphasize backend APIs." in pass_a
    assert "strict_truth (from request): True" in pass_a
    assert "length_target: one_page" in pass_b
    assert "rewrite_freedom: strong" in pass_b
    assert "jobStrategySkills" in pass_b
    assert "REST API Design" in pass_b
    assert "AWS EC2" in pass_b
    assert "reframeTargets" in pass_b
    assert "Backend/API Development" in pass_b


def test_narrative_prompt_includes_preferences(monkeypatch):
    captured = {}

    def fake_chat_completion(*, system_prompt, user_prompt, temperature):
        captured["user_prompt"] = user_prompt
        return (
            '{"candidateAngle":"Backend engineer focused on APIs.","primaryStory":["Python APIs","data workflows"],'
            '"summaryGoal":"Open on backend APIs.","skillsStrategy":["Lead with Python."],'
            '"sectionStrategy":{},"heroProjects":[2],"supportingProjects":[],"peripheralProjects":[],'
            '"heroExperience":[1],"rewriteGoals":["Land API work."],"avoid":["No unsupported tools."]}',
            None,
        )

    monkeypatch.setattr(narrative_module, "debug", False)
    monkeypatch.setattr(narrative_module, "is_openai_enabled", lambda: True)
    monkeypatch.setattr(narrative_module, "ai_chat_completion", fake_chat_completion)

    tailor_context = _tailor_context()
    tailor_context["jobStrategy"] = {
        "persona": "technical_engineering",
        "fitMode": "direct",
        "readerGoal": "Show backend API and data workflow evidence.",
        "proofStyle": ["systems and APIs", "data workflows"],
        "keepPriorities": ["technical experience"],
        "trimPriorities": ["off-lane rows"],
        "claimRules": ["Do not claim unsupported tools."],
        "sectionBudget": {"experience": None, "projects": None, "skillsGroups": None, "advisory": True},
    }

    narrative_module.request_narrative_brief(
        payload=_payload(
            {
                "focus": "technical",
                "tone": "concise",
                "length_target": "one_page",
                "rewrite_freedom": "strong",
                "custom_instructions": "Emphasize backend APIs.",
            }
        ),
        tailorContext=tailor_context,
        sectionDetails=_section_details(),
    )

    assert "length_target: one_page" in captured["user_prompt"]
    assert "rewrite_freedom: strong" in captured["user_prompt"]
    assert "custom_instructions: Emphasize backend APIs." in captured["user_prompt"]
    assert "jobStrategy" in captured["user_prompt"]
    assert "technical_engineering" in captured["user_prompt"]


def test_tailor_explanation_uses_real_preferences_and_patch_sections():
    explanation = build_tailor_explanation(
        patch={
            "summary": {"before": "Old", "after": "New"},
            "experience": [{"id": 1, "fieldsChanged": {"description": {"before": "Old", "after": "New"}}}],
            "skills": [{"id": "_orderOrFullReplace", "note": "skills reordered"}],
        },
        narrative_brief=_narrative(),
        target_role="Backend Engineer",
        company="ExampleCo",
        style_preferences={
            "focus": "technical",
            "tone": "concise",
            "length_target": "one_page",
            "rewrite_freedom": "strong",
            "custom_instructions": "Emphasize APIs.",
        },
        strict_truth=True,
        tailor_context=_tailor_context(),
        quality_audit={"flags": {}},
    )

    assert "backend APIs" in explanation["paragraph"]
    assert "one-page-friendly" in explanation["paragraph"]
    labels = [chip["label"] for chip in explanation["chips"]]
    assert "One-page target" in labels
    assert "Strong retarget" in labels
    assert "Strict truth" in labels
    assert "Summary updated" in labels
    assert "Experience reframed" in labels
    assert "Skills reordered" in labels
    assert explanation["evidence"]["changedSections"] == ["summary", "experience", "skills"]


def test_tailor_explanation_adds_gap_caution_without_claiming_match():
    ctx = _tailor_context()
    ctx["resumeHits"] = []
    ctx["resumeGaps"] = ["Kubernetes"]
    explanation = build_tailor_explanation(
        patch={},
        narrative_brief={},
        target_role="Platform Engineer",
        company="",
        style_preferences={},
        strict_truth=True,
        tailor_context=ctx,
        quality_audit={"flags": {}},
    )

    assert "fewer direct keyword matches" in explanation["paragraph"]
    labels = [chip["label"] for chip in explanation["chips"]]
    assert "Some JD terms not evidenced" in labels
    assert "Kubernetes" in explanation["evidence"]["resumeGaps"]


def test_tailor_explanation_uses_job_strategy_when_present():
    ctx = _tailor_context()
    ctx["jobStrategy"] = {
        "persona": "sales_growth",
        "fitMode": "adjacent",
        "readerGoal": "Prove customer-facing growth readiness through communication and revenue-adjacent impact.",
        "proofStyle": ["customer communication", "revenue-adjacent metrics"],
        "keepPriorities": ["customer-facing roles", "one relevant product/software project"],
        "trimPriorities": ["deep technical projects"],
        "claimRules": ["Do not call the candidate a sales professional unless formal sales or outreach is directly evidenced."],
        "gapSignals": ["outreach"],
        "sectionBudget": {"experience": None, "projects": None, "skillsGroups": None, "advisory": True},
    }

    explanation = build_tailor_explanation(
        patch={"experience": [{"id": 1, "fieldsChanged": {"description": {"before": "Old", "after": "New"}}}]},
        narrative_brief={"alignmentMode": "adjacent"},
        target_role="Sales Outreach Representative",
        company="Coverview",
        style_preferences={},
        strict_truth=True,
        tailor_context=ctx,
        quality_audit={"flags": {}},
    )

    assert "customer-facing growth readiness" in explanation["paragraph"]
    assert explanation["evidence"]["jobStrategy"]["persona"] == "sales_growth"
    detail_titles = [group["title"] for group in explanation["details"]]
    assert "What I prioritized" in detail_titles
    assert "Before you send" in detail_titles
    assert "sales professional" in " ".join(" ".join(group["items"]) for group in explanation["details"])


def test_tailor_explanation_surfaces_unsupported_terms_without_promoting_them():
    ctx = _tailor_context()
    ctx["resumeGaps"] = ["Dialogflow"]
    ctx["alignmentContext"] = {"unsupportedTerms": ["Dialogflow"]}
    ctx["rawKeywords"] = [
        {"term": "healthcare", "signalType": "context"},
        {"term": "Google CES", "signalType": "tool_platform"},
    ]
    ctx["unsupportedClaimSensitiveRequirements"] = [
        {"term": "EMR systems", "signalType": "claim_sensitive_requirement"},
        {"term": "billing systems", "signalType": "claim_sensitive_requirement"},
    ]
    ctx["jobStrategy"] = {
        "persona": "data_ai",
        "roleArchetype": "ai_backend_integration",
        "readerGoal": "Show Python backend and LLM integration proof.",
        "proofStyle": ["Python backend services", "OpenAI API"],
        "claimRules": [
            "Exact tools/platforms stay as review gaps unless resume evidence exists: Dialogflow, Google Cloud Platform.",
            "Do not claim production deployment ownership unless directly evidenced.",
        ],
        "gapSignals": ["Dialogflow", "Google Cloud Platform", "production deployment ownership"],
    }
    narrative = {
        "gapSupport": [
            {"term": "Dialogflow", "status": "unsupported_exact", "signalType": "tool_platform"},
            {"term": "healthcare", "status": "context_only", "signalType": "context"},
        ]
    }

    explanation = build_tailor_explanation(
        patch={},
        narrative_brief=narrative,
        target_role="Conversational AI Engineer",
        company="Pyramid",
        style_preferences={},
        strict_truth=True,
        tailor_context=ctx,
        quality_audit={"flags": {}},
    )

    details = " ".join(" ".join(group["items"]) for group in explanation["details"])
    titles = [group["title"] for group in explanation["details"]]
    assert "Not directly evidenced" in titles
    assert "Before you send" in titles
    assert "I did not claim Dialogflow" in details
    assert "not exact ownership of Dialogflow" in details
    assert "Company context" in titles
    assert "production deployment ownership" in explanation["evidence"]["notDirectlyEvidencedTerms"]
    assert "EMR systems" in explanation["evidence"]["notDirectlyEvidencedTerms"]
    assert "billing systems" in explanation["evidence"]["notDirectlyEvidencedTerms"]
    assert "Google CES" in explanation["evidence"]["notDirectlyEvidencedTerms"]
