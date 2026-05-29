# Template styling capabilities

This document defines how Tailor classifies resume templates for **user-facing style controls** (fonts, margins, alignment, etc.) and how that maps to implementation.

## Styling modes (`stylingMode` in each template’s `meta.json`)

| Mode | Meaning | User expectations | Engineering expectations |
|------|---------|-------------------|---------------------------|
| **`locked`** | Curated visual design | Users choose this template for a **fixed look**. No (or negligible) typography/layout tuning in the product. | `resume_tokens.json` may be internal only; do not expose style sliders. Word/HTML must stay in sync without user overrides. |
| **`hybrid`** | Fixed **layout**, tunable **chrome** | Structure is predictable (sections, columns, title treatment); users may change **bounded** options (e.g. margin preset, font pair from an allowlist). | HTML structure and `docx_builder` paths are stable; only an approved subset of tokens overrides. Often `layoutLocked: true` with a non-empty `allowedControls`. |
| **`themeable`** | Broad token-driven look | Users can adjust presentation within product guardrails (presets, allowlists, clamps)—not arbitrary CSS. | Same token pipeline drives **PDF (CSS vars)** and **Word (`DocxStyleConfig`)**; use `word_*` keys when Word needs a deliberate fudge. See [PDF_WORD_SPACING.md](./PDF_WORD_SPACING.md). |

Invalid or missing `stylingMode` should be treated as **`themeable`** until a template explicitly opts into another mode (fail open for new folders).

## `allowedControls` (canonical strings)

These are **contract IDs** for the frontend and API when you add style UI. A template lists only what it **supports and tests** end-to-end (HTML preview + PDF + DOCX).

| Control ID | Typical meaning |
|------------|------------------|
| `marginPreset` | e.g. Tight / Normal / Wide → maps to `margin_*_in` (and DOCX section margins). |
| `typeScale` | One knob adjusts a **bundle** of related font sizes / vertical rhythm (not per-field free entry). |
| `fontPairing` | Primary / secondary font from an **allowlist** both engines can render (see locked vs themeable notes). |
| `lineSpacingPreset` | Optional global prose tightness (may touch `prose_line_height` and Word multiples). |
| `accentPreset` | Bounded accent/chrome choices such as section rule color or subtle heading treatment. |
| `sectionChromePreset` | Bounded section-title treatments, only when both PDF and Word implement the same visual promise. |
| `headerLayoutPreset` | Bounded header alignment/structure choices, only when the layout profile supports them in DOCX. |
| `densityPreset` | Template-specific content density presets beyond generic line spacing. |

Add new IDs only when documented here and wired for **both** exports you promise.

## Template variant categories

Treat `layoutProfile` as the implementation axis and `intent` / `tags` as product discovery metadata.

| Category | Use when | Implementation expectation |
|----------|----------|----------------------------|
| `classic_single_column` | The resume remains one body stream with the same core header/section structure. | Prefer token and chrome changes; do not create font-only variants. |
| `sidebar_split` | Skills/education live in a rail and summary/experience/projects live in the main column. | Use the existing sidebar HTML and DOCX table path. |
| `timeline_split` | Contact/skills sit in a left info rail while summary, experience, projects, and education render beside a central marker spine. | Use a dedicated locked profile; PDF uses marker rows and DOCX uses a table-based split. |
| `project_forward` | Projects deserve first-class placement and stacked metadata. | Use a dedicated profile so project ordering and DOCX treatment are explicit. |
| `classic_single_column` variant `ats-compact` | A no-frills, scanner-friendly single-column design. | Reuse classic rendering unless structural behavior differs. |
| Future `two_column_body` | The body itself splits into columns. | Requires a new HTML and DOCX layout path before shipping. |

## `layoutLocked`

- **`false`**: Template may eventually allow alignment / structural options if listed in `allowedControls` and implemented in Word.
- **`true`**: Do not expose alignment or column toggles; **presentation-only** overrides.

## Primary template: `classic` (display **Classic Serif**)

Folder slug: **`classic`**. The old name `default` is a **legacy API alias** only—it resolves to `classic` in the generator (`shared.template_slug.normalize_template_slug`).

This template is **`themeable` by design**: full token pipeline + `word_*` Word-only spacing. It is not a generic “fallback” layout; the name reflects a **specific** single-column serif design you can extend with user presets.

## Adding a new template

1. Create folder under `templates/<slug>/` with `template.html`, `preview.css`, `resume_tokens.json`, and **`meta.json`** (see `classic/meta.json`).
2. Choose `stylingMode` and a minimal `allowedControls` set you can **QA on PDF and DOCX**.
3. If the design cannot be expressed without breaking Word parity, use **`locked`** or **`hybrid`** with a small allowlist until parity is solved.
4. Update this file if you introduce a **new** `allowedControls` ID.

## Gallery & layout profile (`meta.json`)

| Key | Purpose |
|-----|---------|
| **`layoutProfile`** | Shared engine id for HTML/DOCX (default `classic_single_column`). Multiple slugs may use the same profile; add new profiles only when you implement a new builder path. See `generator/layouts/registry.py`. |
| **`family`** | Optional; groups templates in the **Templates** page (e.g. `Classic serif`) without merging them into one card. |
| **`variantLabel`** | Optional; short subtitle on the card (e.g. `Default`, `Warm`). |
| **`tags`** | Optional discovery tags, e.g. `["ATS", "Compact"]`. These should describe function, not duplicate display text. |
| **`intent`** | Optional one-line user/job fit, e.g. `ATS minimal` or `Project-heavy technical`. |
| **`defaultStylePreferences`** | Optional defaults applied by clients when starting from the template. Keep keys aligned with supported controls. |
| **`controlOptions`** | Optional per-template narrowing of a control's options. Frontend controls remain allowlist-driven. |
| **`docxMaxPages`** | Optional Word pagination promise used by export and gallery badges. |

## API

`GET /api/templates/list` returns `templates` (folder names, backward compatible) and **`templateStyling`**: a map of folder name → metadata loaded from `meta.json` (with defaults if missing). The API passes through discovery metadata (`tags`, `intent`), supported defaults, and DOCX page hints so the frontend does not infer template behavior from slugs.
