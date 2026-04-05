"""
Extraction service
Handles text extraction from TXT, PDF, DOCX, and Images (OCR).
"""

from pathlib import Path
from vibe_justice.services.ocr_service import get_ocr_service

class ExtractionService:
    def extract_text(self, file_path: Path) -> str:
        ext = file_path.suffix.lower()
        if ext == ".txt":
            if not file_path.exists():
                return ""
            return file_path.read_text(encoding="utf-8", errors="ignore")

        if ext in [".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"]:
            try:
                ocr = get_ocr_service()
                result = ocr.extract_text(str(file_path))
                return result.text
            except Exception as e:
                print(f"OCR Error for {file_path}: {e}")
                return ""

        if ext == ".pdf":
            try:
                from pypdf import PdfReader

                reader = PdfReader(str(file_path))
                parts = []
                for page in reader.pages:
                    text = page.extract_text() or ""
                    if text:
                        parts.append(text)
                
                extracted = "\n\n".join(parts).strip()
                if not extracted:
                    # Try OCR fallback if no text found in PDF (scanned PDF)
                    ocr = get_ocr_service()
                    result = ocr.extract_text(str(file_path))
                    return result.text
                return extracted
            except Exception as e:
                # Try OCR fallback on exception
                try:
                    ocr = get_ocr_service()
                    result = ocr.extract_text(str(file_path))
                    return result.text
                except Exception:
                    return ""

        if ext == ".docx":
            try:
                from docx import Document

                doc = Document(str(file_path))
                parts = [p.text for p in doc.paragraphs if p.text]
                return "\n".join(parts)
            except Exception:
                return ""

        return ""
