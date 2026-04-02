"""
Export-agnostic style loading: merges resume tokens, presets, and template overrides
into a ``DocxStyleConfig`` used by PDF margins and Word layout.

Word-specific field definitions live in ``generator.word.docx_styles``.
"""

from __future__ import annotations

import json

from ..resume_tokens import apply_resume_tokens_to_docx_config, load_resume_token_dict
from ..style_presets import merge_resume_token_overrides
from ..template_slug import (
    PRIMARY_TEMPLATE_SLUG,
    normalize_template_slug,
    resolve_template_folder,
)
from ..word.docx_styles import DocxStyleConfig


def get_styles(template_name: str, style_preferences: dict | None = None) -> DocxStyleConfig:
    """
    Return style config for the given template.
    Loads resume_tokens.json, merges optional user presets (see style_presets), then docx_styles.json overrides.
    """
    name = normalize_template_slug(template_name)
    base = DocxStyleConfig()
    raw_tokens = load_resume_token_dict(name)
    tokens = merge_resume_token_overrides(name, raw_tokens, style_preferences)
    apply_resume_tokens_to_docx_config(base, tokens)
    override_path = resolve_template_folder(name) / "docx_styles.json"
    if not override_path.exists():
        override_path = resolve_template_folder(PRIMARY_TEMPLATE_SLUG) / "docx_styles.json"
    if override_path.exists():
        try:
            with open(override_path, "r", encoding="utf-8") as f:
                overrides = json.load(f)
            for key, val in overrides.items():
                if not key.startswith("_") and hasattr(base, key):
                    setattr(base, key, val)
        except Exception:
            pass
    return base
