"""
resume_parser.py
Extracts plain text from uploaded PDF or DOCX resumes.
"""

import os
import re

def extract_text_from_pdf(filepath: str) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(filepath)
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text("text"))
        doc.close()
        return "\n".join(text_parts)
    except Exception as e:
        raise RuntimeError(f"PDF extraction failed: {e}")


def extract_text_from_docx(filepath: str) -> str:
    """Extract text from a DOCX file using python-docx."""
    try:
        from docx import Document
        doc = Document(filepath)
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        return "\n".join(paragraphs)
    except Exception as e:
        raise RuntimeError(f"DOCX extraction failed: {e}")


def parse_resume(filepath: str) -> str:
    """
    Auto-detect file type and extract text.
    Returns cleaned plain text.
    """
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".pdf":
        raw = extract_text_from_pdf(filepath)
    elif ext in (".docx", ".doc"):
        raw = extract_text_from_docx(filepath)
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    # Clean up whitespace
    cleaned = re.sub(r'\n{3,}', '\n\n', raw)
    cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned)
    return cleaned.strip()
