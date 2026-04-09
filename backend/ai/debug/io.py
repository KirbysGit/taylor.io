from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


DEBUG_DIR = Path(__file__).resolve().parent.parent / "debug_outputs"
DEBUG_LATEST = DEBUG_DIR / "job_tailor_latest.json"
DEBUG_HISTORY = DEBUG_DIR / "job_tailor_history.jsonl"
PROVIDER_DEBUG_LATEST = DEBUG_DIR / "openai_latest.json"
PROVIDER_DEBUG_HISTORY = DEBUG_DIR / "openai_history.jsonl"
PROVIDER_RESPONSE_LATEST = DEBUG_DIR / "openai_latest_response.txt"


def strip_resume_data_from_user_prompt(user_prompt: str) -> str:
    marker = "\n\nResume data (JSON):"
    if marker not in user_prompt:
        return user_prompt
    return user_prompt.split(marker, 1)[0].rstrip() + "\n\nResume data (JSON): [omitted for debug]"


def write_debug_output(entry: Dict[str, Any]) -> None:
    try:
        DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        DEBUG_LATEST.write_text(json.dumps(entry, ensure_ascii=True, indent=2), encoding="utf-8")
        with DEBUG_HISTORY.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=True) + "\n")
    except Exception:
        return


def write_provider_debug_output(entry: Dict[str, Any]) -> None:
    try:
        DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        PROVIDER_DEBUG_LATEST.write_text(json.dumps(entry, ensure_ascii=True, indent=2), encoding="utf-8")
        with PROVIDER_DEBUG_HISTORY.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=True) + "\n")
    except Exception:
        return


def write_provider_response_text(text: str) -> None:
    try:
        DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        PROVIDER_RESPONSE_LATEST.write_text(str(text or ""), encoding="utf-8")
    except Exception:
        return
