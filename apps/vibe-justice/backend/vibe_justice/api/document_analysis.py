"""
Document Analysis API endpoints
Handles: File upload, violation detection, date extraction, contradiction detection
"""

import os
import shutil
import tempfile
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from pydantic import BaseModel

from vibe_justice.services.document_processor_service import get_document_processor
from vibe_justice.services.violation_detector_service import get_violation_detector
from vibe_justice.services.date_extractor_service import get_date_extractor
from vibe_justice.services.contradiction_detector_service import get_contradiction_detector
from vibe_justice.utils.auth import require_api_key

from vibe_justice.utils.rate_limit import limiter


router = APIRouter(prefix="/document-analysis", tags=["Document Analysis"])

# Auth gate for all POST endpoints (LLM/destructive); /health remains open.
_auth = [Depends(require_api_key)]


# Request/Response Models
class DocumentUploadResponse(BaseModel):
    success: bool
    documents: List[dict]
    message: str


class ViolationsResponse(BaseModel):
    violations: List[dict]
    count: int


class DatesResponse(BaseModel):
    dates: List[dict]
    count: int
    urgent_count: int


class ContradictionsResponse(BaseModel):
    contradictions: List[dict]
    count: int


class CompleteAnalysisResponse(BaseModel):
    violations: List[dict]
    dates: List[dict]
    contradictions: List[dict]
    summary: dict


class DocumentAnalysisRequest(BaseModel):
    documents: List[dict]


class ViolationsRequest(DocumentAnalysisRequest):
    case_type: str = "unemployment"


class CompleteAnalysisRequest(DocumentAnalysisRequest):
    case_type: str = "unemployment"


