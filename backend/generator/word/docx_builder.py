# docx_builder.py
# Word document generator for resumes. Style loading: ``shared.styles.get_styles``; tokens: ``word.docx_styles``.

import re
from io import BytesIO

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_LINE_SPACING, WD_UNDERLINE
from docx.shared import Pt, Inches
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from dataclasses import replace
from typing import Dict, Any, Optional, List, Tuple

from ..layout_sidebar_split import sidebar_main_column_order, sidebar_rail_section_order
from ..shared.styles import get_styles
from ..template_layout import (
    LAYOUT_SIDEBAR_SPLIT,
    load_layout_profile,
    resolve_docx_max_pages,
)
from ..template_slug import normalize_template_slug

from ..builders import (
    format_contact_field_display,
    format_date_month_year,
    parse_tagline_runs,
    resolve_contact_url_display,
)
from ..builders.common import skills_group_ordered
from ..icons.docx_rail_png import contact_rail_icon_png_bytes

from .docx_styles import DocxStyleConfig


def _set_run_character_spacing(run, spacing_pt: float) -> None:
    """Word w:spacing on the run; val in 1/20 pt (positive = expand, negative = condense). Matches CSS letter-spacing."""
    if spacing_pt is None or spacing_pt == 0:
        return
    r_pr = run._element.get_or_add_rPr()
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:val"), str(int(round(float(spacing_pt) * 20))))
    r_pr.append(spacing)


def _set_line_spacing_multiple(p, mult: float) -> None:
    """Align Word line leading with CSS line-height. Avoids Normal/defaults (often looser)."""
    m = float(mult)
    if m <= 0:
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        return
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    p.paragraph_format.line_spacing = m


def _resume_color_token_to_word_hex(raw: Any) -> Optional[str]:
    """Map resume_tokens CSS color (hex or rgba) to RRGGBB for w:color (rgba blended on white)."""
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if s.startswith("#"):
        t = s[1:]
        if len(t) == 3 and all(c in "0123456789ABCDEFabcdef" for c in t):
            t = "".join(c * 2 for c in t)
        if len(t) == 6 and all(c in "0123456789ABCDEFabcdef" for c in t):
            return t.upper()
        return None
    m = re.match(
        r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+)\s*)?\)",
        s,
        re.I,
    )
    if not m:
        return None
    r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
    a = float(m.group(4)) if m.group(4) is not None else 1.0
    a = max(0.0, min(1.0, a))
    r = int(round(r * a + 255 * (1.0 - a)))
    g = int(round(g * a + 255 * (1.0 - a)))
    b = int(round(b * a + 255 * (1.0 - a)))
    return f"{r:02X}{g:02X}{b:02X}"


def _apply_run_resume_color(run: Any, style: DocxStyleConfig, attr: str) -> None:
    raw = getattr(style, attr, None)
    hx = _resume_color_token_to_word_hex(raw)
    if not hx:
        return
    r_pr = run._element.get_or_add_rPr()
    for old in list(r_pr.findall(qn("w:color"))):
        r_pr.remove(old)
    c = OxmlElement("w:color")
    c.set(qn("w:val"), hx)
    r_pr.append(c)


def _add_two_column_line(
    doc: Any,
    style: DocxStyleConfig,
    left_runs: List[Tuple],  # (text, font_size_pt, bold, italic) or + force_primary_font bool
    right_run: Optional[Tuple[str, float, bool, bool]],
    *,
    indent_pt: float = 0,
    space_after_pt: float = 0,
    space_before_pt: float = 0,
    line_spacing_single: bool = False,
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
    # Always set (including 0); `if space_after_pt` skipped 0 and Word kept default spacing
    p.paragraph_format.space_before = Pt(space_before_pt)
    p.paragraph_format.space_after = Pt(space_after_pt)
    if line_spacing_single:
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

    if has_right:
        p.paragraph_format.tab_stops.add_tab_stop(
            Inches(style.two_column_tab_in),
            WD_TAB_ALIGNMENT.RIGHT,
        )

    for run_spec in left_runs:
        if len(run_spec) == 5:
            text, sz, bold, italic, force_primary = run_spec
        else:
            text, sz, bold, italic = run_spec
            force_primary = False
        if not text:
            continue
        run = p.add_run(str(text))
        run.font.size = Pt(sz)
        if force_primary:
            run.font.name = style.font_primary
        else:
            run.font.name = style.font_primary if bold else style.font_secondary
        run.bold = bold
        run.italic = italic
        if bold:
            _apply_run_resume_color(run, style, "resume_text_color_emphasis")
        elif italic:
            _apply_run_resume_color(run, style, "resume_text_color_secondary")
        else:
            _apply_run_resume_color(run, style, "resume_text_color_primary")

    if has_right and right_run:
        text, sz, bold, italic = right_run
        if text and str(text).strip():
            p.add_run("\t")
            run = p.add_run(str(text).strip())
            run.font.size = Pt(sz)
            run.font.name = style.font_primary if bold else style.font_secondary
            run.bold = bold
            run.italic = italic
            _apply_run_resume_color(run, style, "resume_text_color_secondary")


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


def _apply_section_title_bottom_border(p) -> None:
    """
    Draw the divider on the title paragraph itself (no empty paragraph below).
    Avoids an extra 'blank line' in Word that deletes with the rule and feels disconnected.
    """
    p_border = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "2")  # ~0.25pt
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "000000")
    p_border.append(bottom)
    p._p.get_or_add_pPr().append(p_border)


