import asyncio
import io
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes
from docx import Document as DocxDocument


async def run_ocr(file_bytes: bytes, mime_type: str) -> str:
    loop = asyncio.get_event_loop()

    def _extract() -> str:
        if mime_type == "application/pdf":
            pages = convert_from_bytes(file_bytes)
            return "\n".join(pytesseract.image_to_string(page) for page in pages).strip()

        if mime_type in {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        }:
            doc = DocxDocument(io.BytesIO(file_bytes))
            return "\n".join(p.text for p in doc.paragraphs).strip()

        image = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(image).strip()

    return await loop.run_in_executor(None, _extract)
