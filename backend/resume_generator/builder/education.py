from typing import Dict

from .common import replace_placeholders_in_doc


def render_education(doc, ctx) -> None:
    """
    Render primary education placeholders for single-entry templates.
    """
    field_values: Dict[str, str] = {
        "edu_name": ctx.edu_name or "",
        "edu_degree": ctx.edu_degree or "",
        "edu_location": ctx.edu_location or "",
        "edu_gpa": ctx.edu_gpa or "",
        "edu_date": ctx.edu_date or "",
        "edu_honors": ctx.edu_honors or "",
        "edu_clubs": ctx.edu_clubs or "",
        "edu_coursework": ctx.edu_coursework or "",
    }

    replace_placeholders_in_doc(doc, field_values)

