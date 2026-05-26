import sys
import types


if "openai" not in sys.modules:
    openai_stub = types.ModuleType("openai")
    openai_stub.OpenAI = object
    sys.modules["openai"] = openai_stub


from backend.ai.strategy import build_job_strategy


def _ctx(target_role, keywords, hits=None, gaps=None, mode="adjacent", unsupported=None):
    return {
        "targetRole": target_role,
        "keywords": keywords,
        "priorityKeywords": keywords,
        "resumeHits": hits or [],
        "resumeGaps": gaps or [],
        "alignmentContext": {
            "mode": mode,
            "unsupportedTerms": unsupported or gaps or [],
        },
    }


def test_data_software_role_returns_data_or_technical_strategy():
    payload = {
        "target_role": "Software Engineer",
        "job_description": "Build systems using Python and SQL. Design data pipelines and support React work.",
        "style_preferences": {},
    }
    context = _ctx(
        "Software Engineer",
        [{"term": "python"}, {"term": "sql"}, {"term": "data pipelines"}, {"term": "react"}],
        hits=["python", "sql", "react"],
        gaps=["azure"],
        mode="direct",
    )

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] in {"technical", "data_ai"}
    assert strategy["persona"] in {"data_ai", "technical_engineering"}
    assert strategy["fitMode"] == "direct"
    assert any("pipeline" in item.lower() or "system" in item.lower() for item in strategy["proofStyle"])


def test_sales_growth_role_keeps_customer_facing_priorities():
    payload = {
        "target_role": "Sales Outreach Representative",
        "job_description": "Run outbound outreach, book discovery calls, and support go-to-market messaging.",
        "style_preferences": {},
    }
    context = _ctx(
        "Sales Outreach Representative",
        [{"term": "sales"}, {"term": "outreach"}, {"term": "customer communication"}],
        hits=["customer communication"],
        gaps=["outreach"],
        mode="adjacent",
    )

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] == "sales_customer"
    assert strategy["persona"] == "sales_growth"
    assert any("customer" in item.lower() for item in strategy["keepPriorities"])
    assert any("sales professional" in item.lower() for item in strategy["claimRules"])


def test_operations_role_returns_operations_strategy():
    payload = {
        "target_role": "Operations Coordinator",
        "job_description": "Coordinate scheduling, compliance, metrics reporting, and process improvement.",
        "style_preferences": {},
    }
    context = _ctx(
        "Operations Coordinator",
        [{"term": "operations"}, {"term": "scheduling"}, {"term": "compliance"}],
        hits=["compliance", "metrics"],
        gaps=["scheduling"],
        mode="adjacent",
    )

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] == "operations"
    assert strategy["persona"] == "operations_admin"
    assert any("coordination" in item.lower() for item in strategy["proofStyle"])


def test_executive_role_returns_cautious_leadership_strategy():
    payload = {
        "target_role": "Vice President",
        "job_description": "Senior executive leader responsible for strategic leadership and people management.",
        "style_preferences": {},
    }
    context = _ctx(
        "Vice President",
        [{"term": "vice president"}, {"term": "strategic leadership"}],
        hits=[],
        gaps=["vice president", "strategic leadership"],
        mode="stretch",
    )
    context["alignmentContext"]["fitRisk"] = {
        "level": "extreme",
        "unsupportedSeniorityTerms": ["vice president", "people management"],
        "claimGuidance": "Use cautious bridge language.",
    }

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] == "executive_stretch"
    assert strategy["persona"] == "executive_leadership"
    assert strategy["fitMode"] == "stretch"
    assert any("do not inflate" in item.lower() for item in strategy["claimRules"])
    assert any("cautious" in item.lower() for item in strategy["claimRules"])


def test_conversational_ai_strategy_keeps_unsupported_tools_as_claim_rules():
    payload = {
        "target_role": "Conversational AI Engineer",
        "job_description": "Integrate LLM models with Dialogflow, Google Cloud Platform, OpenAI, APIs, and backend services.",
        "style_preferences": {"length_target": "one_page"},
    }
    context = _ctx(
        "Conversational AI Engineer",
        [{"term": "openai"}, {"term": "dialogflow"}, {"term": "backend services"}],
        hits=["openai", "backend services"],
        gaps=["dialogflow", "google cloud platform"],
        mode="adjacent",
        unsupported=["dialogflow", "google cloud platform"],
    )
    context["unsupportedExactKeywords"] = [
        {"term": "dialogflow", "signalType": "tool_platform"},
        {"term": "google cloud platform", "signalType": "tool_platform"},
    ]

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] == "technical_ai"
    assert strategy["persona"] == "data_ai"
    assert strategy["roleArchetype"] == "ai_backend_integration"
    assert strategy["lengthMode"] == "one_page"
    assert "openai" in [item.lower() for item in strategy["supportedSignals"]]
    assert any("dialogflow" in item.lower() for item in strategy["claimRules"])
    assert any("rest api" in item.lower() for item in strategy["skillPreserve"])
    assert any("api integration" in item.lower() for item in strategy["skillReframeTargets"])


def test_compliance_word_does_not_override_technical_role_signal():
    payload = {
        "target_role": "Software Engineer (Data Privacy)",
        "job_description": "Build backend services for data privacy, compliance workflows, APIs, and secure systems.",
        "style_preferences": {},
    }
    context = _ctx(
        "Software Engineer (Data Privacy)",
        [{"term": "backend services"}, {"term": "data"}, {"term": "compliance"}, {"term": "api"}],
        hits=["backend services", "data", "api"],
        gaps=["governance"],
        mode="direct",
    )

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] in {"technical", "data_ai"}
    assert strategy["persona"] in {"data_ai", "technical_engineering"}
    assert strategy["persona"] != "operations_admin"