def _add_sidebar_rail_header(
    cell: Any,
    resume_data: Dict[str, Any],
    style: DocxStyleConfig,
    style_preferences: dict | None = None,
    *,
    template_slug: str = "sidebar",
) -> None:
    """Sidebar left rail: name, tagline, stacked contact rows (PDF contact-rail semantics)."""
    rail_pad_pt = float(getattr(style, "sidebar_pad_x_in", 0.0) or 0.0) * 72.0
    header = resume_data.get("header", {})
    name = f"{header.get('first_name', '')} {header.get('last_name', '')}".strip()
    if name:
        p = cell.add_paragraph()
        if rail_pad_pt:
            p.paragraph_format.left_indent = Pt(rail_pad_pt)
        run = p.add_run(name)
        run.bold = True
        run.font.size = Pt(max(8, int(round(style.name_font_size_pt * 0.92))))
        run.font.name = style.font_primary
        _apply_run_resume_color(run, style, "resume_text_color_emphasis")
        _set_run_character_spacing(run, style.name_letter_spacing_pt or 0)
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_after = Pt(style.name_space_after_pt)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

    has_tagline = False
    vis = header.get("visibility", {})
    if vis.get("showTagline", True):
        tagline = (header.get("tagline") or "").strip()
        if tagline:
            has_tagline = True
            p = cell.add_paragraph()
            if rail_pad_pt:
                p.paragraph_format.left_indent = Pt(rail_pad_pt)
            for text, t_bold, t_italic, t_underline in parse_tagline_runs(tagline):
                run = p.add_run(text)
                run.font.size = Pt(style.tagline_font_size_pt)
                run.font.name = style.font_primary
                run.bold = t_bold
                run.italic = t_italic
                run.font.underline = (
                    WD_UNDERLINE.SINGLE if t_underline else WD_UNDERLINE.NONE
                )
                _apply_run_resume_color(run, style, "resume_text_color_primary")
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(style.tagline_space_after_pt)
            _set_line_spacing_multiple(p, style.tagline_line_height)

    contact_order = header.get(
        "contactOrder",
        ["email", "phone", "location", "linkedin", "github", "portfolio"],
    )
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
        "email": "showEmail",
        "phone": "showPhone",
        "location": "showLocation",
        "linkedin": "showLinkedin",
        "github": "showGithub",
        "portfolio": "showPortfolio",
    }
    url_disp = resolve_contact_url_display(style_preferences)
    contact_idx = 0
    for field_key in contact_order:
        if field_key not in field_map:
            continue
        val = field_map[field_key]
        vis_key = visibility_map.get(field_key)
        is_visible = visibility.get(vis_key, True) if vis_key else True
        if not val or not str(val).strip() or not is_visible:
            continue
        disp = format_contact_field_display(
            field_key,
            str(val).strip(),
            contact_url_display=url_disp,
        )
        p = cell.add_paragraph()
        if rail_pad_pt:
            p.paragraph_format.left_indent = Pt(rail_pad_pt)
        icon_pt = float(getattr(style, "sidebar_docx_contact_icon_size_pt", 0) or 0)
        icon_gap = float(getattr(style, "sidebar_docx_contact_icon_text_gap_pt", 4.5) or 0)
        png = (
            contact_rail_icon_png_bytes(template_slug, field_key)
            if icon_pt > 0
            else None
        )
        if png:
            try:
                r_img = p.add_run()
                r_img.add_picture(
                    BytesIO(png),
                    width=Pt(icon_pt),
                    height=Pt(icon_pt),
                )
                if icon_gap > 0:
                    n_nbsp = max(1, min(6, int(round(icon_gap / 2.5))))
                    r_sp = p.add_run("\u00a0" * n_nbsp)
                    r_sp.font.size = Pt(style.contact_font_size_pt)
                    r_sp.font.name = style.font_primary
            except (OSError, ValueError):
                pass
        run = p.add_run(disp)
        run.font.size = Pt(style.contact_font_size_pt)
        run.font.name = style.font_primary
        _apply_run_resume_color(run, style, "resume_text_color_primary")
        _set_run_character_spacing(run, style.contact_span_letter_spacing_pt)
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        space_before = (
            style.contact_space_before_after_tagline_pt
            if has_tagline and contact_idx == 0
            else (style.contact_space_before_pt if contact_idx == 0 and not has_tagline else 0)
        )
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(1.5)
        _set_line_spacing_multiple(p, style.contact_line_height)
        contact_idx += 1

    if contact_idx and cell.paragraphs:
        base_after = float(style.contact_space_after_pt)
        trail = float(getattr(style, "sidebar_header_margin_bottom_pt", 0) or 0)
        cell.paragraphs[-1].paragraph_format.space_after = Pt(base_after + trail)
    elif cell.paragraphs:
        trail = float(getattr(style, "sidebar_header_margin_bottom_pt", 0) or 0)
        if trail > 0:
            lp = cell.paragraphs[-1]
            cur = lp.paragraph_format.space_after
            cur_pt = float(cur.pt) if cur else 0.0
            lp.paragraph_format.space_after = Pt(cur_pt + trail)


def _add_header(
    document: Document,
    resume_data: Dict[str, Any],
    style: DocxStyleConfig,
    style_preferences: dict | None = None,
) -> None:
    """Add name and contact line with proper styling."""
    header = resume_data.get("header", {})
    name = f"{header.get('first_name', '')} {header.get('last_name', '')}".strip()
    if name:
        p = document.add_paragraph()
        run = p.add_run(name)
        run.bold = True
        run.font.size = Pt(style.name_font_size_pt)
        run.font.name = style.font_primary
        _apply_run_resume_color(run, style, "resume_text_color_emphasis")
        _set_run_character_spacing(run, style.name_letter_spacing_pt or 0)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(style.name_space_after_pt)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

    has_tagline = False
    vis = header.get("visibility", {})
    if vis.get("showTagline", True):
        tagline = (header.get("tagline") or "").strip()
        if tagline:
            has_tagline = True
            p = document.add_paragraph()
            for text, t_bold, t_italic, t_underline in parse_tagline_runs(tagline):
                run = p.add_run(text)
                run.font.size = Pt(style.tagline_font_size_pt)
                run.font.name = style.font_primary
                run.bold = t_bold
                run.italic = t_italic
                run.font.underline = WD_UNDERLINE.SINGLE if t_underline else WD_UNDERLINE.NONE
                _apply_run_resume_color(run, style, "resume_text_color_primary")
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_after = Pt(style.tagline_space_after_pt)
            _set_line_spacing_multiple(p, style.tagline_line_height)

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
    url_disp = resolve_contact_url_display(style_preferences)
    fields = []
    for field_key in contact_order:
        if field_key in field_map:
            val = field_map[field_key]
            vis_key = visibility_map.get(field_key)
            is_visible = visibility.get(vis_key, True) if vis_key else True
            if val and str(val).strip() and is_visible:
                fields.append(
                    format_contact_field_display(
                        field_key,
                        str(val).strip(),
                        contact_url_display=url_disp,
                    )
                )
    if fields:
        p = document.add_paragraph()
        run = p.add_run(" | ".join(fields))
        run.font.size = Pt(style.contact_font_size_pt)
        run.font.name = style.font_primary  # Georgia (contact line), not Times New Roman
        _apply_run_resume_color(run, style, "resume_text_color_primary")
        _set_run_character_spacing(run, style.contact_span_letter_spacing_pt)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        space_before = (
            style.contact_space_before_after_tagline_pt
            if has_tagline
            else style.contact_space_before_pt
        )
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(style.contact_space_after_pt)
        _set_line_spacing_multiple(p, style.contact_line_height)


def _add_section_title(doc: Any, title: str, style: DocxStyleConfig) -> None:
    """Add a section heading with bottom border on the same paragraph; space_after clears content below."""
    p = doc.add_paragraph()
    run = p.add_run(title)
    run.font.size = Pt(style.section_title_font_size_pt)
    run.font.name = style.font_primary
    _apply_run_resume_color(run, style, "resume_text_color_emphasis")
    p.paragraph_format.space_before = Pt(style.section_title_space_before_pt)
    p.paragraph_format.space_after = Pt(style.section_title_space_after_pt)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    _apply_section_title_bottom_border(p)


