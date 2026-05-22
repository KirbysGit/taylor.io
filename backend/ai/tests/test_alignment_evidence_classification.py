import sys
import types


if "openai" not in sys.modules:
    openai_stub = types.ModuleType("openai")
    openai_stub.OpenAI = object
    sys.modules["openai"] = openai_stub


from backend.ai.planning.alignment import build_alignment_context


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
