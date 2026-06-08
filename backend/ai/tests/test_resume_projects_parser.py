import importlib.util
from pathlib import Path


def _load_projects_parser():
    parser_path = Path(__file__).resolve().parents[2] / "resume_parser" / "Eparsers" / "projects_parser.py"
    spec = importlib.util.spec_from_file_location("projects_parser", parser_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_projects_parser_rejects_wrapped_bullet_fragments_as_titles():
    parser = _load_projects_parser()
    section_text = """
SentimentTrader - Real-Time Stock Sentiment Pipeline | Python, SQL, FinBERT, XGBoost
• Built an ML data pipeline for real-time sentiment
analytics.
• Automated preprocessing and model inference through
CI/CD.
Centi - Personal Finance App | FastAPI, React, PostgreSQL | https://centi.dev
• Built account aggregation and transaction dashboards.
"""

    projects, debug = parser.parse_projects_with_debug(section_text)

    assert [project["title"] for project in projects] == [
        "SentimentTrader - Real-Time Stock Sentiment Pipeline",
        "Centi - Personal Finance App",
    ]
    assert "analytics." not in [project["title"] for project in projects]
    assert "CI/CD." not in [project["title"] for project in projects]
    assert len(debug["acceptedHeaders"]) == 2
    assert len(debug["wrappedContinuations"]) == 2


def test_project_header_requires_stack_or_url_signal():
    parser = _load_projects_parser()

    assert parser.is_project_header("Taylor.io - Resume Builder | React, FastAPI, PostgreSQL")
    assert not parser.is_project_header("analytics.")
    assert not parser.is_project_header("Created responsive dashboards | improving reporting workflows.")


def test_projects_parser_extracts_bare_domain_url_and_normalizes_dash_spacing():
    parser = _load_projects_parser()
    projects, _debug = parser.parse_projects_with_debug(
        "\n".join([
            "Centi – Personal Finance Web App | React, FastAPI, PostgreSQL, Plaid API | centi.dev",
            "• Built a finance dashboard.",
            "SentimentTrader– Stock Sentiment Analysis Tool | Python, Reddit API",
            "• Built a sentiment pipeline.",
        ])
    )

    assert projects[0]["url"] == "centi.dev"
    assert projects[0]["techStack"] == ["React", "FastAPI", "PostgreSQL", "Plaid API"]
    assert projects[1]["title"] == "SentimentTrader – Stock Sentiment Analysis Tool"


def test_projects_parser_strips_trailing_dates_from_tech_stack():
    parser = _load_projects_parser()
    projects, _debug = parser.parse_projects_with_debug(
        "\n".join([
            "ReStory | Python, PyTorch, Gemini, OpenCV, Raspberry Pi, WebSockets, Docker, RTX 5090 Jan 2026",
            "• Built a wearable AI system.",
            "Lootcode | React, Next, Tailwind, SQL, tRPC, TypeScript, Zx, Docker, Linux Feb 2024 – May 2024",
            "• Built a code-grading server.",
        ])
    )

    assert projects[0]["techStack"] == [
        "Python",
        "PyTorch",
        "Gemini",
        "OpenCV",
        "Raspberry Pi",
        "WebSockets",
        "Docker",
        "RTX 5090",
    ]
    assert projects[1]["techStack"] == [
        "React",
        "Next",
        "Tailwind",
        "SQL",
        "tRPC",
        "TypeScript",
        "Zx",
        "Docker",
        "Linux",
    ]


def test_projects_parser_supports_two_line_title_and_tech_stack():
    parser = _load_projects_parser()
    projects, debug = parser.parse_projects_with_debug(
        "\n".join([
            "ReStory",
            "Python, PyTorch, Gemini, OpenCV, Raspberry Pi Jan 2026",
            "â€¢ Built a wearable AI system.",
            "Visuworld AI",
            "React, Next.js, Tailwind, FastAPI, MongoDB, Google Gemini",
            "â€¢ Built a visual learning tool.",
        ])
    )

    assert [project["title"] for project in projects] == ["ReStory", "Visuworld AI"]
    assert projects[0]["techStack"] == ["Python", "PyTorch", "Gemini", "OpenCV", "Raspberry Pi"]
    assert projects[1]["techStack"] == ["React", "Next.js", "Tailwind", "FastAPI", "MongoDB", "Google Gemini"]
    assert debug["acceptedHeaders"][0]["reason"] == "accepted_two_line_header"


def test_two_line_project_header_does_not_promote_lowercase_wrapped_bullets():
    parser = _load_projects_parser()
    projects, _debug = parser.parse_projects_with_debug(
        "\n".join([
            "CivicLens",
            "Next.js, TypeScript, FastAPI, Google Gemini",
            "â€¢ Led a team building political transparency tools for 535+",
            "congressional representatives, implementing a RAG chatbot using",
            "Google Gemini 2.5 Flash, PostgreSQL with pgvector, and FastAPI backend.",
        ])
    )

    assert len(projects) == 1
    assert projects[0]["title"] == "CivicLens"
    assert "congressional representatives" in " ".join(projects[0]["description"])


def test_projects_parser_supports_embedded_hardware_stacks_with_trailing_dates():
    parser = _load_projects_parser()
    projects, debug = parser.parse_projects_with_debug(
        "\n".join([
            "Custom Embedded RC Derby Car | ESP32, Control Systems, Power Electronics January 2026 – Present",
            "• Designed power distribution and embedded firmware integration.",
            "Digital Logic Design & Verification | Verilog, FPGA Simulation January 2026 – Present",
            "• Developed testbenches and simulated timing behavior in Vivado.",
            "TI-RSLK Robot Maze | C/C++, Embedded Systems, Sensors September 2024 – November 2024",
            "• Programmed autonomous navigation using sensor feedback.",
            "Great Navel Orange Race Autonomous Boat | MSP430, MATLAB, Motor Control Jan 2025 – April 2025",
            "• Programmed motor control and heading-angle navigation.",
        ])
    )

    assert [project["title"] for project in projects] == [
        "Custom Embedded RC Derby Car",
        "Digital Logic Design & Verification",
        "TI-RSLK Robot Maze",
        "Great Navel Orange Race Autonomous Boat",
    ]
    assert projects[0]["techStack"] == ["ESP32", "Control Systems", "Power Electronics"]
    assert projects[1]["techStack"] == ["Verilog", "FPGA Simulation"]
    assert projects[3]["techStack"] == ["MSP430", "MATLAB", "Motor Control"]
    assert len(debug["rejectedHeaders"]) == 0
