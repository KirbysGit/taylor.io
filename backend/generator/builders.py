from typing import Dict, Any
from datetime import datetime

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

    print(f"edu: {edu}")
    
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

    return f'''
    <div class="experience-entry">
        <div class="experience-line">
            <div class="experience-title">{exp.get('title', '')}</div>
            <div class="experience-dates">{date_range}</div>
        </div>
        <div class="company-line">
            <div class="company-name">{exp.get('company', '')}</div>
            <div class="company-skills">{exp.get('skills', '')}</div>
            <div class="company-location">{exp.get('location', '')}</div>
        </div>
        <div class="description-line">
            <div class="description-content">{exp.get('description', '')}</div>
        </div>
    </div>
    '''