"""
Document Processing Service - Extract text from uploaded files
Supports: PDF, DOCX, TXT, images (with OCR)
"""

import os
import re
from typing import List, Dict, Optional
from pathlib import Path
import pypdf
from docx import Document as DocxDocument


class DocumentProcessor:
    """Extract and process text from various document formats."""

    def __init__(self):
        self.supported_extensions = {'.pdf', '.docx', '.txt'}

    def extract_text_from_pdf(self, file_path: str) -> str:
        """
        Extract text from PDF file.

        Args:
            file_path: Path to PDF file

        Returns:
            Extracted text content
        """
        text_content = []

        try:
            with open(file_path, 'rb') as file:
                pdf_reader = pypdf.PdfReader(file)

                for page_num, page in enumerate(pdf_reader.pages, 1):
                    text = page.extract_text()
                    if text:
                        text_content.append(f"[Page {page_num}]\n{text}")

            return "\n\n".join(text_content)

        except Exception as e:
            raise Exception(f"PDF extraction error: {str(e)}")

    def extract_text_from_docx(self, file_path: str) -> str:
        """
        Extract text from DOCX file.

        Args:
            file_path: Path to DOCX file

        Returns:
            Extracted text content
        """
        try:
            doc = DocxDocument(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n\n".join(paragraphs)

        except Exception as e:
            raise Exception(f"DOCX extraction error: {str(e)}")

    def extract_text_from_txt(self, file_path: str) -> str:
        """
        Extract text from TXT file.

        Args:
            file_path: Path to TXT file

        Returns:
            File content
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()

        except UnicodeDecodeError:
            # Try with different encoding if UTF-8 fails
            with open(file_path, 'r', encoding='latin-1') as file:
                return file.read()

    def process_document(self, file_path: str) -> Dict[str, any]:
        """
        Process uploaded document and extract text.

        Args:
            file_path: Path to uploaded file

        Returns:
            Dict with:
            - filename: str
            - file_type: str
            - text_content: str
            - page_count: int (for PDFs)
            - word_count: int
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_ext = Path(file_path).suffix.lower()

        if file_ext not in self.supported_extensions:
            raise ValueError(
                f"Unsupported file type: {file_ext}. "
                f"Supported: {', '.join(self.supported_extensions)}"
            )

        # Extract text based on file type
        if file_ext == '.pdf':
            text = self.extract_text_from_pdf(file_path)
        elif file_ext == '.docx':
            text = self.extract_text_from_docx(file_path)
        elif file_ext == '.txt':
            text = self.extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")

        # Calculate metadata
        word_count = len(text.split())
        page_count = text.count("[Page ") if file_ext == '.pdf' else 1

        return {
            "filename": Path(file_path).name,
            "file_type": file_ext,
            "text_content": text,
            "page_count": page_count,
            "word_count": word_count
        }

    def process_multiple_documents(
        self,
        file_paths: List[str]
    ) -> List[Dict[str, any]]:
        """
        Process multiple documents in batch.

        Args:
            file_paths: List of file paths

        Returns:
            List of processed document dicts
        """
        results = []

        for file_path in file_paths:
            try:
                result = self.process_document(file_path)
                results.append(result)
            except Exception as e:
                results.append({
                    "filename": Path(file_path).name,
                    "error": str(e)
                })

        return results


# Singleton instance
_document_processor_instance: Optional[DocumentProcessor] = None


def get_document_processor() -> DocumentProcessor:
    """Get singleton document processor instance."""
    global _document_processor_instance
    if _document_processor_instance is None:
        _document_processor_instance = DocumentProcessor()
    return _document_processor_instance
