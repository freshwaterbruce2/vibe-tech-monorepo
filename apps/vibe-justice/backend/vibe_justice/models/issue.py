"""Durable, append-only issue analysis records and normalized grounds."""
from datetime import datetime
from typing import Optional
from sqlalchemy import Index,UniqueConstraint
from sqlmodel import Field,SQLModel
from vibe_justice.models.evidence import utc_now
class IssueAnalysisRun(SQLModel,table=True):
 __tablename__="issue_analysis_runs";__table_args__=(Index("ix_issue_run_case_created","case_id","created_at"),)
 run_id:str=Field(primary_key=True,max_length=36);case_id:str=Field(index=True,max_length=64);pack_id:str=Field(max_length=80);engine_id:str=Field(max_length=80);ruleset_id:str=Field(max_length=80);ruleset_status:str=Field(max_length=50);ruleset_sha256:str=Field(max_length=64);input_sha256:str=Field(max_length=64);input_manifest_json:str;status:str=Field(default="completed",max_length=30);created_at:datetime=Field(default_factory=utc_now);completed_at:Optional[datetime]=None
class IssueFinding(SQLModel,table=True):
 __tablename__="issue_findings";__table_args__=(Index("ix_finding_case_run","case_id","run_id"),)
 finding_id:str=Field(primary_key=True,max_length=36);run_id:str=Field(foreign_key="issue_analysis_runs.run_id",index=True,max_length=36);case_id:str=Field(index=True,max_length=64);issue_key:str=Field(max_length=80);title:str=Field(max_length=200);label:str=Field(max_length=30);rationale:str=Field(max_length=1000);confidence:str=Field(max_length=20);source_id:str=Field(max_length=100);element_id:str=Field(max_length=120);created_at:datetime=Field(default_factory=utc_now)
class FindingCitation(SQLModel,table=True):
 __tablename__="finding_citations";citation_id:str=Field(primary_key=True,max_length=36);finding_id:str=Field(foreign_key="issue_findings.finding_id",index=True,max_length=36);kind:str=Field(max_length=20);chunk_id:Optional[str]=Field(default=None,max_length=64);evidence_id:Optional[str]=Field(default=None,max_length=36);original_filename:Optional[str]=Field(default=None,max_length=255);provenance:Optional[str]=Field(default=None,max_length=500);imported_at:Optional[datetime]=None;quote:str;ordinal:Optional[int]=None;page_number:Optional[int]=None;paragraph_index:Optional[int]=None;char_start:Optional[int]=None;char_end:Optional[int]=None;source_id:Optional[str]=Field(default=None,max_length=100);locator:Optional[str]=Field(default=None,max_length=100);authority_title:Optional[str]=Field(default=None,max_length=300);canonical_url:Optional[str]=Field(default=None,max_length=600);retrieved_at:Optional[datetime]=None;as_of:Optional[str]=Field(default=None,max_length=50);source_status:Optional[str]=Field(default=None,max_length=40);approval_status:Optional[str]=Field(default=None,max_length=40);text_sha256:str=Field(max_length=64)
class FindingMissingFact(SQLModel,table=True):
 __tablename__="finding_missing_facts";missing_id:str=Field(primary_key=True,max_length=36);finding_id:str=Field(foreign_key="issue_findings.finding_id",index=True,max_length=36);fact_key:str=Field(max_length=100);description:str=Field(max_length=500)
class FindingQualification(SQLModel,table=True):
 __tablename__="finding_qualifications";qualification_id:str=Field(primary_key=True,max_length=36);finding_id:str=Field(foreign_key="issue_findings.finding_id",index=True,max_length=36);code:str=Field(max_length=100);description:str=Field(max_length=700)
class FindingDisposition(SQLModel,table=True):
 __tablename__="finding_dispositions";__table_args__=(UniqueConstraint("finding_id","version",name="uq_finding_disposition_version"),);disposition_id:str=Field(primary_key=True,max_length=36);finding_id:str=Field(foreign_key="issue_findings.finding_id",index=True,max_length=36);version:int;value:str=Field(max_length=30);note:Optional[str]=Field(default=None,max_length=1000);created_at:datetime=Field(default_factory=utc_now)