def _add_para(
    doc: Any,
    text: str,
    style: DocxStyleConfig,
    *,
    font_size_pt: Optional[float] = None,
    font_name: Optional[str] = None,
    bold: bool = False,
    italic: bool = False,
    indent_pt: float = 0,
    first_line_indent_pt: float = 0,
    space_before_pt: float = 0,
    space_after_pt: float = 0,
    alignment: Optional[WD_ALIGN_PARAGRAPH] = None,
) -> None:
    """Add a styled paragraph."""
    if not text or not str(text).strip():
        return
    p = doc.add_paragraph()
    run = p.add_run(str(text).strip())
    run.font.size = Pt(font_size_pt or style.description_font_size_pt)
    if font_name:
        run.font.name = font_name
    else:
        run.font.name = style.font_primary if bold else style.font_secondary
    run.bold = bold
    run.italic = italic
    _apply_run_resume_color(run, style, "resume_text_color_primary")
    if indent_pt:
        p.paragraph_format.left_indent = Pt(indent_pt)
    if first_line_indent_pt:
        p.paragraph_format.first_line_indent = Pt(first_line_indent_pt)
    p.paragraph_format.space_before = Pt(space_before_pt)
    p.paragraph_format.space_after = Pt(space_after_pt)
    _set_line_spacing_multiple(p, style.prose_line_height)
    if alignment is not None:
        p.alignment = alignment


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
    doc: Any,
    style: DocxStyleConfig,
    description: str,
    indent_pt: float,
) -> None:
    """
    Add description with bullets set off to the side (matches PDF).
    Word bullets: single line spacing; space before/after from word_bullet_* tokens (see PDF_WORD_SPACING.md).
    Non-bullet lines keep prose_line_height and description_paragraph_space_pt.
    """
    items = _parse_description_items(description)
    if not items:
        return
    first = True
    for item_type, content in items:
        if not content or not str(content).strip():
            continue
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        if first:
            if item_type == "bullet":
                p.paragraph_format.space_before = Pt(
                    style.description_block_space_before_pt + style.word_bullet_space_before_pt
                )
            else:
                p.paragraph_format.space_before = Pt(style.description_block_space_before_pt)
            first = False
        else:
            if item_type == "bullet":
                p.paragraph_format.space_before = Pt(style.word_bullet_space_before_pt)
            else:
                p.paragraph_format.space_before = Pt(0)
        if item_type == "bullet":
            li_pad = float(getattr(style, "description_bullet_li_padding_left_pt", 2.0) or 0.0)
            hang = float(style.description_bullet_hang_pt)
            bullet_left_pt = indent_pt + style.description_bullet_indent_pt
            # Hanging bullet: first line starts at bullet_left; all text (line 1 + wraps) aligns at text_left.
            # Tab stop must use the same distance as w:ind w:left (Word: tab pos matches hanging body indent).
            text_left_pt = bullet_left_pt + hang + li_pad
            p.paragraph_format.left_indent = Pt(text_left_pt)
            p.paragraph_format.first_line_indent = Pt(-(hang + li_pad))
            p.paragraph_format.tab_stops.add_tab_stop(
                Pt(text_left_pt),
                WD_TAB_ALIGNMENT.LEFT,
            )
            p.paragraph_format.space_after = Pt(style.word_bullet_space_after_pt)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            # Justify + hanging indents often mis-wrap; left aligns body lines with the tab column.
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            r_b = p.add_run("•")
            r_b.font.size = Pt(style.description_font_size_pt)
            r_b.font.name = style.font_primary
            _apply_run_resume_color(r_b, style, "resume_text_color_primary")
            r_tab = p.add_run("\t")
            r_tab.font.size = Pt(style.description_font_size_pt)
            r_tab.font.name = style.font_primary
            run = p.add_run(str(content).strip())
        else:
            p.paragraph_format.left_indent = Pt(indent_pt)
            p.paragraph_format.space_after = Pt(style.description_paragraph_space_pt)
            run = p.add_run(str(content).strip())
            _set_line_spacing_multiple(p, style.prose_line_height)
        run.font.size = Pt(style.description_font_size_pt)
        run.font.name = style.font_primary  # Georgia for bullets & description (Word)
        _apply_run_resume_color(run, style, "resume_text_color_primary")


# Matches pipeline.py / PDF: header is fixed; body sections follow resume_data.sectionOrder
DEFAULT_DOCX_SECTION_ORDER = ["summary", "education", "experience", "projects", "skills"]
_DOCX_SECTION_KEYS = frozenset(DEFAULT_DOCX_SECTION_ORDER)


def _normalize_docx_section_order(order: Any) -> List[str]:
    """Skip 'header'; dedupe; fall back to default if empty or invalid."""
    if not order or not isinstance(order, list):
        return list(DEFAULT_DOCX_SECTION_ORDER)
    seen = set()
    out: List[str] = []
    for key in order:
        if key == "header":
            continue
        if key in _DOCX_SECTION_KEYS and key not in seen:
            out.append(key)
            seen.add(key)
    if "summary" in out:
        out = ["summary"] + [k for k in out if k != "summary"]
    return out if out else list(DEFAULT_DOCX_SECTION_ORDER)


def _render_docx_summary_section(
    doc: Any,
    resume_data: Dict[str, Any],
    style: DocxStyleConfig,
    indent: float,
    section_labels: Dict[str, Any],
    defaults: Dict[str, str],
) -> None:
    summary = resume_data.get("summary")
    if not summary or not isinstance(summary, dict):
        return
    text = summary.get("summary", "").strip()
    if not text:
        return
    _add_section_title(doc, section_labels.get("summary", defaults["summary"]), style)
    summary_indent = indent + style.summary_text_padding_left_pt
    _add_para(
        doc, text, style,
        font_size_pt=style.summary_font_size_pt,
        font_name=style.font_primary,
        indent_pt=summary_indent,
        first_line_indent_pt=style.summary_first_line_indent_pt,
        space_after_pt=style.summary_space_after_pt,
        alignment=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )


def _render_docx_education_section(
    doc: Any,
    resume_data: Dict[str, Any],
    style: DocxStyleConfig,
    indent: float,
    section_labels: Dict[str, Any],
    defaults: Dict[str, str],
) -> None:
    education = resume_data.get("education") or []
    if not education:
        return
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

        left_runs = [
            (edu.get("school", ""), style.school_name_font_size_pt, True, False),
        ]
        if gpa_text:
            left_runs.append(
                (gpa_text, style.school_gpa_font_size_pt, False, True, False)
            )
        _add_two_column_line(
            doc, style,
            left_runs,
            (date_range, style.school_meta_font_size_pt, False, True) if date_range else None,
            indent_pt=indent,
            space_after_pt=style.school_name_line_space_after_pt,
        )

        loc = edu.get("location", "")
        deg_sz = style.education_degree_line_font_size_pt
        _add_two_column_line(
            doc, style,
            [(degree_text, deg_sz, False, True)],
            (loc, style.school_meta_font_size_pt, False, True) if loc else None,
            indent_pt=indent,
            space_after_pt=style.school_line_space_after_pt,
        )
        hl_between = float(getattr(style, "highlights_gap_pt", 4.5) or 4.5)
        hl_ord = 0
        for sub_title, sub_content in (edu.get("subsections") or {}).items():
            if sub_content and str(sub_content).strip():
                p = doc.add_paragraph()
                p.paragraph_format.left_indent = Pt(indent)
                p.paragraph_format.space_before = Pt(0 if hl_ord == 0 else hl_between)
                hl_ord += 1
                p.paragraph_format.space_after = Pt(style.word_highlight_space_after_pt)
                p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
                if sub_title:
                    r1 = p.add_run(f"{sub_title}: ")
                    r1.bold = True
                    r1.font.size = Pt(style.highlight_font_size_pt)
                    r1.font.name = style.font_primary
                    _apply_run_resume_color(r1, style, "resume_text_color_highlight_title")
                r2 = p.add_run(str(sub_content).strip())
                r2.font.size = Pt(style.highlight_font_size_pt)
                r2.font.name = style.font_primary
                _apply_run_resume_color(r2, style, "resume_text_color_primary")


