"""
ocr.py — Fixed version
Changes from original:
  - Replaced pypdf with pdfplumber (layout-aware, handles Arabic RTL)
  - Added noise cleaning (removes DIFC website nav, URLs, page numbers)
  - Added Tesseract OCR fallback for scanned/image PDFs
  - Added language detection
  - Added Arabic RTL word ordering
"""

import asyncio
import io
import re
import unicodedata
import logging

from PIL import Image
import pytesseract
from docx import Document as DocxDocument
import pdfplumber

logger = logging.getLogger(__name__)

# ── Arabic character range ───────────────────────────────────────────────────
ARABIC_CHARS = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+')


def detect_language(text: str) -> str:
    """Detect if text is primarily Arabic or English."""
    arabic_count = len(ARABIC_CHARS.findall(text))
    total = len(text.replace(' ', ''))
    if total == 0:
        return 'en'
    return 'ar' if (arabic_count / total) > 0.3 else 'en'


def clean_text(text: str) -> str:
    """
    Remove noise introduced by PDF extraction from DIFC court website PDFs.
    Handles both Arabic and English documents.
    """
    if not text:
        return ""

    # Normalize unicode
    text = unicodedata.normalize('NFKC', text)

    # Remove URLs
    text = re.sub(r'https?://[^\s\u0600-\u06FF]*', '', text)
    text = re.sub(r'www\.[^\s\u0600-\u06FF]*', '', text)

    # Remove page number patterns like "1/11" or "3/7" on their own line
    text = re.sub(r'^\d+/\d+\s*$', '', text, flags=re.MULTILINE)

    # Remove timestamps like "3/5/26, 2:56 PM"
    text = re.sub(
        r'\d{1,2}/\d{1,2}/\d{2,4},?\s*\d{1,2}:\d{2}\s*(AM|PM)?', '', text
    )

    # Remove English navigation items from DIFC website
    nav_en = (
        r'\b(About|Services|Rules\s*&\s*Decisions|Media\s*Centre|Login|Home|'
        r'Judgments\s*&\s*Orders|Court\s*of\s*First\s*Instance|'
        r'Privacy\s*Policy|Terms\s*of\s*Use|Quality\s*Policy|Disclaimer|'
        r'Useful\s*Links|DIFC\s*Courts)\b'
    )
    text = re.sub(nav_en, '', text)

    # Remove Arabic navigation items from DIFC website
    nav_ar = (
        r'(تسجيل الدخول|الخدمات|القواعد والقرارات|مركز الإعلام|حول|'
        r'الأحكام والأوامر|محكمة الدرجة الأولى|المنزل)'
    )
    text = re.sub(nav_ar, '', text)

    # Remove copyright lines
    text = re.sub(r'Copyright\s*©.*', '', text)
    text = re.sub(r'حقوق الطبع.*', '', text)

    # Remove control characters (keep Arabic, Latin, numbers, punctuation)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)

    # Remove incorrect LTR/RTL directional markers pypdf sometimes inserts
    text = re.sub(r'[\u200e\u200f\u202a-\u202e]', '', text)

    # Collapse multiple blank lines to max 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)

    # Strip each line, remove lines that are just 1-2 chars (nav remnants)
    lines = [line.strip() for line in text.split('\n')]
    lines = [l for l in lines if len(l) > 2 or l == '']
    text = '\n'.join(lines)

    return text.strip()


def _extract_with_pdfplumber(file_bytes: bytes) -> str:
    """
    Extract text from a native (text-based) PDF using pdfplumber.
    Handles Arabic RTL by sorting words right-to-left on Arabic lines.
    """
    full_text = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages):
            try:
                words = page.extract_words(
                    x_tolerance=3,
                    y_tolerance=3,
                    keep_blank_chars=False,
                    use_text_flow=True,
                    extra_attrs=[]
                )

                if not words:
                    # Fallback to simple layout extraction for this page
                    text = page.extract_text(layout=True)
                    if text:
                        full_text.append(text)
                    continue

                # Group words by line using y-position
                lines: dict = {}
                for word in words:
                    y_key = round(word['top'] / 5) * 5
                    if y_key not in lines:
                        lines[y_key] = []
                    lines[y_key].append(word)

                page_lines = []
                for y_key in sorted(lines.keys()):
                    line_words = lines[y_key]
                    sample = ' '.join(w['text'] for w in line_words)
                    is_arabic = bool(ARABIC_CHARS.search(sample))

                    if is_arabic:
                        # Arabic: sort right to left
                        line_words.sort(key=lambda w: w['x0'], reverse=True)
                    else:
                        # English: sort left to right
                        line_words.sort(key=lambda w: w['x0'])

                    line_text = ' '.join(w['text'] for w in line_words)
                    if line_text.strip():
                        page_lines.append(line_text)

                if page_lines:
                    full_text.append('\n'.join(page_lines))

            except Exception as e:
                logger.warning(f"pdfplumber failed on page {page_num}: {e}")
                # Fallback for this page only
                text = page.extract_text()
                if text:
                    full_text.append(text)

    return '\n\n'.join(full_text)


def _extract_with_tesseract(file_bytes: bytes) -> str:
    """
    OCR fallback using Tesseract for scanned/image-based PDFs.
    Uses Arabic + English language packs.
    """
    try:
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(file_bytes, dpi=200)
        pages_text = []
        for i, img in enumerate(images):
            logger.info(f"Tesseract OCR: processing page {i + 1}/{len(images)}")
            text = pytesseract.image_to_string(
                img,
                lang='ara+eng',
                config='--oem 3 --psm 3'
            )
            if text.strip():
                pages_text.append(text)
        return '\n\n'.join(pages_text)
    except Exception as e:
        logger.error(f"Tesseract OCR failed: {e}")
        return ""


def _extract_pdf(file_bytes: bytes) -> str:
    """
    Main PDF extraction function.
    1. Try pdfplumber (works for native text PDFs — Arabic and English)
    2. Fall back to Tesseract OCR (for scanned/image PDFs)
    """
    # Step 1: Try pdfplumber
    try:
        text = _extract_with_pdfplumber(file_bytes)
        if len(text.strip()) > 100:
            return text
        logger.warning("pdfplumber returned too little text, trying Tesseract")
    except Exception as e:
        logger.warning(f"pdfplumber extraction failed: {e}, trying Tesseract")

    # Step 2: Tesseract fallback
    return _extract_with_tesseract(file_bytes)


async def run_ocr(file_bytes: bytes, mime_type: str) -> str:
    """
    Main entry point called by the ingestion pipeline.
    Supports PDF, DOCX, and image files.
    """
    loop = asyncio.get_event_loop()

    def _extract() -> str:
        if mime_type == "application/pdf":
            raw_text = _extract_pdf(file_bytes)
            if not raw_text.strip():
                return "No readable text."

            cleaned = clean_text(raw_text)
            language = detect_language(cleaned)
            logger.info(
                f"PDF extracted: {len(raw_text)} raw chars → "
                f"{len(cleaned)} cleaned chars | language={language}"
            )
            return cleaned if cleaned else "No readable text."

        if mime_type in {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        }:
            doc = DocxDocument(io.BytesIO(file_bytes))
            text = "\n".join(p.text for p in doc.paragraphs).strip()
            return clean_text(text)

        # Image file — direct Tesseract
        image = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(
            image,
            lang='ara+eng',
            config='--oem 3 --psm 3'
        )
        return clean_text(text.strip())

    return await loop.run_in_executor(None, _extract)
