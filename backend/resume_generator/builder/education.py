from typing import Dict
import re

from .common import replace_placeholders_in_doc
from docx import Document
from docx.oxml.table import CT_Tc


def render_education(doc, ctx) -> None:
    """
    Render primary education placeholders for single-entry templates.
    """
    field_values: Dict[str, str] = {
        "edu_name": ctx.edu_name or "",
        "edu_degree": ctx.edu_degree or "",
        "edu_minor": ctx.edu_minor or "",
        # wrap location in parentheses only when present
        "edu_location": f"( {ctx.edu_location} )" if ctx.edu_location else "",
        "edu_gpa": ctx.edu_gpa or "",
        "edu_date": ctx.edu_date or "",
        "edu_honors": ctx.edu_honors or "",
        "edu_clubs": ctx.edu_clubs or "",
        "edu_coursework": ctx.edu_coursework or "",
    }

    replace_placeholders_in_doc(doc, field_values)

    # handle inline conditionals `{? field:INLINE}` for education across all paragraphs (including tables)
    _process_inline(doc, "edu_location", field_values["edu_location"])
    _process_inline(doc, "edu_date", field_values["edu_date"])
    _process_inline(doc, "edu_gpa", field_values["edu_gpa"])
    _process_inline(doc, "edu_honors", field_values["edu_honors"])
    _process_inline(doc, "edu_clubs", field_values["edu_clubs"])
    _process_inline(doc, "edu_coursework", field_values["edu_coursework"])
    _process_inline(doc, "edu_minor", field_values["edu_minor"])


INLINE_PATTERN_CACHE: Dict[str, re.Pattern] = {}


def _process_inline(doc: Document, field: str, value: str) -> None:
    """
    Handle `{? field:INLINE}` markers across paragraphs and table paragraphs:
      - if value is truthy: remove the marker text, preserving run formatting
      - if value is falsy: clear visible content (runs) but keep paragraph structure
    """
    if field not in INLINE_PATTERN_CACHE:
        INLINE_PATTERN_CACHE[field] = re.compile(
            r"\{\?\s*" + re.escape(field) + r"\s*:\s*INLINE\s*\}", re.IGNORECASE
        )
    pat = INLINE_PATTERN_CACHE[field]

    def _process_para(para):
        combined = "".join(run.text for run in para.runs)
        if not pat.search(combined):
            return
        if value:
            # remove marker only, leave styling on other text
            for run in para.runs:
                if run.text:
                    run.text = pat.sub("", run.text)
        else:
            # hide line: strip marker and clear remaining content, keep structure
            for run in para.runs:
                if not run.text:
                    continue
                run.text = pat.sub("", run.text)
                if run.text.strip():
                    run.text = ""
            # safe removal/compaction to avoid gaps or corruption
            if not (para.text or "").strip():
                _safe_remove_paragraph(para)

    for para in doc.paragraphs:
        _process_para(para)

    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    _process_para(para)


def _safe_remove_paragraph(para):
    """
    Safely hide an empty paragraph.

    - If it's inside a table cell: collapse it (cannot remove).
    - If it's a top-level paragraph: remove only if parent won't break.
    """
    p = para._element
    parent = p.getparent()

    # CASE 1: inside a table cell — do NOT remove, just collapse
    if isinstance(parent, CT_Tc):
        try:
            for run in para.runs:
                try:
                    run._element.clear_content()  # type: ignore[attr-defined]
                except Exception:
                    run.text = ""
            fmt = para.paragraph_format
            fmt.space_before = 0
            fmt.space_after = 0
            fmt.left_indent = 0
            fmt.right_indent = 0
            fmt.first_line_indent = 0
            fmt.line_spacing = 1
        except Exception:
            para.text = ""
        return

    # CASE 2: top-level — remove only if parent won't be emptied
    if parent is not None and len(parent.findall("./")) <= 1:
        para.text = ""
        return

    # safe to remove
    if parent is not None:
        parent.remove(p)

