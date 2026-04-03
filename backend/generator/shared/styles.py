# Export-agnostic style loading: merges resume tokens, presets, and template overrides into a DocxStyleConfig used by PDF margins and Word layout.

from __future__ import annotations

import json

from .resume_tokens import apply_resume_tokens_to_docx_config, load_resume_token_dict
from .style_presets import merge_resume_token_overrides
from .template_slug import PRIMARY_TEMPLATE_SLUG, normalize_template_slug, resolve_template_folder
from ..word.docx_styles import DocxStyleConfig

# Get the styles for a given template.
# In : Template Name, Style Preferences
# Out : DocxStyleConfig
def get_styles(template_name: str, style_preferences: dict | None = None) -> DocxStyleConfig:

    # Loads resume_tokens.json, merges optional user presets, then docx_styles.json overrides.
    name = normalize_template_slug(template_name)

    # Initialize the base DocxStyleConfig.
    base = DocxStyleConfig()

    # Load Tokens, Merge Presets, Apply to DocxStyleConfig.
    raw_tokens = load_resume_token_dict(name)
    tokens = merge_resume_token_overrides(name, raw_tokens, style_preferences)
    apply_resume_tokens_to_docx_config(base, tokens)

    # Load Template Overrides.
    override_path = resolve_template_folder(name) / "docx_styles.json"
    if not override_path.exists():
        override_path = resolve_template_folder(PRIMARY_TEMPLATE_SLUG) / "docx_styles.json"
    if override_path.exists():
        # Load the overrides.
        try:
            with open(override_path, "r", encoding="utf-8") as f:
                overrides = json.load(f)
            # Apply the overrides to the DocxStyleConfig.
            for key, val in overrides.items():
                if not key.startswith("_") and hasattr(base, key):
                    setattr(base, key, val)
        except Exception:
            pass
    return base
