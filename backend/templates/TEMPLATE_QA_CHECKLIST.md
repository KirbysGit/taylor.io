# Template QA Checklist

Use this checklist before exposing a template in the picker or marking a layout profile as Word-supported.

## Fixture Coverage

- Header includes first name, last name, tagline formatting, and all contact fields.
- Contact visibility toggles hide at least one field and preserve ordering.
- Summary is long enough to wrap across multiple lines.
- Experience includes two or more roles, dates, location, skills, paragraphs, and bullets.
- Projects include title, tech stack, URL, paragraphs, and bullets.
- Education includes school, dates, location, GPA, major/minor, and subsections.
- Skills include categorized and uncategorized entries.
- `sectionOrder` is changed from the default to confirm profile ordering behavior.

## Preview And PDF

- Template appears in `/api/templates/list` with expected `displayName`, `layoutProfile`, `tags`, `intent`, and `allowedControls`.
- Template card filters match metadata rather than slug-only guesses.
- Preview renders without missing CSS variables or broken placeholders.
- PDF margins match the selected layout profile.
- Section ordering matches the profile contract.
- Empty sections do not leave orphan headings or blank blocks.
- Contact URL display preference changes visible text without breaking links.
- Every exposed template style control changes the preview and PDF.

## Word Export

- DOCX export uses the selected template slug when `layoutProfile` is supported.
- Margins match `resume_tokens.json` / merged style preferences.
- Header alignment, section divider visibility, divider color, and divider width match the PDF intent where supported.
- Bullets, wrapped lines, and right-aligned metadata stay readable.
- One-page templates do not create a trailing blank page.
- Multi-page templates continue naturally without clipped table rows or missing sections.
- Project-forward templates place projects after the summary and stack project metadata.
- Sidebar templates keep rail and main sections in their profile-specific columns.

## Template Switching

- Switching templates keeps resume content unchanged.
- Hidden controls are not applied visibly to templates that do not allow them.
- Saved resumes restore `template` and `stylePreferences`.
- Gallery `Preview with my resume` passes selected template and style draft into the editor.

## Release Gate

- Add or update `meta.json`, `resume_tokens.json`, `preview.css`, and `docx_styles.json` when needed.
- Update `TEMPLATE_CAPABILITIES.md` for new control IDs or layout profiles.
- Verify HTML preview, PDF export, and DOCX export before shipping the template.
