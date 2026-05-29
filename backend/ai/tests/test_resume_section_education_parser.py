import importlib.util
from pathlib import Path


def _load_module(relative_path: str, name: str):
    module_path = Path(__file__).resolve().parents[2] / relative_path
    spec = importlib.util.spec_from_file_location(name, module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_segmenter_recognizes_skills_and_extracurriculars_header_after_summary():
    segmenter = _load_module("resume_parser/Csegmenter/section_finder.py", "section_finder")
    text = "\n".join([
        "Summary",
        "Full-stack engineer who ships secure apps.",
        "Skills & Extracurriculars",
        "Languages: Python, SQL",
        "Frameworks & Libraries: React, Django",
        "Experience",
        "Software Engineering Intern May 2024 – June 2025",
        "BitGo | Python Remote",
    ])

    sections = segmenter.split_into_sections(text)

    assert sections["summary"] == "Full-stack engineer who ships secure apps."
    assert "Languages: Python, SQL" in sections["skills"]
    assert "Software Engineering Intern" in sections["experience"]


def test_segmenter_recognizes_key_competencies_header():
    segmenter = _load_module("resume_parser/Csegmenter/section_finder.py", "section_finder")
    sections = segmenter.split_into_sections(
        "\n".join([
            "KEY COMPETENCIES",
            "Strategic Communications • Digital Marketing • Media Relations",
            "Professional Experience",
            "Marketing Coordinator",
        ])
    )

    assert "Strategic Communications" in sections["skills"]


def test_education_parser_ignores_honors_years_and_captures_inline_gpa_coursework():
    education_parser = _load_module("resume_parser/Eparsers/education_parser.py", "education_parser")
    education = education_parser.parse_education(
        "\n".join([
            "University of Central Florida",
            "Bachelor of Science in Computer Engineering, 3.7 GPA Orlando, FL",
            "Honors & Awards: Dean's List 2021, President's Honor Roll 2023 – 2025",
            "Extracurriculars: Knight Hacks, AI @ UCF",
            "Relevant Coursework: Algorithms for Machine Learning, Deep Learning, Data Structures & Algorithms, Enterprise",
            "Computing, Object-Oriented Programming, Massive Storage & Big Data",
        ])
    )

    assert len(education) == 1
    item = education[0]
    assert item["school"] == "University of Central Florida"
    assert item["degree"] == "Bachelor of Science"
    assert item["field"] == "Computer Engineering"
    assert item["gpa"] == "3.7"
    assert item["startDate"] is None
    assert item["endDate"] is None
    assert "President's Honor Roll 2023 – 2025" in item["honorsAwards"]
    assert item["relevantCoursework"].endswith("Massive Storage & Big Data")


def test_education_parser_captures_plain_clubs_label():
    education_parser = _load_module("resume_parser/Eparsers/education_parser.py", "education_parser")
    education = education_parser.parse_education(
        "\n".join([
            "University of Central Florida",
            "Bachelor of Science in Computer Engineering, 3.7 GPA Orlando, FL",
            "Honors & Awards: Dean's List 2021",
            "Clubs: AI@UCF, SHPE @ UCF, Knight Hacks",
        ])
    )

    assert len(education) == 1
    assert education[0]["clubsExtracurriculars"] == "AI@UCF, SHPE @ UCF, Knight Hacks"


def test_education_parser_captures_minor_location_and_organizations_label():
    education_parser = _load_module("resume_parser/Eparsers/education_parser.py", "education_parser")
    education = education_parser.parse_education(
        "\n".join([
            "University of Central Florida, Burnett Honors College Orlando, FL",
            "Bachelor of Science in Computer Science; Minor in Robotics and Data Science Aug 2023 â€“ May 2027",
            "Organizations: Knight Hacks, AI@UCF",
        ])
    )

    assert len(education) == 1
    item = education[0]
    assert item["school"] == "University of Central Florida, Burnett Honors College"
    assert item["location"] == "Orlando, FL"
    assert item["degree"] == "Bachelor of Science"
    assert item["field"] == "Computer Science"
    assert item["minor"] == "Robotics and Data Science"
    assert item["clubsExtracurriculars"] == "Knight Hacks, AI@UCF"


def test_education_parser_captures_dash_separated_degree_field():
    education_parser = _load_module("resume_parser/Eparsers/education_parser.py", "education_parser")
    education = education_parser.parse_education(
        "\n".join([
            "Florida State University University of South Florida",
            "Bachelor of Science - Marketing Master of Business Adminstration (MBA) - In Progress",
        ])
    )

    assert len(education) == 1
    assert education[0]["school"] == "Florida State University University of South Florida"
    assert education[0]["degree"] == "Bachelor of Science"
    assert education[0]["field"] == "Marketing"
