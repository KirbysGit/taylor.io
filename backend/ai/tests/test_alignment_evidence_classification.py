import sys
import types


if "openai" not in sys.modules:
    openai_stub = types.ModuleType("openai")
    openai_stub.OpenAI = object
    sys.modules["openai"] = openai_stub


from backend.ai.planning.alignment import build_alignment_context
from backend.ai.planning.build_plan import build_tailor_plan
from backend.ai.post_processing.resume_tailor_report import build_tailor_explanation
from backend.ai.processing.tailor_context import build_tailor_context


def test_client_role_downgrades_product_account_keyword_overlap():
    resume_data = {
        "experience": [
            {
                "id": 7,
                "title": "Server",
                "company": "Bar Louie",
                "description": "Effective communication with guests, kitchen, and bar teams in a fast-paced service environment.",
            }
        ],
        "projects": [
            {
                "id": 9,
                "title": "Centi - Personal Finance App",
                "description": "Built account aggregation, transaction tracking, authentication, and React dashboards for user account workflows.",
                "tech_stack": ["FastAPI", "React", "PostgreSQL"],
            }
        ],
        "skills": [],
        "education": [],
    }
    tailor_context = {
        "keywords": [
            {"term": "account management"},
            {"term": "customer service"},
            {"term": "client"},
            {"term": "marketing"},
        ],
        "resumeHits": ["account management", "account"],
        "resumeGaps": ["customer service", "client", "marketing", "communicate"],
    }
    section_details = {
        "rowsPerSectionRanked": {
            "projects": [
                {
                    "id": 9,
                    "matchedTerms": ["account management", "account"],
                    "score": 16.0,
                }
            ]
        }
    }

    context = build_alignment_context(resume_data, tailor_context, section_details)
    classes = context["evidenceClassification"]
    centi = next(item for item in classes if item["id"] == 9)
    server = next(item for item in classes if item["id"] == 7)

    assert centi["evidenceType"] == "domain_tool_evidence"
    assert centi["claimStrength"] == "supporting"
    assert server["evidenceType"] == "transferable_behavior"
    assert "customer service" not in context["unsupportedTerms"]
    assert "marketing" in context["unsupportedTerms"]


def test_sales_role_treats_technical_jd_terms_as_product_context():
    resume_data = {
        "experience": [
            {
                "id": 7,
                "title": "Server",
                "company": "Bar Louie",
                "description": "Communicated with guests and coordinated with kitchen and bar teams during high-pressure service.",
            }
        ],
        "projects": [
            {
                "id": 20,
                "title": "SentimentTrader",
                "description": "Built a real-time data pipeline and model architecture for financial sentiment analytics.",
                "tech_stack": ["Python", "SQL"],
            }
        ],
        "skills": [],
        "education": [],
    }
    tailor_context = {
        "targetRole": "Sales Outreach Representative",
        "keywords": [
            {"term": "sales"},
            {"term": "outreach"},
            {"term": "pipeline"},
            {"term": "architecture"},
            {"term": "artificial intelligence"},
        ],
        "resumeHits": ["pipeline", "architecture"],
        "resumeGaps": ["sales", "outreach"],
    }
    section_details = {
        "rowsPerSectionRanked": {
            "projects": [
                {
                    "id": 20,
                    "matchedTerms": ["pipeline", "architecture"],
                    "score": 12.0,
                }
            ]
        }
    }
    jd_lines = [
        "Conduct sales outreach to prospective customers and support follow-up activity.",
        "Our artificial intelligence pipeline architecture helps MSPs with hiring workflows.",
    ]

    context = build_alignment_context(
        resume_data,
        tailor_context,
        section_details,
        relevant_jd_lines=jd_lines,
        target_role="Sales Outreach Representative",
    )
    signal_by_term = {item["term"]: item for item in context["jdSignalIntent"]}
    sentiment = next(item for item in context["evidenceClassification"] if item["id"] == 20)

    assert signal_by_term["sales"]["intent"] == "role_responsibility"
    assert signal_by_term["outreach"]["intent"] == "role_responsibility"
    assert signal_by_term["pipeline"]["intent"] == "company_product_context"
    assert signal_by_term["architecture"]["intent"] == "company_product_context"
    assert sentiment["evidenceType"] == "domain_tool_evidence"
    assert sentiment["claimStrength"] == "supporting"


