# PDF preview vs Word (DOCX) spacing reference

For **which templates allow user style overrides** (locked / hybrid / themeable), see [TEMPLATE_CAPABILITIES.md](./TEMPLATE_CAPABILITIES.md).

Each template folder (primary: **`classic`**) loads `resume_tokens.json`; values apply to **PDF** via injected CSS variables (`--rt-*`) in `preview.css`, and to **Word** via `DocxStyleConfig` when a field exists with the same name. Legacy API slug `default` resolves to `classic`.

Engine differences (fonts, line breaking) mean layouts will not match exactly. Tokens with the **`word_` prefix** are **not** emitted to CSS—they exist only on `DocxStyleConfig` for compact or Word-specific paragraph rules.

## Quick mapping

| Resume region | PDF (tokens + CSS) | Word (DocxStyleConfig + `docx_builder.py`) |
|---------------|-------------------|---------------------------------------------|
| Education highlights (subsection lines) | `highlights_gap_pt` (flex gap between `.highlight-line` rows), highlight text uses shared `prose_line_height` in other contexts | `word_highlight_space_after_pt` (pt after each highlight paragraph), **single** line spacing |
| Experience description bullets | `description_bullet_item_space_pt` (`li` margin-bottom), `description_bullet_*` indents, `prose_line_height` on `.description-content` | Each bullet: `word_bullet_space_after_pt` after, **single** line spacing. First bullet space-before = `description_block_space_before_pt` + `word_bullet_space_before_pt`; later bullets = `word_bullet_space_before_pt` only |
| Project description bullets | Same as experience (shared description markup/CSS) | Same Word fields as experience (`_add_description_block`) |
| Skills category rows | `skill_line_space_pt` (margin-bottom), `skill_line_height` (CSS `line-height`) | `skill_line_space_pt` (space after paragraph), **single** line spacing |

## Template authors

1. Edit shared appearance in `resume_tokens.json` (PDF + Word) when the key exists on `DocxStyleConfig`.
2. For **Word-only** vertical tuning, add or adjust keys prefixed with `word_` (omitted from `:root` CSS).
3. Optional overrides per template: `docx_styles.json` (same field names as `DocxStyleConfig`).
