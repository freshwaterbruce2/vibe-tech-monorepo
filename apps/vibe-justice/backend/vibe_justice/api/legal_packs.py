"""Read-only authenticated API for source-checked offline legal packs."""
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel,ConfigDict
from vibe_justice.services.legal_pack_service import LegalPackService
router=APIRouter(prefix="/legal-packs",tags=["Legal packs"])
class SourceSummary(BaseModel):
 model_config=ConfigDict(from_attributes=True)
 source_id:str;title:str;canonical_url:str;official:bool;status:str;sha256:str;excerpt:str;locator:str
class PackSummary(BaseModel):
 pack_id:str;jurisdiction:str;matter_type:str;version:str;as_of:str;status:str;retrieval_status:str;approval_status:str;sha256:str;retrieved_at:datetime;sources:list[SourceSummary]
class PackListResponse(BaseModel):packs:list[PackSummary]
class ElementResponse(BaseModel):
 model_config=ConfigDict(from_attributes=True)
 element_id:str;ordinal:int;authority_text:str;applicability:str;status:str
class SourceDetailResponse(SourceSummary):pack_id:str;retrieved_at:datetime;approval_status:str;pack_status:str;version:str;as_of:str;elements:list[ElementResponse]
@router.get("",response_model=PackListResponse)
def list_packs():
 manager=LegalPackService();values=[]
 for pack in manager.list():
  _,sources=manager.sources(pack.pack_id);values.append(PackSummary(pack_id=pack.pack_id,jurisdiction=pack.jurisdiction,matter_type=pack.matter_type,version=pack.version,as_of=pack.as_of,status=pack.status,retrieval_status="offline_verified",approval_status=pack.approval_status,sha256=pack.sha256,retrieved_at=pack.retrieved_at,sources=[SourceSummary.model_validate(s) for s in sources]))
 return PackListResponse(packs=values)
@router.get("/{pack_id}/sources/{source_id}",response_model=SourceDetailResponse)
def source_detail(pack_id:str,source_id:str):
 pack,source,elements=LegalPackService().source(pack_id,source_id);return SourceDetailResponse(**SourceSummary.model_validate(source).model_dump(),pack_id=pack_id,retrieved_at=source.retrieved_at,approval_status=pack.approval_status,pack_status=pack.status,version=pack.version,as_of=pack.as_of,elements=[ElementResponse.model_validate(e) for e in elements])