def test_gap_support_marks_related_capabilities_without_exact_terms():
    resume_data = {
        "experience": [
            {
                "id": 5,
                "title": "Software Engineering Intern",
                "company": "BitGo",
                "description": "Optimized Python data-processing pipelines and PostgreSQL queries, and built React dashboards for operational metrics.",
                "skills": "Python, React, PostgreSQL",
            }
        ],
        "projects": [
            {
                "id": 20,
                "title": "SentimentTrader",
                "description": "Built multi-stage ETL workflows with SQL, feature engineering, analytics, and model inference.",
                "tech_stack": ["Python", "SQL"],
            }
        ],
        "skills": [],
        "education": [],
    }
    tailor_context = {
        "targetRole": "Software Engineer",
        "keywords": [
            {"term": "Python"},
            {"term": "SQL"},
            {"term": "data engineering"},
            {"term": "frontend"},
            {"term": "data analysis"},
            {"term": "Azure"},
        ],
        "resumeHits": ["Python", "SQL"],
        "resumeGaps": ["data engineering", "frontend", "data analysis", "Azure"],
    }

    context = build_alignment_context(resume_data, tailor_context, {"rowsPerSectionRanked": {}})
    support = {item["term"]: item for item in context["gapSupport"]}

    assert support["data engineering"]["status"] == "conceptual"
    assert "pipelines" in support["data engineering"]["supportingEvidence"]
    assert support["frontend"]["status"] == "conceptual"
    assert "react" in support["frontend"]["supportingEvidence"]
    assert support["data analysis"]["status"] == "conceptual"
    assert support["azure"]["status"] == "unsupported"
    assert "data engineering" not in context["unsupportedTerms"]
    assert "frontend" not in context["unsupportedTerms"]
    assert "data analysis" not in context["unsupportedTerms"]
    assert "azure" in context["unsupportedTerms"]


def test_executive_role_sets_extreme_fit_risk_for_early_career_resume():
    resume_data = {
        "experience": [
            {
                "id": 5,
                "title": "Software Engineering Intern",
                "company": "BitGo",
                "description": "Collaborated with senior engineers on backend services and compliance dashboards.",
            },
            {
                "id": 7,
                "title": "Server",
                "company": "Bar Louie",
                "description": "Communicated with guests, kitchen, and bar teams in a high-pressure environment.",
            },
        ],
        "projects": [
            {
                "id": 20,
                "title": "SentimentTrader",
                "description": "Built data pipelines and reporting metrics for sentiment analytics.",
            }
        ],
        "skills": [],
        "education": [],
    }
    tailor_context = {
        "targetRole": "Vice President",
        "keywords": [
            {"term": "vice president"},
            {"term": "external representation"},
            {"term": "people management"},
            {"term": "strategic leadership"},
            {"term": "operational excellence"},
        ],
        "resumeHits": ["compliance", "metrics"],
        "resumeGaps": [
            "vice president",
            "external representation",
            "people management",
            "strategic leadership",
            "organizational capacity",
        ],
    }
    jd_lines = [
        "The Vice President is a senior executive leader responsible for mission, strategic priorities, and operational excellence.",
        "This role combines strategic leadership, people management, cross-functional oversight, and external representation.",
    ]

    context = build_alignment_context(
        resume_data,
        tailor_context,
        {"rowsPerSectionRanked": {}},
        relevant_jd_lines=jd_lines,
        target_role="Vice President",
    )

    assert context["fitRisk"]["level"] == "extreme"
    assert context["fitRisk"]["kind"] == "seniority_scope_mismatch"
    assert "vice president" in context["fitRisk"]["unsupportedSeniorityTerms"]
    assert context["fitRisk"]["resumeScopeEvidence"]["seniorTitleEvidence"] == []


