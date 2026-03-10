"""
Forms API endpoints
"""

from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from vibe_justice.services.forms_service import FormsService

router = APIRouter()
forms_service = FormsService()


class FormInfo(BaseModel):
    id: str
    name: str
    domain: str
    description: str
    url: str


@router.get("", response_model=List[FormInfo])
async def list_forms(domain: str = "general"):
    """
    Returns available legal forms for the specified domain.
    """
    forms = forms_service.get_forms(domain)
    return [FormInfo(**form) for form in forms]


@router.get("/{form_id}")
async def get_form(form_id: str):
    """
    Get specific form details.
    """
    forms = forms_service.get_forms()
    for form in forms:
        if form["id"] == form_id:
            return form
    return {"error": "Form not found"}