# Sidebar layout (`sidebar_split`) — notes

## Implemented

- **Rail:** header → **Skills** + **Education** in the order they appear in `sectionOrder` (only those two keys; same list the Organize tab edits). Default if missing: skills, then education.
- **Main:** **Summary**, **Experience**, **Projects** only—`sectionOrder` among these three.
- Education uses the **rail variant** only here; classic template still uses `build_education_entry`.
- `generator/pipeline.fill_template` branches on `layoutProfile` from `meta.json`.
- PDF and `/preview` use the `sidebar` folder as normal.
- Word: `docx_export_template_slug()` routes exports to `classic` until `sidebar_split` is added to `SUPPORTED_DOCX_PROFILES` and `docx_builder` gains a matching structure (likely table with two cells or section columns).

## DOCX checklist (later)

- Map aside width to Word (table column inches vs section columns).
- Repeat header/contact in Word or accept different first-page treatment.
- Skills block: same HTML builders; ensure list styles and spacing match narrow column.
- Section order parity: main includes education; skills rail-only.
- Regression: export still includes all sections when user picks Sidebar (currently classic layout substitutes).

## PDF / Playwright

- **`sidebar_split`:** Playwright PDF margins are **0**; “page” inset is only **`.resume-aside`** / **`.resume-body`** padding from tokens (`resume_tokens.json`). Avoids a white band around the full sheet on top of column padding.
- **Single-column templates** still use Playwright margins from `get_styles()` + `.resume` padding as before.