def _render_docx_experience_section(
    doc: Any,
    resume_data: Dict[str, Any],
    style: DocxStyleConfig,
    indent: float,
    section_labels: Dict[str, Any],
    defaults: Dict[str, str],
) -> None:
    experience = resume_data.get("experience") or []
    if not experience:
        return
    _add_section_title(doc, section_labels.get("experience", defaults["experience"]), style)
    for exp in experience:
        start_raw = exp.get("start_date") or exp.get("startDate") or ""
        end_raw = exp.get("end_date") or exp.get("endDate") or ""
        date_range = _format_date_range(start_raw, end_raw, exp.get("current", False))

        _add_two_column_line(
            doc, style,
            [(exp.get("title", ""), style.experience_title_font_size_pt, True, False)],
            (date_range, style.experience_meta_font_size_pt, False, True) if date_range else None,
            indent_pt=indent,
            space_before_pt=style.experience_line_space_before_pt,
            space_after_pt=style.experience_line_space_pt,
            line_spacing_single=True,
        )

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
            space_after_pt=style.company_line_space_after_pt,
            line_spacing_single=True,
        )
        desc = exp.get("description", "")
        if desc and str(desc).strip():
            _add_description_block(doc, style, str(desc), indent)


def _render_docx_projects_section(
    doc: Any,
    resume_data: Dict[str, Any],
    style: DocxStyleConfig,
    indent: float,
    section_labels: Dict[str, Any],
    defaults: Dict[str, str],
    *,
    sidebar_main_column: bool = False,
) -> None:
    projects = resume_data.get("projects") or []
    if not projects:
        return
    _add_section_title(doc, section_labels.get("projects", defaults["projects"]), style)
    meta_sz = float(style.project_title_font_size_pt)
    for proj in projects:
        title = proj.get("title", "")
        tech = proj.get("tech_stack") or proj.get("techStack") or []
        tech_str = ", ".join(tech) if isinstance(tech, list) else str(tech or "")
        url = str(proj.get("url") or "").strip()

        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Pt(indent)
        p.paragraph_format.space_before = Pt(style.project_title_space_before_pt)
        p.paragraph_format.space_after = (
            Pt(style.project_line_space_pt * 0.35)
            if sidebar_main_column and (tech_str or url)
            else Pt(style.project_line_space_pt)
        )
        _set_line_spacing_multiple(p, 1.0)
        r1 = p.add_run(title)
        r1.bold = True
        r1.font.size = Pt(meta_sz)
        r1.font.name = style.font_primary
        _apply_run_resume_color(r1, style, "resume_text_color_emphasis")

        if sidebar_main_column and (tech_str or url):
            p2 = doc.add_paragraph()
            p2.paragraph_format.left_indent = Pt(indent)
            p2.paragraph_format.space_after = Pt(style.project_line_space_pt)
            _set_line_spacing_multiple(p2, 1.0)
            if url:
                p2.paragraph_format.tab_stops.add_tab_stop(
                    Inches(style.two_column_tab_in),
                    WD_TAB_ALIGNMENT.RIGHT,
                )
            if tech_str:
                r_t = p2.add_run(tech_str)
                r_t.italic = True
                r_t.font.size = Pt(meta_sz)
                r_t.font.name = style.font_secondary
                _apply_run_resume_color(r_t, style, "resume_text_color_secondary")
            if url:
                p2.add_run("\t")
                r_u = p2.add_run(url)
                r_u.italic = True
                r_u.font.size = Pt(meta_sz)
                r_u.font.name = style.font_secondary
                _apply_run_resume_color(r_u, style, "resume_text_color_secondary")
        elif tech_str or url:
            extras = []
            if tech_str:
                extras.append(tech_str)
            if url:
                extras.append(url)
            p.add_run(" | ")
            r2 = p.add_run(" | ".join(extras))
            r2.italic = True
            r2.font.size = Pt(meta_sz)
            r2.font.name = style.font_secondary
            _apply_run_resume_color(r2, style, "resume_text_color_secondary")
        desc = proj.get("description", "")
        if desc and str(desc).strip():
            _add_description_block(doc, style, str(desc), indent)


def _render_docx_skills_section(
    doc: Any,
    resume_data: Dict[str, Any],
    style: DocxStyleConfig,
    indent: float,
    section_labels: Dict[str, Any],
    defaults: Dict[str, str],
) -> None:
    skills = resume_data.get("skills") or []
    skills_category_order = resume_data.get("skillsCategoryOrder") or []
    if not skills:
        return

    skills_by_cat: Dict[str, List[str]] = {}
    uncategorized: List[str] = []
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
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        r1 = p.add_run(f"{cat}: ")
        r1.bold = True
        r1.font.size = Pt(style.skill_category_font_size_pt)
        r1.font.name = style.font_primary
        _apply_run_resume_color(r1, style, "resume_text_color_emphasis")
        r2 = p.add_run(", ".join(skills_by_cat[cat]))
        r2.font.size = Pt(style.skill_names_font_size_pt)
        r2.font.name = style.font_primary
        _apply_run_resume_color(r2, style, "resume_text_color_primary")
    if uncategorized:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Pt(indent)
        p.paragraph_format.space_after = Pt(style.skill_line_space_pt)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        r = p.add_run(", ".join(uncategorized))
        r.font.size = Pt(style.skill_names_font_size_pt)
        r.font.name = style.font_primary
        _apply_run_resume_color(r, style, "resume_text_color_primary")


