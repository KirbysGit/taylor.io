from typing import Dict, Any
from datetime import datetime
import re

# ----- helpers.
def format_date_month_year(date: str) -> str:
    if not date:
        return ''

    try:
        # handle ISO datetime strings (e.g., "2021-08-01T00:00:00").
        # extract just the date part (first 10 characters: yyyy-mm-dd).
        date_str = date[:10] if len(date) >= 10 else date
        
        # parse the date.
        if len(date_str) == 7:  # yyyy-mm format.
            dt = datetime.strptime(date_str, '%Y-%m')
        elif len(date_str) == 10:  # yyyy-mm-dd format.
            dt = datetime.strptime(date_str, '%Y-%m-%d')
        else:
            return date  # return original if format is unexpected.
        
        # format as "August 2021" (month year).
        return dt.strftime('%B %Y')
    except Exception as e:
        # if parsing fails, return original date.
        return date


def format_description(description: str) -> str:
    """Format description text, converting bullet points to HTML list."""
    if not description:
        return ''
    
    # split by newlines.
    lines = description.split('\n')
    bullet_items = []
    non_bullet_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        
        # check if line starts with bullet character.
        if stripped.startswith('•'):
            # if we have accumulated non-bullet lines, add them as paragraph.
            if non_bullet_lines:
                bullet_items.append(('paragraph', '\n'.join(non_bullet_lines)))
                non_bullet_lines = []
            # extract bullet text (remove bullet and leading space).
            bullet_text = re.sub(r'^•\s+', '', stripped)
            if bullet_text:
                bullet_items.append(('bullet', bullet_text))
        else:
            # non-bullet line - accumulate for paragraph.
            non_bullet_lines.append(stripped)
    
    # add any remaining non-bullet lines.
    if non_bullet_lines:
        bullet_items.append(('paragraph', '\n'.join(non_bullet_lines)))
    
    # if we have bullets, render as list.
    if bullet_items and any(item[0] == 'bullet' for item in bullet_items):
        html_parts = []
        current_bullets = []
        
        for item_type, content in bullet_items:
            if item_type == 'bullet':
                current_bullets.append(content)
            else:
                # flush current bullets as list.
                if current_bullets:
                    list_items = ''.join([f'<li>{bullet}</li>' for bullet in current_bullets])
                    html_parts.append(f'<ul class="description-bullets">{list_items}</ul>')
                    current_bullets = []
                # add paragraph.
                html_parts.append(f'<p class="description-paragraph">{content}</p>')
        
        # flush any remaining bullets.
        if current_bullets:
            list_items = ''.join([f'<li>{bullet}</li>' for bullet in current_bullets])
            html_parts.append(f'<ul class="description-bullets">{list_items}</ul>')
        
        return ''.join(html_parts)
    else:
        # no bullets found, return as paragraph.
        return f'<p class="description-paragraph">{description}</p>'


# ------------ builders.

# ----- build headers.
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

# ----- build education entries.
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
    gpa_text = f"(GPA: {gpa})" if gpa else ""

    # build highlights lines.
    highlights_lines = []
    for title, content in edu.get('subsections', {}).items():
        highlights_lines.append(
            f'''<div class='highlight-line'>
                <div class='highlight-title'>{title}: </div>
                <div class='highlight-content'>{content}</div>
            </div>'''
        )
    highlights_lines = "\n".join(highlights_lines)

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
        <div class="highlights-lines">
            {highlights_lines}
        </div>
    </div>
    '''

# ----- build experience entries.
def build_experience_entry(exp: Dict[str, Any]) -> str:
    
    # build date range.
    start_date = format_date_month_year(exp.get('start_date', ''))
    end_date = format_date_month_year(exp.get('end_date', ''))
    current = exp.get('current', False)
    if current:
        date_range = f"{start_date} - Present"
    else:
        date_range = f"{start_date} - {end_date}"

    company = exp.get('company', '')
    skills = exp.get('skills', '')
    location = exp.get('location', '')

    # build company and skills section (left side).
    company_skills_html = f'<div class="company-name">{company}</div>'
    if skills:
        company_skills_html += f'<span class="company-separator"> | </span><div class="company-skills">{skills}</div>'

    # format description (convert bullets to HTML list).
    description = format_description(exp.get('description', ''))

    return f'''
    <div class="experience-entry">
        <div class="experience-line">
            <div class="experience-title">{exp.get('title', '')}</div>
            <div class="experience-dates">{date_range}</div>
        </div>
        <div class="company-line">
            <div class="company-skills-group">{company_skills_html}</div>
            <div class="company-location">{location}</div>
        </div>
        <div class="description-line">
            <div class="description-content">{description}</div>
        </div>
    </div>
    '''

# ----- build project entries.
def build_project_entry(proj: Dict[str, Any]) -> str:
    
    title = proj.get('title', '')
    
    # build tech stack string.
    tech_stack = proj.get('tech_stack', [])
    tech_stack_str = ', '.join(tech_stack) if isinstance(tech_stack, list) else (tech_stack or '')
    
    # get url.
    url = proj.get('url', '')
    
    # build title line with conditional separators and styling.
    title_html = f'<span class="project-title-text">{title}</span>'
    
    if tech_stack_str:
        title_html += f'<span class="project-separator">|</span><span class="project-tech">{tech_stack_str}</span>'
    
    if url:
        title_html += f'<span class="project-separator">|</span><span class="project-url">{url}</span>'

    # format description (convert bullets to HTML list).
    description = format_description(proj.get('description', ''))

    return f'''
    <div class="project-entry">
        <div class="project-line">
            <div class="project-title">{title_html}</div>
        </div>
        <div class="description-line">
            <div class="description-content">{description}</div>
        </div>
    </div>
    '''

# ----- build skills entries.
def build_skill_entry(skills: list) -> str:
    
    if not skills:
        return ''
    
    # group skills by category.
    skills_by_category = {}
    uncategorized = []
    
    for skill in skills:
        # handle both dict and string formats.
        if isinstance(skill, dict):
            category = skill.get('category') or skill.get('Category')
            name = skill.get('name') or skill.get('Name', '')
        else:
            # if it's just a string, treat as uncategorized.
            category = None
            name = str(skill)
        
        if not name:
            continue
        
        if category:
            if category not in skills_by_category:
                skills_by_category[category] = []
            skills_by_category[category].append(name)
        else:
            uncategorized.append(name)
    
    # build HTML for each category.
    skill_lines = []
    
    # add categorized skills.
    for category in sorted(skills_by_category.keys()):
        skill_names = ', '.join(skills_by_category[category])
        skill_lines.append(
            f'<div class="skill-line">'
            f'<span class="skill-category">{category}:</span> '
            f'<span class="skill-names">{skill_names}</span>'
            f'</div>'
        )
    
    # add uncategorized skills if any.
    if uncategorized:
        skill_names = ', '.join(uncategorized)
        skill_lines.append(
            f'<div class="skill-line">'
            f'<span class="skill-names">{skill_names}</span>'
            f'</div>'
        )
    
    return '\n'.join(skill_lines)
