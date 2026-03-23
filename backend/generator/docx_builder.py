# docx_builder.py
# Word document generator for resumes. Uses docx_styles for template-consistent formatting.

import re
from io import BytesIO

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.shared import Pt, Inches
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from typing import Dict, Any, Optional, List, Tuple

from .builders import format_date_month_year
from .docx_styles import get_styles, DocxStyleConfig


def _add_two_column_line(
    doc: Document,
    style: DocxStyleConfig,
    left_runs: List[Tuple[str, float, bool, bool]],  # (text, font_size_pt, bold, italic)
    right_run: Optional[Tuple[str, float, bool, bool]],
    *,
    indent_pt: float = 0,
    space_after_pt: float = 0,
    space_before_pt: float = 0,
) -> None:
    """
    Add a line with left content (multiple styled runs) and right-aligned content.
    Matches PDF flex layout: school+GPA left, dates right; degree left, location right; etc.
    left_runs: [(text, font_size_pt, bold, italic), ...]
    right_run: (text, font_size_pt, bold, italic) or None
    """
    has_left = any(r[0] for r in left_runs)
    has_right = right_run and right_run[0]
    if not has_left and not has_right:
        return
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Pt(indent_pt)
    if space_before_pt:
        p.paragraph_format.space_before = Pt(space_before_pt)
    if space_after_pt:
        p.paragraph_format.space_after = Pt(space_after_pt)

    if has_right:
        p.paragraph_format.tab_stops.add_tab_stop(
            Inches(style.two_column_tab_in),
            WD_TAB_ALIGNMENT.RIGHT,
        )

    for text, sz, bold, italic in left_runs:
        if not text:
            continue
        run = p.add_run(str(text))
        run.font.size = Pt(sz)
        run.font.name = style.font_primary if bold else style.font_secondary
        run.bold = bold
        run.italic = italic

    if has_right and right_run:
        text, sz, bold, italic = right_run
        if text and str(text).strip():
            p.add_run("\t")
            run = p.add_run(str(text).strip())
            run.font.size = Pt(sz)
            run.font.name = style.font_primary if bold else style.font_secondary
            run.bold = bold
            run.italic = italic


def _format_date_range(start_raw, end_raw: str, current: bool) -> str:
    """Format date range for display. Matches builders logic."""
    start_val = str(start_raw) if start_raw else ""
    end_val = str(end_raw) if end_raw else ""
    start_date = format_date_month_year(start_val) if start_val else ""
    end_date = format_date_month_year(end_val) if end_val else ""

    if current and start_date:
        return f"{start_date} - Present"
    if current and not start_date:
        return "Present"
    if start_date and end_date:
        return f"{start_date} - {end_date}"
    if start_date:
        return start_date
    if end_date:
        return end_date
    return ""


