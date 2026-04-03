


# imports.
from io import BytesIO
from typing import Dict, Any
import asyncio
import sys
from datetime import datetime
from playwright.sync_api import sync_playwright

# local imports.
from .shared.styles import get_styles
from .shared.resume_tokens import build_resume_tokens_css, load_resume_token_dict
from .shared.style_presets import merge_resume_token_overrides
from .layouts import LAYOUT_SIDEBAR_SPLIT, docx_export_template_slug, load_layout_profile
from .layouts.common import raw_body_order as _raw_body_order
from .layouts.sidebar_split import (
    sidebar_main_column_order as _sidebar_main_column_order,
    sidebar_rail_section_order as _sidebar_rail_section_order,
)
from .shared.template_slug import normalize_template_slug, resolve_template_folder

# HTML fragment generators (preview / pdf)
from .html import (
    build_contact_rail_html,
    build_header,
    build_tagline_block,
    build_education_entry,
    build_education_entry_rail,
    build_experience_entry,
    build_project_entry,
    build_skill_entry,
    build_skill_entry_rail,
)

# Builds section with title and content.
def _build_section(title: str, entries_html: str) -> str:
    """Helper to build a section with title and content."""
    if not entries_html or not entries_html.strip():
        return ""
    return f'''<section class="section">
            <h2 class="section-title">
                <span>{title}</span>
                <div class="divider"></div>
            </h2>
            <div class="section-content">
                {entries_html}
            </div>
        </section>'''


# Builds section titles from resume data.
def _section_titles(resume_data: Dict[str, Any]) -> Dict[str, str]:
    raw = resume_data.get("sectionLabels") or {}
    if not isinstance(raw, dict):
        raw = {}
    defaults = {
        "summary": "Professional Summary",
        "education": "Education",
        "experience": "Experience",
        "projects": "Projects",
        "skills": "Skills",
    }
    titles = dict(defaults)
    for key in titles:
        v = raw.get(key)
        if isinstance(v, str) and v.strip():
            titles[key] = v.strip()
    return titles


# Builds sections map from resume data.
def build_sections_map(
    resume_data: Dict[str, Any],
    layout_profile: str | None = None,
) -> Dict[str, str]:
    """Section key → HTML block (possibly empty string)."""
    titles = _section_titles(resume_data)
    sections_map: Dict[str, str] = {}
    project_variant = (
        "sidebar_main" if layout_profile == LAYOUT_SIDEBAR_SPLIT else "default"
    )

    summary = resume_data.get("summary")
    if summary is not None:
        summary_text = summary.get("summary", "") if isinstance(summary, dict) else ""
        summary_content = ""
        if summary_text and summary_text.strip():
            summary_content = f'<div class="summary-section">{summary_text}</div>'
        sections_map["summary"] = _build_section(titles["summary"], summary_content)
    else:
        sections_map["summary"] = ""

    education = resume_data.get("education") or []
    education_entries = [build_education_entry(edu) for edu in education]
    sections_map["education"] = _build_section(titles["education"], "\n".join(education_entries))

    experience = resume_data.get("experience") or []
    experience_entries = [build_experience_entry(exp) for exp in experience]
    sections_map["experience"] = _build_section(titles["experience"], "\n".join(experience_entries))

    projects = resume_data.get("projects") or []
    project_entries = [
        build_project_entry(proj, variant=project_variant) for proj in projects
    ]
    sections_map["projects"] = _build_section(titles["projects"], "\n".join(project_entries))

    skills = resume_data.get("skills") or []
    skills_category_order = resume_data.get("skillsCategoryOrder") or []
    skill_entries_html = build_skill_entry(skills, skills_category_order)
    sections_map["skills"] = _build_section(titles["skills"], skill_entries_html)

    return sections_map


