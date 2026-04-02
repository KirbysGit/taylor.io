# docx_styles.py
# Word-facing style token dataclass. Values mirror backend/templates/classic/preview.css.
# Merged token loading lives in ``generator.shared.styles`` (``get_styles``).

from dataclasses import dataclass


@dataclass
class DocxStyleConfig:
    """Style tokens for docx output. Matches preview.css where possible."""

    # ---- Page / document ----
    # .resume padding: 0.43in top, 0.5in sides, 0.19in bottom
    margin_top_in: float = 0.43
    margin_bottom_in: float = 0.19
    margin_left_in: float = 0.5
    margin_right_in: float = 0.5

    # ---- Font families (Word-compatible) ----
    font_primary: str = "Georgia"  # .name, .section-title, .company-name, etc.
    font_secondary: str = "Times New Roman"  # .school-dates, .experience-dates, etc.

    # Body text colors (CSS rgba / #hex); Word uses alpha blended onto white. Sidebar + classic.
    resume_text_color_primary: str = "rgba(15, 23, 42, 0.92)"
    resume_text_color_secondary: str = "rgba(15, 23, 42, 0.78)"
    resume_text_color_tertiary: str = "rgba(15, 23, 42, 0.55)"
    resume_text_color_emphasis: str = "rgba(15, 23, 42, 0.96)"
    resume_text_color_highlight_title: str = "rgba(15, 23, 42, 0.88)"

    # ---- Header ----
    # .name: 32pt, bold
    name_font_size_pt: int = 32
    name_space_after_pt: float = 0.0  # space after name (before contact line)
    # Letter-spacing on name: CSS letter-spacing + Word expanded spacing (same token)
    name_letter_spacing_pt: float = 0.5

    # Optional tagline (between name and contact)
    tagline_font_size_pt: float = 11.0
    tagline_line_height: float = 1.2
    tagline_space_after_pt: float = 2.5
    # When a tagline is shown, contact line sits right under it (small gap via tagline_space_after)
    contact_space_before_after_tagline_pt: float = 0.0

    # Contact line (centered under name); negative = tighter, same token as `.contact span` letter-spacing in preview.css
    contact_span_letter_spacing_pt: float = 0.0
    contact_font_size_pt: float = 10.0
    contact_line_height: float = 1.0  # single-ish
    contact_space_before_pt: float = 3.0  # space between name and contact line (no tagline)
    contact_space_after_pt: float = 2.0  # space after contact line (before first section)

    # ---- Section title ----
    section_title_font_size_pt: int = 12
    section_title_space_before_pt: float = 2.0
    # Space below the title paragraph (divider is on the same paragraph); breathing room before body
    section_title_space_after_pt: float = 5.0

    # .section-content padding-left: 10pt
    section_content_indent_pt: float = 10.0

    # Entry-level padding (education-entry, etc.): 0 2.5pt
    entry_padding_pt: float = 2.5

    # ---- Education ----
    # .school-name: 12pt, bold
    school_name_font_size_pt: int = 12
    # GPA on school line (Georgia in Word)
    school_gpa_font_size_pt: int = 9
    # .school-dates (right column): 12pt, italic
    school_meta_font_size_pt: int = 12
    # "Bachelor of … in …" degree line (left column)
    education_degree_line_font_size_pt: int = 11
    # Space after university/school line (before degree line); keep tighter than degree→next
    school_name_line_space_after_pt: float = 0.0
    school_line_space_after_pt: float = 1.5

    # Right-aligned tab position for two-column lines (in). Content width ~7.5in.
    two_column_tab_in: float = 7.5

    # sidebar_split Word: rail column width (in). Classic templates ignore; sidebar resume_tokens sets this.
    sidebar_width_in: float = 2.68
    # Rail / main cell insets and main-column summary indents (sidebar resume_tokens)
    sidebar_pad_x_in: float = 0.34
    sidebar_body_pad_left_in: float = 0.3
    sidebar_section_content_indent_pt: float = 6.5
    sidebar_summary_text_padding_left_pt: float = 0.0
    sidebar_summary_first_line_indent_pt: float = 20.0
    sidebar_header_margin_bottom_pt: float = 12.0
    # Rail cell fill + divider (sidebar resume_tokens); classic export ignores.
    sidebar_bg: str = "#e9edf2"
    sidebar_border_width_pt: float = 0.75
    sidebar_border_color: str = "#b8c2ce"
    # Word-only: when row-fill runs, w:trHeight@exact height in inches (~full Letter body).
    # Classic ignores.
    sidebar_docx_fill_row_height_in: float = 10.795
    # Word rail: templates/<slug>/docx_icons/<field>.png (optional); square PNG recommended
    sidebar_docx_contact_icon_size_pt: float = 9.5
    sidebar_docx_contact_icon_text_gap_pt: float = 4.5

    # .highlight-title, .highlight-content: 10pt (title bold)
    highlight_font_size_pt: int = 10
    # .highlights-lines gap (PDF); Word: space before each highlight after the first in an entry
    highlights_gap_pt: float = 4.5
    # Word-only: education subsection (honors / highlights) lines — see PDF_WORD_SPACING.md
    word_highlight_space_after_pt: float = 3.0
    # Word-only: experience & project bullet paragraphs (shared _add_description_block)
    word_bullet_space_before_pt: float = 1.0
    word_bullet_space_after_pt: float = 1.5

    # sidebar rail education: minor line size (pt), GPA→highlights gap, highlights block top air
    education_rail_minor_font_size_pt: float = 9.0
    education_rail_gpa_space_after_pt: float = 6.0
    education_rail_highlights_space_before_pt: float = 8.0

    # Extra margin between stacked aside sections (PDF rail)
    sidebar_rail_section_stack_margin_top_pt: float = 8.0

    # PDF: margin below each education entry card (rail uses for last paragraph in entry)
    education_entry_margin_bottom_pt: float = 4.0

    # ---- Experience ----
    # .experience-title: 11pt, bold
    # .experience-dates, .company-name, .company-skills, .company-location: 11pt
    experience_title_font_size_pt: int = 11
    experience_meta_font_size_pt: int = 11
    experience_line_space_pt: float = 1.5
    experience_line_space_before_pt: float = 0.5
    # .company-line margin-bottom (PDF); title line uses experience_line_space_pt
    company_line_space_after_pt: float = 2.5

    # .description-content: 10pt
    description_font_size_pt: int = 10
    description_space_after_pt: float = 1.5

    # .description-bullets padding-left, li margin/padding (matches preview.css)
    description_bullet_indent_pt: float = 12.5
    description_bullet_hang_pt: float = 12.0  # hang width; tab stop here for bullet-to-text alignment
    description_bullet_li_padding_left_pt: float = 2.0  # gap between bullet glyph and text (PDF li padding-left)
    description_bullet_item_space_pt: float = 0.5
    description_paragraph_space_pt: float = 2.0
    description_block_space_before_pt: float = 1.0  # margin between company and bullets

    # ---- Projects ----
    # .project-title: 10.5pt, bold
    project_title_font_size_pt: float = 10.5
    project_title_space_before_pt: float = 0.0
    project_line_space_pt: float = 0.75

    # ---- Skills ----
    skill_category_font_size_pt: float = 10
    skill_names_font_size_pt: float = 10
    skill_line_space_pt: float = 1.5
    skill_line_height: float = 1.2

    # ---- Summary / body prose ----
    # Line height for summary + experience/project bullets (matches preview.css line-height)
    prose_line_height: float = 1.15

    # .section-content padding-left 10pt + .summary-section padding-left 1.25pt (see preview.css)
    summary_font_size_pt: int = 10
    summary_space_after_pt: float = 2.5
    summary_text_padding_left_pt: float = 1.25
    # First-line “tab” (body lines align to section indent + padding only)
    summary_first_line_indent_pt: float = 30.0