def _set_cell_margins_inches(
    cell: Any,
    *,
    top: float = 0,
    left: float = 0,
    bottom: float = 0,
    right: float = 0,
) -> None:
    """Word tcMar in twips (dxa): inset cell text from cell border."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    for old in list(tcPr.findall(qn("w:tcMar"))):
        tcPr.remove(old)
    if top <= 0 and left <= 0 and bottom <= 0 and right <= 0:
        return
    tcMar = OxmlElement("w:tcMar")
    for tag, inches in (
        ("w:top", top),
        ("w:left", left),
        ("w:bottom", bottom),
        ("w:right", right),
    ):
        if inches <= 0:
            continue
        el = OxmlElement(tag)
        el.set(qn("w:w"), str(int(round(float(inches) * 1440))))
        el.set(qn("w:type"), "dxa")
        tcMar.append(el)
    tcPr.append(tcMar)


# Sidebar DOCX: stretch table row to page height only when content likely fits on one page.
# Word may still paginate oddly if the row splits across pages (tall fixed row + overflow).
_SIDEBAR_DOCX_FILL_ROW_SLACK_TWIPS = 720  # heuristic one-pager: room for pagination / sectPr
_SIDEBAR_DOCX_FILL_ROW_SLACK_TWIPS_DOCX_MAX_1 = (
    720  # ~0.5in under full body + stub para before sectPr — fewer phantom pages than 240
)
_SIDEBAR_DOCX_AVG_LINE_PT = 12.75
_SIDEBAR_DOCX_ONE_PAGE_LINES_FRAC = 0.78  # conservative; underestimate risk = blank page again


def _sidebar_docx_wrapped_line_count(text: str, chars_per_line: float = 58.0) -> float:
    t = (text or "").strip()
    if not t:
        return 0.0
    total = 0.0
    for seg in t.split("\n"):
        seg = seg.strip()
        if not seg:
            total += 0.35
            continue
        total += max(1.0, len(seg) / chars_per_line)
    return total


def _estimate_sidebar_docx_main_column_lines(resume_data: Dict[str, Any]) -> float:
    lines = 0.0
    for key in sidebar_main_column_order(resume_data):
        if key == "summary":
            summ = (resume_data.get("summary") or {}).get("summary") or ""
            if not str(summ).strip():
                continue
            lines += 3.4
            lines += _sidebar_docx_wrapped_line_count(str(summ), 56.0)
        elif key == "experience":
            exps = resume_data.get("experience") or []
            if not exps:
                continue
            lines += 3.6
            for exp in exps:
                if not isinstance(exp, dict):
                    exp = {}
                lines += 2.8
                desc = str(exp.get("description") or "")
                lines += _sidebar_docx_wrapped_line_count(desc, 56.0) * 1.08
                lines += 1.35
        elif key == "projects":
            projs = resume_data.get("projects") or []
            if not projs:
                continue
            lines += 3.6
            for proj in projs:
                if not isinstance(proj, dict):
                    proj = {}
                lines += 3.2
                desc = str(proj.get("description") or "")
                lines += _sidebar_docx_wrapped_line_count(desc, 56.0)
                lines += 0.9
    return lines


def _estimate_sidebar_docx_rail_lines(resume_data: Dict[str, Any]) -> float:
    lines = 6.5
    header = resume_data.get("header") or {}
    vis = header.get("visibility") or {}
    if vis.get("showTagline", True) and (header.get("tagline") or "").strip():
        lines += 1.6
    order = header.get(
        "contactOrder",
        ["email", "phone", "location", "linkedin", "github", "portfolio"],
    )
    field_map = {
        "email": header.get("email", ""),
        "phone": header.get("phone", ""),
        "location": header.get("location", ""),
        "linkedin": header.get("linkedin", ""),
        "github": header.get("github", ""),
        "portfolio": header.get("portfolio", ""),
    }
    vis_map = {
        "email": "showEmail",
        "phone": "showPhone",
        "location": "showLocation",
        "linkedin": "showLinkedin",
        "github": "showGithub",
        "portfolio": "showPortfolio",
    }
    n_contact = 0
    for fk in order:
        if fk not in field_map:
            continue
        val = str(field_map.get(fk) or "").strip()
        if not val:
            continue
        vk = vis_map.get(fk)
        if vk and not vis.get(vk, True):
            continue
        n_contact += 1
    lines += max(0.0, n_contact - 1) * 1.05 + (1.0 if n_contact else 0.0)

    for key in sidebar_rail_section_order(resume_data):
        if key == "skills":
            skills = resume_data.get("skills") or []
            if not skills:
                continue
            lines += 3.0
            cat_order = resume_data.get("skillsCategoryOrder") or []
            groups = skills_group_ordered(skills, cat_order if cat_order else None)
            for category, names in groups:
                if not names:
                    continue
                if category:
                    lines += 1.15
                # Narrow column: names wrap more often
                joined_len = sum(len(str(n)) for n in names) + max(0, len(names) - 1) * 2
                lines += max(1.0, joined_len / 34.0)
                lines += 0.35
        elif key == "education":
            edu_list = resume_data.get("education") or []
            if not edu_list:
                continue
            lines += 3.0
            for edu in edu_list:
                if not isinstance(edu, dict):
                    edu = {}
                subs = edu.get("subsections") or {}
                if not isinstance(subs, dict):
                    subs = {}
                lines += 5.8 + min(8.0, len(subs)) * 1.8
    return lines


def _sidebar_docx_row_likely_fits_one_page(sect: Any, resume_data: Dict[str, Any]) -> bool:
    """If True, safe(r) to use a large w:trHeight@exact so the rail fills the sheet."""
    body_h_in = float(sect.page_height.inches) - float(sect.top_margin.inches) - float(
        sect.bottom_margin.inches
    )
    usable_lines = (max(1.0, body_h_in) * 72.0) / _SIDEBAR_DOCX_AVG_LINE_PT
    cap = usable_lines * _SIDEBAR_DOCX_ONE_PAGE_LINES_FRAC
    main_l = _estimate_sidebar_docx_main_column_lines(resume_data)
    rail_l = _estimate_sidebar_docx_rail_lines(resume_data)
    return max(main_l, rail_l) <= cap


def _hex_rgb_6_for_word(raw: Any) -> str:
    """Normalize #RGB / #RRGGBB to RRGGBB for Word w:fill / w:color, or ''."""
    if raw is None:
        return ""
    s = str(raw).strip()
    if not s:
        return ""
    if s.startswith("#"):
        s = s[1:]
    if len(s) == 3 and all(c in "0123456789ABCDEFabcdef" for c in s):
        s = "".join(c * 2 for c in s)
    if len(s) != 6 or not all(c in "0123456789ABCDEFabcdef" for c in s):
        return ""
    return s.upper()


def _finalize_sidebar_split_table(
    tbl: Any,
    sect: Any,
    rail_in: float,
    main_in: float,
    *,
    fill_row_to_page: bool = False,
    fill_slack_twips: int = _SIDEBAR_DOCX_FILL_ROW_SLACK_TWIPS,
    fill_row_height_in: float | None = None,
) -> None:
    """
    python-docx sets tblGrid from Column.width but leaves each tcW at the same default
    (~3in), so Word often renders a near 50/50 split. Force table + cell widths to
    match the intended rail/main inches.

    Optional **fill_row_to_page**: set w:trHeight@hRule=**exact** to the height from
    **fill_row_height_in** (e.g. 10.795in on Letter). If unset/≤0, falls back to printable
    body minus **fill_slack_twips** (also exact).
    """
    usable_in = (
        float(sect.page_width.inches)
        - float(sect.left_margin.inches)
        - float(sect.right_margin.inches)
    )
    usable_twips = int(round(max(0.5, usable_in) * 1440))
    rail_twips = int(round(max(0.25, float(rail_in)) * 1440))
    main_twips = max(int(round(float(main_in) * 1440)), 1)
    # Keep grid exact to printable width so Word does not rescale columns.
    drift = usable_twips - (rail_twips + main_twips)
    if drift != 0:
        main_twips += drift

    tbl_el = tbl._tbl
    tbl_pr = tbl_el.find(qn("w:tblPr"))
    if tbl_pr is None:
        tbl_pr = OxmlElement("w:tblPr")
        tbl_el.insert(0, tbl_pr)

    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.insert(0, tbl_w)
    tbl_w.set(qn("w:type"), "dxa")
    tbl_w.set(qn("w:w"), str(usable_twips))

    tbl_layout = tbl_pr.find(qn("w:tblLayout"))
    if tbl_layout is None:
        tbl_layout = OxmlElement("w:tblLayout")
        tbl_pr.append(tbl_layout)
    tbl_layout.set(qn("w:type"), "fixed")

    tbl_grid = tbl_el.find(qn("w:tblGrid"))
    if tbl_grid is None:
        tbl_grid = OxmlElement("w:tblGrid")
        ins = len(tbl_el)
        for i, child in enumerate(tbl_el):
            if child.tag == qn("w:tr"):
                ins = i
                break
        tbl_el.insert(ins, tbl_grid)
    for old_gc in list(tbl_grid.findall(qn("w:gridCol"))):
        tbl_grid.remove(old_gc)
    for w_tw in (rail_twips, main_twips):
        gc = OxmlElement("w:gridCol")
        gc.set(qn("w:w"), str(w_tw))
        tbl_grid.append(gc)

    for ci, w_tw in enumerate((rail_twips, main_twips)):
        tc = tbl.rows[0].cells[ci]._tc
        tc_pr = tc.get_or_add_tcPr()
        tc_w = tc_pr.find(qn("w:tcW"))
        if tc_w is None:
            tc_w = OxmlElement("w:tcW")
            tc_pr.insert(0, tc_w)
        tc_w.set(qn("w:type"), "dxa")
        tc_w.set(qn("w:w"), str(w_tw))

    tr = tbl.rows[0]._tr
    tr_pr = tr.find(qn("w:trPr"))
    if tr_pr is not None:
        for old_th in list(tr_pr.findall(qn("w:trHeight"))):
            tr_pr.remove(old_th)
        if not fill_row_to_page and len(list(tr_pr)) == 0:
            tr.remove(tr_pr)
            tr_pr = None
    if fill_row_to_page:
        if tr_pr is None:
            tr_pr = OxmlElement("w:trPr")
            tr.insert(0, tr_pr)
        body_h_in = (
            float(sect.page_height.inches)
            - float(sect.top_margin.inches)
            - float(sect.bottom_margin.inches)
        )
        body_twips = int(round(max(1.0, body_h_in) * 1440))
        if fill_row_height_in is not None and float(fill_row_height_in) > 0:
            target = max(1000, int(round(float(fill_row_height_in) * 1440)))
            target = min(target, body_twips)
        else:
            slack = max(0, int(fill_slack_twips))
            target = max(1000, body_twips - slack)
        tr_h = OxmlElement("w:trHeight")
        tr_h.set(qn("w:val"), str(target))
        tr_h.set(qn("w:hRule"), "exact")
        tr_pr.append(tr_h)


