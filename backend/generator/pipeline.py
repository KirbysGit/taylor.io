
# imports.
from io import BytesIO
from pathlib import Path
from typing import Dict, Any
import asyncio
from datetime import datetime
from playwright.sync_api import sync_playwright

# import builders.
from .builders import build_header, build_education_entry, build_experience_entry, build_project_entry, build_skill_entry

# get abs path to templates directory.
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

def _build_section(title: str, entries_html: str) -> str:
    """Helper to build a section with title and content."""
    if not entries_html or not entries_html.strip():
        return ""
    return f'''<section class="section">
            <h2 class="section-title">
                <span>{title}</span>
                <div class="divider"></div>
            </h2>
            {entries_html}
        </section>'''

def fill_template(html_content: str, resume_data: Dict[str, Any]) -> str:

    # -- 1. fill header.
    header = resume_data.get("header", {})
    name = f"{header.get('first_name', '')} {header.get('last_name', '')}".strip()
    html_content = html_content.replace("{name}", name)
    html_content = html_content.replace("{header_line}", build_header(header))
    
    # -- 2. build all sections (order will be applied later).
    # Get custom section labels or use defaults
    section_labels = resume_data.get("sectionLabels", {})
    default_labels = {
        "summary": "Professional Summary",
        "education": "Education",
        "experience": "Experience",
        "projects": "Projects",
        "skills": "Skills"
    }
    
    sections_map = {}
    
    # Summary
    summary = resume_data.get("summary")
    if summary is not None:
        summary_text = summary.get("summary", "") if isinstance(summary, dict) else ""
        summary_content = ""
        if summary_text and summary_text.strip():
            summary_content = f'<div class="summary-section">&emsp; &ensp;{summary_text}</div>'
        summary_title = section_labels.get("summary", default_labels["summary"])
        sections_map["summary"] = _build_section(summary_title, summary_content)
    else:
        sections_map["summary"] = ""
    
    # Education
    education = resume_data.get("education") or []
    education_entries = [build_education_entry(edu) for edu in education]
    education_title = section_labels.get("education", default_labels["education"])
    sections_map["education"] = _build_section(education_title, "\n".join(education_entries))
    
    # Experience
    experience = resume_data.get("experience") or []
    experience_entries = [build_experience_entry(exp) for exp in experience]
    experience_title = section_labels.get("experience", default_labels["experience"])
    sections_map["experience"] = _build_section(experience_title, "\n".join(experience_entries))
    
    # Projects
    projects = resume_data.get("projects") or []
    project_entries = [build_project_entry(proj) for proj in projects]
    projects_title = section_labels.get("projects", default_labels["projects"])
    sections_map["projects"] = _build_section(projects_title, "\n".join(project_entries))
    
    # Skills
    skills = resume_data.get("skills") or []
    skill_entries_html = build_skill_entry(skills)
    skills_title = section_labels.get("skills", default_labels["skills"])
    sections_map["skills"] = _build_section(skills_title, skill_entries_html)
    
    # -- 3. build sections in specified order.
    section_order = resume_data.get("sectionOrder", ["summary", "education", "experience", "projects", "skills"])
    sections_html = []
    for section_key in section_order:
        if section_key in sections_map and sections_map[section_key]:
            sections_html.append(sections_map[section_key])
    
    # -- 4. replace sections placeholder.
    html_content = html_content.replace("{sections}", "\n".join(sections_html))

    return html_content

def generate_resume(template_name: str, resume_data: Dict[str, Any]) -> str:

    # grab template from template folder.
    # Look for {template_name}/{template_name}.docx inside templates directory.
    template_path = TEMPLATES_DIR / template_name / f"template.html"

    # load template.
    with open(template_path, 'r', encoding='utf-8') as file:
        html_template = file.read()

    # load preview.css.
    styles_path = TEMPLATES_DIR / template_name / "preview.css"
    with open(styles_path, 'r', encoding='utf-8') as file:
        styles = file.read()

    # replace {{template_css}} placeholder with styles.
    html_template = html_template.replace("{{template_css}}", styles)

    # fill template based on placeholders.
    filled_html = fill_template(html_template, resume_data)

    # return filled document.
    return filled_html

def convert_html_to_pdf_sync(html_content: str) -> bytes:
    # convert html to pdf using playwright.
    # has to run in a thread pool to avoid windows asyncio subprocess issues.
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        page.set_content(html_content, wait_until='networkidle')
        pdf_bytes = page.pdf(format='Letter', print_background=True)
        browser.close()
        return pdf_bytes

async def generate_pdf(template_name: str, resume_data: Dict[str, Any]) -> bytes:

    # generate html resume.
    html_content = generate_resume(template_name, resume_data)

    # generate pdf from html content using thread pool (fixes Windows asyncio issue).
    pdf_bytes = await asyncio.to_thread(convert_html_to_pdf_sync, html_content)

    # return pdf bytes.
    return pdf_bytes