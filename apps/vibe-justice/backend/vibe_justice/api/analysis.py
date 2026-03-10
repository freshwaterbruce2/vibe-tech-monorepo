"""
Document Analysis API endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from vibe_justice.services.analysis_service import AnalysisService

router = APIRouter()
analysis_service = AnalysisService()


class AnalysisRequest(BaseModel):
    document_text: str
    domain: str = "general"


class AnalysisResponse(BaseModel):
    result: str


@router.post("/run", response_model=AnalysisResponse)
async def run_analysis(request: AnalysisRequest):
    """
    Analyzes a document against legal frameworks using DeepSeek R1.
    """
    if not request.document_text:
        raise HTTPException(status_code=400, detail="Document text cannot be empty")

    try:
        result = analysis_service.analyze_document(
            request.document_text,
            request.domain
        )
        return AnalysisResponse(result=result)
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))