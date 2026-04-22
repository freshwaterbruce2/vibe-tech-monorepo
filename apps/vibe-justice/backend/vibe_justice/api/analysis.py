"""
Document Analysis API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from vibe_justice.services.analysis_service import AnalysisService
from vibe_justice.utils.auth import require_api_key

from vibe_justice.utils.rate_limit import limiter

router = APIRouter(dependencies=[Depends(require_api_key)])
analysis_service = AnalysisService()


class AnalysisRequest(BaseModel):
    document_text: str
    domain: str = "general"


class AnalysisResponse(BaseModel):
    result: str


@router.post("/run", response_model=AnalysisResponse)
@limiter.limit("30/minute")
async def run_analysis(request: Request, body: AnalysisRequest):
    """
    Analyzes a document against legal frameworks using DeepSeek R1.
    """
    if not body.document_text:
        raise HTTPException(status_code=400, detail="Document text cannot be empty")

    try:
        result = analysis_service.analyze_document(
            body.document_text,
            body.domain
        )
        return AnalysisResponse(result=result)
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))