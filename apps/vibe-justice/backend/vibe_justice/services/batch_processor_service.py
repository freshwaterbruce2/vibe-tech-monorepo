"""
Batch Document Processor Service - Orchestrate OCR + AI analysis for multiple files
Supports: Phone photos (JPG/PNG), scanned PDFs, DOCX, TXT
"""

import asyncio
from typing import List, Dict, Optional
from pathlib import Path
from datetime import datetime

from vibe_justice.services.ocr_service import get_ocr_service, OCRResult
from vibe_justice.services.document_processor_service import get_document_processor
from vibe_justice.services.violation_detector_service import get_violation_detector
from vibe_justice.services.date_extractor_service import get_date_extractor
from vibe_justice.services.contradiction_detector_service import get_contradiction_detector


class BatchFileResult:
    """Result of processing a single file in batch."""

    def __init__(
        self,
        filename: str,
        file_type: str,
        success: bool,
        text_content: str = "",
        ocr_quality: Optional[str] = None,
        ocr_confidence: Optional[float] = None,
        page_count: int = 0,
        word_count: int = 0,
        processing_time: float = 0.0,
        error: Optional[str] = None,
    ):
        self.filename = filename
        self.file_type = file_type
        self.success = success
        self.text_content = text_content
        self.ocr_quality = ocr_quality  # high, medium, low (if OCR used)
        self.ocr_confidence = ocr_confidence  # 0-100 (if OCR used)
        self.page_count = page_count
        self.word_count = word_count
        self.processing_time = processing_time
        self.error = error

    def to_dict(self) -> Dict:
        return {
            "filename": self.filename,
            "file_type": self.file_type,
            "success": self.success,
            "text_content": self.text_content if self.success else "",
            "ocr_quality": self.ocr_quality,
            "ocr_confidence": self.ocr_confidence,
            "page_count": self.page_count,
            "word_count": self.word_count,
            "processing_time": self.processing_time,
            "error": self.error,
        }


class BatchAnalysisResult:
    """Complete analysis results for batch of documents."""

    def __init__(
        self,
        batch_id: str,
        total_files: int,
        successful_files: int,
        failed_files: int,
        file_results: List[BatchFileResult],
        violations: List[Dict] = None,
        dates: List[Dict] = None,
        contradictions: List[Dict] = None,
        total_processing_time: float = 0.0,
    ):
        self.batch_id = batch_id
        self.total_files = total_files
        self.successful_files = successful_files
        self.failed_files = failed_files
        self.file_results = file_results
        self.violations = violations or []
        self.dates = dates or []
        self.contradictions = contradictions or []
        self.total_processing_time = total_processing_time

    def to_dict(self) -> Dict:
        return {
            "batch_id": self.batch_id,
            "total_files": self.total_files,
            "successful_files": self.successful_files,
            "failed_files": self.failed_files,
            "file_results": [f.to_dict() for f in self.file_results],
            "violations": self.violations,
            "dates": self.dates,
            "contradictions": self.contradictions,
            "total_processing_time": self.total_processing_time,
            "summary": {
                "total_violations": len(self.violations),
                "critical_violations": sum(
                    1 for v in self.violations if v.get("severity") == "CRITICAL"
                ),
                "total_dates": len(self.dates),
                "urgent_dates": sum(1 for d in self.dates if d.get("is_urgent", False)),
                "total_contradictions": len(self.contradictions),
            },
        }


