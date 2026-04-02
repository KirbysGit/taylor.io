# Sidebar layout (`sidebar_split`) — notes

## Implemented

- **Rail:** header → **Skills** + **Education** in the order they appear in `sectionOrder` (only those two keys; same list the Organize tab edits). Default if missing: skills, then education.
- **Main:** **Summary**, **Experience**, **Projects** only—`sectionOrder` among these three.
- Education uses the **rail variant** only here; classic template still uses `build_education_entry`.
- `generator/pipeline.fill_template` branches on `layoutProfile` from `meta.json`.
- PDF and `/preview` use the `sidebar` folder as normal.
- Word: `sidebar_split` is in `SUPPORTED_DOCX_PROFILES`; `docx_export_template_slug('sidebar')` stays `sidebar` so DOCX loads `templates/sidebar/` tokens. Builder uses a **two-column table**; **page margins and header/footer offset are 0** (Playwright PDF margin 0 parity); insets use `margin_top_in` / `margin_bottom_in` / `sidebar_pad_x_in` / `margin_right_in` as **cell padding** + rail **paragraph** indent. Rail cell gets shading + right border from tokens. Main-column **projects** use a right tab (tech left, URL right).
- **Contact rail**: PDF uses inline SVG from `generator/icons/contact_rail_svg.py` (via `build_contact_rail_html`). Word optionally embeds **PNG** via `generator/icons/docx_rail_png.py` from `templates/sidebar/docx_icons/<field>.png` (`email`, `phone`, `location`, `linkedin`, `github`, `portfolio`). Transparent PNGs are fine. Size / text gap: `sidebar_docx_contact_icon_size_pt`, `sidebar_docx_contact_icon_text_gap_pt` in `resume_tokens.json`. Hyperlinks on contact text are not yet mirrored in Word.

## DOCX checklist

- Done: table column width vs aside ratio, rail cell appearance from tokens, main vs rail section order, projects tech/URL line.
- Rail **height**: `docxMaxPages`: 1 + row-fill set `w:trHeight` / `w:hRule=exact` from **`sidebar_docx_fill_row_height_in`** in `resume_tokens.json` (default **10.795in**). If set to `0`, falls back to body height minus slack twips. Stub paragraph before `w:sectPr` when row-fill runs.
- Optional polish: first-page header repeat, pixel-perfect list spacing in narrow column.

## PDF / Playwright

- **`sidebar_split`:** Playwright PDF margins are **0**; “page” inset is only **`.resume-aside`** / **`.resume-body`** padding from tokens (`resume_tokens.json`). Avoids a white band around the full sheet on top of column padding.
- **Single-column templates** still use Playwright margins from `get_styles()` + `.resume` padding as before.
