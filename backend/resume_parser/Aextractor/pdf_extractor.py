# extractor/pdf_extractor.py

import pdfplumber
import logging
from io import BytesIO
import re

logger = logging.getLogger(__name__)

def extract_pdf(file_bytes: bytes) -> str:
    """
    Phase-1 optimized PDF text extraction:
    - Maximize raw text recovery
    - Avoid complex layout logic (columns, buckets, indentation)
    - Preserve bullet points and natural line breaks
    - Keep output "clean enough" for downstream cleaners & segmenters
    """

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

                # simple line reconstruction
                lines = []
                current_line = []
                last_y = None

                for w in words:
                    text = w.get("text", "").strip()
                    if not text:
                        continue

                    y = w.get("top", 0)

                    # detect new line by vertical movement
                    if last_y is not None and abs(y - last_y) > 5:
                        if current_line:
                            lines.append(" ".join(current_line))
                        current_line = []

                    current_line.append(text)
                    last_y = y

                if current_line:
                    lines.append(" ".join(current_line))

                all_lines.extend(lines)

        # Join everything into a single block of text
        raw_text = "\n".join(all_lines)

        # Light normalization (not "cleaning", just basic hygiene)
        raw_text = re.sub(r'[ \t]+', ' ', raw_text)     # collapse multiple spaces
        raw_text = re.sub(r'\n\s+\n', '\n\n', raw_text) # normalize empty lines
        raw_text = raw_text.strip()

        logger.info(f"[PDF] Extracted {len(raw_text)} characters of text.")
        return raw_text

    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise
