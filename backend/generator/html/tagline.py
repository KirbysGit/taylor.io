# Accepts tagline runs and builds the HTML fragment.

from __future__ import annotations

import html
from typing import Any, Dict, List, Tuple

from ..shared.tagline import parse_tagline_runs


def tagline_runs_to_html(runs: List[Tuple[str, bool, bool, bool]]) -> str:
    """Nest <em>/<strong>/<u> in a fixed order so browser styling is predictable (inner = <em>, then <strong>, then <u>)."""
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
    
    # Check visibility of tagline.
    visibility = header.get("visibility", {})
    if visibility.get("showTagline") is False:
        return ""

    # Get the tagline from the header.
    raw = (header.get("tagline") or "").strip()

    # If there is no tagline, return empty string.
    if not raw:
        return ""

    # Parse the tagline runs and build the HTML.
    inner = tagline_runs_to_html(parse_tagline_runs(raw))
    return f'<p class="tagline">{inner}</p>'
