# builder/docx_builder.py

# Core logic for building DOCX resumes from templates and user data.

# imports.
import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from ..formatter.formatters import format_date, clean_text_for_docx


def build_docx(user, template_path: str) -> Document:
    """
    Build a DOCX resume from a template and user data.
    
    Args:
        user: User model instance with all relationships loaded
        template_path: Path to the Word template file (.docx)
    
    Returns:
        Document: python-docx Document object ready to save
    """
    # check if template exists, otherwise create a blank document.
    if os.path.exists(template_path):
        doc = Document(template_path)
    else:
        # create a new document if template doesn't exist.
        doc = Document()
    
    # get contact info (use user.contact if available, otherwise use user.email).
    contact = user.contact if hasattr(user, 'contact') and user.contact else None
    email = contact.email if contact and contact.email else user.email
    phone = contact.phone if contact else None
    github = contact.github if contact else None
    linkedin = contact.linkedin if contact else None
    portfolio = contact.portfolio if contact else None
    
    # replace placeholder tags in existing paragraphs (if template has them).
    replace_map = {
        "{NAME}": user.name,
        "{EMAIL}": email or "",
        "{PHONE}": phone or "",
        "{GITHUB}": github or "",
        "{LINKEDIN}": linkedin or "",
        "{PORTFOLIO}": portfolio or "",
    }
    
    # replace placeholders in existing paragraphs.
    for paragraph in doc.paragraphs:
        for key, value in replace_map.items():
            if key in paragraph.text:
                paragraph.text = paragraph.text.replace(key, value)
    
    # replace placeholders in tables.
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    for key, value in replace_map.items():
                        if key in paragraph.text:
                            paragraph.text = paragraph.text.replace(key, value)
    
    # if document is empty or we want to build from scratch, add sections.
    # check if document already has content (more than just headers/metadata).
    has_content = len([p for p in doc.paragraphs if p.text.strip()]) > 2
    
    if not has_content:
        # add header section.
        _add_header_section(doc, user.name, email, phone, github, linkedin, portfolio)
    
    # add experience section.
    _add_experience_section(doc, user.experiences)
    
    # add projects section.
    _add_projects_section(doc, user.projects)
    
    # add skills section.
    _add_skills_section(doc, user.skills)
    
    # add education section if available.
    if hasattr(user, 'education') and user.education:
        _add_education_section(doc, user.education)
    
    return doc


def _add_header_section(doc: Document, name: str, email: str = None, phone: str = None, 
                       github: str = None, linkedin: str = None, portfolio: str = None):
    """Add header section with name and contact info."""
    # add name as title.
    heading = doc.add_heading(name, level=1)
    heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # add contact info.
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
    
    if contact_parts:
        contact_para = doc.add_paragraph(" | ".join(contact_parts))
        contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        contact_para_format = contact_para.runs[0].font
        contact_para_format.size = Pt(10)
    
    # add spacing.
    doc.add_paragraph()


def _add_experience_section(doc: Document, experiences):
    """Add experience section."""
    if not experiences:
        return
    
    # add section heading.
    doc.add_heading("Experience", level=1)
    
    for exp in experiences:
        # add experience title and company.
        title_text = exp.title
        if exp.company:
            title_text += f" – {exp.company}"
        
        exp_para = doc.add_paragraph(title_text, style="List Bullet")
        exp_para_format = exp_para.runs[0].font
        exp_para_format.bold = True
        exp_para_format.size = Pt(11)
        
        # add date range.
        start_date = format_date(exp.start_date) if exp.start_date else ""
        end_date = format_date(exp.end_date) if exp.end_date else "Present"
        date_range = f"{start_date} - {end_date}" if start_date else end_date
        
        date_run = exp_para.add_run(f" ({date_range})")
        date_run.font.size = Pt(10)
        date_run.font.italic = True
        
        # add description if available.
        if exp.description:
            desc_para = doc.add_paragraph(clean_text_for_docx(exp.description))
            desc_para_format = desc_para.runs[0].font
            desc_para_format.size = Pt(10)
        
        # add spacing.
        doc.add_paragraph()
    
    # add spacing after section.
    doc.add_paragraph()


def _add_projects_section(doc: Document, projects):
    """Add projects section."""
    if not projects:
        return
    
    # add section heading.
    doc.add_heading("Projects", level=1)
    
    for project in projects:
        # add project title.
        proj_para = doc.add_paragraph(project.title, style="List Bullet")
        proj_para_format = proj_para.runs[0].font
        proj_para_format.bold = True
        proj_para_format.size = Pt(11)
        
        # add description if available.
        if project.description:
            desc_para = doc.add_paragraph(clean_text_for_docx(project.description))
            desc_para_format = desc_para.runs[0].font
            desc_para_format.size = Pt(10)
        
        # add tech stack if available.
        if hasattr(project, 'tech_stack') and project.tech_stack:
            tech_text = f"Tech Stack: {', '.join(project.tech_stack) if isinstance(project.tech_stack, list) else project.tech_stack}"
            tech_para = doc.add_paragraph(tech_text)
            tech_para_format = tech_para.runs[0].font
            tech_para_format.size = Pt(10)
            tech_para_format.italic = True
        
        # add spacing.
        doc.add_paragraph()
    
    # add spacing after section.
    doc.add_paragraph()


def _add_skills_section(doc: Document, skills):
    """Add skills section."""
    if not skills:
        return
    
    # add section heading.
    doc.add_heading("Skills", level=1)
    
    # add skills as comma-separated list.
    skill_names = [skill.name for skill in skills]
    skills_para = doc.add_paragraph(", ".join(skill_names))
    skills_para_format = skills_para.runs[0].font
    skills_para_format.size = Pt(11)
    
    # add spacing after section.
    doc.add_paragraph()


def _add_education_section(doc: Document, education_list):
    """Add education section."""
    if not education_list:
        return
    
    # add section heading.
    doc.add_heading("Education", level=1)
    
    for edu in education_list:
        # build education line.
        edu_parts = []
        if edu.degree:
            edu_parts.append(edu.degree)
        if edu.field:
            edu_parts.append(edu.field)
        if edu.school:
            edu_parts.append(f"– {edu.school}")
        
        edu_text = " ".join(edu_parts) if edu_parts else "Education"
        
        edu_para = doc.add_paragraph(edu_text, style="List Bullet")
        edu_para_format = edu_para.runs[0].font
        edu_para_format.bold = True
        edu_para_format.size = Pt(11)
        
        # add date range.
        start_date = format_date(edu.start_date) if edu.start_date else ""
        end_date = format_date(edu.end_date) if edu.end_date else ("Present" if edu.current else "")
        if start_date or end_date:
            date_range = f"{start_date} - {end_date}" if start_date else end_date
            date_run = edu_para.add_run(f" ({date_range})")
            date_run.font.size = Pt(10)
            date_run.font.italic = True
        
        # add GPA if available.
        if edu.gpa:
            gpa_para = doc.add_paragraph(f"GPA: {edu.gpa}")
            gpa_para_format = gpa_para.runs[0].font
            gpa_para_format.size = Pt(10)
        
        # add spacing.
        doc.add_paragraph()
    
    # add spacing after section.
    doc.add_paragraph()

