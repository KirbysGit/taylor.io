"""
Cross-format helpers (e.g. token merge → ``DocxStyleConfig`` for PDF margins + Word).

Add more shared modules here as you dedupe HTML/DOCX logic. Avoid importing ``python-docx``
or Playwright-backed code from this package.
"""

from __future__ import annotations

from .styles import get_styles

__all__ = ["get_styles"]
