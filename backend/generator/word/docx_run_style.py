# Low-level Python-docx Run/Paragraph Styling: Spacing, Line Height, Resume-token Colors.

from __future__ import annotations

import re
from typing import Any, Optional

from docx.enum.text import WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

from .docx_styles import DocxStyleConfig


# --- Handle Run Character Spacing ---
def _set_run_character_spacing(run, spacing_pt: float) -> None:
    # Word w:spacing on the run; val in 1/20 pt (positive = expand, negative = condense). Matches CSS letter-spacing.
    if spacing_pt is None or spacing_pt == 0:
        return
    r_pr = run._element.get_or_add_rPr()
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:val"), str(int(round(float(spacing_pt) * 20))))
    r_pr.append(spacing)


# --- Handle Line Spacing Multiple ---
def _set_line_spacing_multiple(p, mult: float) -> None:
    # Align Word line leading with CSS line-height. Avoids Normal/defaults (often looser).
    m = float(mult)
    if m <= 0:
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        return
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    p.paragraph_format.line_spacing = m

# --- Handle Resume Color Token to Word Hex ---
def _resume_color_token_to_word_hex(raw: Any) -> Optional[str]:
    # Map resume_tokens CSS color (hex or rgba) to RRGGBB for w:color (rgba blended on white).
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if s.startswith("#"):
        t = s[1:]
        if len(t) == 3 and all(c in "0123456789ABCDEFabcdef" for c in t):
            t = "".join(c * 2 for c in t)
        if len(t) == 6 and all(c in "0123456789ABCDEFabcdef" for c in t):
            return t.upper()
        return None
    m = re.match(
        r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+)\s*)?\)",
        s,
        re.I,
    )
    if not m:
        return None
    r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
    a = float(m.group(4)) if m.group(4) is not None else 1.0
    a = max(0.0, min(1.0, a))
    r = int(round(r * a + 255 * (1.0 - a)))
    g = int(round(g * a + 255 * (1.0 - a)))
    b = int(round(b * a + 255 * (1.0 - a)))
    return f"{r:02X}{g:02X}{b:02X}"


# --- Handle Apply Run Resume Color ---
def _apply_run_resume_color(run: Any, style: DocxStyleConfig, attr: str) -> None:
    raw = getattr(style, attr, None)
    hx = _resume_color_token_to_word_hex(raw)
    if not hx:
        return
    r_pr = run._element.get_or_add_rPr()
    for old in list(r_pr.findall(qn("w:color"))):
        r_pr.remove(old)
    c = OxmlElement("w:color")
    c.set(qn("w:val"), hx)
    r_pr.append(c)


# --- Handle Hex RGB 6 for Word ---
def _hex_rgb_6_for_word(raw: Any) -> str:
    # Normalize #RGB / #RRGGBB to RRGGBB for Word w:fill / w:color, or ''.
    if raw is None:
        return ""
    s = str(raw).strip()
    if not s:
        return ""
    if s.startswith("#"):
        s = s[1:]
    if len(s) == 3 and all(c in "0123456789ABCDEFabcdef" for c in s):
        s = "".join(c * 2 for c in s)
    if len(s) != 6 or not all(c in "0123456789ABCDEFabcdef" for c in s):
        return ""
    return s.upper()
