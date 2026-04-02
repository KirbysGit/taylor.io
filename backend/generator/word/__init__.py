"""
Word (.docx) generation.

Import ``build_docx`` from ``generator.word.docx_builder`` — package ``__init__`` stays
light so ``generator.shared.styles`` can load ``word.docx_styles`` without pulling in
``python-docx`` or the full builder graph.
"""
