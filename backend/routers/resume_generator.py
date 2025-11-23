# routers/resume_generator.py

# resume generation utilities (HTML template and PDF conversion).

# imports.
from io import BytesIO
from models import User
from xhtml2pdf import pisa
from resume_generator.formatter.formatters import format_date, clean_text_for_docx

def generate_resume_html(user: User) -> str:
    # generate HTML resume from user data - matches DOCX structure.
    
    # get contact info (use user.contact if available, otherwise use user.email).
    contact = user.contact if hasattr(user, 'contact') and user.contact else None
    email = contact.email if contact and contact.email else user.email
    phone = contact.phone if contact else None
    github = contact.github if contact else None
    linkedin = contact.linkedin if contact else None
    portfolio = contact.portfolio if contact else None
    
    # build contact info line (matching DOCX format).
    contact_parts = []
    if email:
        contact_parts.append(email)
    if phone:
        contact_parts.append(phone)
    if github:
        contact_parts.append(f"GitHub: {github}")
    if linkedin:
        contact_parts.append(f"LinkedIn: {linkedin}")
    if portfolio:
        contact_parts.append(f"Portfolio: {portfolio}")
    contact_line = " | ".join(contact_parts) if contact_parts else email or ""
    
    # format experiences (matching DOCX format: "Title – Company (Date Range)").
    experiences_html = ""
    if user.experiences:
        for exp in user.experiences:
            # build title line matching DOCX: "Title – Company (Date Range)".
            title_text = exp.title
            if exp.company:
                title_text += f" – {exp.company}"
            
            # format dates (matching DOCX format_date which returns "Jan 2020").
            start_date = format_date(exp.start_date) if exp.start_date else ""
            end_date = format_date(exp.end_date) if exp.end_date else "Present"
            date_range = f"{start_date} - {end_date}" if start_date else end_date
            
            experiences_html += f"""
            <div class="experience-item">
                <p class="experience-title-line">
                    <strong>{title_text}</strong> <span class="experience-date">({date_range})</span>
                </p>
                {f'<p class="experience-description">{clean_text_for_docx(exp.description)}</p>' if exp.description else ''}
            </div>
            """
    else:
        experiences_html = "<p class='empty-state'>No experiences added yet.</p>"
    
    # format projects (matching DOCX format).
    projects_html = ""
    if user.projects:
        for project in user.projects:
            projects_html += f"""
            <div class="project-item">
                <p class="project-title-line"><strong>{project.title}</strong></p>
                {f'<p class="project-description">{clean_text_for_docx(project.description)}</p>' if project.description else ''}
                {f'<p class="project-tech"><em>Tech Stack: {", ".join(project.tech_stack) if isinstance(project.tech_stack, list) else project.tech_stack}</em></p>' if hasattr(project, 'tech_stack') and project.tech_stack else ''}
            </div>
            """
    else:
        projects_html = "<p class='empty-state'>No projects added yet.</p>"
    
    # format skills (matching DOCX format - comma-separated).
    skills_html = ""
    if user.skills:
        skill_names = [skill.name for skill in user.skills]
        skills_html = f"<p class='skills-list'>{', '.join(skill_names)}</p>"
    else:
        skills_html = "<p class='empty-state'>No skills added yet.</p>"
    
    # format education (matching DOCX format).
    education_html = ""
    if hasattr(user, 'education') and user.education:
        for edu in user.education:
            # build education line matching DOCX: "Degree Field – School (Date Range)".
            edu_parts = []
            if edu.degree:
                edu_parts.append(edu.degree)
            if edu.field:
                edu_parts.append(edu.field)
            if edu.school:
                edu_parts.append(f"– {edu.school}")
            
            edu_text = " ".join(edu_parts) if edu_parts else "Education"
            
            # format dates.
            start_date = format_date(edu.start_date) if edu.start_date else ""
            end_date = format_date(edu.end_date) if edu.end_date else ("Present" if edu.current else "")
            date_range = f"{start_date} - {end_date}" if start_date else end_date
            
            education_html += f"""
            <div class="education-item">
                <p class="education-title-line">
                    <strong>{edu_text}</strong> {f'<span class="education-date">({date_range})</span>' if date_range else ''}
                </p>
                {f'<p class="education-gpa">GPA: {edu.gpa}</p>' if edu.gpa else ''}
            </div>
            """
    else:
        education_html = ""
    
    # generate full HTML (matching DOCX structure).
    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{user.name} - Resume</title>
        <style>
            @page {{
                size: letter;
                margin: 0.75in;
            }}
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: 'Arial', 'Helvetica', 'Georgia', serif;
                line-height: 1.6;
                color: #000000;
                background-color: #FFFFFF;
                font-size: 11pt;
                max-width: 8.5in;
                margin: 0 auto;
                padding: 0.75in;
            }}
            .header {{
                text-align: center;
                margin-bottom: 20px;
            }}
            .header h1 {{
                margin: 0 0 8px 0;
                font-size: 24pt;
                font-weight: bold;
                color: #000000;
            }}
            .header p {{
                margin: 0;
                font-size: 10pt;
                color: #000000;
            }}
            .section {{
                margin-bottom: 20px;
                page-break-inside: avoid;
            }}
            .section-title {{
                font-size: 14pt;
                font-weight: bold;
                color: #000000;
                margin-bottom: 12px;
            }}
            .experience-item {{
                margin-bottom: 12px;
                margin-left: 0;
            }}
            .experience-title-line {{
                font-size: 11pt;
                margin-bottom: 4px;
            }}
            .experience-title-line strong {{
                font-weight: bold;
            }}
            .experience-date {{
                font-size: 10pt;
                font-style: italic;
            }}
            .experience-description {{
                margin-top: 4px;
                font-size: 10pt;
                color: #000000;
                line-height: 1.5;
                margin-left: 20px;
            }}
            .project-item {{
                margin-bottom: 12px;
                margin-left: 0;
            }}
            .project-title-line {{
                font-size: 11pt;
                font-weight: bold;
                margin-bottom: 4px;
            }}
            .project-description {{
                font-size: 10pt;
                color: #000000;
                line-height: 1.5;
                margin-left: 20px;
                margin-top: 4px;
            }}
            .project-tech {{
                margin-top: 4px;
                font-size: 10pt;
                font-style: italic;
                margin-left: 20px;
            }}
            .skills-list {{
                font-size: 11pt;
                color: #000000;
                line-height: 1.8;
            }}
            .education-item {{
                margin-bottom: 12px;
                margin-left: 0;
            }}
            .education-title-line {{
                font-size: 11pt;
                margin-bottom: 4px;
            }}
            .education-title-line strong {{
                font-weight: bold;
            }}
            .education-date {{
                font-size: 10pt;
                font-style: italic;
            }}
            .education-gpa {{
                font-size: 10pt;
                margin-left: 20px;
                margin-top: 4px;
            }}
            .empty-state {{
                font-size: 10pt;
                color: #666666;
                font-style: italic;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{user.name}</h1>
            <p>{contact_line}</p>
        </div>
        
        <div class="section">
            <h2 class="section-title">Experience</h2>
            {experiences_html}
        </div>
        
        <div class="section">
            <h2 class="section-title">Projects</h2>
            {projects_html}
        </div>
        
        <div class="section">
            <h2 class="section-title">Skills</h2>
            {skills_html}
        </div>
        
        {f'<div class="section"><h2 class="section-title">Education</h2>{education_html}</div>' if education_html else ''}
    </body>
    </html>
    """
    
    return html_template

# convert HTML content to PDF bytes.
def html_to_pdf(html_content: str) -> bytes:
    # create a new BytesIO object to store the PDF.
    result = BytesIO()
    # create a new PDF object from the HTML content.
    pdf = pisa.CreatePDF(
        BytesIO(html_content.encode('utf-8')),
        dest=result
    )
    
    # if there is an error, raise an error.
    if pdf.err:
        raise Exception(f"Error generating PDF: {pdf.err}")
    
    # seek to the beginning of the PDF and return the PDF.
    result.seek(0)
    return result.read()