class BatchProcessorService:
    """
    Batch document processor with OCR + AI analysis.

    Workflow:
    1. Extract text from all files (OCR for images/scanned PDFs)
    2. Run AI analysis (violations, dates, contradictions)
    3. Return comprehensive results with quality metrics
    """

    def __init__(self):
        # Services
        self.ocr_service = get_ocr_service()
        self.document_processor = get_document_processor()
        self.violation_detector = get_violation_detector()
        self.date_extractor = get_date_extractor()
        self.contradiction_detector = get_contradiction_detector()

        # File type categorization
        self.ocr_formats = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp", ".pdf"}
        self.document_formats = {".pdf", ".docx", ".txt"}

    async def process_batch(
        self,
        file_paths: List[str],
        case_type: str = "employment_law",
        run_analysis: bool = True,
    ) -> BatchAnalysisResult:
        """
        Process batch of documents with OCR + AI analysis.

        Args:
            file_paths: List of absolute file paths to process
            case_type: Case type for violation detection (employment_law, family_law, estate_law)
            run_analysis: Whether to run AI analysis (violations, dates, contradictions)

        Returns:
            BatchAnalysisResult with all extracted text and analysis
        """
        start_time = datetime.now()

        # Generate batch ID
        batch_id = f"batch_{start_time.strftime('%Y%m%d_%H%M%S')}"

        # Step 1: Extract text from all files
        file_results = []
        successful_docs = []  # For AI analysis

        for file_path in file_paths:
            file_result = await self._process_single_file(file_path)
            file_results.append(file_result)

            if file_result.success:
                # Prepare for AI analysis
                successful_docs.append(
                    {
                        "filename": file_result.filename,
                        "text_content": file_result.text_content,
                    }
                )

        # Step 2: Run AI analysis on successfully extracted documents
        violations = []
        dates = []
        contradictions = []

        if run_analysis and successful_docs:
            # Run all analysis tasks in parallel
            analysis_tasks = [
                self.violation_detector.scan_for_violations(
                    successful_docs, case_type=case_type
                ),
                self.date_extractor.extract_all_dates(successful_docs),
                self.contradiction_detector.find_contradictions(successful_docs),
            ]

            analysis_results = await asyncio.gather(*analysis_tasks, return_exceptions=True)

            # Extract results (handle errors gracefully)
            if not isinstance(analysis_results[0], Exception):
                violations = [v.to_dict() for v in analysis_results[0]]

            if not isinstance(analysis_results[1], Exception):
                dates = [d.to_dict() for d in analysis_results[1]]

            if not isinstance(analysis_results[2], Exception):
                contradictions = [c.to_dict() for c in analysis_results[2]]

        # Calculate metrics
        successful_count = sum(1 for r in file_results if r.success)
        failed_count = len(file_results) - successful_count
        total_time = (datetime.now() - start_time).total_seconds()

        return BatchAnalysisResult(
            batch_id=batch_id,
            total_files=len(file_paths),
            successful_files=successful_count,
            failed_files=failed_count,
            file_results=file_results,
            violations=violations,
            dates=dates,
            contradictions=contradictions,
            total_processing_time=total_time,
        )

    async def _process_single_file(self, file_path: str) -> BatchFileResult:
        """
        Process a single file (OCR or direct text extraction).

        Args:
            file_path: Absolute path to file

        Returns:
            BatchFileResult with extraction results
        """
        start_time = datetime.now()

        try:
            file_ext = Path(file_path).suffix.lower()
            filename = Path(file_path).name

            # Determine processing method based on file type
            if file_ext in {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"}:
                # Image file - use OCR
                result = await self._process_with_ocr(file_path)

            elif file_ext == ".pdf":
                # PDF - try document processor first, fall back to OCR if needed
                result = await self._process_pdf(file_path)

            elif file_ext in {".docx", ".txt"}:
                # Direct text extraction
                result = await self._process_document(file_path)

            else:
                # Unsupported format
                return BatchFileResult(
                    filename=filename,
                    file_type=file_ext,
                    success=False,
                    error=f"Unsupported file format: {file_ext}",
                )

            # Add processing time
            result.processing_time = (datetime.now() - start_time).total_seconds()
            return result

        except Exception as e:
            return BatchFileResult(
                filename=Path(file_path).name,
                file_type=Path(file_path).suffix.lower(),
                success=False,
                error=f"Processing error: {str(e)}",
                processing_time=(datetime.now() - start_time).total_seconds(),
            )

    async def _process_with_ocr(self, file_path: str) -> BatchFileResult:
        """
        Process image file with OCR.

        Args:
            file_path: Path to image file

        Returns:
            BatchFileResult with OCR results
        """
        filename = Path(file_path).name
        file_ext = Path(file_path).suffix.lower()

        # Run OCR extraction (synchronous, but wrapped for async)
        ocr_result: OCRResult = await asyncio.to_thread(
            self.ocr_service.extract_text, file_path
        )

        # Validate quality
        quality_ok = self.ocr_service.validate_quality(ocr_result, min_confidence=80.0)

        if not quality_ok:
            # Low quality OCR result
            return BatchFileResult(
                filename=filename,
                file_type=file_ext,
                success=False,
                text_content=ocr_result.text,
                ocr_quality="low",
                ocr_confidence=ocr_result.confidence,
                page_count=ocr_result.page_count,
                word_count=ocr_result.word_count,
                error=f"OCR quality too low (confidence: {ocr_result.confidence:.1f}%)",
            )

        # Determine quality level
        if ocr_result.confidence >= 80:
            quality = "high"
        elif ocr_result.confidence >= 60:
            quality = "medium"
        else:
            quality = "low"

        return BatchFileResult(
            filename=filename,
            file_type=file_ext,
            success=True,
            text_content=ocr_result.text,
            ocr_quality=quality,
            ocr_confidence=ocr_result.confidence,
            page_count=ocr_result.page_count,
            word_count=ocr_result.word_count,
        )

    async def _process_pdf(self, file_path: str) -> BatchFileResult:
        """
        Process PDF file (try direct extraction, fall back to OCR).

        Args:
            file_path: Path to PDF file

        Returns:
            BatchFileResult
        """
        filename = Path(file_path).name

        # Try direct text extraction first (faster for digital PDFs)
        try:
            doc_result = await asyncio.to_thread(
                self.document_processor.process_document, file_path
            )

            # Check if extracted text is substantial
            if doc_result["word_count"] >= 10:
                # Successful direct extraction
                return BatchFileResult(
                    filename=filename,
                    file_type=".pdf",
                    success=True,
                    text_content=doc_result["text_content"],
                    page_count=doc_result["page_count"],
                    word_count=doc_result["word_count"],
                    ocr_quality=None,  # No OCR used
                    ocr_confidence=None,
                )

        except Exception as e:
            # Direct extraction failed, fall through to OCR
            pass

        # PDF has minimal/no text - use OCR (scanned PDF)
        return await self._process_with_ocr(file_path)

    async def _process_document(self, file_path: str) -> BatchFileResult:
        """
        Process DOCX or TXT file with direct text extraction.

        Args:
            file_path: Path to document file

        Returns:
            BatchFileResult
        """
        filename = Path(file_path).name
        file_ext = Path(file_path).suffix.lower()

        # Extract text directly
        doc_result = await asyncio.to_thread(
            self.document_processor.process_document, file_path
        )

        return BatchFileResult(
            filename=filename,
            file_type=file_ext,
            success=True,
            text_content=doc_result["text_content"],
            page_count=doc_result.get("page_count", 1),
            word_count=doc_result["word_count"],
        )


# Singleton instance
_batch_processor_instance: Optional[BatchProcessorService] = None


def get_batch_processor() -> BatchProcessorService:
    """Get singleton batch processor instance."""
    global _batch_processor_instance
    if _batch_processor_instance is None:
        _batch_processor_instance = BatchProcessorService()
    return _batch_processor_instance
