
# imports.
from io import BytesIO
from pathlib import Path
from typing import Dict, Any
import asyncio
from datetime import datetime
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

def format_date_month_year(date: str) -> str:
    if not date:
        return ''

    try:
        # Handle ISO datetime strings (e.g., "2021-08-01T00:00:00")
        # Extract just the date part (first 10 characters: YYYY-MM-DD)
        date_str = date[:10] if len(date) >= 10 else date
        
        # Parse the date
        if len(date_str) == 7:  # YYYY-MM format
            dt = datetime.strptime(date_str, '%Y-%m')
        elif len(date_str) == 10:  # YYYY-MM-DD format
            dt = datetime.strptime(date_str, '%Y-%m-%d')
        else:
            return date  # Return original if format is unexpected
        
        # Format as "August 2021"
        return dt.strftime('%B %Y')
    except Exception as e:
        # If parsing fails, return original date
        return date

def build_education_entry(edu: Dict[str, Any]) -> str:
    
    # build degree line.
    degree = edu.get('degree', '')
    discipline = edu.get('discipline', '')
    minor = edu.get('minor', '')
    
    degree_text = f"{degree} in {discipline}"
    if minor:
        degree_text += f", Minor in {minor}"

    # build date range.
    start_date = format_date_month_year(edu.get('start_date', ''))
    end_date = format_date_month_year(edu.get('end_date', ''))
    current = edu.get('current', False)
    if current:
        date_range = f"{start_date} - Present"
    else:
        date_range = f"{start_date} - {end_date}"

    gpa = edu.get('gpa', '')
    gpa_text = f" (GPA: {gpa})" if gpa else ""
    
    return f'''
    <div class="education-entry">
        <div class="school-line">
            <div class="school-gpa-line">
                <div class="school-name">{edu.get('school', '')}</div>
                <div class="school-gpa">{gpa_text}</div>
            </div>
            <div class="school-dates">{date_range}</div>
        </div>
        <div class="degree-line">
            <div class="degree-type">{degree_text}</div>
            <div class="school-location">{edu.get('location', '')}</div>
        </div>
    </div>
    '''

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