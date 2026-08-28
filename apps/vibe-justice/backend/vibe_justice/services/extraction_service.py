"""
Extraction service
Handles text extraction from TXT, PDF, and DOCX.
"""

from pathlib import Path


class ExtractionService:
    def extract_text(self, file_path: Path) -> str:
        ext = file_path.suffix.lower()
        if ext == ".txt":
            if not file_path.exists():
                return ""
            return file_path.read_text(encoding="utf-8", errors="ignore")

        if ext == ".pdf":
            try:
                from pypdf import PdfReader

                reader = PdfReader(str(file_path))
                parts = []
                for page in reader.pages:
                    text = page.extract_text() or ""
                    if text:
                        parts.append(text)
                return "\n\n".join(parts)
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