def test_executive_fit_risk_allows_real_management_scope():
    resume_data = {
        "experience": [
            {
                "id": 3,
                "title": "Operations Manager",
                "company": "Acme",
                "description": "Managed teams, budget planning, hiring, and cross-functional oversight for regional operations.",
            }
        ],
        "projects": [],
        "skills": [],
        "education": [],
    }
    tailor_context = {
        "targetRole": "Vice President",
        "keywords": [
            {"term": "vice president"},
            {"term": "people management"},
            {"term": "strategic leadership"},
        ],
        "resumeHits": ["people management"],
        "resumeGaps": ["vice president", "strategic leadership"],
    }

    context = build_alignment_context(
        resume_data,
        tailor_context,
        {"rowsPerSectionRanked": {}},
        relevant_jd_lines=["Vice President role with strategic leadership and people management."],
        target_role="Vice President",
    )

    assert context["fitRisk"]["level"] != "extreme"
    assert context["fitRisk"]["resumeScopeEvidence"]["seniorTitleEvidence"]


def test_tool_platform_gaps_are_not_conceptually_claimed_as_exact_tools():
    resume_data = {
        "experience": [
            {
                "id": 5,
                "title": "Software Engineering Intern",
                "company": "BitGo",
                "description": "Built Python APIs and deployed internal services on AWS EC2.",
                "skills": "Python, AWS EC2",
            }
        ],
        "projects": [],
        "skills": [],
        "education": [],
    }
    tailor_context = {
        "targetRole": "Conversational AI Engineer",
        "keywords": [
            {"term": "python", "signalType": "tool_platform"},
            {"term": "google cloud platform", "signalType": "tool_platform"},
            {"term": "dialogflow", "signalType": "tool_platform"},
            {"term": "backend services", "signalType": "role_capability"},
        ],
        "resumeHits": ["python"],
        "resumeGaps": ["google cloud platform", "dialogflow", "backend services"],
    }

    context = build_alignment_context(resume_data, tailor_context, {"rowsPerSectionRanked": {}})
    support = {item["term"]: item for item in context["gapSupport"]}

    assert support["google cloud platform"]["status"] == "unsupported_exact"
    assert support["dialogflow"]["status"] == "unsupported_exact"
    assert "google cloud platform" in context["unsupportedTerms"]
    assert "dialogflow" in context["unsupportedTerms"]


def test_openai_project_ranks_above_generic_application_overlap():
    resume_data = {
        "experience": [],
        "projects": [
            {
                "id": 9,
                "title": "Centi",
                "description": "Built a finance application with account aggregation and dashboards.",
                "tech_stack": ["FastAPI", "React", "PostgreSQL"],
            },
            {
                "id": 10,
                "title": "Taylor.io",
                "description": "Integrated OpenAI API for structured parsing, content generation, and AI-assisted editing workflows.",
                "tech_stack": ["FastAPI", "React", "PostgreSQL", "OpenAI API"],
            },
        ],
        "skills": [],
        "education": [],
    }
    keywords = [
        {"term": "openai", "score": 8.0, "signalType": "tool_platform"},
        {"term": "api integration", "score": 6.0, "signalType": "role_capability"},
        {"term": "backend services", "score": 5.0, "signalType": "role_capability"},
    ]
    tailor_context = build_tailor_context(
        "Conversational AI Engineer",
        ["ai", "engineering"],
        keywords,
        resume_data,
        rawKeywords=keywords + [{"term": "applications", "signalType": "generic_fragment"}],
        suppressedKeywords=[{"term": "applications", "signalType": "generic_fragment", "reason": "generic fragment"}],
    )
    plan = build_tailor_plan(resumeData=resume_data, tailorContext=tailor_context)
    rows = plan["rowsPerSectionRanked"]["projects"]

    assert rows[0]["id"] == 10
    assert "openai" in rows[0]["matchedTerms"]
    assert all("applications" not in row["matchedTerms"] for row in rows)


