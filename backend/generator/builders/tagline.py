"""
Resume tagline mini-markup: same AST drives HTML (preview/PDF) and Word runs.

Markup (intentionally small surface area):
  ==text==     → underline (split on ``==`` first so underline wraps bold/italic regions)
  **text**     → bold
  _text_       → italic (underscore pairs; unmatched ``_`` stays literal in a plain segment)
  *            → middle dot (·) when not part of a ``**`` pair

``parse_tagline_runs`` returns runs as ``(text, bold, italic, underline)`` for ``docx_builder``
and internal HTML emission. ``build_tagline_block`` wraps the parsed HTML in ``<p class="tagline">``.
"""

from __future__ import annotations

import html
from typing import Any, Dict, List, Tuple

# Characters that become a literal middle dot (·), to avoid clashing with ``**`` bold markers.
TAGLINE_INTERPUNCT = "\u00b7"


def _tagline_outer_italic_segments(raw: str) -> List[Tuple[bool, str]]:
    """
    Scan ``raw`` left-to-right and emit (is_italic, segment) pieces using ``_..._`` pairs.

    - Balanced ``_inner_`` → ``inner`` is one segment with ``is_italic=True``.
    - Lone/trailing ``_`` → consume until next ``_`` or EOS as a non-italic segment (literal underscores preserved in the slice).
    - Segments between italic spans are non-italic; bold/interpunct rules apply later per segment.
    """
    out: List[Tuple[bool, str]] = []
    i = 0
    n = len(raw)
    while i < n:
        if raw[i] == "_":
            j = raw.find("_", i + 1)
            if j != -1 and j > i + 1:
                out.append((True, raw[i + 1 : j]))
                i = j + 1
            else:
                start = i
                i += 1
                while i < n and raw[i] != "_":
                    i += 1
                out.append((False, raw[start:i]))
        else:
            start = i
            while i < n and raw[i] != "_":
                i += 1
            out.append((False, raw[start:i]))
    return out


def _tagline_apply_bold_and_dots(text: str, italic: bool) -> List[Tuple[str, bool, bool]]:
    """
    Within one italic/non-italic segment: split on ``**`` to mark bold runs; remap stray ``*`` to ``TAGLINE_INTERPUNCT``.

    - Odd number of ``**``-delimited parts → even **index segments are normal, odd are **bold**.
    - Even number of splits (unclosed ``**``) → treat whole string as plain: no bold toggles, still swap ``*`` for interpunct.
    """
    parts = text.split("**")
    if len(parts) % 2 == 0:
        t = text.replace("*", TAGLINE_INTERPUNCT)
        return [(t, False, italic)] if t else []
    runs: List[Tuple[str, bool, bool]] = []
    for idx, p in enumerate(parts):
        bold = idx % 2 == 1
        t = p.replace("*", TAGLINE_INTERPUNCT)
        if t:
            runs.append((t, bold, italic))
    return runs


def _merge_bold_italic_runs(runs: List[Tuple[str, bool, bool]]) -> List[Tuple[str, bool, bool]]:
    """Join adjacent (text, bold, italic) runs when style flags match so Word/HTML get fewer fragments."""
    merged: List[Tuple[str, bool, bool]] = []
    for text_p, b, it in runs:
        if not text_p:
            continue
        if merged and merged[-1][1] == b and merged[-1][2] == it:
            merged[-1] = (merged[-1][0] + text_p, b, it)
        else:
            merged.append((text_p, b, it))
    return merged


def _parse_tagline_runs_bold_italic_only(text: str) -> List[Tuple[str, bool, bool]]:
    """Parse a slice that does not contain ``==`` underline markers (underline is applied one level up)."""
    all_runs: List[Tuple[str, bool, bool]] = []
    for is_italic, seg in _tagline_outer_italic_segments(text):
        all_runs.extend(_tagline_apply_bold_and_dots(seg, is_italic))
    return _merge_bold_italic_runs(all_runs)


def parse_tagline_runs(raw: str) -> List[Tuple[str, bool, bool, bool]]:
    """
    Tagline mini-markup (HTML preview/PDF and Word):
    - ==text== — underline (parsed outermost)
    - **text** — bold
    - _text_ — italic
    - Every * outside of ** pairs becomes a middle dot (·)
    """
    raw = (raw or "").strip()
    if not raw:
        return []
    # Underline: split on == so segments at odd indices are wrapped with underline in the final pass below.
    parts = raw.split("==")
    if len(parts) % 2 == 0:
        # Unbalanced ==: do not treat as underline; parse bold/italic only on full string.
        merged_three = _parse_tagline_runs_bold_italic_only(raw)
        return [(t, b, it, False) for t, b, it in merged_three]
    merged_four: List[Tuple[str, bool, bool, bool]] = []
    for idx, p in enumerate(parts):
        underline = idx % 2 == 1
        for t, b, it in _parse_tagline_runs_bold_italic_only(p):
            merged_four.append((t, b, it, underline))
    # Merge adjacent runs if all four style bits match (same as bold/italic merge, plus underline).
    out: List[Tuple[str, bool, bool, bool]] = []
    for text_p, b, it, u in merged_four:
        if not text_p:
            continue
        if out and out[-1][1] == b and out[-1][2] == it and out[-1][3] == u:
            out[-1] = (out[-1][0] + text_p, b, it, u)
        else:
            out.append((text_p, b, it, u))
    return out


def _tagline_runs_to_html(runs: List[Tuple[str, bool, bool, bool]]) -> str:
    """Nest em/strong/u in a fixed order so browser styling is predictable (inner = em, then strong, then u)."""
    out: List[str] = []
    for text_p, bold, italic, underline in runs:
        esc = html.escape(text_p, quote=True)
        chunk = esc
        if italic:
            chunk = f"<em>{chunk}</em>"
        if bold:
            chunk = f"<strong>{chunk}</strong>"
        if underline:
            chunk = f"<u>{chunk}</u>"
        out.append(chunk)
    return "".join(out)


def build_tagline_block(header: Dict[str, Any]) -> str:
    """HTML fragment for optional tagline: ==underline==, **bold**, _italic_, * -> ·."""
    visibility = header.get("visibility", {})
    if visibility.get("showTagline") is False:
        return ""
    raw = (header.get("tagline") or "").strip()
    if not raw:
        return ""
    inner = _tagline_runs_to_html(parse_tagline_runs(raw))
    return f'<p class="tagline">{inner}</p>'
