import importlib.util
from pathlib import Path


def _load_skills_parser():
    parser_path = Path(__file__).resolve().parents[2] / "resume_parser" / "Eparsers" / "skills_parser.py"
    spec = importlib.util.spec_from_file_location("skills_parser", parser_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_skills_parser_preserves_spaced_ampersand_categories():
    parser = _load_skills_parser()
    skills = parser.parse_skills(
        "\n".join([
            "Languages : Python, SQL, JavaScript, Java",
            "Analysis & Data Tools : Pandas, NumPy, ETL Pipelines",
            "Frameworks & Technologies : FastAPI, Django, React",
            "AI Developer Tools : Cursor, Claude Code",
        ])
    )

    by_name = {skill["name"]: skill.get("category") for skill in skills}

    assert by_name["Python"] == "Languages"
    assert by_name["Pandas"] == "Analysis & Data Tools"
    assert by_name["FastAPI"] == "Frameworks & Technologies"
    assert by_name["Cursor"] == "AI Developer Tools"
    assert "Analysis & Data Tools : Pandas" not in by_name
    assert "Frameworks & Technologies : FastAPI" not in by_name


def test_skills_parser_does_not_split_commas_inside_parentheses():
    parser = _load_skills_parser()
    skills = parser.parse_skills(
        "DevOps & Tools: AWS (EC2, S3, Lambda), GitHub Actions, Redis, Celery"
    )

    by_name = {skill["name"]: skill.get("category") for skill in skills}

    assert by_name["AWS (EC2, S3, Lambda)"] == "DevOps & Tools"
    assert by_name["GitHub Actions"] == "DevOps & Tools"
    assert by_name["Redis"] == "DevOps & Tools"
    assert "AWS (EC2" not in by_name
    assert "Lambda)" not in by_name


def test_skills_parser_keeps_c_language():
    parser = _load_skills_parser()
    skills = parser.parse_skills("Programming Languages: Python, C#, C++, C, Java")
    by_name = {skill["name"]: skill.get("category") for skill in skills}

    assert by_name["C"] == "Programming Languages"


def test_skills_parser_preserves_wrapped_social_media_skill_phrases():
    parser = _load_skills_parser()
    skills = parser.parse_skills(
        "Strategic Communications • Digital Marketing • Email\n"
        "Marketing • Public Relations • Cross-Functional Collaboration"
    )
    names = [skill["name"] for skill in skills]

    assert "Email Marketing" in names
    assert "Cross-Functional Collaboration" in names
    assert "Email" not in names
    assert "Cross" not in names


def test_skills_parser_treats_standalone_category_labels_as_separators():
    parser = _load_skills_parser()
    skills = parser.parse_skills(
        "\n".join([
            "• Managerial and supervisory",
            "• Problem-solving",
            "Technical Skills",
            "• Broadcast production",
            "• Presentation (PowerPoint)",
            "Personal Traits",
            "• Strong work ethic",
            "• Quick learner, team player",
        ])
    )

    by_name = {skill["name"]: skill.get("category") for skill in skills}

    assert by_name["Broadcast production"] == "Technical Skills"
    assert by_name["Presentation (PowerPoint)"] == "Technical Skills"
    assert by_name["Strong work ethic"] == "Personal Traits"
    assert "Problem-solving Technical Skills" not in by_name
    assert "Presentation (PowerPoint) Personal Traits" not in by_name
