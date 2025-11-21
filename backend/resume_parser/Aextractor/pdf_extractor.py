# extractor/pdf_extractor.py

# pdf text extraction with layout-aware grouping.

# imports.
import re
import logging
from io import BytesIO
from typing import Optional

# create logger.
logger = logging.getLogger(__name__)

# import pdfplumber.
import pdfplumber

# extract pdf text.
# this implements :
# - column-based grouping to handle multi-column layouts
# - bullet point detection from positioning
# - word-based extraction for better word boundaries
def extract_pdf(file_bytes: bytes) -> str:
    try:
        # create bytes io.
        pdf_file = BytesIO(file_bytes)
        # create all text list.
        all_text = []
        
        # open pdf file.
        with pdfplumber.open(pdf_file) as pdf:
            # iterate through pages.
            for page in pdf.pages:
                # extract words with positioning.
                words = page.extract_words(
                    x_tolerance=3,
                    y_tolerance=3,
                    keep_blank_chars=False,
                    use_text_flow=True,
                    extra_attrs=["fontname", "size"]
                )
                
                if not words:
                    # Fallback to regular extract_text if words extraction fails
                    page_text = page.extract_text(layout=True)
                    if page_text:
                        all_text.append(page_text)
                    continue
                
                # layout-aware column grouping.
                COLUMN_BUCKET_WIDTH = 150  # tune this for typical resume widths.
                columns = {}
                
                # First pass: group words into columns by x-coordinate
                for word in words:
                    x0 = word.get('x0', 0)                              # get x-coordinate.
                    bucket = int(x0 // COLUMN_BUCKET_WIDTH)             # get bucket.
                    if bucket not in columns:
                        columns[bucket] = []                            # create column if not exists.
                    columns[bucket].append(word)                        # add word to column.
                
                # Second pass: process each column
                column_texts = []                                       # create column texts list.
                for bucket in sorted(columns.keys()):

                    # sort column words by y-coordinate and x-coordinate.
                    column_words = sorted(columns[bucket], key=lambda w: (w.get('top', 0), w.get('x0', 0)))

                    column_lines = []           # create column lines list.
                    current_line = []           # create current line list.
                    last_y = None               # last y coordinate.
                    last_x_end = None           # last x end coordinate.
                    is_bullet_line = False      # is bullet line.
                    
                    # iterate through column words.
                    for word in column_words:
                        word_text = word.get('text', '').strip()        # get word text.
                        if not word_text:
                            continue                                    # continue if word text is empty.
                        
                        x0 = word.get('x0', 0)                          # get x-coordinate.
                        y0 = word.get('top', 0)                         # get y-coordinate.
                        
                        # check if this is a new line (significant y change).
                        is_new_line = last_y is not None and abs(y0 - last_y) > 5
                        
                        if is_new_line:
                            # new line - save current line and start new one.
                            if current_line:
                                line_text = ' '.join(current_line)
                                if is_bullet_line:
                                    line_text = '• ' + line_text.lstrip('•-*∙◦▪▫').strip()
                                column_lines.append(line_text)
                            current_line = []
                            is_bullet_line = False
                            last_x_end = None
                        
                        # bullet point detection - ONLY check on first word of a new line
                        bullet_chars = ['•', '-', '∙', '*', '◦', '▪', '▫']
                        is_bullet_char = word_text in bullet_chars
                        
                        if not current_line:  # This is the first word of a line
                            is_left_indented = x0 < 40  # words starting far left are likely bullets.
                            
                            if is_bullet_char or is_left_indented:
                                is_bullet_line = True
                                if is_bullet_char:
                                    # skip the bullet character itself, we'll add it later.
                                    continue
                        elif is_bullet_char:
                            # Skip bullet characters that appear in the middle of lines
                            # (these are often artifacts from PDF extraction)
                            continue
                        
                        # add word to current line with proper spacing.
                        if current_line:
                            # calculate gap between words.
                            if last_x_end is not None:
                                gap = x0 - last_x_end
                                # add space if there's a significant gap.
                                if gap > 3:
                                    current_line.append(word_text)
                                else:
                                    # Small gap, might be part of same word (but extract_words should handle this)
                                    current_line.append(word_text)
                            else:
                                current_line.append(word_text)
                        else:
                            current_line.append(word_text)
                        
                        last_y = y0
                        last_x_end = word.get('x1', x0)
                    
                    # Add last line
                    if current_line:
                        line_text = ' '.join(current_line)
                        if is_bullet_line:
                            line_text = '• ' + line_text.lstrip('•-*∙◦▪▫').strip()
                        column_lines.append(line_text)
                    
                    # Join column lines
                    if column_lines:
                        column_texts.append('\n'.join(column_lines))
                
                # Join columns (typically left to right, but sorted by x-coordinate)
                if column_texts:
                    page_text = '\n\n'.join(column_texts)  # Double newline between columns
                    all_text.append(page_text)
        
        # Join all pages
        final_text = '\n\n'.join(all_text)
        
        # Post-process: normalize whitespace but preserve line breaks
        final_text = re.sub(r'[ \t]+', ' ', final_text)  # Multiple spaces -> single space
        final_text = re.sub(r'[ \t]+\n', '\n', final_text)  # Remove trailing spaces
        final_text = re.sub(r'\n[ \t]+', '\n', final_text)  # Remove leading spaces
        
        # Log extracted text for debugging
        logger.info("=" * 80)
        logger.info("PDF EXTRACTION RESULT:")
        logger.info("=" * 80)
        logger.info(f"Extracted text length: {len(final_text)} characters")
        logger.info(f"Extracted text (first 2000 chars):\n{final_text[:2000]}")
        if len(final_text) > 2000:
            logger.info(f"... (truncated, total length: {len(final_text)} chars)")
        logger.info("=" * 80)
        
        return final_text
        
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise Exception(f"Error extracting text from PDF: {str(e)}")