# Builds body section order from resume data.
def _body_section_order(resume_data: Dict[str, Any]) -> list:
    """Single-column flow: summary always first when present, then rest in order."""
    body_order = list(_raw_body_order(resume_data))
    if "summary" in body_order:
        body_order = ["summary"] + [k for k in body_order if k != "summary"]
    return body_order


# Builds sidebar rail skills section from resume data.
def _sidebar_rail_skills_section(resume_data: Dict[str, Any]) -> str:
    skills = resume_data.get("skills") or []
    order = resume_data.get("skillsCategoryOrder") or []
    inner = build_skill_entry_rail(skills, order)
    if not inner.strip():
        return ""
    titles = _section_titles(resume_data)
    return _build_section(titles["skills"], inner)


# Builds sidebar rail education section from resume data.
def _sidebar_rail_education_section(resume_data: Dict[str, Any]) -> str:
    """Education in the rail uses build_education_entry_rail (tighter than full education-entry)."""
    education = resume_data.get("education") or []
    entries: list = []
    for edu in education:
        frag = build_education_entry_rail(edu if isinstance(edu, dict) else {})
        if frag and frag.strip():
            entries.append(frag)
    if not entries:
        return ""
    titles = _section_titles(resume_data)
    return _build_section(titles["education"], "\n".join(entries))


# Fills header placeholders in html content.
def _fill_header_placeholders(
    html_content: str,
    resume_data: Dict[str, Any],
    layout_profile: str,
    style_preferences: Dict[str, Any] | None = None,
) -> str:

    # Get header.
    header = resume_data.get("header", {})
    name = f"{header.get('first_name', '')} {header.get('last_name', '')}".strip()

    # Replace all placeholders w/ corresponding values if applicable.
    html_content = html_content.replace("{name}", name)
    html_content = html_content.replace("{tagline_block}", build_tagline_block(header))
    if layout_profile == LAYOUT_SIDEBAR_SPLIT:
        html_content = html_content.replace(
            "{contact_rail}",
            build_contact_rail_html(header, style_preferences),
        )
        html_content = html_content.replace("{header_line}", "")
    else:
        html_content = html_content.replace(
            "{header_line}", build_header(header, style_preferences)
        )
        html_content = html_content.replace("{contact_rail}", "")
    return html_content


# Fills template with resume data.
def fill_template(
    html_content: str,
    resume_data: Dict[str, Any],
    layout_profile: str,
    style_preferences: Dict[str, Any] | None = None,
) -> str:

    # Fill header placeholders.
    html_content = _fill_header_placeholders(
        html_content, resume_data, layout_profile, style_preferences
    )

    # Build sections map.
    sections_map = build_sections_map(resume_data, layout_profile)

    # If layout profile is sidebar split, build sidebar rail sections.
    if layout_profile == LAYOUT_SIDEBAR_SPLIT:
        rail_blocks = []
        # Iterate over each sidebar rail section order.
        for key in _sidebar_rail_section_order(resume_data):
            # If key is education, build education section.
            if key == "education":
                block = _sidebar_rail_education_section(resume_data)
            # If key is skills, build skills section.
            elif key == "skills":
                block = _sidebar_rail_skills_section(resume_data)
            # Otherwise, get block from sections map.
            else:
                block = sections_map.get(key) or ""
            # If block is not empty, add to rail blocks.
            if block:
                rail_blocks.append(block)
        sidebar_html = "\n".join(rail_blocks)

        # Build main sections.
        main_order = _sidebar_main_column_order(resume_data)
        main_sections: list = []
        # Iterate over each main section order.
        for section_key in main_order:
            # If section key is in sections map and section map is not empty, add to main sections.
            if section_key in sections_map and sections_map[section_key]:
                main_sections.append(sections_map[section_key])

        # Replace sidebar sections and main sections placeholders with corresponding values.
        html_content = html_content.replace("{sidebar_sections}", sidebar_html)
        html_content = html_content.replace("{sections}", "\n".join(main_sections))
        return html_content

    # If layout profile is not sidebar split, build body sections.
    body_order = _body_section_order(resume_data)
    sections_html = []
    for section_key in body_order:
        if section_key in sections_map and sections_map[section_key]:
            sections_html.append(sections_map[section_key])
    html_content = html_content.replace("{sidebar_sections}", "")
    html_content = html_content.replace("{sections}", "\n".join(sections_html))
    return html_content

