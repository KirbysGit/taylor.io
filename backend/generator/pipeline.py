
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

def fill_template(html_content: str, resume_data: Dict[str, Any]) -> str:

    # -- 1. fill header.

    # get header data to fill in.
    header = resume_data.get("header", {})

    name = f"{header.get('first_name', '')} {header.get('last_name', '')}".strip()

    # fill header line.
    html_content = html_content.replace("{name}", name)
    html_content = html_content.replace("{header_line}", build_header(header))
    
    # -- 2. fill education.
    education = resume_data.get("education", [])

    education_entries = []

    for edu in education:
        education_entries.append(build_education_entry(edu))
    
    html_content = html_content.replace("{education_entries}", "\n".join(education_entries))

    # -- 3. fill experience.
    experience = resume_data.get("experience", [])

    experience_entries = []

    for exp in experience:
        experience_entries.append(build_experience_entry(exp))
    
    html_content = html_content.replace("{experience_entries}", "\n".join(experience_entries))
    
    # -- 4. fill projects.
    projects = resume_data.get("projects", [])

    project_entries = []

    for proj in projects:
        project_entries.append(build_project_entry(proj))
    
    html_content = html_content.replace("{project_entries}", "\n".join(project_entries))

    # -- 5. fill skills.
    skills = resume_data.get("skills", [])
    skill_entries_html = build_skill_entry(skills)
    
    html_content = html_content.replace("{skill_entries}", skill_entries_html)

    # -- 6. fill summary.
    summary = resume_data.get("summary", {})
    summary_text = summary.get("summary", "") if isinstance(summary, dict) else ""
    
    # add indent to first line only.
    if summary_text:
        print("in here!")
        summary_text = f"&emsp; &ensp;{summary_text}"
    
    html_content = html_content.replace("{summary}", summary_text)

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