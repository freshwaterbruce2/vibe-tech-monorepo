"""
Batch Document Processing API - Upload and analyze multiple documents
Supports: Phone photos, scanned PDFs, DOCX, TXT (10+ files at once)
"""

import os
import tempfile
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from vibe_justice.services.batch_processor_service import get_batch_processor


router = APIRouter(prefix="/api/batch", tags=["batch"])


# Request/Response Models
class BatchUploadResponse(BaseModel):
    """Response from batch upload endpoint."""

    batch_id: str
    total_files: int
    successful_files: int
    failed_files: int
    file_results: List[dict]
    violations: List[dict]
    dates: List[dict]
    contradictions: List[dict]
    total_processing_time: float
    summary: dict


# Constants
MAX_FILES = 50  # Maximum files per batch
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB per file
ALLOWED_EXTENSIONS = {
    # Images (phone photos)
    ".jpg",
    ".jpeg",
    ".png",
    ".tiff",
    ".tif",
    ".webp",
    # Documents
    ".pdf",
    ".docx",
    ".txt",
}


@router.post("/upload", response_model=BatchUploadResponse)
async def upload_batch(
    files: List[UploadFile] = File(...),
    case_type: Optional[str] = Form("employment_law"),
    run_analysis: Optional[bool] = Form(True),
):
    """
    Upload and process multiple documents in batch.

    Supports:
    - Phone camera photos (JPG, PNG)
    - Scanned PDFs
    - Digital PDFs
    - Word documents (DOCX)
    - Text files (TXT)

    Args:
        files: List of uploaded files (max 50)
        case_type: Case type for violation detection
                   - employment_law (Walmart/Sedgwick/Unemployment)
                   - family_law (Custody/Support/Divorce)
                   - estate_law (Probate/Will/Inheritance)
        run_analysis: Whether to run AI analysis (violations, dates, contradictions)

    Returns:
        BatchUploadResponse with:
        - Extracted text from all files
        - OCR quality metrics (if applicable)
        - Legal violations detected
        - Critical dates found
        - Contradictions identified
        - Per-file processing status

    Raises:
        HTTPException: 400 if validation fails, 500 if processing fails
    """
    # Validation: Check file count
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files. Maximum {MAX_FILES} files per batch.",
        )

    # Validation: Check file types and sizes
    temp_files = []
    validated_files = []

    try:
        for upload_file in files:
            # Check file extension
            file_ext = Path(upload_file.filename).suffix.lower()
            if file_ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Unsupported file type: {upload_file.filename}. "
                        f"Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
                    ),
                )

            # Read file content
            content = await upload_file.read()

            # Check file size
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large: {upload_file.filename} ({len(content) / 1024 / 1024:.1f} MB). Max 25 MB.",
                )

            # Save to temporary file for processing
            temp_file = tempfile.NamedTemporaryFile(
                delete=False, suffix=file_ext, prefix="vibe_justice_"
            )
            temp_file.write(content)
            temp_file.close()

            temp_files.append(temp_file.name)
            validated_files.append(upload_file.filename)

        # Process batch with batch processor service
        batch_processor = get_batch_processor()

        result = await batch_processor.process_batch(
            file_paths=temp_files,
            case_type=case_type,
            run_analysis=run_analysis,
        )

        # Return results
        return BatchUploadResponse(**result.to_dict())

    except HTTPException:
        # Re-raise validation errors
        raise

    except Exception as e:
        # Log error and return generic error
        print(f"Batch processing error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch processing failed: {str(e)}",
        )

    finally:
        # Cleanup temporary files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except Exception as e:
                print(f"Cleanup error for {temp_file}: {e}")


@router.get("/status/{batch_id}")
async def get_batch_status(batch_id: str):
    """
    Get status of a batch processing job.

    Args:
        batch_id: Batch job ID from upload response

    Returns:
        Batch processing status (for future Celery integration)

    Note:
        Currently returns placeholder. Will integrate with Celery
        task queue in Week 2 for async processing.
    """
    # Placeholder for future Celery integration
    return JSONResponse(
        {
            "batch_id": batch_id,
            "status": "completed",
            "message": "Synchronous processing (async queue coming in Week 2)",
        }
    )


@router.get("/supported-formats")
async def get_supported_formats():
    """
    Get list of supported file formats.

    Returns:
        Dict with:
        - images: List of supported image formats (phone photos)
        - documents: List of supported document formats
        - max_files: Maximum files per batch
        - max_file_size_mb: Maximum file size in MB
    """
    image_formats = [
        ext for ext in ALLOWED_EXTENSIONS if ext in {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"}
    ]

    document_formats = [ext for ext in ALLOWED_EXTENSIONS if ext in {".pdf", ".docx", ".txt"}]

    return JSONResponse(
        {
            "images": image_formats,
            "documents": document_formats,
            "max_files": MAX_FILES,
            "max_file_size_mb": MAX_FILE_SIZE / 1024 / 1024,
            "case_types": [
                "employment_law",
                "family_law",
                "estate_law",
            ],
            "features": {
                "ocr": "Tesseract OCR with quality validation",
                "phone_photos": "Optimized for phone camera photos",
                "multi_page_pdf": "Automatic page-by-page OCR for scanned PDFs",
                "ai_analysis": "Violations, dates, contradictions detection",
            },
        }
    )
