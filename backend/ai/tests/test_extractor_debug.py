import sys
import types


if "openai" not in sys.modules:
    openai_stub = types.ModuleType("openai")
    openai_stub.OpenAI = object
    sys.modules["openai"] = openai_stub


from backend.ai.extraction.extractor import extract_keywords
from backend.ai.processing.tailor_context import build_tailor_context


TECO_STYLE_JD = """
About the job
Title: Data Engineer (Tampa)
Company: Peoples Gas System
State and City: Florida - Tampa
Shift: 8 Hr. X 5 Days

WHO WE ARE?
Peoples Gas System is a natural gas utility.

WHAT YOU NEED TO SUCCEED?
Demonstrated database programming language such as Python, R or SQL.
Demonstrated database management systems such as Oracle, Microsoft SQL Server, SAP HANA and others.
Cloud data platforms such as Microsoft Azure, Snowflake, Google Cloud Platform, AWS.

Primary Duties & Responsibilities
Data and AI Design and Development
Create, conceptualize, design and maintain data processes, data reliability, data quality, data storage, data models, data performance, data ingestion.

Project and Database Support
Support systems development team members in understanding application data requirements and developing logical database models.
"""


CONVERSATIONAL_AI_JD = """
About the job
Key Responsibilities:
Design and develop conversational AI solutions using Google CES, Dialog flow, or similar platforms.
Integrate AI/LLM models into applications to enable intelligent interactions.
Develop and maintain backend services using Python.
Implement and manage API integrations with third-party systems.
Optimize prompts and workflows for improved AI performance and user experience.
Participate in CI/CD pipeline setup and automation.
Ensure code quality using version control systems like Git.

Key Requirements and Technology Experience:
Key skills: Python, AI integration and LLM models (Dialog flow, Google CES, Amazon Bedrock, OpenAI, API, JavaScript, Cloud Platform).
Hands-on experience with cloud platforms (GCP, AWS, or Azure).
Our client is a leading Healthcare Industry.
"""


LENNOX_PRODUCT_JD = """
Responsibilities:
Support the design and development of residential HVAC products including gas furnaces, air handlers, and evaporator coils.
Participate in laboratory testing and evaluation of HVAC systems for airflow, heating/cooling performance, sound, reliability, safety, and efficiency.
Learn and apply engineering principles related to thermodynamics, heat transfer, refrigeration systems, and combustion processes.
"""


HOST_JD = """
Responsibilities:
Welcome guests in a fine dining restaurant.
Manage reservations and seating while using strong phone etiquette.
Must be comfortable standing for long periods.
"""


HEALTHCARE_DATA_JD = """
Responsibilities:
Build reporting across EMR systems, billing systems, CRM systems, and accounting systems.
Integrate healthcare operations data into dashboards.
"""


FULL_STACK_OWNERSHIP_JD = """
Responsibilities:
Drive formal system design ownership and production deployment ownership.
Write well-tested code in Python, Django, React, and TypeScript.
Requirements:
1 to 5 years full-stack experience.
"""


def test_extractor_does_not_fall_back_to_job_metadata_after_company_intro():
    result = extract_keywords(TECO_STYLE_JD, "Data Engineer (Tampa)", 12, company="TECO Peoples Gas")
    terms = [item["term"] for item in result["keywords"]]

    assert result["debug"]["line_counts"]["included_body"] >= 5
    assert "tampa" not in terms[:8]
    assert "city" not in terms[:8]
    assert "state" not in terms[:8]
    assert "title" not in terms[:8]
    assert "python" in terms
    assert "sql" in terms
    assert "database management" in terms or "database" in terms
    assert any(term in terms for term in ("azure", "snowflake", "amazon web services", "google cloud platform"))


def test_extractor_returns_basic_debug_snapshot():
    result = extract_keywords(TECO_STYLE_JD, "Data Engineer (Tampa)", 8, company="TECO Peoples Gas")
    debug = result["debug"]

    assert debug["target_role"] == "Data Engineer (Tampa)"
    assert debug["company"] == "TECO Peoples Gas"
    assert debug["top_keywords"] == result["keywords"]
    assert debug["included_line_samples"]
    assert "top_known_phrases" in debug
    assert "top_stack_terms" in debug


