# Template Guide: How Templates Work

## Overview

Templates control the **layout and styling** of your generated resumes. You can create them in three ways:

## How Templates Work

### 1. Template Loading Process

When `generate_resume_docx(user, template="modern")` is called:

1. **Looks for template**: `templates/modern.docx`
2. **If found**: 
   - Loads the template
   - Replaces placeholder tags (`{NAME}`, `{EMAIL}`, etc.)
   - Appends sections (Experience, Projects, Skills, Education)
3. **If not found**: 
   - Creates a blank document
   - Builds everything from scratch with default styling

### 2. Placeholder System

Templates can contain these placeholder tags that get replaced:

| Placeholder | Replaced With | Example |
|------------|---------------|---------|
| `{NAME}` | User's full name | "John Doe" |
| `{EMAIL}` | Email address | "john@example.com" |
| `{PHONE}` | Phone number | "+1 (555) 123-4567" |
| `{GITHUB}` | GitHub URL | "https://github.com/johndoe" |
| `{LINKEDIN}` | LinkedIn URL | "https://linkedin.com/in/johndoe" |
| `{PORTFOLIO}` | Portfolio URL | "https://johndoe.dev" |

**Where placeholders are replaced:**
- In paragraph text
- In table cells
- Anywhere in the document

### 3. Section Appending

After replacing placeholders, the builder **appends** these sections (if data exists):

- **Experience** - Work history with dates
- **Projects** - Projects with descriptions and tech stack
- **Skills** - Comma-separated skills list
- **Education** - Education history with dates and GPA

**Important**: Sections are always appended, even if your template already has content.

## Creating Templates: Three Options

### Option 1: Programmatic Generation (Code-Based)

**Best for**: Version control, consistency, automation

```python
# Run the template generator
python -m resume_generator.template_generator

# Or in code:
from resume_generator.template_generator import generate_all_templates
generate_all_templates()
```

This creates:
- `templates/modern.docx` - Modern, centered layout
- `templates/classic.docx` - Classic, left-aligned layout

**Customize**: Edit `template_generator.py` to create your own template styles.

### Option 2: Use Existing Word Document

**Best for**: Complex designs, custom formatting, visual design

**Steps:**
1. Open Microsoft Word (or LibreOffice, Google Docs)
2. Design your resume layout
3. Add placeholder tags where you want data:
   ```
   {NAME}
   {EMAIL} | {PHONE}
   GitHub: {GITHUB}
   ```
4. Save as `.docx` in `backend/resume_generator/templates/`
5. Name it (e.g., `my_template.docx`)
6. Use it: `generate_resume_docx(user, template="my_template")`

**Example Template Structure:**
```
┌─────────────────────────────┐
│      {NAME}                 │  ← Placeholder
│  {EMAIL} | {PHONE}          │  ← Placeholders
│                             │
│  EXPERIENCE                 │  ← Your section header
│  [Experience will be        │  ← Builder appends here
│   appended here]            │
│                             │
│  PROJECTS                   │  ← Your section header
│  [Projects will be          │  ← Builder appends here
│   appended here]            │
└─────────────────────────────┘
```

### Option 3: No Template (Auto-Generated)

**Best for**: Quick testing, default styling

Just call `generate_resume_docx(user)` - it creates everything from scratch.

## Template Examples

### Minimal Template

A template with just placeholders:

```
{NAME}
{EMAIL} | {PHONE}

[Content sections will be appended below]
```

### Styled Template

A template with custom formatting:

```
┌─────────────────────────────┐
│   [Custom Header Design]     │
│      {NAME}                 │
│   {EMAIL} | {PHONE}         │
│   {GITHUB} | {LINKEDIN}     │
│                             │
│   [Custom divider/logo]     │
│                             │
│   PROFESSIONAL SUMMARY      │
│   [Your custom text here]    │
│                             │
│   [Sections appended below]  │
└─────────────────────────────┘
```

## Best Practices

1. **Keep templates simple**: The builder handles section formatting
2. **Use placeholders**: They're automatically replaced
3. **Test templates**: Generate a resume and check the output
4. **Version control**: If using Word docs, commit them to git
5. **Naming**: Use descriptive names (`modern.docx`, `academic.docx`, etc.)

## Customizing Template Generator

To create new template styles programmatically, edit `template_generator.py`:

```python
def create_my_custom_template(output_path: str):
    doc = Document()
    
    # Set margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        # ... more styling
    
    # Add custom header
    heading = doc.add_heading("{NAME}", level=1)
    # ... more customization
    
    return doc
```

Then add it to `generate_all_templates()` function.

## Questions?

- **Q: Can I have multiple templates?**  
  A: Yes! Just add more `.docx` files to `templates/` and reference them by name.

- **Q: What if my template has sections already?**  
  A: The builder appends sections after your template content. Your sections stay intact.

- **Q: Can I customize section formatting?**  
  A: Yes! Edit `builder/docx_builder.py` functions like `_add_experience_section()`.

- **Q: Do I need to provide a template?**  
  A: No! The system works without templates, creating a clean default resume.

