# extractor/__init__.py

from .pdf_extractor import extract_pdf
from .docx_extractor import extract_docx

__all__ = ["extract_pdf", "extract_docx"]

