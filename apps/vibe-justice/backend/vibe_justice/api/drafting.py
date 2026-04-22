"""
Document Drafting API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from vibe_justice.services.drafting_service import DraftingService
from vibe_justice.utils.auth import require_api_key

from vibe_justice.utils.rate_limit import limiter

router = APIRouter(dependencies=[Depends(require_api_key)])
drafting_service = DraftingService()


class DraftingRequest(BaseModel):
    template_type: str
    case_details: str
    domain: str = "general"


class DraftingResponse(BaseModel):
    filepath: str
    message: str


@router.post("/generate", response_model=DraftingResponse)
@limiter.limit("30/minute")
async def generate_draft(request: Request, body: DraftingRequest):
    """
    Generates a legal document draft using DeepSeek R1.
    """
    if not body.case_details:
        raise HTTPException(status_code=400, detail="Case details cannot be empty")

    try:
        filepath = drafting_service.generate_document(
            body.template_type,
            body.case_details,
            body.domain
        )
        return DraftingResponse(
            filepath=filepath,
            message=f"Draft generated successfully: {filepath}"
        )
    except Exception as e:
        print(f"Drafting error: {e}")
        raise HTTPException(status_code=500, detail=str(e))