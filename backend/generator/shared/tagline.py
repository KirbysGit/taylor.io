# Tagline markup parser: ==underline==, **bold**, _italic_, * → middle dot.

from __future__ import annotations

from typing import List, Tuple

# Middle dot (·) for stray * outside ** pairs.
TAGLINE_INTERPUNCT = "\u00b7"


# Parse the outer italic segments.
# In : Raw Text
# Out : List of Tuple[bool, str].
def _tagline_outer_italic_segments(raw: str) -> List[Tuple[bool, str]]:
    # Initialize the output list.
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


# Apply bold and dots to the text.
# In : Text, Italic
# Out : List of Tuple[str, bool, bool].
def _tagline_apply_bold_and_dots(text: str, italic: bool) -> List[Tuple[str, bool, bool]]:
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

# Merge the bold and italic runs.
# In : List of Tuple[str, bool, bool]
# Out : List of Tuple[str, bool, bool].
def _merge_bold_italic_runs(runs: List[Tuple[str, bool, bool]]) -> List[Tuple[str, bool, bool]]:
    merged: List[Tuple[str, bool, bool]] = []
    for text_p, b, it in runs:
        if not text_p:
            continue
        if merged and merged[-1][1] == b and merged[-1][2] == it:
            merged[-1] = (merged[-1][0] + text_p, b, it)
        else:
            merged.append((text_p, b, it))
    return merged

# Parse the tagline runs for bold and italic only.
# In : Text
# Out : List of Tuple[str, bool, bool].
def _parse_tagline_runs_bold_italic_only(text: str) -> List[Tuple[str, bool, bool]]:
    all_runs: List[Tuple[str, bool, bool]] = []
    for is_italic, seg in _tagline_outer_italic_segments(text):
        all_runs.extend(_tagline_apply_bold_and_dots(seg, is_italic))
    return _merge_bold_italic_runs(all_runs)

# Parse the tagline runs for all.
# In : Raw Text
# Out : List of Tuple[str, bool, bool, bool].
def parse_tagline_runs(raw: str) -> List[Tuple[str, bool, bool, bool]]:
    raw = (raw or "").strip()
    if not raw:
        return []
    parts = raw.split("==")
    if len(parts) % 2 == 0:
        merged_three = _parse_tagline_runs_bold_italic_only(raw)
        return [(t, b, it, False) for t, b, it in merged_three]
    merged_four: List[Tuple[str, bool, bool, bool]] = []
    for idx, p in enumerate(parts):
        underline = idx % 2 == 1
        for t, b, it in _parse_tagline_runs_bold_italic_only(p):
            merged_four.append((t, b, it, underline))
    out: List[Tuple[str, bool, bool, bool]] = []
    for text_p, b, it, u in merged_four:
        if not text_p:
            continue
        if out and out[-1][1] == b and out[-1][2] == it and out[-1][3] == u:
            out[-1] = (out[-1][0] + text_p, b, it, u)
        else:
            out.append((text_p, b, it, u))
    return out
