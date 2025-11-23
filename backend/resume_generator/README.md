# Resume Generator (DOCX)

This module handles DOCX resume generation from user data.

## Directory Structure

```
resume_generator/
├── templates/              # Word document templates (.docx files)
│   ├── modern.docx        # Modern template (generated or custom)
│   └── classic.docx       # Classic template (generated or custom)
├── builder/               # Core document building logic
│   ├── __init__.py
│   └── docx_builder.py   # Builds DOCX from template + user data
├── formatter/             # Formatting utilities
│   ├── __init__.py
│   └── formatters.py      # Date formatting, text cleaning, etc.
├── template_generator.py  # Utility to create templates programmatically
└── generator.py           # Public API interface (used by FastAPI)
```

## Usage

### From FastAPI Route

```python
from resume_generator import generate_resume_docx

# Generate DOCX resume
docx_bytes = generate_resume_docx(user, template="modern")
```

### Available Templates

- `modern` (default) - Looks for `templates/modern.docx`
- `classic` - Looks for `templates/classic.docx`
- Custom templates can be added to `templates/` directory

## Template System

### Placeholder Tags

If your Word template contains placeholder tags, they will be automatically replaced:

- `{NAME}` - User's name
- `{EMAIL}` - User's email (from contact or user.email)
- `{PHONE}` - Phone number (from contact)
- `{GITHUB}` - GitHub URL (from contact)
- `{LINKEDIN}` - LinkedIn URL (from contact)
- `{PORTFOLIO}` - Portfolio URL (from contact)

### Template Behavior

- **If template exists**: Content is loaded and placeholders are replaced, then sections are appended
- **If template doesn't exist**: A new document is created from scratch with all sections

## Creating Templates

You have **three options** for creating templates:

### Option 1: Generate Templates Programmatically (Recommended)

Use the `template_generator.py` utility to create templates in code:

```python
from resume_generator.template_generator import generate_all_templates

# Generate default templates (modern.docx, classic.docx)
generate_all_templates()
```

Or run it directly:
```bash
python -m resume_generator.template_generator
```

**Benefits:**
- Version controlled (templates are generated from code)
- Easy to customize programmatically
- Consistent styling
- Can be regenerated anytime

### Option 2: Use an Existing Word Document

1. Create or open a Word document with your desired layout
2. Add placeholder tags like `{NAME}`, `{EMAIL}`, `{PHONE}`, etc. where you want data inserted
3. Save it as `.docx` in the `templates/` directory (e.g., `templates/modern.docx`)

**Benefits:**
- Full control over design in Word
- Can use Word's advanced formatting features
- Easy to visually design

**Note:** The builder will:
- Replace placeholder tags with actual data
- Append sections (Experience, Projects, Skills, Education) after your template content
- If your template already has sections, they'll be preserved

### Option 3: Let the System Create from Scratch

If no template exists, the system automatically creates a clean, professional resume with all sections.

**Benefits:**
- No setup required
- Always works
- Consistent default styling

## Sections Generated

The builder automatically adds the following sections (if data exists):

1. **Header** - Name and contact information
2. **Experience** - Work experiences with dates
3. **Projects** - Projects with descriptions and tech stack
4. **Skills** - Comma-separated list of skills
5. **Education** - Education history with dates and GPA

