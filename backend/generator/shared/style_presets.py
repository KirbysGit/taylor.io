# Map user style preferences (margin / line-spacing presets) into resume_tokens overrides.

from __future__ import annotations

from typing import Any, Dict, Optional

from ..layouts.registry import DEFAULT_LAYOUT_PROFILE, load_layout_profile


def _classic_single_column_engine(template_name: Optional[str]) -> bool:
    return load_layout_profile(template_name) == DEFAULT_LAYOUT_PROFILE

# --- Classic (classic / legacy default) ---------------------------------

_CLASSIC_MARGIN_PRESETS: Dict[str, Dict[str, float]] = {
    # "Tight" / "spacious" describe the *layout* (how roomy the text block feels), not raw margin inches:
    # larger page margins → narrower column → reads tighter; smaller margins → wider column → reads airier.
    "balanced": {},
    "tight": {
        "margin_top_in": 0.55,
        "margin_bottom_in": 0.28,
        "margin_left_in": 0.62,
        "margin_right_in": 0.62,
    },
    "spacious": {
        "margin_top_in": 0.32,
        "margin_bottom_in": 0.12,
        "margin_left_in": 0.4,
        "margin_right_in": 0.4,
    },
}

_CLASSIC_LINE_PRESETS: Dict[str, Dict[str, float]] = {
    "standard": {},
    "compact": {"prose_line_height": 1.0},
    "relaxed": {"prose_line_height": 1.35},
}

# One knob scales every font size token together (hierarchy preserved).
_CLASSIC_TYPE_SCALE_FACTORS: Dict[str, float] = {
    "standard": 1.0,
    "compact": 0.94,
    "large": 1.08,
}

# Primary + secondary roles: headings/body vs meta/dates (Word: font_primary / font_secondary).
# Stacks are full CSS font-family values for PDF preview; must stay Word-safe for the single-name fields.
_CLASSIC_FONT_PAIRINGS: Dict[str, Dict[str, Any]] = {
    "serif_classic": {},
    "calibri_modern": {
        "font_primary": "Calibri",
        "font_secondary": "Calibri",
        "font_name_display_stack": "Calibri, \"Segoe UI\", \"Helvetica Neue\", Arial, sans-serif",
        "font_stack_primary": "Calibri, \"Segoe UI\", sans-serif",
        "font_stack_secondary": "Calibri, \"Segoe UI\", sans-serif",
    },
}

# Pick the first non-empty value from the list of keys.
# In : Dictionary, List of Keys
# Out : First Non-Empty Value.
def _pick(d: Dict[str, Any], *keys: str) -> Optional[Any]:
    for k in keys:
        if k in d and d[k] is not None and d[k] != "":
            return d[k]
    return None

# Map user style preferences to resume token overrides.
# In : Template Name, Preferences
# Out : Dictionary of Resume Token Overrides.
def user_style_to_token_overrides(template_name: Optional[str], preferences: Dict[str, Any]) -> Dict[str, Any]:
    # If the preferences are not provided, return an empty dictionary.
    if not preferences:
        return {}
    if not _classic_single_column_engine(template_name):
        return {}

    out: Dict[str, Any] = {}

    # Get the margin preset.
    margin_key = _pick(preferences, "marginPreset", "margin_preset")
    if isinstance(margin_key, str):
        margin_key = margin_key.strip().lower()
        preset = _CLASSIC_MARGIN_PRESETS.get(margin_key)
        if preset is not None:
            out.update(preset)

    # Get the line spacing preset.
    line_key = _pick(preferences, "lineSpacingPreset", "line_spacing_preset")
    if isinstance(line_key, str):
        line_key = line_key.strip().lower()
        preset = _CLASSIC_LINE_PRESETS.get(line_key)
        if preset is not None:
            out.update(preset)

    # Get the font pairing preset.
    fp_key = _pick(preferences, "fontPairing", "font_pairing")
    if isinstance(fp_key, str):
        fp_key = fp_key.strip().lower()
        fp_preset = _CLASSIC_FONT_PAIRINGS.get(fp_key)
        if fp_preset is not None:
            out.update(fp_preset)

    return out

# Apply the type scale to the tokens.
# In : Tokens, Template Name, Preferences
# Out : Dictionary of Scaled Tokens.
def apply_type_scale_to_tokens(tokens: Dict[str, Any], template_name: Optional[str], preferences: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    # If the preferences are not provided, return the tokens.
    if not preferences:
        return tokens
    
    ts_key = _pick(preferences, "typeScalePreset", "type_scale_preset")
    
    # If the type scale key is not a string, return the tokens.
    if not isinstance(ts_key, str):
        return tokens

    # Strip the type scale key and convert to lowercase.
    ts_key = ts_key.strip().lower()

    # Get the type scale factor to be applied.
    factor = _CLASSIC_TYPE_SCALE_FACTORS.get(ts_key)
    if not _classic_single_column_engine(template_name) or factor is None or factor == 1.0:
        return tokens

    # Create a new dictionary to store the scaled tokens.
    out = dict(tokens)

    # Iterate over the keys in the tokens dictionary.
    for k in list(out.keys()):
        if not k.endswith("_font_size_pt"):
            continue
        v = out[k]
        if not isinstance(v, (int, float)):
            continue
        scaled = float(v) * factor
        out[k] = max(6, int(round(scaled)))
    return out

# Merge the resume token overrides.
# In : Template Name, Base Tokens, Preferences
# Out : Dictionary of Merged Tokens.
def merge_resume_token_overrides(template_name: Optional[str], base_tokens: Dict[str, Any], preferences: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    merged = dict(base_tokens)
    merged.update(user_style_to_token_overrides(template_name, preferences or {}))
    merged = apply_type_scale_to_tokens(merged, template_name, preferences)
    return merged
