"""
simple, template‑driven docx resume builder (v1 – header only).

placeholder language (current scope)
------------------------------------

supported now:
  {field}
    - simple inline replacement
    - case‑insensitive: {name}, {NAME}, {NaMe} all map to "name"
    - used in header:
        {name}
        {email}
        {github}
        {linkedin}
        {portfolio}

conditional markers ({?field}, {?field:INLINE}) and section builders
will be added back later; for now we only render the header and focus on
styling preservation.

key ideas:
  - templates own all visual styling
  - builder only replaces placeholders in paragraphs / table cells
  - run‑level formatting is preserved whenever possible
"""

import os
import re
from typing import Dict, List, Tuple

from docx import Document
from docx.shared import Pt, RGBColor

from ..context import ResumeRenderContext, build_resume_render_context


# public entry point

def build_docx(user, template_path: str) -> Document:

    doc = Document(template_path)

    # 1) build render context
    ctx: ResumeRenderContext = build_resume_render_context(user)

    # 2) render header only (global simple placeholders)
    _render_header(doc, ctx)

    # Later we will call:
    #   _render_education(...)
    #   _render_experience(...)
    #   _render_projects(...)
    #   _render_skills(...)
    # as we grow this file again.

    return doc


# header rendering

def _render_header(doc: Document, ctx: ResumeRenderContext) -> None:
    field_values: Dict[str, str] = {
        "name": ctx.name or "",
        "email": ctx.email or "",
        "github": ctx.github or "",
        "linkedin": ctx.linkedin or "",
        "portfolio": ctx.portfolio or "",
    }

    _replace_placeholders_in_doc(doc, field_values)


# core placeholder engine (inline, no conditionals yet)

def _replace_placeholders_in_doc(doc: Document, field_values: Dict[str, str]) -> None:
    if not field_values:
        return

    # compile patterns once per field
    patterns: Dict[str, re.Pattern] = {
        field: re.compile(r"\{\s*" + re.escape(field) + r"\s*\}", re.IGNORECASE)
        for field in field_values.keys()
    }

    def _apply_all(text: str) -> str:
        """apply all {field} replacements to a single string."""
        new_text = text
        for field, pattern in patterns.items():
            value = field_values.get(field) or ""
            if pattern.search(new_text):
                new_text = pattern.sub(value, new_text)
        return new_text

    def _replace_in_paragraph(paragraph) -> None:
        # if there is nothing here, skip quickly
        if not paragraph.runs and not paragraph.text:
            return

        full_text = (
            "".join(run.text for run in paragraph.runs)
            if paragraph.runs
            else paragraph.text
        )

        if not full_text:
            return

        # fast path – check if there is any placeholder at all
        if "{" not in full_text or "}" not in full_text:
            return

        # pass 1: run-level replacement (no restructuring)
        run_changed = False
        if paragraph.runs:
            for run in paragraph.runs:
                original = run.text
                if not original:
                    continue
                replaced = _apply_all(original)
                if replaced != original:
                    run.text = replaced
                    run_changed = True

        if run_changed:
            # if we changed runs, we are done
            return

        # pass 2: multi-run placeholders (structured rebuild)
        new_full_text = _apply_all(full_text)
        if new_full_text == full_text:
            # no placeholders in this paragraph
            return

        # if there are no runs, we cannot preserve run formatting anyway
        # so we just overwrite the paragraph text
        if not paragraph.runs:
            paragraph.text = new_full_text
            return

        runs = paragraph.runs
        run_texts = [r.text for r in runs]

        # build a map from character offset in full_text to (run_index, char_index)
        char_map: List[Tuple[int, int]] = []
        for i, txt in enumerate(run_texts):
            for j in range(len(txt)):
                char_map.append((i, j))

        if len(char_map) != len(full_text):
            # something is off – fall back to a simpler replacement
            paragraph.text = new_full_text
            return

        # find all placeholder spans in the original full_text
        spans: List[Tuple[int, int, str]] = []  # (start_idx, end_idx, replacement_text)
        for field, pattern in patterns.items():
            value = field_values.get(field) or ""
            for m in pattern.finditer(full_text):
                spans.append((m.start(), m.end(), value))

        if not spans:
            return

        spans.sort(key=lambda x: x[0])

        # rebuild segments (text + font)
        segments: List[Tuple[str, object]] = []
        cursor = 0

        for start, end, replacement in spans:
            # text before placeholder
            if cursor < start:
                segment_text = full_text[cursor:start]
                run_idx, _ = char_map[cursor]
                segments.append((segment_text, runs[run_idx].font))

            # replacement text styled like the run where placeholder starts
            run_idx, _ = char_map[start]
            segments.append((replacement, runs[run_idx].font))

            cursor = end

        # trailing text after last placeholder
        if cursor < len(full_text):
            segment_text = full_text[cursor:]
            run_idx, _ = char_map[cursor]
            segments.append((segment_text, runs[run_idx].font))

        # clear and rebuild runs
        paragraph.clear()
        for text, font_obj in segments:
            if not text:
                continue
            new_run = paragraph.add_run(text)
            try:
                new_run.font.size = font_obj.size
                new_run.font.bold = font_obj.bold
                new_run.font.italic = font_obj.italic
                if font_obj.color and font_obj.color.rgb:
                    new_run.font.color.rgb = font_obj.color.rgb
            except Exception:
                # best effort on formatting
                pass

    # apply to normal paragraphs
    for para in doc.paragraphs:
        _replace_in_paragraph(para)
