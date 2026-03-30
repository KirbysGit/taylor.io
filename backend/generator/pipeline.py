# if no start date, end date, don't have the dash.
# better spacing.


# imports.
from io import BytesIO
from typing import Dict, Any
import asyncio
import sys
from datetime import datetime
from playwright.sync_api import sync_playwright

from .docx_styles import get_styles
from .resume_tokens import build_resume_tokens_css, load_resume_token_dict
from .style_presets import merge_resume_token_overrides
from .template_layout import LAYOUT_SIDEBAR_SPLIT, docx_export_template_slug, load_layout_profile
from .template_slug import normalize_template_slug, resolve_template_folder

# import builders.
from .builders import (
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


def build_sections_map(resume_data: Dict[str, Any]) -> Dict[str, str]:
    """Section key → HTML block (possibly empty string)."""
    titles = _section_titles(resume_data)
    sections_map: Dict[str, str] = {}

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
    project_entries = [build_project_entry(proj) for proj in projects]
    sections_map["projects"] = _build_section(titles["projects"], "\n".join(project_entries))

    skills = resume_data.get("skills") or []
    skills_category_order = resume_data.get("skillsCategoryOrder") or []
    skill_entries_html = build_skill_entry(skills, skills_category_order)
    sections_map["skills"] = _build_section(titles["skills"], skill_entries_html)

    return sections_map


def _raw_body_order(resume_data: Dict[str, Any]) -> list:
    """Section keys from payload order, excluding header only (no summary-first normalization)."""
    section_order = resume_data.get(
        "sectionOrder",
        ["header", "summary", "education", "experience", "projects", "skills"],
    )
    return [k for k in section_order if k != "header"]


def _body_section_order(resume_data: Dict[str, Any]) -> list:
    """Single-column flow: summary always first when present, then rest in order."""
    body_order = list(_raw_body_order(resume_data))
    if "summary" in body_order:
        body_order = ["summary"] + [k for k in body_order if k != "summary"]
    return body_order


# sidebar_split: rail = skills + education (order from sectionOrder); main = narrative only.
_SIDEBAR_RAIL_KEY_SET = frozenset({"skills", "education"})
_SIDEBAR_MAIN_KEYS = frozenset({"summary", "experience", "projects"})


def _sidebar_rail_section_order(resume_data: Dict[str, Any]) -> list:
    """
    Skills vs education order follows resume_data.sectionOrder (same source as the Organize UI).
    Keys omitted from sectionOrder default to skills, then education.
    """
    raw = _raw_body_order(resume_data)
    ordered: list = []
    seen: set = set()
    for k in raw:
        if k in _SIDEBAR_RAIL_KEY_SET and k not in seen:
            ordered.append(k)
            seen.add(k)
    for k in ("skills", "education"):
        if k not in seen:
            ordered.append(k)
            seen.add(k)
    return ordered


def _sidebar_rail_skills_section(resume_data: Dict[str, Any]) -> str:
    skills = resume_data.get("skills") or []
    order = resume_data.get("skillsCategoryOrder") or []
    inner = build_skill_entry_rail(skills, order)
    if not inner.strip():
        return ""
    titles = _section_titles(resume_data)
    return _build_section(titles["skills"], inner)


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


def _sidebar_main_column_order(resume_data: Dict[str, Any]) -> list:
    """
    Respect sectionOrder only among summary / experience / projects.
    Education is rail-only (compact variant); skills are rail-only.
    """
    return [k for k in _raw_body_order(resume_data) if k in _SIDEBAR_MAIN_KEYS]


def _fill_header_placeholders(
    html_content: str,
    resume_data: Dict[str, Any],
    layout_profile: str,
    style_preferences: Dict[str, Any] | None = None,
) -> str:
    header = resume_data.get("header", {})
    name = f"{header.get('first_name', '')} {header.get('last_name', '')}".strip()
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


def fill_template(
    html_content: str,
    resume_data: Dict[str, Any],
    layout_profile: str,
    style_preferences: Dict[str, Any] | None = None,
) -> str:
    html_content = _fill_header_placeholders(
        html_content, resume_data, layout_profile, style_preferences
    )
    sections_map = build_sections_map(resume_data)

    if layout_profile == LAYOUT_SIDEBAR_SPLIT:
        rail_blocks = []
        for key in _sidebar_rail_section_order(resume_data):
            if key == "education":
                block = _sidebar_rail_education_section(resume_data)
            elif key == "skills":
                block = _sidebar_rail_skills_section(resume_data)
            else:
                block = sections_map.get(key) or ""
            if block:
                rail_blocks.append(block)
        sidebar_html = "\n".join(rail_blocks)
        main_order = _sidebar_main_column_order(resume_data)
        main_sections: list = []
        for section_key in main_order:
            if section_key in sections_map and sections_map[section_key]:
                main_sections.append(sections_map[section_key])
        html_content = html_content.replace("{sidebar_sections}", sidebar_html)
        html_content = html_content.replace("{sections}", "\n".join(main_sections))
        return html_content

    body_order = _body_section_order(resume_data)
    sections_html = []
    for section_key in body_order:
        if section_key in sections_map and sections_map[section_key]:
            sections_html.append(sections_map[section_key])
    html_content = html_content.replace("{sidebar_sections}", "")
    html_content = html_content.replace("{sections}", "\n".join(sections_html))
    return html_content

def generate_resume(
    template_name: str,
    resume_data: Dict[str, Any],
    style_preferences: Dict[str, Any] | None = None,
) -> str:

    folder = resolve_template_folder(template_name)
    template_path = folder / "template.html"

    # load template.
    with open(template_path, 'r', encoding='utf-8') as file:
        html_template = file.read()

    # load preview.css and prepend :root tokens (resume_tokens.json — shared with Word).
    styles_path = folder / "preview.css"
    with open(styles_path, 'r', encoding='utf-8') as file:
        styles = file.read()
    slug = normalize_template_slug(template_name)
    raw_tokens = load_resume_token_dict(template_name)
    token_dict = merge_resume_token_overrides(slug, raw_tokens, style_preferences)
    token_css = build_resume_tokens_css(token_dict)

    # replace {{template_css}} placeholder with styles.
    html_template = html_template.replace("{{template_css}}", token_css + styles)

    # fill template based on placeholders.
    profile = load_layout_profile(template_name)
    filled_html = fill_template(
        html_template, resume_data, profile, style_preferences
    )

    # return filled document.
    return filled_html

def convert_html_to_pdf_sync(
    html_content: str,
    template_name: str | None = None,
    style_preferences: Dict[str, Any] | None = None,
) -> bytes:
    # convert html to pdf using playwright.
    # On Windows, Playwright needs ProactorEventLoop for subprocess support (SelectorEventLoop raises NotImplementedError).
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    style = get_styles(normalize_template_slug(template_name), style_preferences)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        page.set_content(html_content, wait_until='networkidle')
        slug = normalize_template_slug(template_name)
        # sidebar_split: page inset comes from per-column padding (aside + body tokens), not Playwright margins—
        # otherwise we get a white frame around the whole sheet on top of column padding.
        if load_layout_profile(slug) == LAYOUT_SIDEBAR_SPLIT:
            margin = {"top": "0", "right": "0", "bottom": "0", "left": "0"}
        else:
            margin = {
                "top": f"{style.margin_top_in}in",
                "right": f"{style.margin_right_in}in",
                "bottom": f"{style.margin_bottom_in}in",
                "left": f"{style.margin_left_in}in",
            }
        pdf_bytes = page.pdf(
            format="Letter",
            print_background=True,
            margin=margin,
        )
        browser.close()
        return pdf_bytes

async def generate_pdf(
    template_name: str,
    resume_data: Dict[str, Any],
    style_preferences: Dict[str, Any] | None = None,
) -> bytes:

    # generate html resume.
    html_content = generate_resume(template_name, resume_data, style_preferences)

    # generate pdf from html content using thread pool (fixes Windows asyncio issue).
    pdf_bytes = await asyncio.to_thread(
        convert_html_to_pdf_sync,
        html_content,
        template_name,
        style_preferences,
    )

    # return pdf bytes.
    return pdf_bytes


def generate_docx(
    template_name: str,
    resume_data: Dict[str, Any],
    style_preferences: Dict[str, Any] | None = None,
) -> bytes:
    """
    Generate a Word document from resume_data.
    Uses template-specific styling from docx_styles.
    Returns .docx file as bytes.
    """
    from .docx_builder import build_docx

    export_slug = docx_export_template_slug(template_name)
    return build_docx(resume_data, export_slug, style_preferences)