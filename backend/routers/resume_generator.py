# routers/resume_generator.py

# resume generation utilities (HTML template and PDF conversion).

# imports.
from io import BytesIO
from models import User
from xhtml2pdf import pisa
from datetime import datetime


def format_date(date_value):
    # format date value for display.
    if not date_value:
        return None
    try:
        # handle datetime objects.
        if isinstance(date_value, datetime):
            return date_value.strftime('%B %Y')
        # handle string dates.
        date_str = str(date_value)
        # try parsing ISO format.
        if 'T' in date_str:
            date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00').split('T')[0])
        else:
            date_obj = datetime.fromisoformat(date_str)
        return date_obj.strftime('%B %Y')
    except Exception as e:
        # if parsing fails, return the original value as string.
        return str(date_value)

def generate_resume_html(user: User) -> str:
    # generate HTML resume from user data.
    
    # format experiences.
    experiences_html = ""
    if user.experiences:
        for exp in user.experiences:
            start_date = format_date(str(exp.start_date)) if exp.start_date else None
            end_date = format_date(str(exp.end_date)) if exp.end_date else "Present"
            date_range = f"{start_date or ''} - {end_date}" if start_date else end_date
            
            experiences_html += f"""
            <div class="experience-item">
                <div class="experience-header">
                    <div>
                        <h3 class="experience-title">{exp.title}</h3>
                        {f'<p class="experience-company">{exp.company}</p>' if exp.company else ''}
                    </div>
                    <p class="experience-date">{date_range}</p>
                </div>
                {f'<p class="experience-description">{exp.description}</p>' if exp.description else ''}
            </div>
            """
    else:
        experiences_html = "<p class='empty-state'>No experiences added yet.</p>"
    
    # format projects.
    projects_html = ""
    if user.projects:
        for project in user.projects:
            tech_stack = ""
            if project.tech_stack:
                tech_stack = f"<p class='project-tech'><strong>Tech Stack:</strong> {', '.join(project.tech_stack)}</p>"
            
            projects_html += f"""
            <div class="project-item">
                <h3 class="project-title">{project.title}</h3>
                {f'<p class="project-description">{project.description}</p>' if project.description else ''}
                {tech_stack}
            </div>
            """
    else:
        projects_html = "<p class='empty-state'>No projects added yet.</p>"
    
    # format skills.
    skills_html = ""
    if user.skills:
        skill_names = [skill.name for skill in user.skills]
        skills_html = f"<p class='skills-list'>{', '.join(skill_names)}</p>"
    else:
        skills_html = "<p class='empty-state'>No skills added yet.</p>"
    
    # generate full HTML.
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
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 2px solid #000000;
            }}
            .header h1 {{
                margin: 0 0 8px 0;
                font-size: 24pt;
                font-weight: bold;
                color: #000000;
                letter-spacing: 1px;
            }}
            .header p {{
                margin: 0;
                font-size: 11pt;
                color: #000000;
            }}
            .section {{
                margin-bottom: 22px;
                page-break-inside: avoid;
            }}
            .section-title {{
                font-size: 14pt;
                font-weight: bold;
                color: #000000;
                margin-bottom: 12px;
                padding-bottom: 4px;
                border-bottom: 1px solid #000000;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            .experience-item {{
                margin-bottom: 18px;
                page-break-inside: avoid;
            }}
            .experience-header {{
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 6px;
            }}
            .experience-title {{
                font-size: 12pt;
                font-weight: bold;
                color: #000000;
                margin: 0;
            }}
            .experience-company {{
                font-size: 11pt;
                color: #000000;
                margin: 2px 0;
                font-style: italic;
            }}
            .experience-date {{
                font-size: 10pt;
                color: #000000;
                white-space: nowrap;
                margin-left: 10px;
            }}
            .experience-description {{
                margin-top: 6px;
                font-size: 10pt;
                color: #000000;
                line-height: 1.5;
            }}
            .project-item {{
                margin-bottom: 18px;
                page-break-inside: avoid;
            }}
            .project-title {{
                font-size: 12pt;
                font-weight: bold;
                color: #000000;
                margin: 0 0 4px 0;
            }}
            .project-description {{
                font-size: 10pt;
                color: #000000;
                line-height: 1.5;
                margin-top: 4px;
            }}
            .project-tech {{
                margin-top: 6px;
                font-size: 10pt;
                color: #000000;
            }}
            .project-tech strong {{
                font-weight: bold;
            }}
            .skills-list {{
                font-size: 11pt;
                color: #000000;
                line-height: 1.8;
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
            <p>{user.email}</p>
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

