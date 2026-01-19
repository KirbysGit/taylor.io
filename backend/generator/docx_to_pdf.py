import tempfile
import os
from docx2pdf import convert

def docx_to_pdf(document: Document) -> bytes:

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp_docx:
        document.save(tmp_docx.name)
        tmp_pdf = tmp_docx.name.replace('.docx', '.pdf')

        convert(tmp_docx.name, tmp_pdf)

        with open(tmp_pdf, 'rb') as f:
            pdf_bytyes = f.read()

        os.unlink(tmp_docx.name)
        os.unlink(tmp_pdf)

        return pdf_bytes