# Generates resume HTML.
def generate_resume(
    template_name: str,
    resume_data: Dict[str, Any],
    style_preferences: Dict[str, Any] | None = None,
) -> str:

    # Resolve template folder and load template.
    folder = resolve_template_folder(template_name)
    template_path = folder / "template.html"

    # Load template.
    with open(template_path, 'r', encoding='utf-8') as file:
        html_template = file.read()

    # Load preview.css and prepend :root tokens (resume_tokens.json — shared with Word).
    styles_path = folder / "preview.css"
    with open(styles_path, 'r', encoding='utf-8') as file:
        styles = file.read()

    # Normalize template slug and load resume tokens.
    slug = normalize_template_slug(template_name)
    raw_tokens = load_resume_token_dict(template_name)

    # Merge resume tokens and build resume tokens CSS.
    token_dict = merge_resume_token_overrides(slug, raw_tokens, style_preferences)
    token_css = build_resume_tokens_css(token_dict)

    # Replace {{template_css}} placeholder with styles.
    html_template = html_template.replace("{{template_css}}", token_css + styles)

    # Fill template based on placeholders.
    profile = load_layout_profile(template_name)
    filled_html = fill_template(
        html_template, resume_data, profile, style_preferences
    )

    # Return filled document.
    return filled_html

# Converts HTML to PDF synchronously.
def convert_html_to_pdf_sync(
    html_content: str,
    template_name: str | None = None,
    style_preferences: Dict[str, Any] | None = None,
) -> bytes:
    # On Windows, Playwright needs ProactorEventLoop for subprocess support (SelectorEventLoop raises NotImplementedError).
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

    slug = normalize_template_slug(template_name)
    style = get_styles(slug, style_preferences)
    layout_profile = load_layout_profile(slug)

    # Sidebar split: page inset comes from per-column padding in CSS, not Playwright margins.
    if layout_profile == LAYOUT_SIDEBAR_SPLIT:
        margin = {"top": "0", "right": "0", "bottom": "0", "left": "0"}
    else:
        margin = {
            "top": f"{style.margin_top_in}in",
            "right": f"{style.margin_right_in}in",
            "bottom": f"{style.margin_bottom_in}in",
            "left": f"{style.margin_left_in}in",
        }

    # Keep browser/page/pdf inside `with` — exiting early stops Playwright and causes
    # "Event loop is closed! Is Playwright already stopped?" on page.pdf().
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            page = browser.new_page()
            page.set_content(html_content, wait_until="networkidle")
            return page.pdf(
                format="Letter",
                print_background=True,
                margin=margin,
            )
        finally:
            browser.close()

# Generates PDF asynchronously.
async def generate_pdf(
    template_name: str,
    resume_data: Dict[str, Any],
    style_preferences: Dict[str, Any] | None = None,
) -> bytes:

    # Generate HTML resume.
    html_content = generate_resume(template_name, resume_data, style_preferences)

    # Generate PDF from HTML content using thread pool (fixes Windows asyncio issue).
    pdf_bytes = await asyncio.to_thread(
        convert_html_to_pdf_sync,
        html_content,
        template_name,
        style_preferences,
    )

    # Return PDF bytes.
    return pdf_bytes


# Generates Word document.
def generate_docx(
    template_name: str,
    resume_data: Dict[str, Any],
    style_preferences: Dict[str, Any] | None = None,
) -> bytes:
   
    from .word.docx_builder import build_docx

    # Get export slug and build Word document.
    export_slug = docx_export_template_slug(template_name)

    # Return Word document bytes.
    return build_docx(resume_data, export_slug, style_preferences)