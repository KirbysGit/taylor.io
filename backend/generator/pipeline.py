
# imports.
from io import BytesIO
from pathlib import Path
from typing import Dict, Any
import asyncio
from playwright.sync_api import sync_playwright

# get abs path to templates directory.
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

def build_header(header: Dict[str, Any]) -> str:
    fields = [
        header.get("email", ""),
        header.get("phone", ""),
        header.get("github", ""),
        header.get("linkedin", ""),
        header.get("location", ""),
        header.get("portfolio", ""),
    ]
    return " | ".join([field for field in fields if field.strip()])

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

def _convert_html_to_pdf_sync(html_content: str) -> bytes:
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
    pdf_bytes = await asyncio.to_thread(_convert_html_to_pdf_sync, html_content)

    # return pdf bytes.
    return pdf_bytes