@router.post("/upload", response_model=DocumentUploadResponse, dependencies=_auth)
@limiter.limit("30/minute")
async def upload_documents(
    request: Request,
    files: List[UploadFile] = File(...),
):
    """
    Upload and process documents (PDF, DOCX, TXT).

    Returns:
        - Processed documents with extracted text
        - Metadata (page count, word count)
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    doc_processor = get_document_processor()
    processed_docs = []

    # Create temp directory for uploaded files
    temp_dir = tempfile.mkdtemp()

    try:
        for upload_file in files:
            # Save uploaded file to temp location
            filename = Path(upload_file.filename or "uploaded-document").name
            file_path = os.path.join(temp_dir, filename)

            with open(file_path, "wb") as f:
                content = await upload_file.read()
                f.write(content)

            # Process document
            try:
                result = doc_processor.process_document(file_path)
                processed_docs.append(result)
            except Exception as e:
                processed_docs.append({
                    "filename": filename,
                    "error": str(e)
                })

        return DocumentUploadResponse(
            success=True,
            documents=processed_docs,
            message=f"Processed {len(processed_docs)} documents"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/analyze/violations", response_model=ViolationsResponse, dependencies=_auth)
async def analyze_violations(
    request: ViolationsRequest,
):
    """
    Detect legal violations in uploaded documents.

    Args:
        documents: List of processed documents with text_content
        case_type: Type of case (unemployment, labor, etc.)

    Returns:
        List of violations with severity, statute citations, recommended actions
    """
    if not request.documents:
        raise HTTPException(status_code=400, detail="No documents provided")

    violation_detector = get_violation_detector()

    try:
        violations = await violation_detector.scan_for_violations(
            request.documents,
            request.case_type
        )

        violations_list = [v.to_dict() for v in violations]

        return ViolationsResponse(
            violations=violations_list,
            count=len(violations_list)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Violation analysis error: {str(e)}")


@router.post("/analyze/dates", response_model=DatesResponse, dependencies=_auth)
async def analyze_dates(
    request: DocumentAnalysisRequest,
):
    """
    Extract critical dates and deadlines from documents.

    Args:
        documents: List of processed documents with text_content

    Returns:
        List of critical dates with labels, importance, days remaining
    """
    if not request.documents:
        raise HTTPException(status_code=400, detail="No documents provided")

    date_extractor = get_date_extractor()

    try:
        critical_dates = await date_extractor.extract_all_dates(request.documents)

        dates_list = [d.to_dict() for d in critical_dates]

        # Count urgent dates (within 7 days)
        urgent_count = sum(1 for d in dates_list if d.get("is_urgent", False))

        return DatesResponse(
            dates=dates_list,
            count=len(dates_list),
            urgent_count=urgent_count
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Date extraction error: {str(e)}")


@router.post("/analyze/contradictions", response_model=ContradictionsResponse, dependencies=_auth)
async def analyze_contradictions(
    request: DocumentAnalysisRequest,
):
    """
    Find contradictions between multiple documents.

    Args:
        documents: List of processed documents with text_content

    Returns:
        List of contradictions with side-by-side statements, impact, rebuttal
    """
    if not request.documents or len(request.documents) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 documents required for contradiction analysis"
        )

    contradiction_detector = get_contradiction_detector()

    try:
        contradictions = await contradiction_detector.find_contradictions(request.documents)

        contradictions_list = [c.to_dict() for c in contradictions]

        return ContradictionsResponse(
            contradictions=contradictions_list,
            count=len(contradictions_list)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Contradiction analysis error: {str(e)}")


@router.post("/analyze/complete", response_model=CompleteAnalysisResponse, dependencies=_auth)
async def complete_analysis(
    request: CompleteAnalysisRequest,
):
    """
    Run complete document analysis (violations + dates + contradictions).

    Args:
        documents: List of processed documents with text_content
        case_type: Type of case

    Returns:
        Complete analysis with all findings and summary
    """
    if not request.documents:
        raise HTTPException(status_code=400, detail="No documents provided")

    # Run all analyses in parallel (if needed later, for now sequential)
    violation_detector = get_violation_detector()
    date_extractor = get_date_extractor()
    contradiction_detector = get_contradiction_detector()

    try:
        # Detect violations
        violations = await violation_detector.scan_for_violations(
            request.documents,
            request.case_type
        )
        violations_list = [v.to_dict() for v in violations]

        # Extract dates
        critical_dates = await date_extractor.extract_all_dates(request.documents)
        dates_list = [d.to_dict() for d in critical_dates]

        # Find contradictions (only if multiple documents)
        contradictions_list = []
        if len(request.documents) >= 2:
            contradictions = await contradiction_detector.find_contradictions(request.documents)
            contradictions_list = [c.to_dict() for c in contradictions]

        # Generate summary
        critical_violations = sum(1 for v in violations_list if v["severity"] == "CRITICAL")
        urgent_dates = sum(1 for d in dates_list if d.get("is_urgent", False))

        summary = {
            "total_violations": len(violations_list),
            "critical_violations": critical_violations,
            "total_dates": len(dates_list),
            "urgent_dates": urgent_dates,
            "total_contradictions": len(contradictions_list),
            "case_strength": _calculate_case_strength(
                violations_list,
                contradictions_list
            )
        }

        return CompleteAnalysisResponse(
            violations=violations_list,
            dates=dates_list,
            contradictions=contradictions_list,
            summary=summary
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Complete analysis error: {str(e)}")


def _calculate_case_strength(
    violations: List[dict],
    contradictions: List[dict]
) -> str:
    """
    Calculate overall case strength based on findings.

    Returns:
        "STRONG", "MODERATE", or "WEAK"
    """
    critical_count = sum(1 for v in violations if v["severity"] == "CRITICAL")
    high_count = sum(1 for v in violations if v["severity"] == "HIGH")
    contradiction_count = len(contradictions)

    score = (critical_count * 3) + (high_count * 2) + (contradiction_count * 2)

    if score >= 10:
        return "STRONG"
    elif score >= 5:
        return "MODERATE"
    else:
        return "WEAK"


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "document-analysis"}
