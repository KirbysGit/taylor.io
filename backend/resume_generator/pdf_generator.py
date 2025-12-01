# pdf_generator.py

# PDF resume generation from DOCX templates using docx2pdf.
# Requires: pip install docx2pdf
# On Windows: Works with Microsoft Word or system PDF engine.

# imports.
import tempfile
import os
from docx2pdf import convert
from .generator import generate_resume_docx


def generate_resume_pdf_from_docx(user, template: str = "main") -> bytes:
    """
    Generate PDF from DOCX template using docx2pdf.
    
    This produces a pixel-perfect PDF that matches the Word document exactly.
    Works on Windows/macOS when Word or the system PDF engine is available.
    
    Args:
        user: User model instance with all relationships loaded
        template: Template name (default: "main")
    
    Returns:
        bytes: Raw .pdf file bytes ready for download/preview
    """
    # 1. Generate DOCX bytes in memory.
    docx_bytes = generate_resume_docx(user, template)
    
    # 2. Use temporary directory for file conversion.
    with tempfile.TemporaryDirectory() as tmpdir:
        docx_path = os.path.join(tmpdir, "resume.docx")
        pdf_path = os.path.join(tmpdir, "resume.pdf")
        
        # 3. Write DOCX to temp file.
        with open(docx_path, "wb") as f:
            f.write(docx_bytes)
        
        # 4. Convert DOCX → PDF using docx2pdf.
        convert(docx_path, pdf_path)
        
        # 5. Read PDF bytes back.
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
    
    return pdf_bytes
