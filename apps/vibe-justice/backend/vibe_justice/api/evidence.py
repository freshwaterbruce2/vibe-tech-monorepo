"""Authenticated, case-scoped evidence API."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field
from vibe_justice.services.evidence_import_service import EvidenceImportService

router=APIRouter(prefix="/cases/{case_id}/evidence",tags=["Evidence"])
class AttemptResponse(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    attempt_id:str; status:str; started_at:datetime; completed_at:Optional[datetime]; page_count:Optional[int]; error_code:Optional[str]; error_message:Optional[str]
class EvidenceResponse(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    evidence_id:str; case_id:str; display_filename:str; byte_length:int; sha256:str
    declared_mime:Optional[str]; detected_mime:str; detected_type:str; imported_at:datetime
    source_label:str; received_from:Optional[str]; notes:Optional[str]; evidence_date:Optional[datetime]
    status:str; error_code:Optional[str]; error_message:Optional[str]; same_content_as:Optional[str]
    attempts:list[AttemptResponse]=Field(default_factory=list)
def service(): return EvidenceImportService()
def response(item):
    manager=service(); value=EvidenceResponse.model_validate(item); value.attempts=[AttemptResponse.model_validate(a) for a in manager.attempts(item.evidence_id)]; return value
@router.post("",response_model=EvidenceResponse,status_code=201)
async def upload(case_id:str,file:UploadFile=File(...),source_label:str=Form(...),received_from:Optional[str]=Form(None),notes:Optional[str]=Form(None),evidence_date:Optional[datetime]=Form(None)):
    if not source_label.strip() or len(source_label)>200: raise HTTPException(422,"Source label is required")
    try:
        return response(await service().import_upload(case_id,file,source_label.strip(),received_from,notes,evidence_date))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500,"Evidence import failed safely") from exc
@router.get("",response_model=list[EvidenceResponse])
def list_evidence(case_id:str): return [response(item) for item in service().list(case_id)]
@router.get("/{evidence_id}",response_model=EvidenceResponse)
def get_evidence(case_id:str,evidence_id:str): return response(service().get(case_id,evidence_id))
@router.get("/{evidence_id}/original")
def download_original(case_id:str,evidence_id:str):
    manager=service(); item=manager.get(case_id,evidence_id)
    if item.status in {"missing","corrupt"}: raise HTTPException(409,item.error_message)
    return FileResponse(manager.resolve(item.original_path),media_type=item.detected_mime,filename=item.display_filename)
@router.get("/{evidence_id}/text")
def extracted_text(case_id:str,evidence_id:str):
    manager=service(); item=manager.get(case_id,evidence_id); attempt=next((a for a in manager.attempts(evidence_id) if a.status=="succeeded"),None)
    if not attempt or not attempt.text_path: raise HTTPException(409,f"Extracted text is not available ({item.status})")
    return PlainTextResponse(manager.resolve(attempt.text_path).read_text(encoding="utf-8"))
@router.post("/{evidence_id}/extract",response_model=EvidenceResponse)
def retry_extraction(case_id:str,evidence_id:str):
    manager=service(); manager.extract(case_id,evidence_id); return response(manager.get(case_id,evidence_id))
