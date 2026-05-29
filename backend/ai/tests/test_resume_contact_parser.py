import importlib.util
from pathlib import Path


def _load_contact_parser():
    parser_path = Path(__file__).resolve().parents[2] / "resume_parser" / "Eparsers" / "contact_parser.py"
    spec = importlib.util.spec_from_file_location("contact_parser", parser_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_contact_parser_captures_bare_portfolio_domain():
    parser = _load_contact_parser()
    contact = parser.parse_contact(
        "Dylan Vidal\n"
        "dylan@dvidal.dev | linkedin.com/in/dylanvidal1205 | github.com/DVidal1205 | dvidal.dev"
    )

    assert contact["email"] == "dylan@dvidal.dev"
    assert contact["linkedin"] == "https://linkedin.com/in/dylanvidal1205"
    assert contact["github"] == "https://github.com/DVidal1205"
    assert contact["portfolio"] == "https://dvidal.dev"


def test_contact_parser_excludes_project_bare_domains_from_portfolio():
    parser = _load_contact_parser()
    contact = parser.parse_contact(
        "Colin Kirby\ncolin@email.com\nProjects\nCenti | React | centi.dev",
        sections={"projects": "Centi | React | centi.dev", "experience": ""},
    )

    assert contact["portfolio"] is None


def test_contact_parser_captures_middle_dot_phone_number():
    parser = _load_contact_parser()
    contact = parser.parse_contact("Taylor Kirby\n407 Â· 719 Â· 9944 Â· tekirby@usf.edu Website")

    assert contact["phone"] == "407-719-9944"
    assert contact["email"] == "tekirby@usf.edu"
