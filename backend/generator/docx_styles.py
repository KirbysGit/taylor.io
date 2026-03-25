# docx_styles.py
# Style configuration for Word document generation.
# Values mirror backend/templates/Default/preview.css for consistency.
# Edit these to adjust docx styling; add per-template configs as you expand.

from dataclasses import dataclass
from pathlib import Path

# Template dir for resolving paths (e.g. to load per-template overrides later).
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


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

    # ---- Header ----
    # .name: 32pt, bold
    name_font_size_pt: int = 32
    name_space_after_pt: float = 0.0  # space after name (before contact line)
    # Expanded letter-spacing on name (Word w:spacing, in points; 0 = off)
    name_character_spacing_pt: float = 0.6

    # Optional tagline (between name and contact)
    tagline_font_size_pt: float = 11.0
    tagline_space_after_pt: float = 2.5
    # When a tagline is shown, contact line sits right under it (small gap via tagline_space_after)
    contact_space_before_after_tagline_pt: float = 0.0

    # Contact line (centered under name)
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

    # .highlight-title, .highlight-content: 10pt (title bold)
    highlight_font_size_pt: int = 10

    # ---- Experience ----
    # .experience-title: 11pt, bold
    # .experience-dates, .company-name, .company-skills, .company-location: 11pt
    experience_title_font_size_pt: int = 11
    experience_meta_font_size_pt: int = 11
    experience_line_space_pt: float = 1.5
    experience_line_space_before_pt: float = 0.5

    # .description-content: 10pt
    description_font_size_pt: int = 10
    description_space_after_pt: float = 1.5

    # .description-bullets padding-left, li margin/padding (matches preview.css)
    description_bullet_indent_pt: float = 12.5
    description_bullet_hang_pt: float = 12.0  # hang width; tab stop here for bullet-to-text alignment
    description_bullet_item_space_pt: float = 0.5
    description_paragraph_space_pt: float = 2.0
    description_block_space_before_pt: float = 1.0  # margin between company and bullets

    # ---- Projects ----
    # .project-title: 10.5pt, bold
    project_title_font_size_pt: float = 10.5
    project_title_space_before_pt: float = 0.0
    project_line_space_pt: float = 0.75

    # ---- Skills ----
    skill_category_font_size_pt: int = 10
    skill_names_font_size_pt: int = 10
    skill_line_space_pt: float = 1.5

    # ---- Summary ----
    # .summary-section: 10pt
    summary_font_size_pt: int = 10
    summary_space_after_pt: float = 2.5


def get_styles(template_name: str) -> DocxStyleConfig:
    """
    Return style config for the given template.
    Uses DocxStyleConfig as base; loads optional docx_styles.json from
    templates/<TemplateName>/ to override values (keeps PDF and Word aligned).
    """
    import json
    name = (template_name or "default").strip()
    base = DocxStyleConfig()
    # Try per-template override: templates/Default/docx_styles.json
    override_path = TEMPLATES_DIR / name / "docx_styles.json"
    if not override_path.exists():
        override_path = TEMPLATES_DIR / "Default" / "docx_styles.json"
    if override_path.exists():
        try:
            with open(override_path, "r", encoding="utf-8") as f:
                overrides = json.load(f)
            for key, val in overrides.items():
                if not key.startswith("_") and hasattr(base, key):
                    setattr(base, key, val)
        except Exception:
            pass
    return base
