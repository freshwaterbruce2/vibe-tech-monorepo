"""Authenticated case-scoped API for cautious offline issue candidates."""
from datetime import datetime
import json
from typing import Literal,Optional
from fastapi import APIRouter
from pydantic import BaseModel,ConfigDict,Field
from vibe_justice.services.issue_analysis_service import IssueAnalysisService
router=APIRouter(prefix="/cases/{case_id}/issues",tags=["Issue analysis"])
class AnalyzeRequest(BaseModel):pack_id:Optional[str]=None;matter_type:str="residential landlord-tenant";evidence_ids:Optional[list[str]]=None
class RunResponse(BaseModel):
 run_id:str;case_id:str;pack_id:str;engine_id:str;ruleset_id:str;ruleset_sha256:str;screening_status:Literal["approved_for_candidate_screening"];input_sha256:str;input_manifest:dict;status:str;created_at:datetime;completed_at:Optional[datetime];pack_status:str="source_checked";approval_status:str="not_approved_for_matching"
class FindingSummary(BaseModel):
 model_config=ConfigDict(from_attributes=True)
 finding_id:str;run_id:str;case_id:str;issue_key:str;title:str;label:Literal["possible","conflicting","missing_facts","not_supported"];rationale:str;confidence:Literal["low","moderate"];source_id:str;element_id:str;created_at:datetime;latest_disposition:Optional[str]=None
class CitationResponse(BaseModel):
 model_config=ConfigDict(from_attributes=True)
 citation_id:str;kind:str;chunk_id:Optional[str];evidence_id:Optional[str];original_filename:Optional[str];provenance:Optional[str];imported_at:Optional[datetime];quote:str;ordinal:Optional[int];page_number:Optional[int];paragraph_index:Optional[int];char_start:Optional[int];char_end:Optional[int];source_id:Optional[str];locator:Optional[str];authority_title:Optional[str];canonical_url:Optional[str];retrieved_at:Optional[datetime];as_of:Optional[str];source_status:Optional[str];approval_status:Optional[str];text_sha256:str
class MissingResponse(BaseModel):
 model_config=ConfigDict(from_attributes=True)
 missing_id:str;fact_key:str;description:str
class QualificationResponse(BaseModel):
 model_config=ConfigDict(from_attributes=True)
 qualification_id:str;code:str;description:str
class DispositionResponse(BaseModel):
 model_config=ConfigDict(from_attributes=True)
 disposition_id:str;finding_id:str;version:int;value:str;note:Optional[str];created_at:datetime
class ElementMatrixResponse(BaseModel):element_id:str;condition_key:str;condition_text:str;authority_quote:str;legal_locator:str;status:str;support_citation_ids:list[str];contrary_citation_ids:list[str];missing_fact_ids:list[str]
class FindingDetail(FindingSummary):support_citations:list[CitationResponse];contrary_citations:list[CitationResponse];legal_citations:list[CitationResponse];missing_facts:list[MissingResponse];qualifications:list[QualificationResponse];dispositions:list[DispositionResponse];element_matrix:list[ElementMatrixResponse];safe_next_steps:list[str];warnings:list[str]
class AnalyzeResponse(BaseModel):run:RunResponse;findings:list[FindingDetail]
class ListResponse(BaseModel):runs:list[RunResponse];findings:list[FindingSummary]
class DispositionRequest(BaseModel):value:Literal["accepted","dismissed","needs_review"];note:Optional[str]=Field(default=None,max_length=1000)
def detail_response(manager,finding):
 finding,citations,missing,quals,dispositions=manager.detail(finding.case_id,finding.finding_id);support=[c for c in citations if c.kind=="support"];contrary=[c for c in citations if c.kind=="contrary"];legal=[c for c in citations if c.kind=="legal"];latest=dispositions[-1].value if dispositions else None;base=FindingSummary.model_validate(finding).model_dump();base["latest_disposition"]=latest
 matrix=[ElementMatrixResponse(element_id=finding.element_id,condition_key=m.fact_key,condition_text=m.description,authority_quote=legal[0].quote if legal else "",legal_locator=legal[0].locator if legal else "",status="missing",support_citation_ids=[c.citation_id for c in support],contrary_citation_ids=[c.citation_id for c in contrary],missing_fact_ids=[m.missing_id]) for m in missing]
 return FindingDetail(**base,support_citations=[CitationResponse.model_validate(c) for c in support],contrary_citations=[CitationResponse.model_validate(c) for c in contrary],legal_citations=[CitationResponse.model_validate(c) for c in legal],missing_facts=[MissingResponse.model_validate(m) for m in missing],qualifications=[QualificationResponse.model_validate(q) for q in quals],dispositions=[DispositionResponse.model_validate(d) for d in dispositions],element_matrix=matrix,safe_next_steps=["Review the exact evidence and authority excerpts.","Confirm applicability, exclusions, notice, dates, and contrary facts before relying on this candidate."],warnings=["This is not a finding that anyone violated a law.","The bundled online Code source is unofficial and not approved for automatic matching."])
def run_response(run):return RunResponse(run_id=run.run_id,case_id=run.case_id,pack_id=run.pack_id,engine_id=run.engine_id,ruleset_id=run.ruleset_id,ruleset_sha256=run.ruleset_sha256,screening_status=run.ruleset_status,input_sha256=run.input_sha256,input_manifest=json.loads(run.input_manifest_json),status=run.status,created_at=run.created_at,completed_at=run.completed_at)
@router.post("/analyze",response_model=AnalyzeResponse)
def analyze(case_id:str,body:AnalyzeRequest):
 manager=IssueAnalysisService();run,findings,pack=manager.analyze(case_id,body.pack_id,body.evidence_ids,body.matter_type);return AnalyzeResponse(run=run_response(run),findings=[detail_response(manager,f) for f in findings])
@router.get("",response_model=ListResponse)
def list_issues(case_id:str):
 manager=IssueAnalysisService();runs=manager.runs(case_id);findings=manager.findings(case_id);summaries=[]
 for finding in findings:
  _,_,_,_,dispositions=manager.detail(case_id,finding.finding_id);data=FindingSummary.model_validate(finding).model_dump();data["latest_disposition"]=dispositions[-1].value if dispositions else None;summaries.append(FindingSummary(**data))
 return ListResponse(runs=[run_response(r) for r in runs],findings=summaries)
@router.get("/{finding_id}",response_model=FindingDetail)
def get_issue(case_id:str,finding_id:str):
 manager=IssueAnalysisService();finding,*_=manager.detail(case_id,finding_id);return detail_response(manager,finding)
@router.post("/{finding_id}/disposition",response_model=DispositionResponse)
def disposition(case_id:str,finding_id:str,body:DispositionRequest):return DispositionResponse.model_validate(IssueAnalysisService().disposition(case_id,finding_id,body.value,body.note))
