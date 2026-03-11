import asyncio
import io
from PIL import Image
import pytesseract
from pypdf import PdfReader
from docx import Document as DocxDocument


async def run_ocr(file_bytes: bytes, mime_type: str) -> str:
    loop = asyncio.get_event_loop()

    def _extract() -> str:
        if mime_type == "application/pdf":
            # Fast text extraction using pure python pypdf
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                
                # If we successfully extracted text, return it
                if len(text.strip()) > 50:
                    return text.strip()
                return text.strip() or "No readable text."
            except Exception as e:
                return "Failed to extract PDF content."

        if mime_type in {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        }:
            doc = DocxDocument(io.BytesIO(file_bytes))
            return "\n".join(p.text for p in doc.paragraphs).strip()

        image = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(image).strip()

    return await loop.run_in_executor(None, _extract)
