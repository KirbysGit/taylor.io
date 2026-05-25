import sys
import types


if "openai" not in sys.modules:
    openai_stub = types.ModuleType("openai")
    openai_stub.OpenAI = object
    sys.modules["openai"] = openai_stub


from backend.ai.extraction.extractor import extract_keywords


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