def test_conversational_ai_extractor_preserves_exact_tools_and_filters_fragments():
    result = extract_keywords(
        CONVERSATIONAL_AI_JD,
        "Conversational AI Engineer (LLM & Google Cloud)",
        12,
        company="Pyramid Consulting",
    )
    priority_terms = [item["term"] for item in result["keywords"]]
    raw_terms = [item["term"] for item in result["rawKeywords"]]
    suppressed = {item["term"]: item for item in result["suppressedKeywords"]}

    assert "flow" not in priority_terms
    assert "applications" not in priority_terms
    assert "healthcare" not in priority_terms
    assert "dialogflow" in priority_terms or "dialogflow" in raw_terms
    assert "google ces" in priority_terms or "google ces" in raw_terms
    assert "amazon bedrock" in priority_terms or "amazon bedrock" in raw_terms
    assert "openai" in priority_terms or "openai" in raw_terms
    assert "ci/cd" in priority_terms
    assert "git" in priority_terms or "git" in raw_terms
    assert suppressed["healthcare"]["signalType"] == "context"
    assert result["debug"]["priority_keywords"] == result["keywords"]
    assert result["debug"]["suppressed_terms"]


def test_extractor_returns_claim_sensitive_domain_requirements():
    result = extract_keywords(LENNOX_PRODUCT_JD, "Product Development Engineer", 12, company="Lennox")
    terms = {item["term"] for item in result["claimSensitiveRequirements"]}

    assert "residential hvac products" in terms
    assert "heat transfer" in terms
    assert "refrigeration systems" in terms
    assert "combustion processes" in terms
    assert result["debug"]["claim_sensitive_requirements"] == result["claimSensitiveRequirements"]


def test_extractor_returns_claim_sensitive_hospitality_requirements():
    result = extract_keywords(HOST_JD, "Host/Hostess", 12, company="Christy's")
    terms = {item["term"] for item in result["claimSensitiveRequirements"]}

    assert "fine dining experience" in terms or "fine dining" in terms
    assert "phone etiquette" in terms
    assert "standing for long periods" in terms
    assert "hospitality" in result["activeDomains"]


def test_extractor_returns_claim_sensitive_systems_and_seniority_requirements():
    health = extract_keywords(HEALTHCARE_DATA_JD, "Data & AI Lead", 12, company="Timshel Health")
    health_terms = {item["term"] for item in health["claimSensitiveRequirements"]}

    assert {"emr systems", "billing systems", "crm systems", "accounting systems"} <= health_terms

    full_stack = extract_keywords(FULL_STACK_OWNERSHIP_JD, "Full Stack Engineer", 12, company="JKB Advisors")
    full_stack_terms = {item["term"] for item in full_stack["claimSensitiveRequirements"]}

    assert "formal system design ownership" in full_stack_terms
    assert "production deployment ownership" in full_stack_terms
    assert "well-tested code" in full_stack_terms
    assert any("1 to 5 years" in term and "experience" in term for term in full_stack_terms)


def test_claim_sensitive_requirements_flow_into_tailor_context_as_warnings_not_keywords():
    claim_sensitive = [{"term": "fine dining experience", "reason": "hospitality", "signalType": "claim_sensitive_requirement"}]
    context = build_tailor_context(
        "Host/Hostess",
        ["hospitality"],
        [{"term": "customer service", "signalType": "role_capability"}],
        {"experience": [], "projects": [], "skills": [], "education": []},
        claimSensitiveRequirements=claim_sensitive,
    )

    assert context["claimSensitiveRequirements"] == claim_sensitive
    assert [item["term"] for item in context["unsupportedClaimSensitiveRequirements"]] == ["fine dining experience"]
    assert "fine dining experience" not in [item["term"] for item in context["keywords"]]
