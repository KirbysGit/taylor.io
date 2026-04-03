# Resume Design Tokens. 

# Goal is that we have shared styling that can be used across all templates.

from __future__ import annotations

import json
from dataclasses import fields
from typing import Any, Dict

from .template_slug import PRIMARY_TEMPLATE_SLUG, TEMPLATES_DIR, resolve_template_folder
from ..word.docx_styles import DocxStyleConfig

# The filename of the resume tokens JSON file.
TOKEN_FILENAME = "resume_tokens.json"

# Simple helper function to get the template directory.
def _template_dir(template_name: str):
    return resolve_template_folder(template_name)

# Load the resume tokens JSON file for a given template.
# In : Template Name
# Out : Dictionary of Resume Tokens.
def load_resume_token_dict(template_name: str) -> Dict[str, Any]:
    path = _template_dir(template_name) / TOKEN_FILENAME
    if not path.exists():
        path = TEMPLATES_DIR / PRIMARY_TEMPLATE_SLUG / TOKEN_FILENAME
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception:
        return {}
    if not isinstance(raw, dict):
        return {}
    return {k: v for k, v in raw.items() if isinstance(k, str) and not k.startswith("_")}

# Apply the resume tokens to the DocxStyleConfig.
# In : DocxStyleConfig, Dictionary of Resume Tokens
# Out : None
def apply_resume_tokens_to_docx_config(cfg: DocxStyleConfig, tokens: Dict[str, Any]) -> None:
    fmap = {f.name: f for f in fields(DocxStyleConfig)}
    for key, val in tokens.items():
        if key not in fmap or val is None:
            continue
        f = fmap[key]
        if isinstance(val, bool) and f.type is not bool:
            continue
        if f.type is bool:
            setattr(cfg, key, bool(val))
        elif f.type is int:
            setattr(cfg, key, int(val))
        elif f.type is float:
            setattr(cfg, key, float(val))
        else:
            setattr(cfg, key, val)

# Converts the resume token key to a CSS variable name.
def _css_var_name(key: str) -> str:
    return "--rt-" + key.replace("_", "-")

# Converts the resume token value to a CSS value.
def token_value_to_css(key: str, val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, str):
        if key.endswith("_in") or key.endswith("_pt"):
            return val
        return val
    if isinstance(val, bool):
        return "1" if val else "0"
    if key.endswith("_in"):
        return f"{float(val)}in"
    if key.endswith("_pt"):
        f = float(val)
        if f == int(f):
            return f"{int(f)}pt"
        return f"{f}pt"
    if isinstance(val, float):
        s = f"{val:.4f}".rstrip("0").rstrip(".")
        return s if s else "0"
    if isinstance(val, int):
        return str(val)
    return str(val)

# Build the CSS for the resume tokens.
# In : Dictionary of Resume Tokens
# Out : CSS String
def build_resume_tokens_css(tokens: Dict[str, Any]) -> str:
    # Create a list of lines to build the CSS.
    lines = [
        "/* Injected from resume_tokens.json — single source with Word styles (DocxStyleConfig). */",
        ":root {",
    ]
    for key in sorted(tokens.keys()):
        if key.startswith("_") or key.startswith("word_"):
            continue
        val = tokens[key]
        css_val = token_value_to_css(key, val)
        if css_val == "":
            continue
        lines.append(f"  {_css_var_name(key)}: {css_val};")
    lines.append("}")
    return "\n".join(lines) + "\n"
