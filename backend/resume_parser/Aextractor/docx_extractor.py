# backend / resume_parser / Aextractor / docx_extractor.py

# docx text extraction.

# imports.
import logging
from io import BytesIO

# create logger.
logger = logging.getLogger(__name__)

# import docx.
from docx import Document

# extract docx text.
def extract_docx(file_bytes: bytes) -> str:
    doc_file = BytesIO(file_bytes)      # create bytes io.
    doc = Document(doc_file)            # create document.
    text = ""                           # create empty string.
    for paragraph in doc.paragraphs:    # iterate through paragraphs.
        text += paragraph.text + "\n"   # add paragraph text to text.
    return text                         # return text.

