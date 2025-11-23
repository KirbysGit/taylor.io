# extractor/pdf_extractor.py

# pdf text extraction.

# imports.
import re
import logging
import pdfplumber
from io import BytesIO

# create logger.
logger = logging.getLogger(__name__)

def extract_pdf(file_bytes: bytes) -> str:
    # extract text from a PDF file.
    pdf_file = BytesIO(file_bytes)
    all_lines = []

    try:
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                # extract words with positions (best word-level accuracy)
                words = page.extract_words(
                    x_tolerance=3,
                    y_tolerance=3,
                    keep_blank_chars=False,
                    use_text_flow=True
                )

                if not words:
                    # absolute fallback → extract_text
                    text = page.extract_text() or ""
                    all_lines.extend(text.split("\n"))
                    continue

                # simple line reconstruction.
                lines = []
                current_line = []
                last_y = None

                # iterate through words.
                for w in words:
                    text = w.get("text", "").strip()
                    if not text:
                        continue

                    y = w.get("top", 0)

                    # detect new line by vertical movement.
                    if last_y is not None and abs(y - last_y) > 5:
                        if current_line:
                            lines.append(" ".join(current_line))
                        current_line = []

                    # add word to current line.
                    current_line.append(text)
                    last_y = y

                if current_line:
                    lines.append(" ".join(current_line))

                # add lines to all lines.
                all_lines.extend(lines)

        # join everything into a single block of text.
        raw_text = "\n".join(all_lines)

        # light normalization (not "cleaning", just basic hygiene).
        raw_text = re.sub(r'[ \t]+', ' ', raw_text)         # collapse multiple spaces
        raw_text = re.sub(r'\n\s+\n', '\n\n', raw_text)     # normalize empty lines
        raw_text = raw_text.strip()

        # log the number of characters extracted.
        logger.info(f"[PDF] Extracted {len(raw_text)} characters of text.")

        # return the raw text.
        return raw_text

    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise
