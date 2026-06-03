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


def test_segmenter_recognizes_letter_spaced_headers():
    segmenter = _load_module("resume_parser/Csegmenter/section_finder.py", "section_finder")
    sections = segmenter.split_into_sections(
        "\n".join([
            "P R O F I L E",
            "Academic training in counseling.",
            "E D U C A T I O N",
            "University of Montevallo | 2023",
            "E X P E R I E N C E",
            "UM Counseling Services | 2022-23",
        ])
    )

    assert "Academic training" in sections["summary"]
    assert "University of Montevallo" in sections["education"]
    assert "UM Counseling Services" in sections["experience"]


def test_segmenter_preserves_repeated_subsection_labels_inside_summary():
    segmenter = _load_module("resume_parser/Csegmenter/section_finder.py", "section_finder")
    sections = segmenter.split_into_sections(
        "\n".join([
            "Experience",
            "ABC Company | 2024",
            "Summary",
            "Knowledge",
            "• Communication principles",
            "Experience",
            "• Leadership",
            "• Public relations",
            "Skills",
            "• Writing",
        ])
    )

    assert "ABC Company" in sections["experience"]
    assert "Knowledge" in sections["summary"]
    assert "Experience" in sections["summary"]
    assert "Leadership" in sections["summary"]
    assert "Writing" in sections["skills"]


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
            "Florida State University",
            "Bachelor of Science - Marketing Master of Business Adminstration (MBA) - In Progress",
        ])
    )

    assert len(education) == 1
    assert education[0]["school"] == "Florida State University"
    assert education[0]["degree"] == "Bachelor of Science"
    assert education[0]["field"] == "Marketing"


def test_education_parser_splits_combined_school_and_degree_lines():
    education_parser = _load_module("resume_parser/Eparsers/education_parser.py", "education_parser")
    education = education_parser.parse_education(
        "\n".join([
            "Florida State University University of South Florida",
            "Bachelor of Science - Marketing Master of Business Adminstration (MBA) - In Progress",
        ])
    )

    assert len(education) == 2
    assert education[0]["school"] == "Florida State University"
    assert education[0]["degree"] == "Bachelor of Science"
    assert education[0]["field"] == "Marketing"
    assert education[1]["school"] == "University of South Florida"
    assert education[1]["degree"] in {"Master of Business", "Master of Business Adminstration"}


def test_education_parser_preserves_wrapped_sidebar_school_and_degree_lines():
    education_parser = _load_module("resume_parser/Eparsers/education_parser.py", "education_parser")
    education = education_parser.parse_education(
        "\n".join([
            "Florida State University",
            "University of South",
            "Florida",
            "Bachelor of Science in",
            "Marketing",
        ])
    )

    assert len(education) == 1
    assert education[0]["school"] == "Florida State University; University of South Florida"
    assert education[0]["degree"] == "Bachelor of Science"
    assert education[0]["field"] == "Marketing"


def test_education_parser_handles_school_location_year_and_degree_bullet():
    education_parser = _load_module("resume_parser/Eparsers/education_parser.py", "education_parser")
    education = education_parser.parse_education(
        "\n".join([
            "University of Montevallo, Montevallo, AL | 2023",
            "• Master of Education Degree in Counseling - Professional Track: Mental Health",
            "• Chi Sigma Iota Counseling Honor Society",
        ])
    )

    assert len(education) == 1
    assert education[0]["school"] == "University of Montevallo"
    assert education[0]["location"] == "Montevallo, AL"
    assert education[0]["endDate"] == "2023-01"
    assert education[0]["degree"] == "Master of Education"


def test_education_parser_handles_school_location_slash_year_and_separates_coursework_honors():
    education_parser = _load_module("resume_parser/Eparsers/education_parser.py", "education_parser")
    education = education_parser.parse_education(
        "\n".join([
            "UNIVERSITY OF MONTEVALLO - Montevallo, AL / 2018",
            "â€¢ Bachelor of Science Degree in Business Administration",
            "â€¢ Coursework: Management, Marketing, Finance, Accounting",
            "â€¢ Dean's List - GPA 3.8 - Omicron Delta Kappa Leadership Honor Society",
            "â€¢ Student Government Association - University Program Council - Debate Society",
        ])
    )

    assert len(education) == 1
    assert education[0]["school"] == "UNIVERSITY OF MONTEVALLO"
    assert education[0]["location"] == "Montevallo, AL"
    assert education[0]["endDate"] == "2018-01"
    assert education[0]["relevantCoursework"] == "Management, Marketing, Finance, Accounting"
    assert "Dean's List" in education[0]["honorsAwards"]


def test_education_parser_splits_stacked_school_year_entries_without_blank_lines():
    education_parser = _load_module("resume_parser/Eparsers/education_parser.py", "education_parser")
    education = education_parser.parse_education(
        "\n".join([
            "University of Montevallo, Montevallo, AL | 2023",
            "• Master of Education Degree in Counseling - Professional Track: Mental Health",
            "• Chi Sigma Iota Counseling Honor Society",
            "University of Montevallo, Montevallo, AL | 2021",
            "• Bachelor of Science Degree in Psychology - Minor Concentration: Sociology",
            "• GPA 3.5 - Dean's List",
        ])
    )

    assert len(education) == 2
    assert education[0]["degree"] == "Master of Education"
    assert education[0]["field"] == "Counseling"
    assert education[1]["degree"] == "Bachelor of Science"
    assert education[1]["field"] == "Psychology"
    assert education[1]["gpa"] == "3.5"


def test_education_parser_captures_minor_concentration_and_unlabeled_activity_bullets():
    education_parser = _load_module("resume_parser/Eparsers/education_parser.py", "education_parser")
    education = education_parser.parse_education(
        "\n".join([
            "University of Montevallo, Montevallo, AL | 2021",
            "• Bachelor of Science Degree in Psychology - Minor Concentration: Sociology",
            "• GPA 3.5 - Dean's List",
            "• Psychology Club (President) - Delta Sigma Theta Sorority (Secretary) - Best Buddies - Safe Zone",
            "• Volunteer Community Service: Crisis Center, Magic City Wellness Center",
        ])
    )

    assert len(education) == 1
    assert education[0]["minor"] == "Sociology"
    assert "Psychology Club" in education[0]["clubsExtracurriculars"]
    assert "Volunteer Community Service" in education[0]["clubsExtracurriculars"]
