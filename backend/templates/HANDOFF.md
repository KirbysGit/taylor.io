# Tailor Template Authoring Handoff

This folder is the product-facing template catalog. A template is valid when it can
be discovered by the API, rendered to HTML/PDF from the shared fixture, and exported
to DOCX without breaking the layout/profile contract.

## Mental Model

There are three separate layers:

- Template slug: the folder name under `backend/templates/<slug>/`.
- Layout profile: the shared rendering engine selected by `meta.json`.
- Visual theme: `resume_tokens.json`, `preview.css`, and optional `docx_styles.json`.

Multiple slugs can share one layout profile. That is the preferred way to create
new visual variants, because it preserves HTML/PDF/DOCX parity while letting the
template look meaningfully different.

## Required Files

Every shipped template folder must include:

- `meta.json`
- `template.html`
- `preview.css`
- `resume_tokens.json`

Optional but common:

- `docx_styles.json` for Word-only overrides.
- `preview.png` and `previews/full.png` for static gallery assets.
- `docx_icons/` for specialized sidebar DOCX contact icons.

## Slug Rules

Folder names are API slugs. Use lowercase kebab case:

```text
classic
ats-compact
modern-rule
```

The validator enforces:

```text
^[a-z0-9]+(-[a-z0-9]+)*$
```

## Layout Profiles

The current supported profiles are registered in `backend/generator/layouts/registry.py`:

- `classic_single_column`
- `early_career`
- `project_forward`
- `sidebar_split`
- `timeline_split`

Do not ship a new layout profile until both HTML and DOCX paths exist. Unsupported
profiles silently fall back in some runtime paths, but template authoring treats
that as invalid because it hides export mismatches.

## Styling Contract

`resume_tokens.json` is the source of truth for visual values:

- PDF and preview CSS receive tokens as `--rt-*` variables.
- DOCX receives matching fields through `DocxStyleConfig`.
- Keys beginning with `_` are comments.
- Keys beginning with `word_` are Word-only and are not emitted to CSS.

`preview.css` should reference token variables for values that need to be tuned or
kept close to DOCX output. Hardcoded CSS is acceptable only for layout mechanics
or browser-only details.

## User Controls

Only expose controls that are implemented and tested end to end:

- `marginPreset`
- `typeScale`
- `fontPairing`
- `lineSpacingPreset`

The frontend knows a few planned control IDs, but they are not active template
controls yet. Do not list planned controls in `allowedControls` until the backend
preset merge and frontend behavior are implemented.

## New Template Flow

For a new visual variant:

1. Copy an existing folder with the same layout profile.
2. Change `displayName`, `family`, `variantLabel`, `tags`, and `intent` in `meta.json`.
3. Tune `resume_tokens.json` first.
4. Update `preview.css` only where tokens cannot express the visual change.
5. Add sparse `docx_styles.json` overrides only when Word needs a deliberate fudge.
6. Run the validator:

```bash
python backend/scripts/validate_templates.py
```

Use the PDF smoke check when Playwright Chromium is available:

```bash
python backend/scripts/validate_templates.py --include-pdf
```

For a new section order or column layout, add the layout profile, HTML ordering,
DOCX builder, and tests before adding the template folder.

## Release Gate

A template is ready for design review when the validator passes. It is ready to
ship only after manual visual QA for:

- template gallery preview
- editor preview
- PDF export
- DOCX export
- template switching with saved style preferences