def _add_border_paragraph(doc: Document, style: DocxStyleConfig) -> None:
    """Add a thin horizontal line (divider) under section titles."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(1.5)
    p.paragraph_format.space_after = Pt(style.section_title_space_after_pt)
    p.paragraph_format.line_spacing = Pt(1)
    p_border = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "2")  # ~0.25pt
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "000000")
    p_border.append(bottom)
    p._p.get_or_add_pPr().append(p_border)


def _add_header(document: Document, resume_data: Dict[str, Any], style: DocxStyleConfig) -> None:
    """Add name and contact line with proper styling."""
    header = resume_data.get("header", {})
    name = f"{header.get('first_name', '')} {header.get('last_name', '')}".strip()
    if name:
        p = document.add_paragraph()
        run = p.add_run(name)
        run.bold = True
        run.font.size = Pt(style.name_font_size_pt)
        run.font.name = style.font_primary
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(style.name_space_after_pt)

    # Contact line
    contact_order = header.get("contactOrder", ["email", "phone", "location", "linkedin", "github", "portfolio"])
    field_map = {
        "email": header.get("email", ""),
        "phone": header.get("phone", ""),
        "location": header.get("location", ""),
        "linkedin": header.get("linkedin", ""),
        "github": header.get("github", ""),
        "portfolio": header.get("portfolio", ""),
    }
    visibility = header.get("visibility", {})
    visibility_map = {
        "email": "showEmail", "phone": "showPhone", "location": "showLocation",
        "linkedin": "showLinkedin", "github": "showGithub", "portfolio": "showPortfolio",
    }
    fields = []
    for field_key in contact_order:
        if field_key in field_map:
            val = field_map[field_key]
            vis_key = visibility_map.get(field_key)
            is_visible = visibility.get(vis_key, True) if vis_key else True
            if val and str(val).strip() and is_visible:
                fields.append(str(val).strip())
    if fields:
        p = document.add_paragraph()
        run = p.add_run(" | ".join(fields))
        run.font.size = Pt(style.contact_font_size_pt)
        run.font.name = style.font_secondary
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.line_spacing = style.contact_line_height
        p.paragraph_format.space_after = Pt(6)  # before first section


def _add_section_title(document: Document, title: str, style: DocxStyleConfig) -> None:
    """Add a section heading with divider."""
    p = document.add_paragraph()
    run = p.add_run(title)
    run.font.size = Pt(style.section_title_font_size_pt)
    run.font.name = style.font_primary
    p.paragraph_format.space_before = Pt(style.section_title_space_before_pt)
    p.paragraph_format.space_after = Pt(0)
    _add_border_paragraph(document, style)


def _add_para(
    document: Document,
    text: str,
    style: DocxStyleConfig,
    *,
    font_size_pt: Optional[float] = None,
    bold: bool = False,
    italic: bool = False,
    indent_pt: float = 0,
    space_before_pt: float = 0,
    space_after_pt: float = 0,
) -> None:
    """Add a styled paragraph."""
    if not text or not str(text).strip():
        return
    p = document.add_paragraph()
    run = p.add_run(str(text).strip())
    run.font.size = Pt(font_size_pt or style.description_font_size_pt)
    run.font.name = style.font_primary if bold else style.font_secondary
    run.bold = bold
    run.italic = italic
    if indent_pt:
        p.paragraph_format.left_indent = Pt(indent_pt)
    if space_before_pt:
        p.paragraph_format.space_before = Pt(space_before_pt)
    if space_after_pt:
        p.paragraph_format.space_after = Pt(space_after_pt)


def _parse_description_items(description: str) -> List[Tuple[str, str]]:
    """Parse description into bullet/paragraph items. Matches builders.format_description logic."""
    if not description or not str(description).strip():
        return []
    lines = str(description).split("\n")
    items = []
    non_bullet_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("•"):
            if non_bullet_lines:
                items.append(("paragraph", "\n".join(non_bullet_lines)))
                non_bullet_lines = []
            bullet_text = re.sub(r"^•\s+", "", stripped)
            if bullet_text:
                items.append(("bullet", bullet_text))
        else:
            non_bullet_lines.append(stripped)
    if non_bullet_lines:
        items.append(("paragraph", "\n".join(non_bullet_lines)))
    return items


def _add_description_block(
    doc: Document,
    style: DocxStyleConfig,
    description: str,
    indent_pt: float,
) -> None:
    """
    Add description with bullets set off to the side (matches PDF).
    Bullets get extra indent (12.5pt), bullet item spacing (0.5pt), paragraph spacing (2pt).
    """
    items = _parse_description_items(description)
    if not items:
        return
    bullet_indent = indent_pt + style.description_bullet_indent_pt
    first = True
    for item_type, content in items:
        if not content or not str(content).strip():
            continue
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        if first:
            p.paragraph_format.space_before = Pt(style.description_block_space_before_pt)
            first = False
        if item_type == "bullet":
            # Tab stop at hang_pt (from first-line edge) aligns text; wrapped lines align with left_indent
            p.paragraph_format.left_indent = Pt(bullet_indent)
            p.paragraph_format.first_line_indent = Pt(-style.description_bullet_hang_pt)
            p.paragraph_format.tab_stops.add_tab_stop(
                Pt(style.description_bullet_hang_pt),
                WD_TAB_ALIGNMENT.LEFT,
            )
            p.paragraph_format.space_after = Pt(style.description_bullet_item_space_pt)
            run = p.add_run("•\t" + str(content).strip())
        else:
            p.paragraph_format.left_indent = Pt(indent_pt)
            p.paragraph_format.space_after = Pt(style.description_paragraph_space_pt)
            run = p.add_run(str(content).strip())
        run.font.size = Pt(style.description_font_size_pt)
        run.font.name = style.font_secondary


def build_docx(resume_data: Dict[str, Any], template_name: str = "default") -> bytes:
    """
    Build a styled Word document from resume_data.
    Uses docx_styles for template-consistent formatting (margins, fonts, spacing).
    """
    style = get_styles(template_name)
    doc = Document()

    # Page margins (match .resume padding)
    sect = doc.sections[0]
    sect.top_margin = Inches(style.margin_top_in)
    sect.bottom_margin = Inches(style.margin_bottom_in)
    sect.left_margin = Inches(style.margin_left_in)
    sect.right_margin = Inches(style.margin_right_in)

    # Header
    _add_header(doc, resume_data, style)

    section_labels = resume_data.get("sectionLabels", {})
    defaults = {
        "summary": "Professional Summary",
        "education": "Education",
        "experience": "Experience",
        "projects": "Projects",
        "skills": "Skills",
    }

    indent = style.section_content_indent_pt

    # Summary
    summary = resume_data.get("summary")
    if summary and isinstance(summary, dict):
        text = summary.get("summary", "").strip()
        if text:
            _add_section_title(doc, section_labels.get("summary", defaults["summary"]), style)
            _add_para(
                doc, text, style,
                font_size_pt=style.summary_font_size_pt,
                indent_pt=indent,
                space_after_pt=style.summary_space_after_pt,
            )

    # Education
    education = resume_data.get("education") or []
    if education:
        _add_section_title(doc, section_labels.get("education", defaults["education"]), style)
        for edu in education:
            degree = edu.get("degree", "")
            discipline = edu.get("discipline", "")
            minor = edu.get("minor", "")
            degree_text = f"{degree} in {discipline}" if discipline else degree
            if minor:
                degree_text += f", Minor in {minor}"

            start_raw = edu.get("start_date") or edu.get("startDate") or ""
            end_raw = edu.get("end_date") or edu.get("endDate") or ""
            date_range = _format_date_range(start_raw, end_raw, edu.get("current", False))
            gpa = edu.get("gpa", "")
            gpa_text = f" (GPA: {gpa})" if gpa else ""

            # School line: [school bold 12pt] [GPA italic 11pt] <tab> [dates italic 12pt] - matches PDF
            left_runs = [
                (edu.get("school", ""), style.school_name_font_size_pt, True, False),
            ]
            if gpa_text:
                left_runs.append((gpa_text, style.school_gpa_font_size_pt, False, True))
            _add_two_column_line(
                doc, style,
                left_runs,
                (date_range, style.school_meta_font_size_pt, False, True) if date_range else None,
                indent_pt=indent,
                space_after_pt=style.school_line_space_after_pt,
            )

            # Degree line: [degree italic 12pt] <tab> [location italic 12pt]
            loc = edu.get("location", "")
            _add_two_column_line(
                doc, style,
                [(degree_text, style.school_meta_font_size_pt, False, True)],
                (loc, style.school_meta_font_size_pt, False, True) if loc else None,
                indent_pt=indent,
                space_after_pt=style.school_line_space_after_pt,
            )
            for sub_title, sub_content in (edu.get("subsections") or {}).items():
                if sub_content and str(sub_content).strip():
                    p = doc.add_paragraph()
                    p.paragraph_format.left_indent = Pt(indent)
                    p.paragraph_format.space_after = Pt(3)
                    if sub_title:
                        r1 = p.add_run(f"{sub_title}: ")
                        r1.bold = True
                        r1.font.size = Pt(style.highlight_font_size_pt)
                        r1.font.name = style.font_primary
                    r2 = p.add_run(str(sub_content).strip())
                    r2.font.size = Pt(style.highlight_font_size_pt)
                    r2.font.name = style.font_secondary

    # Experience
    experience = resume_data.get("experience") or []
    if experience:
        _add_section_title(doc, section_labels.get("experience", defaults["experience"]), style)
        for exp in experience:
            start_raw = exp.get("start_date") or exp.get("startDate") or ""
            end_raw = exp.get("end_date") or exp.get("endDate") or ""
            date_range = _format_date_range(start_raw, end_raw, exp.get("current", False))

            # Experience line: [title bold 11pt] <tab> [dates italic 11pt]
            _add_two_column_line(
                doc, style,
                [(exp.get("title", ""), style.experience_title_font_size_pt, True, False)],
                (date_range, style.experience_meta_font_size_pt, False, True) if date_range else None,
                indent_pt=indent,
                space_before_pt=style.experience_line_space_before_pt,
                space_after_pt=style.experience_line_space_pt,
            )

            # Company line: [company bold] [| skills italic] <tab> [location italic]
            company = exp.get("company", "")
            skills = exp.get("skills", "")
            loc = exp.get("location", "")
            left_runs = [(company, style.experience_meta_font_size_pt, True, False)]
            if skills:
                left_runs.append((f" | {skills}", style.experience_meta_font_size_pt, False, True))
            _add_two_column_line(
                doc, style,
                left_runs,
                (loc, style.experience_meta_font_size_pt, False, True) if loc else None,
                indent_pt=indent,
                space_after_pt=style.experience_line_space_pt,
            )
            desc = exp.get("description", "")
            if desc and str(desc).strip():
                _add_description_block(doc, style, str(desc), indent)

    # Projects
    projects = resume_data.get("projects") or []
    if projects:
        _add_section_title(doc, section_labels.get("projects", defaults["projects"]), style)
        for proj in projects:
            title = proj.get("title", "")
            tech = proj.get("tech_stack") or proj.get("techStack") or []
            tech_str = ", ".join(tech) if isinstance(tech, list) else str(tech or "")
            url = proj.get("url", "")

            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(style.project_line_space_pt)
            r1 = p.add_run(title)
            r1.bold = True
            r1.font.size = Pt(style.project_title_font_size_pt)
            r1.font.name = style.font_primary
            if tech_str or url:
                extras = []
                if tech_str:
                    extras.append(tech_str)
                if url:
                    extras.append(url)
                p.add_run(" | ")
                r2 = p.add_run(" | ".join(extras))
                r2.italic = True
                r2.font.size = Pt(style.project_title_font_size_pt)
                r2.font.name = style.font_secondary
            desc = proj.get("description", "")
            if desc and str(desc).strip():
                _add_description_block(doc, style, str(desc), indent)

    # Skills
    skills = resume_data.get("skills") or []
    skills_category_order = resume_data.get("skillsCategoryOrder") or []
    if skills:
        skills_by_cat = {}
        uncategorized = []
        for s in skills:
            if isinstance(s, dict):
                cat = s.get("category") or s.get("Category")
                name = s.get("name") or s.get("Name", "")
            else:
                cat = None
                name = str(s)
            if not name:
                continue
            if cat:
                skills_by_cat.setdefault(cat, []).append(name)
            else:
                uncategorized.append(name)

        _add_section_title(doc, section_labels.get("skills", defaults["skills"]), style)
        order = [c for c in skills_category_order if c in skills_by_cat]
        for c in sorted(skills_by_cat.keys()):
            if c not in order:
                order.append(c)
        for cat in order:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(style.skill_line_space_pt)
            r1 = p.add_run(f"{cat}: ")
            r1.bold = True
            r1.font.size = Pt(style.skill_category_font_size_pt)
            r1.font.name = style.font_primary
            r2 = p.add_run(", ".join(skills_by_cat[cat]))
            r2.font.size = Pt(style.skill_names_font_size_pt)
            r2.font.name = style.font_secondary
        if uncategorized:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(style.skill_line_space_pt)
            r = p.add_run(", ".join(uncategorized))
            r.font.size = Pt(style.skill_names_font_size_pt)
            r.font.name = style.font_secondary

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()
