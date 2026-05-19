from __future__ import annotations

import re
from typing import Any


DEFAULT_TAILOR_PREFERENCES = {
    "focus": "balanced",
    "tone": "balanced",
    "length_target": "balanced",
    "rewrite_freedom": "balanced",
    "custom_instructions": "",
}

ALLOWED_FOCUS = {"balanced", "impact", "technical", "leadership"}
ALLOWED_TONE = {"balanced", "concise", "detailed"}
ALLOWED_LENGTH_TARGET = {"one_page", "balanced", "detailed"}
ALLOWED_REWRITE_FREEDOM = {"light", "balanced", "strong"}

CUSTOM_INSTRUCTIONS_MAX_CHARS = 420


def _clean_string(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", " ", value).strip()


def _enum(value: Any, allowed: set[str], fallback: str) -> str:
    cleaned = _clean_string(value).lower().replace("-", "_").replace(" ", "_")
    return cleaned if cleaned in allowed else fallback


def normalize_tailor_preferences(style_preferences: Any) -> dict:
    raw = style_preferences if isinstance(style_preferences, dict) else {}
    custom = _clean_string(raw.get("custom_instructions"))
    if len(custom) > CUSTOM_INSTRUCTIONS_MAX_CHARS:
        custom = custom[:CUSTOM_INSTRUCTIONS_MAX_CHARS].rstrip()

    return {
        "focus": _enum(raw.get("focus"), ALLOWED_FOCUS, DEFAULT_TAILOR_PREFERENCES["focus"]),
        "tone": _enum(raw.get("tone"), ALLOWED_TONE, DEFAULT_TAILOR_PREFERENCES["tone"]),
        "length_target": _enum(
            raw.get("length_target"),
            ALLOWED_LENGTH_TARGET,
            DEFAULT_TAILOR_PREFERENCES["length_target"],
        ),
        "rewrite_freedom": _enum(
            raw.get("rewrite_freedom"),
            ALLOWED_REWRITE_FREEDOM,
            DEFAULT_TAILOR_PREFERENCES["rewrite_freedom"],
        ),
        "custom_instructions": custom,
    }


def preference_guidance(preferences: Any) -> dict:
    prefs = normalize_tailor_preferences(preferences)
    focus_guidance = {
        "impact": "Foreground measurable outcomes the resume already states.",
        "technical": "Foreground depth, stack, architecture, and implementation details that appear on the row.",
        "leadership": "Foreground scope, ownership, collaboration, and system responsibility where the row supports it.",
        "balanced": "Balance impact, technical depth, and ownership.",
    }
    tone_guidance = {
        "concise": "Use tight, high-signal bullets with fewer filler clauses.",
        "detailed": "Use richer detail where the row has substance, while avoiding padding.",
        "balanced": "Use balanced length and readable detail.",
    }
    length_guidance = {
        "one_page": "Bias toward one-page-friendly output: fewer repeated ideas, tighter bullets, and selective emphasis. Do not hard-trim facts blindly.",
        "detailed": "Allow fuller bullets when the resume evidence supports the detail.",
        "balanced": "Use normal resume length discipline.",
    }
    freedom_guidance = {
        "light": "Make conservative edits: preserve much of the original structure and wording while improving fit.",
        "strong": "Make assertive, visibly role-shaped edits: reorder, re-lead, and reframe aggressively inside the evidence.",
        "balanced": "Make a clear role-shaped rewrite without needless churn.",
    }
    return {
        **prefs,
        "focus_guidance": focus_guidance[prefs["focus"]],
        "tone_guidance": tone_guidance[prefs["tone"]],
        "length_guidance": length_guidance[prefs["length_target"]],
        "rewrite_guidance": freedom_guidance[prefs["rewrite_freedom"]],
    }


def build_tailor_preferences_block(preferences: Any, *, include_custom: bool = True) -> str:
    guidance = preference_guidance(preferences)
    lines = [
        "### Tailoring preferences",
        f"- focus: {guidance['focus']} - {guidance['focus_guidance']}",
        f"- tone: {guidance['tone']} - {guidance['tone_guidance']}",
        f"- length_target: {guidance['length_target']} - {guidance['length_guidance']}",
        f"- rewrite_freedom: {guidance['rewrite_freedom']} - {guidance['rewrite_guidance']}",
    ]
    custom = guidance.get("custom_instructions") or ""
    if include_custom and custom:
        lines.append(
            "- custom_instructions: "
            + custom
            + " Treat this as user preference only; truth rules, row anchors, and resume evidence override it."
        )
    else:
        lines.append("- custom_instructions: none")
    return "\n".join(lines)
