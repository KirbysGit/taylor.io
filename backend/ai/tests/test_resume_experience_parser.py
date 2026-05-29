import importlib.util
from pathlib import Path


def _load_experience_parser():
    parser_path = Path(__file__).resolve().parents[2] / "resume_parser" / "Eparsers" / "experience_parser.py"
    spec = importlib.util.spec_from_file_location("experience_parser", parser_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_experience_parser_extracts_tab_separated_stack_and_remote_location():
    parser = _load_experience_parser()
    experiences = parser.parse_experience(
        "\n".join([
            "Software Engineering Intern\tMay 2024 – June 2025",
            "BitGo | Python, Django, React, PostgreSQL, AWS EC2\tRemote",
            "Built backend services and internal automation tools.",
            "Worked with design teams and engineers.",
        ])
    )

    assert len(experiences) == 1
    experience = experiences[0]
    assert experience["title"] == "Software Engineering Intern"
    assert experience["company"] == "BitGo"
    assert experience["location"] == "Remote"
    assert experience["skills"] == "Python, Django, React, PostgreSQL, AWS EC2"
    assert "Built backend services" in experience["description"]


def test_experience_parser_extracts_pipe_separated_location_without_forcing_skills():
    parser = _load_experience_parser()
    experiences = parser.parse_experience(
        "\n".join([
            "Server October 2023 – December 2023",
            "Bar Louie | Orlando, FL",
            "Communicated with guests and kitchen teams.",
        ])
    )

    assert len(experiences) == 1
    experience = experiences[0]
    assert experience["company"] == "Bar Louie"
    assert experience["location"] == "Orlando, FL"
    assert experience["skills"] is None


def test_experience_parser_extracts_inline_city_state_from_company_line():
    parser = _load_experience_parser()
    experiences = parser.parse_experience(
        "\n".join([
            "Host / Expo May 2022 – August 2022",
            "Hawkers Windermere, FL",
            "Maintained clear communication with customers and kitchen teams.",
        ])
    )

    assert len(experiences) == 1
    experience = experiences[0]
    assert experience["company"] == "Hawkers"
    assert experience["location"] == "Windermere, FL"


def test_experience_parser_strips_inline_remote_from_stack_string():
    parser = _load_experience_parser()
    experiences = parser.parse_experience(
        "\n".join([
            "Software Engineering Intern May 2024 – June 2025",
            "BitGo | Python, Django, React, PostgreSQL, AWS EC2 Remote",
            "Built backend services and internal automation tools.",
        ])
    )

    experience = experiences[0]
    assert experience["location"] == "Remote"
    assert experience["skills"] == "Python, Django, React, PostgreSQL, AWS EC2"


def test_experience_parser_supports_company_date_then_title_layout():
    parser = _load_experience_parser()
    experiences = parser.parse_experience(
        "\n".join([
            "Knight Hacks Feb 2024 â€“ Present",
            "President",
            "Led weekly planning and hackathon operations.",
            "NVIDIA Santa Clara, CA May 2025 â€“ Aug 2025",
            "Software Engineer Intern",
            "Built internal tools with engineers.",
        ])
    )

    assert len(experiences) == 2
    assert experiences[0]["company"] == "Knight Hacks"
    assert experiences[0]["title"] == "President"
    assert experiences[0]["current"] is True
    assert experiences[1]["company"] == "NVIDIA"
    assert experiences[1]["title"] == "Software Engineer Intern"
    assert experiences[1]["location"] == "Santa Clara, CA"


def test_experience_parser_supports_company_season_year_then_title_layout():
    parser = _load_experience_parser()
    experiences = parser.parse_experience(
        "\n".join([
            "BNY Summer 2026",
            "Software Engineering Intern (Incoming)",
            "Selected for a competitive internship.",
        ])
    )

    assert len(experiences) == 1
    assert experiences[0]["company"] == "BNY"
    assert experiences[0]["title"] == "Software Engineering Intern (Incoming)"


def test_experience_parser_supports_company_title_description_then_date_layout():
    parser = _load_experience_parser()
    experiences = parser.parse_experience(
        "\n".join([
            "Associated Luxury Hotels International",
            "Marketing Coordinator - Contract, Part-Time (25 - 30 hours/week)",
            "Supported brand campaign initiatives through media partnership coordination, content development, and digital asset",
            "management",
            "Assisted executive marketing leadership with reporting.",
            "November 7, 2023 - Dec 27, 2023",
            "BumbleBee Skincare & Waxing",
            "Social Media Marketing Manager - Full-Time (3 Years and 3 months)",
            "Managed social media strategy and audience engagement initiatives.",
            "August 22, 2022 - December 31, 2025",
        ])
    )

    assert len(experiences) == 2
    assert experiences[0]["company"] == "Associated Luxury Hotels International"
    assert experiences[0]["title"] == "Marketing Coordinator - Contract, Part-Time (25 - 30 hours/week)"
    assert experiences[0]["startDate"] == "2023-11"
    assert experiences[0]["endDate"] == "2023-12"
    assert "digital asset management" in experiences[0]["description"]
    assert experiences[1]["company"] == "BumbleBee Skincare & Waxing"
    assert experiences[1]["title"] == "Social Media Marketing Manager - Full-Time (3 Years and 3 months)"


def test_experience_parser_keeps_three_trailing_date_roles():
    parser = _load_experience_parser()
    experiences = parser.parse_experience(
        "\n".join([
            "Company One",
            "Marketing Coordinator",
            "Supported brand campaigns.",
            "November 7, 2023 - Dec 27, 2023",
            "Company Two",
            "Social Media Marketing Manager",
            "Managed content calendars.",
            "August 22, 2022 - December 31, 2025",
            "Company Three",
            "Communications & Marketing Officer",
            "Managed website strategy.",
            "December 6, 2024 - Present",
        ])
    )

    assert [experience["company"] for experience in experiences] == ["Company One", "Company Two", "Company Three"]
    assert experiences[2]["current"] is True