def _apply_sidebar_rail_cell_appearance(cell: Any, style: DocxStyleConfig) -> None:
    """Rail cell: shading (sidebar_bg) + right divider (sidebar_border_*), PDF aside parity."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    for tag in ("w:shd", "w:tcBorders"):
        for old in list(tcPr.findall(qn(tag))):
            tcPr.remove(old)

    fill = _hex_rgb_6_for_word(getattr(style, "sidebar_bg", "") or "")
    if fill:
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), fill)
        tcPr.append(shd)

    border_c = _hex_rgb_6_for_word(
        getattr(style, "sidebar_border_color", None) or "#b8c2ce"
    )
    border_w = float(getattr(style, "sidebar_border_width_pt", 0.75) or 0.75)
    sz = max(2, min(96, int(round(border_w * 8))))
    if border_c:
        tb = OxmlElement("w:tcBorders")
        for side in ("top", "left", "bottom"):
            b = OxmlElement(f"w:{side}")
            b.set(qn("w:val"), "nil")
            tb.append(b)
        br = OxmlElement("w:right")
        br.set(qn("w:val"), "single")
        br.set(qn("w:sz"), str(sz))
        br.set(qn("w:space"), "0")
        br.set(qn("w:color"), border_c)
        tb.append(br)
        tcPr.append(tb)


def _add_section_title_sidebar_rail(
    doc: Any,
    title: str,
    style: DocxStyleConfig,
    *,
    left_indent_pt: float = 0,
    section_stack_margin_top_pt: float = 0,
) -> None:
    """Narrow-column section heading (~preview .resume-aside .section-title)."""
    p = doc.add_paragraph()
    if left_indent_pt:
        p.paragraph_format.left_indent = Pt(left_indent_pt)
    run = p.add_run(title)
    sz = max(8, int(round(style.section_title_font_size_pt * 0.9)))
    run.font.size = Pt(sz)
    run.font.name = style.font_primary
    _apply_run_resume_color(run, style, "resume_text_color_emphasis")
    p.paragraph_format.space_before = Pt(
        style.section_title_space_before_pt * 0.85 + section_stack_margin_top_pt
    )
    p.paragraph_format.space_after = Pt(style.section_title_space_after_pt * 0.85)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    _apply_section_title_bottom_border(p)


def _render_docx_education_rail(
    doc: Any,
    resume_data: Dict[str, Any],
    style: DocxStyleConfig,
    indent: float,
    section_labels: Dict[str, Any],
    defaults: Dict[str, str],
    *,
    section_stack_margin_top_pt: float = 0,
) -> bool:
    """Compact rail education; mirrors builders.sidebar_rail.build_education_entry_rail."""
    education = resume_data.get("education") or []
    rendered_any = False
    school_sz = max(8, int(round(style.school_name_font_size_pt * 0.92)))
    meta_sz = max(7, int(round(style.school_meta_font_size_pt * 0.88)))
    deg_sz = max(8, int(round(style.education_degree_line_font_size_pt * 1.05)))
    minor_sz = max(7, float(getattr(style, "education_rail_minor_font_size_pt", 9.0) or 9.0))
    hl_sz = max(7, int(round(style.highlight_font_size_pt)))
    gpa_after = float(getattr(style, "education_rail_gpa_space_after_pt", 6.0) or 6.0)
    hl_before = float(getattr(style, "education_rail_highlights_space_before_pt", 8.0) or 8.0)
    entry_tail_gap = float(
        getattr(style, "education_entry_margin_bottom_pt", 8.0) or 8.0
    )

    for edu in education:
        if not isinstance(edu, dict):
            edu = {}
        school_raw = (edu.get("school") or "").strip()
        degree = (edu.get("degree") or "").strip()
        discipline = (edu.get("discipline") or "").strip()
        minor = (edu.get("minor") or "").strip()
        location = (edu.get("location") or "").strip()
        gpa = (edu.get("gpa") or "").strip()
        start_raw = edu.get("start_date") or edu.get("startDate") or ""
        end_raw = edu.get("end_date") or edu.get("endDate") or ""
        date_range = _format_date_range(start_raw, end_raw, edu.get("current", False))
        minor_line = f"Minor in {minor}" if minor else ""
        has_major = bool(degree or discipline)
        subs = edu.get("subsections") or {}
        if not isinstance(subs, dict):
            subs = {}
        has_body = bool(
            school_raw or date_range or location or has_major or minor_line or gpa
        ) or bool(subs)
        if not has_body:
            continue

        if not rendered_any:
            _add_section_title_sidebar_rail(
                doc,
                section_labels.get("education", defaults["education"]),
                style,
                left_indent_pt=indent,
                section_stack_margin_top_pt=section_stack_margin_top_pt,
            )
            rendered_any = True

        if school_raw:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(style.school_line_space_after_pt)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            r = p.add_run(school_raw)
            r.bold = True
            r.font.size = Pt(school_sz)
            r.font.name = style.font_primary
            _apply_run_resume_color(r, style, "resume_text_color_emphasis")
        if date_range:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(1.25)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            r = p.add_run(date_range)
            r.font.size = Pt(meta_sz)
            r.font.name = style.font_secondary
            r.italic = True
            _apply_run_resume_color(r, style, "resume_text_color_secondary")
        if location:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(1.25)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            r = p.add_run(location)
            r.font.size = Pt(meta_sz)
            r.font.name = style.font_secondary
            r.italic = True
            _apply_run_resume_color(r, style, "resume_text_color_secondary")
        if degree and discipline:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(1.5)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            r1 = p.add_run(f"{degree} in ")
            r1.font.size = Pt(deg_sz)
            r1.font.name = style.font_secondary
            _apply_run_resume_color(r1, style, "resume_text_color_primary")
            r2 = p.add_run(discipline)
            r2.font.size = Pt(deg_sz)
            r2.font.name = style.font_secondary
            _apply_run_resume_color(r2, style, "resume_text_color_primary")
        elif degree:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(1.5)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            r = p.add_run(degree)
            r.font.size = Pt(deg_sz)
            r.font.name = style.font_secondary
            _apply_run_resume_color(r, style, "resume_text_color_primary")
        elif discipline:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(1.5)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            r = p.add_run(discipline)
            r.font.size = Pt(deg_sz)
            r.font.name = style.font_secondary
            _apply_run_resume_color(r, style, "resume_text_color_primary")
        if minor_line:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(1.25)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            r = p.add_run(minor_line)
            r.font.size = Pt(minor_sz)
            r.font.name = style.font_secondary
            _apply_run_resume_color(r, style, "resume_text_color_primary")
        if gpa:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(gpa_after)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            r = p.add_run(f"GPA: {gpa}")
            r.font.size = Pt(style.school_gpa_font_size_pt)
            r.font.name = style.font_secondary
            r.italic = True
            _apply_run_resume_color(r, style, "resume_text_color_secondary")

        hl_gap_pt = float(getattr(style, "highlights_gap_pt", 4.5) or 4.5)
        hl_block_i = 0
        for sub_title, sub_content in subs.items():
            st = str(sub_title).strip() if sub_title is not None else ""
            sc = str(sub_content).strip() if sub_content is not None else ""
            if not st and not sc:
                continue
            block_top = hl_before if hl_block_i == 0 else hl_gap_pt
            if st:
                p = doc.add_paragraph()
                p.paragraph_format.left_indent = Pt(indent)
                p.paragraph_format.space_before = Pt(block_top)
                p.paragraph_format.space_after = Pt(1.0)
                p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
                r = p.add_run(st)
                r.bold = True
                r.font.size = Pt(hl_sz)
                r.font.name = style.font_primary
                _apply_run_resume_color(r, style, "resume_text_color_highlight_title")
            if sc:
                p = doc.add_paragraph()
                p.paragraph_format.left_indent = Pt(indent)
                p.paragraph_format.space_before = Pt(0 if st else block_top)
                # No space_after: PDF rail uses flex gap between .hl blocks, not margin on body.
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
                r = p.add_run(sc)
                r.font.size = Pt(hl_sz)
                r.font.name = style.font_primary
                _apply_run_resume_color(r, style, "resume_text_color_primary")

            hl_block_i += 1

        if doc.paragraphs:
            doc.paragraphs[-1].paragraph_format.space_after = Pt(entry_tail_gap)

    return rendered_any


def _render_docx_skills_rail_section(
    doc: Any,
    resume_data: Dict[str, Any],
    style: DocxStyleConfig,
    indent: float,
    section_labels: Dict[str, Any],
    defaults: Dict[str, str],
    *,
    section_stack_margin_top_pt: float = 0,
) -> bool:
    """Stacked category titles + skill lines (builders.build_skill_entry_rail semantics)."""
    skills = resume_data.get("skills") or []
    category_order = resume_data.get("skillsCategoryOrder") or []
    groups = skills_group_ordered(skills, category_order if category_order else None)
    if not groups:
        return False

    _add_section_title_sidebar_rail(
        doc,
        section_labels.get("skills", defaults["skills"]),
        style,
        left_indent_pt=indent,
        section_stack_margin_top_pt=section_stack_margin_top_pt,
    )
    cat_sz = max(8, int(round(style.skill_category_font_size_pt * 0.95)))
    name_sz = max(8, int(round(style.skill_names_font_size_pt * 0.95)))

    for category, names in groups:
        if not names:
            continue
        if category:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(indent)
            p.paragraph_format.space_after = Pt(2.0)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            r = p.add_run(str(category))
            r.bold = True
            r.font.size = Pt(cat_sz)
            r.font.name = style.font_primary
            _apply_run_resume_color(r, style, "resume_text_color_emphasis")
        p2 = doc.add_paragraph()
        p2.paragraph_format.left_indent = Pt(indent)
        p2.paragraph_format.space_after = Pt(style.skill_line_space_pt)
        _set_line_spacing_multiple(p2, style.skill_line_height)
        r2 = p2.add_run(", ".join(names))
        r2.font.size = Pt(name_sz)
        r2.font.name = style.font_primary
        _apply_run_resume_color(r2, style, "resume_text_color_primary")

    return True


def _remove_singleton_empty_paragraph(cell: Any) -> None:
    """New table cells contain one empty paragraph; remove it before adding content."""
    paras = cell.paragraphs
    if len(paras) != 1:
        return
    if paras[0].text.strip():
        return
    el = paras[0]._element
    parent = el.getparent()
    if parent is not None:
        parent.remove(el)


def _strip_document_leading_empty_paragraph(doc: Document) -> None:
    if not doc.paragraphs:
        return
    p0 = doc.paragraphs[0]
    if p0.text.strip():
        return
    el = p0._element
    parent = el.getparent()
    if parent is not None:
        parent.remove(el)


def _sidebar_docx_tail_paragraph_before_sectpr(doc: Document) -> None:
    """
    Word often reserves a second page when w:body ends with w:tbl and w:sectPr is the
    next sibling (near full-page row height makes this worse). Insert a 1pt, zero-
    layout paragraph between them so pagination can close the section on page 1.
    """
    body = doc.element.body
    kids = list(body)
    if len(kids) < 2 or kids[-1].tag != qn("w:sectPr"):
        return
    if kids[-2].tag == qn("w:p"):
        return
    idx = len(kids) - 1
    p = OxmlElement("w:p")
    pPr = OxmlElement("w:pPr")
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:before"), "0")
    spacing.set(qn("w:after"), "0")
    spacing.set(qn("w:line"), "20")
    spacing.set(qn("w:lineRule"), "exact")
    pPr.append(spacing)
    p.append(pPr)
    r = OxmlElement("w:r")
    rPr = OxmlElement("w:rPr")
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), "2")
    sz_cs = OxmlElement("w:szCs")
    sz_cs.set(qn("w:val"), "2")
    rPr.append(sz)
    rPr.append(sz_cs)
    r.append(rPr)
    t = OxmlElement("w:t")
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = "\u200b"
    r.append(t)
    p.append(r)
    body.insert(idx, p)


def _build_docx_sidebar_split_document(
    resume_data: Dict[str, Any],
    style: DocxStyleConfig,
    style_preferences: dict | None = None,
    *,
    template_slug: str = "sidebar",
    docx_max_pages: int | None = None,
) -> bytes:
    """
    sidebar_split: one row × two columns; rail = identity + contact + skills/education
    (sectionOrder); main = summary + experience + projects.
    """
    doc = Document()
    sect = doc.sections[0]
    # Match PDF: Playwright margin is 0 for sidebar; resume is a full Letter box and
    # preview.css applies margin_top / pad_x / margin_bottom inside each column.
    sect.top_margin = Inches(0)
    sect.bottom_margin = Inches(0)
    sect.left_margin = Inches(0)
    sect.right_margin = Inches(0)
    # Word reserves ~0.5" for header/footer in w:pgMar even when empty; clear it so the
    # table can align with the physical page like the PDF (Playwright margin 0).
    sect.header_distance = Inches(0)
    sect.footer_distance = Inches(0)

    _strip_document_leading_empty_paragraph(doc)

    usable_pt = (
        float(sect.page_width.pt)
        - float(sect.left_margin.pt)
        - float(sect.right_margin.pt)
    )
    usable_in = usable_pt / 72.0
    rail_in = float(style.sidebar_width_in)
    main_in = max(1.25, usable_in - rail_in)

    tbl = doc.add_table(rows=1, cols=2)
    tbl.autofit = False
    try:
        tbl.allow_autofit = False
    except AttributeError:
        pass
    tbl.columns[0].width = Inches(rail_in)
    tbl.columns[1].width = Inches(main_in)

    left_cell = tbl.rows[0].cells[0]
    right_cell = tbl.rows[0].cells[1]
    _remove_singleton_empty_paragraph(left_cell)
    _remove_singleton_empty_paragraph(right_cell)

    # PDF .resume-aside: padding = margin_top, pad_x, margin_bottom, pad_x (shading still
    # fills the rail). No page margin + no left tcMar so the rail is flush to the paper edge;
    # text uses paragraph left_indent from sidebar_pad_x_in (header + section renders).
    pad_x = float(style.sidebar_pad_x_in)
    mt = float(style.margin_top_in)
    mb = float(style.margin_bottom_in)
    mr = float(style.margin_right_in)
    _set_cell_margins_inches(
        left_cell, top=mt, bottom=mb, left=0, right=pad_x
    )
    _apply_sidebar_rail_cell_appearance(left_cell, style)
    main_left_pad = float(style.sidebar_body_pad_left_in)
    _set_cell_margins_inches(
        right_cell, top=mt, bottom=mb, left=main_left_pad, right=mr
    )

    _add_sidebar_rail_header(
        left_cell,
        resume_data,
        style,
        style_preferences,
        template_slug=template_slug,
    )

    section_labels = resume_data.get("sectionLabels", {})
    defaults = {
        "summary": "Professional Summary",
        "education": "Education",
        "experience": "Experience",
        "projects": "Projects",
        "skills": "Skills",
    }
    rail_indent = float(style.sidebar_pad_x_in) * 72.0

    rail_blocks = 0
    for key in sidebar_rail_section_order(resume_data):
        stack_m = (
            float(getattr(style, "sidebar_rail_section_stack_margin_top_pt", 0) or 0)
            if rail_blocks
            else 0.0
        )
        if key == "skills":
            if _render_docx_skills_rail_section(
                left_cell,
                resume_data,
                style,
                rail_indent,
                section_labels,
                defaults,
                section_stack_margin_top_pt=stack_m,
            ):
                rail_blocks += 1
        elif key == "education":
            if _render_docx_education_rail(
                left_cell,
                resume_data,
                style,
                rail_indent,
                section_labels,
                defaults,
                section_stack_margin_top_pt=stack_m,
            ):
                rail_blocks += 1

    inner_main_in = max(1.0, main_in - main_left_pad - mr)
    tab_main = max(1.25, inner_main_in - 0.01)
    style_main = replace(
        style,
        two_column_tab_in=tab_main,
        summary_text_padding_left_pt=float(style.sidebar_summary_text_padding_left_pt),
        summary_first_line_indent_pt=float(style.sidebar_summary_first_line_indent_pt),
    )
    main_indent = float(style.sidebar_section_content_indent_pt)

    for key in sidebar_main_column_order(resume_data):
        if key == "summary":
            _render_docx_summary_section(
                right_cell, resume_data, style_main, main_indent, section_labels, defaults
            )
        elif key == "experience":
            _render_docx_experience_section(
                right_cell, resume_data, style_main, main_indent, section_labels, defaults
            )
        elif key == "projects":
            _render_docx_projects_section(
                right_cell,
                resume_data,
                style_main,
                main_indent,
                section_labels,
                defaults,
                sidebar_main_column=True,
            )

    if docx_max_pages == 1:
        fill_row = True
        slack = _SIDEBAR_DOCX_FILL_ROW_SLACK_TWIPS_DOCX_MAX_1
    else:
        fill_row = _sidebar_docx_row_likely_fits_one_page(sect, resume_data)
        slack = _SIDEBAR_DOCX_FILL_ROW_SLACK_TWIPS
    row_h_in = float(getattr(style, "sidebar_docx_fill_row_height_in", 0.0) or 0.0)
    _finalize_sidebar_split_table(
        tbl,
        sect,
        rail_in,
        main_in,
        fill_row_to_page=fill_row,
        fill_slack_twips=slack,
        fill_row_height_in=row_h_in if row_h_in > 0 else None,
    )
    if fill_row:
        _sidebar_docx_tail_paragraph_before_sectpr(doc)

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()


def build_docx(
    resume_data: Dict[str, Any],
    template_name: str = "classic",
    style_preferences: dict | None = None,
) -> bytes:
    """
    Build a styled Word document from resume_data.
    Uses ``shared.styles.get_styles`` for template-consistent formatting (margins, fonts, spacing).
    Body sections follow resume_data.sectionOrder (same as PDF/HTML), after the header.
    """
    name = normalize_template_slug(template_name)
    style = get_styles(name, style_preferences)
    if load_layout_profile(name) == LAYOUT_SIDEBAR_SPLIT:
        return _build_docx_sidebar_split_document(
            resume_data,
            style,
            style_preferences,
            template_slug=name,
            docx_max_pages=resolve_docx_max_pages(name, resume_data),
        )

    doc = Document()

    # Page margins (match .resume padding)
    sect = doc.sections[0]
    sect.top_margin = Inches(style.margin_top_in)
    sect.bottom_margin = Inches(style.margin_bottom_in)
    sect.left_margin = Inches(style.margin_left_in)
    sect.right_margin = Inches(style.margin_right_in)

    # Header (always first)
    _add_header(doc, resume_data, style, style_preferences)

    section_labels = resume_data.get("sectionLabels", {})
    defaults = {
        "summary": "Professional Summary",
        "education": "Education",
        "experience": "Experience",
        "projects": "Projects",
        "skills": "Skills",
    }

    indent = style.section_content_indent_pt

    section_order = _normalize_docx_section_order(resume_data.get("sectionOrder"))
    renderers = {
        "summary": _render_docx_summary_section,
        "education": _render_docx_education_section,
        "experience": _render_docx_experience_section,
        "projects": _render_docx_projects_section,
        "skills": _render_docx_skills_section,
    }
    for section_key in section_order:
        fn = renderers.get(section_key)
        if fn:
            fn(doc, resume_data, style, indent, section_labels, defaults)

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()
