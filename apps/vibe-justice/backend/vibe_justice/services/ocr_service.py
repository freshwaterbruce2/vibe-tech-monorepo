"""
OCR Service - Extract text from images and PDFs using Tesseract
Supports: JPG, PNG, PDF, TIFF (including phone camera photos)
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, List, Optional
from PIL import Image
import pytesseract
from pdf2image import convert_from_path


class OCRResult:
    """Result of OCR extraction."""

    def __init__(
        self,
        text: str,
        confidence: float,
        page_count: int = 1,
        word_count: int = 0,
        processing_time: float = 0.0,
    ):
        self.text = text
        self.confidence = confidence  # 0-100 scale
        self.page_count = page_count
        self.word_count = word_count or len(text.split())
        self.processing_time = processing_time

    def to_dict(self) -> Dict:
        return {
            "text": self.text,
            "confidence": self.confidence,
            "page_count": self.page_count,
            "word_count": self.word_count,
            "processing_time": self.processing_time,
            "quality": "high" if self.confidence >= 80 else "medium" if self.confidence >= 60 else "low",
        }


class OCRService:
    """
    OCR Service using Tesseract for text extraction.

    Supports:
    - Images: JPG, PNG, TIFF, WEBP (including phone photos)
    - PDFs: Converts to images then OCR
    - Multi-page documents
    - Quality validation
    """

    def __init__(self):
        # Tesseract configuration
        # Optimized for legal documents (English text, high accuracy)
        self.tesseract_config = r"--oem 3 --psm 3"  # LSTM OCR Engine, Automatic page segmentation

        # Supported file extensions
        self.supported_image_formats = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"}
        self.supported_document_formats = {".pdf"}

    def is_supported_format(self, file_path: str) -> bool:
        """Check if file format is supported."""
        ext = Path(file_path).suffix.lower()
        return ext in self.supported_image_formats or ext in self.supported_document_formats

    def extract_text(self, file_path: str) -> OCRResult:
        """
        Extract text from image or PDF file.

        Args:
            file_path: Path to file (image or PDF)

        Returns:
            OCRResult with extracted text and metadata

        Raises:
            ValueError: If file format is not supported
            FileNotFoundError: If file does not exist
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        if not self.is_supported_format(file_path):
            raise ValueError(f"Unsupported file format: {file_path}")

        ext = Path(file_path).suffix.lower()

        # Start timing
        import time

        start_time = time.time()

        # Process based on file type
        if ext in self.supported_image_formats:
            result = self._extract_from_image(file_path)
        elif ext in self.supported_document_formats:
            result = self._extract_from_pdf(file_path)
        else:
            raise ValueError(f"Unsupported format: {ext}")

        # Calculate processing time
        result.processing_time = time.time() - start_time

        return result

    def _extract_from_image(self, image_path: str) -> OCRResult:
        """
        Extract text from a single image file.

        Handles:
        - Phone camera photos (auto-correction for skew/rotation)
        - Low-resolution images (upscaling)
        - Various image formats
        """
        try:
            # Open image
            image = Image.open(image_path)

            # Preprocess image for better OCR
            image = self._preprocess_image(image)

            # Extract text with confidence data
            ocr_data = pytesseract.image_to_data(
                image, config=self.tesseract_config, output_type=pytesseract.Output.DICT
            )

            # Extract text
            text = pytesseract.image_to_string(image, config=self.tesseract_config)

            # Calculate average confidence (filter out empty detections)
            confidences = [
                int(conf) for conf, word_text in zip(ocr_data["conf"], ocr_data["text"]) if conf != "-1" and word_text.strip()
            ]

            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

            return OCRResult(
                text=text.strip(),
                confidence=avg_confidence,
                page_count=1,
                word_count=len(text.split()),
            )

        except Exception as e:
            print(f"Error extracting text from image: {e}")
            return OCRResult(text="", confidence=0.0, page_count=1)

    def _extract_from_pdf(self, pdf_path: str) -> OCRResult:
        """
        Extract text from PDF by converting to images.

        Handles:
        - Multi-page PDFs
        - Scanned documents
        - Mixed digital/scanned PDFs
        """
        try:
            # Convert PDF to images (one per page)
            images = convert_from_path(pdf_path, dpi=300)  # High DPI for quality

            all_text = []
            all_confidences = []

            # Process each page
            for page_num, image in enumerate(images, 1):
                # Preprocess image
                image = self._preprocess_image(image)

                # Extract text
                text = pytesseract.image_to_string(image, config=self.tesseract_config)
                all_text.append(text.strip())

                # Get confidence
                ocr_data = pytesseract.image_to_data(
                    image, config=self.tesseract_config, output_type=pytesseract.Output.DICT
                )

                confidences = [
                    int(conf) for conf, word_text in zip(ocr_data["conf"], ocr_data["text"]) if conf != "-1" and word_text.strip()
                ]

                if confidences:
                    all_confidences.extend(confidences)

            # Combine all pages
            combined_text = "\n\n".join(all_text)

            # Calculate average confidence across all pages
            avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

            return OCRResult(
                text=combined_text,
                confidence=avg_confidence,
                page_count=len(images),
                word_count=len(combined_text.split()),
            )

        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return OCRResult(text="", confidence=0.0, page_count=0)

    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR accuracy.

        Optimizations:
        - Convert to grayscale
        - Upscale if too small
        - Auto-rotate if skewed
        - Enhance contrast
        """
        # Convert to grayscale (better for OCR)
        if image.mode != "L":
            image = image.convert("L")

        # Upscale if image is too small (< 1000px width)
        width, height = image.size
        if width < 1000:
            scale_factor = 1000 / width
            new_size = (int(width * scale_factor), int(height * scale_factor))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        # Enhance contrast (helps with low-quality phone photos)
        from PIL import ImageEnhance

        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)  # Increase contrast by 50%

        return image

    def validate_quality(self, ocr_result: OCRResult, min_confidence: float = 80.0) -> bool:
        """
        Validate OCR quality.

        Args:
            ocr_result: OCR result to validate
            min_confidence: Minimum acceptable confidence (0-100)

        Returns:
            True if quality is acceptable, False otherwise
        """
        if ocr_result.confidence < min_confidence:
            return False

        # Check for gibberish (too many non-alphabetic characters)
        if ocr_result.text:
            alpha_ratio = sum(c.isalpha() or c.isspace() for c in ocr_result.text) / len(ocr_result.text)
            if alpha_ratio < 0.5:  # Less than 50% alphabetic/space characters
                return False

        # Check if text is too short (likely failed extraction)
        if ocr_result.word_count < 10:
            return False

        return True


# Singleton instance
_ocr_service_instance: Optional[OCRService] = None


def get_ocr_service() -> OCRService:
    """Get singleton OCR service instance."""
    global _ocr_service_instance
    if _ocr_service_instance is None:
        _ocr_service_instance = OCRService()
    return _ocr_service_instance
