"""
Document Drafting API endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from vibe_justice.services.drafting_service import DraftingService

router = APIRouter()
drafting_service = DraftingService()


class DraftingRequest(BaseModel):
    template_type: str
    case_details: str
    domain: str = "general"


class DraftingResponse(BaseModel):
    filepath: str
    message: str


@router.post("/generate", response_model=DraftingResponse)
async def generate_draft(request: DraftingRequest):
    """
    Generates a legal document draft using DeepSeek R1.
    """
    if not request.case_details:
        raise HTTPException(status_code=400, detail="Case details cannot be empty")

    try:
        filepath = drafting_service.generate_document(
            request.template_type,
            request.case_details,
            request.domain
        )
        return DraftingResponse(
            filepath=filepath,
            message=f"Draft generated successfully: {filepath}"
        )
    except Exception as e:
        print(f"Drafting error: {e}")
        raise HTTPException(status_code=500, detail=str(e))