def test_tailor_context_keeps_unsupported_exact_tools_as_gaps_not_prompt_keywords():
    resume_data = {
        "projects": [
            {
                "id": 10,
                "title": "Taylor.io",
                "description": "Integrated OpenAI API for structured parsing and content generation.",
                "tech_stack": ["OpenAI API", "FastAPI"],
            }
        ],
        "experience": [],
        "skills": [],
        "education": [],
    }
    keywords = [
        {"term": "openai", "signalType": "tool_platform"},
        {"term": "dialogflow", "signalType": "tool_platform"},
        {"term": "backend services", "signalType": "role_capability"},
    ]

    context = build_tailor_context("Conversational AI Engineer", ["ai"], keywords, resume_data)
    prompt_terms = [item["term"] for item in context["keywords"]]

    assert "openai" in prompt_terms
    assert "dialogflow" not in prompt_terms
    assert "dialogflow" in context["resumeGaps"]
    assert [item["term"] for item in context["unsupportedExactKeywords"]] == ["dialogflow"]


def test_data_engineer_terms_rank_pipeline_projects_above_unrelated_frontend():
    resume_data = {
        "experience": [],
        "projects": [
            {
                "id": 18,
                "title": "Portfolio Site",
                "description": "Built a responsive marketing website with galleries and animations.",
                "tech_stack": ["React", "Next.js"],
            },
            {
                "id": 20,
                "title": "SentimentTrader",
                "description": "Built multi-stage ETL pipelines with SQL, feature engineering, model inference, and analytics.",
                "tech_stack": ["Python", "SQL", "XGBoost"],
            },
            {
                "id": 9,
                "title": "Centi",
                "description": "Designed PostgreSQL schemas and FastAPI services for normalized transaction processing.",
                "tech_stack": ["FastAPI", "PostgreSQL", "React"],
            },
        ],
        "skills": [],
        "education": [],
    }
    keywords = [
        {"term": "data pipelines", "score": 8.0, "signalType": "role_capability"},
        {"term": "sql", "score": 7.0, "signalType": "tool_platform"},
        {"term": "python", "score": 7.0, "signalType": "tool_platform"},
        {"term": "react", "score": 2.0, "signalType": "tool_platform"},
    ]
    tailor_context = build_tailor_context("Data Engineer", ["data"], keywords, resume_data)
    rows = build_tailor_plan(resumeData=resume_data, tailorContext=tailor_context)["rowsPerSectionRanked"]["projects"]
    ranked_ids = [row["id"] for row in rows]

    assert ranked_ids.index(20) < ranked_ids.index(18)
    assert ranked_ids.index(9) < ranked_ids.index(18)


def test_tailor_explanation_uses_filtered_priority_terms_and_warns_on_exact_gaps():
    tailor_context = {
        "keywords": [
            {"term": "python", "signalType": "tool_platform"},
            {"term": "openai", "signalType": "tool_platform"},
            {"term": "backend services", "signalType": "role_capability"},
        ],
        "resumeHits": ["python", "openai", "backend services"],
        "resumeGaps": ["dialogflow"],
        "alignmentContext": {
            "unsupportedTerms": ["dialogflow"],
        },
    }
    narrative = {
        "alignmentMode": "direct",
        "evidenceClassification": [
            {
                "section": "projects",
                "id": 10,
                "label": "Taylor.io",
                "terms": ["openai"],
                "evidenceType": "direct_role_evidence",
            }
        ],
        "gapSupport": [
            {
                "term": "dialogflow",
                "status": "unsupported_exact",
                "signalType": "tool_platform",
                "supportingEvidence": [],
            },
            {
                "term": "healthcare",
                "status": "context_only",
                "signalType": "context",
                "supportingEvidence": [],
            },
        ],
    }
    patch = {
        "projects": [
            {
                "id": 10,
                "fieldsChanged": {
                    "description": {"before": "Old", "after": "Integrated OpenAI API for parsing workflows."}
                },
            }
        ]
    }

    explanation = build_tailor_explanation(
        patch=patch,
        narrative_brief=narrative,
        target_role="Conversational AI Engineer",
        company="Pyramid Consulting",
        tailor_context=tailor_context,
        quality_audit={"flags": {}},
    )

    assert explanation["evidence"]["jobPriorityTerms"] == ["Python", "OpenAI", "backend services"]
    detail_titles = [item["title"] for item in explanation["details"]]
    assert "Not directly evidenced" in detail_titles
    assert "Company context" in detail_titles
    assert "Dialogflow" in " ".join(" ".join(item["items"]) for item in explanation["details"])