def test_full_stack_product_role_routes_to_product_engineering_not_data_ai():
    payload = {
        "target_role": "Full Stack Engineer",
        "job_description": "Build customer-facing and internal products with Python Django, React, TypeScript, product judgment, deployment, and system design.",
        "style_preferences": {},
    }
    context = _ctx(
        "Full Stack Engineer",
        [{"term": "python"}, {"term": "react"}, {"term": "django"}, {"term": "data"}],
        hits=["python", "react", "django"],
        gaps=["typescript"],
        mode="direct",
    )

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] == "technical"
    assert strategy["persona"] == "technical_engineering"
    assert strategy["roleArchetype"] == "full_stack_product_engineering"
    assert any("full-stack" in item.lower() for item in strategy["proofStyle"])
    assert any("data/ai-first" in item.lower() for item in strategy["summaryGuardrails"])


def test_functional_analyst_routes_to_analyst_bridge_not_executive():
    payload = {
        "target_role": "Functional Analyst",
        "job_description": "Gather requirements, write user stories and acceptance criteria, support testing/UAT, document business processes, and coordinate stakeholders.",
        "style_preferences": {},
    }
    context = _ctx(
        "Functional Analyst",
        [{"term": "user stories"}, {"term": "acceptance criteria"}, {"term": "testing"}],
        hits=["testing"],
        gaps=["azure devops", "cbap"],
        mode="stretch",
    )

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] == "business_analysis"
    assert strategy["persona"] == "operations_admin"
    assert strategy["roleArchetype"] == "functional_analyst_bridge"
    assert any("requirements" in item.lower() for item in strategy["proofStyle"])
    assert "SQL" in strategy["skillPreserve"]
    assert any("requirements" in item.lower() for item in strategy["skillReframeTargets"])
    assert any("cbap" in item.lower() for item in strategy["claimRules"])


def test_product_development_engineering_routes_to_engineering_stretch_not_sales():
    payload = {
        "target_role": "Product Development Engineer",
        "job_description": "Support HVAC product lifecycle work, airflow testing, manufacturing compliance, troubleshooting, and engineering documentation.",
        "style_preferences": {},
    }
    context = _ctx(
        "Product Development Engineer",
        [{"term": "hvac"}, {"term": "airflow"}, {"term": "product lifecycle"}],
        hits=[],
        gaps=["hvac", "airflow", "manufacturing"],
        mode="stretch",
    )

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] == "engineering_product"
    assert strategy["persona"] == "general_adjacent"
    assert strategy["roleArchetype"] == "engineering_product_development_stretch"
    assert any("engineering problem" in item.lower() for item in strategy["proofStyle"])
    assert not any("growth" in item.lower() for item in strategy["proofStyle"])


def test_hospitality_role_routes_to_hospitality_customer_service():
    payload = {
        "target_role": "Host/Hostess",
        "job_description": "Restaurant host role requiring hospitality, phone etiquette, reservations, seating guests, teamwork, and customer service.",
        "style_preferences": {},
    }
    context = _ctx(
        "Host/Hostess",
        [{"term": "hospitality"}, {"term": "customer service"}, {"term": "phone etiquette"}],
        hits=["customer service"],
        gaps=[],
        mode="direct",
    )

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] == "hospitality"
    assert strategy["roleArchetype"] == "hospitality_customer_service"
    assert any("guest" in item.lower() for item in strategy["proofStyle"])
    assert any("guest" in item.lower() for item in strategy["skillReframeTargets"])
    assert any("software projects" in item.lower() for item in strategy["trimPriorities"])


def test_financial_representative_routes_to_customer_education():
    payload = {
        "target_role": "Financial Services Representative",
        "job_description": "Help people understand money, debt, financial goals, life insurance, and training while building customer trust.",
        "style_preferences": {},
    }
    context = _ctx(
        "Financial Services Representative",
        [{"term": "financial services"}, {"term": "training"}, {"term": "customer trust"}],
        hits=["finance"],
        gaps=["life insurance"],
        mode="adjacent",
    )

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] == "sales_customer"
    assert strategy["persona"] == "sales_growth"
    assert strategy["roleArchetype"] == "financial_customer_education"
    assert any("trust" in item.lower() for item in strategy["proofStyle"])
    assert any("full-stack engineer" in item.lower() for item in strategy["claimRules"])


def test_data_ai_lead_routes_to_analytics_ownership_stretch_not_sales():
    payload = {
        "target_role": "Data & AI Lead",
        "job_description": "First data hire building a data repository, ROI reporting, dashboards, analytics, SQL workflows, multi-source integrations, and executive insights.",
        "style_preferences": {},
    }
    context = _ctx(
        "Data & AI Lead",
        [{"term": "data repository"}, {"term": "roi reporting"}, {"term": "dashboards"}],
        hits=["sql", "analytics"],
        gaps=["healthcare data"],
        mode="stretch",
    )

    strategy = build_job_strategy(payload, context, {})

    assert strategy["lane"] == "data_ai"
    assert strategy["persona"] == "data_ai"
    assert strategy["roleArchetype"] == "data_ai_analytics_ownership_stretch"
    assert any("dashboards" in item.lower() for item in strategy["proofStyle"])
    assert not any("customer-facing growth" in item.lower() for item in strategy["readerGoal"])
