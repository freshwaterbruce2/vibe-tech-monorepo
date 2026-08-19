"""Cautious deterministic issue candidate matching; no legal conclusions."""
import hashlib,json,re
from datetime import datetime,timezone
from uuid import uuid4
from fastapi import HTTPException
from sqlmodel import Session,SQLModel,select
from vibe_justice.api.cases import _load_case
from vibe_justice.models.issue import FindingCitation,FindingDisposition,FindingMissingFact,FindingQualification,IssueAnalysisRun,IssueFinding
from vibe_justice.services.evidence_retrieval_service import EvidenceRetrievalService
from vibe_justice.services.legal_pack_service import LegalPackService,sha
from vibe_justice.legal_packs.issue_candidate_ruleset import MANIFEST as RULESET,SHA256 as RULESET_SHA256
ENGINE_ID=RULESET["engine_id"];RULESET_ID=RULESET["ruleset_id"]
RULES=(
 ("repair_habitability","Possible repair or habitability issue","SECTION 27-40-440",("repair","broken","habitable","heater","air conditioning","plumbing"),("refused","will not","won't","failed","has not","still broken","no repair"),("repaired","fixed","completed","did not refuse"),True),
 ("essential_services","Possible essential-services issue","SECTION 27-40-630",("heat","hot water","running water","electricity","gas","essential service"),("no heat","no hot water","without heat","shut off","interrupted","failed"),("restored","working","provided"),True),
 ("access","Possible access or entry issue","SECTION 27-40-530(c)",("enter","entered","entry","access","harass"),("without notice","no notice","harass","unreasonable"),("24 hours notice","twenty-four hours notice","requested access","consent"),False),
 ("notice","Possible notice issue","SECTION 27-40-610",("notice","notified","written request","certified mail"),("gave notice","sent notice","written notice","notified"),("no notice was sent","did not notify"),False),
)
PROMPT_MARKERS=("ignore previous","system prompt","assistant:","developer message","follow these instructions")
UNVALIDATED_MARKERS=("forwarded message","quoted text","hypothetically","suppose that","what if","tenant refused access","landlord could not repair")
CONDITIONS={
 "repair_habitability":[("landlord_actor","The actor was the landlord or a legally responsible agent."),("repair_duty","The condition implicated a repair, habitability, code, or supplied/required facility duty."),("supplied_required","The facility or appliance was supplied or required to be supplied by the landlord."),("written_agreement_exception","Any written tenant-maintenance agreement and statutory limits under Section 27-40-440(c)-(d)."),("timing_condition","The condition and response occurred during the relevant tenancy period.")],
 "essential_services":[("landlord_actor","The actor was the landlord or responsible agent."),("required_service","The service was an essential service required by the rental agreement or Section 27-40-440."),("negligent_or_wilful","The failure was negligent or wilful."),("written_notice","The tenant gave written notice specifying the breach."),("reasonable_opportunity","The landlord failed to act within a reasonable time."),("tenant_cause","The condition was not caused by a deliberate or negligent act or omission attributable to the tenant side."),("remedy_election","The tenant's remedy election and Section 27-40-610 exclusivity are established.")],
 "access":[("landlord_actor","The person entering was the landlord or agent."),("entry_event","An entry or access demand actually occurred."),("subsection_b_exception","No emergency, scheduled-service, or tenant-request exception under Section 27-40-530(b) applied."),("notice_24h","At least twenty-four hours notice was or was not given as applicable."),("reasonable_time","The entry occurred at a reasonable or unreasonable time."),("harassment_or_abuse","Any abuse or harassment facts are established, not quoted or hypothetical.")],
 "notice":[("material_noncompliance","The asserted noncompliance and required materiality are established."),("written_notice","A written notice specifying acts and omissions was delivered."),("receipt_and_timing","Receipt and the applicable fourteen-day timing are established."),("tenant_cause","The condition was not caused by a tenant-side deliberate or negligent act or omission."),("remedy_and_cure","Cure, commencement of cure, termination language, and remedy prerequisites are established.")],
}
DATE_SCOPE_CONDITION=("authority_date_scope","The cited authority version applied on the relevant event date; the web source does not establish historical effective-date coverage.")
class IssueAnalysisService:
 def __init__(self):
  if hashlib.sha256((json.dumps(RULESET,sort_keys=True,separators=(",",":"))+"\n").encode()).hexdigest()!=RULESET_SHA256 or RULESET.get("status")!="approved_for_candidate_screening":raise HTTPException(409,"Candidate ruleset manifest failed integrity verification")
  self.legal=LegalPackService();self.evidence=EvidenceRetrievalService();self.engine=self.legal.engine;SQLModel.metadata.create_all(self.engine)
  with self.engine.begin() as connection:connection.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS uq_finding_disposition_version_idx ON finding_dispositions(finding_id,version)")
 def _pack(self,pack_id):
  packs=self.legal.list();compatible=[p for p in packs if p.jurisdiction=="South Carolina" and p.matter_type=="residential landlord-tenant" and p.status=="source_checked"]
  pack=next((p for p in compatible if p.pack_id==pack_id),None) if pack_id else (max(compatible,key=lambda p:(p.version,p.retrieved_at)) if compatible else None)
  if not pack:raise HTTPException(409,"Compatible South Carolina residential landlord-tenant pack is unavailable")
  _,sources=self.legal.sources(pack.pack_id);mapped={s.locator:s for s in sources}
  if any(locator not in mapped for locator in RULESET["required_locators"]):raise HTTPException(409,"Legal pack lacks sources required by the candidate ruleset")
  return pack,mapped
 def analyze(self,case_id,pack_id=None,evidence_ids=None,matter_type="residential landlord-tenant"):
  case,_=_load_case(case_id)
  if case.jurisdiction.strip().casefold() not in {"south carolina","sc","south carolina, usa"}:raise HTTPException(422,"Case jurisdiction is not compatible with this legal pack")
  if matter_type!="residential landlord-tenant":raise HTTPException(422,"Matter type is not supported by this ruleset")
  pack,sources=self._pack(pack_id);records=self.evidence.imports.list(case_id)
  if evidence_ids is not None:
   requested=set(evidence_ids)
   if len(requested)!=len(evidence_ids):raise HTTPException(422,"evidence_ids must be unique")
   selected=[r for r in records if r.evidence_id in requested]
   if len(selected)!=len(requested):raise HTTPException(404,"Selected evidence not found in case")
  else:selected=records
  chunks=[];manifest_evidence=[]
  for record in selected:
   record_chunks=self.evidence.chunks(case_id,record.evidence_id);manifest_evidence.append({"evidence_id":record.evidence_id,"original_sha256":record.sha256,"chunks":[{"chunk_id":chunk.chunk_id,"text_sha256":chunk.text_sha256} for chunk in record_chunks]})
   for chunk in record_chunks:chunks.append((record,chunk))
  if not chunks:raise HTTPException(409,"No verified indexed evidence is available for analysis")
  manifest_evidence.sort(key=lambda item:item["evidence_id"]);manifest={"case_id":case_id,"jurisdiction":case.jurisdiction,"matter_type":matter_type,"selected_evidence":manifest_evidence,"pack":{"pack_id":pack.pack_id,"sha256":pack.sha256,"version":pack.version},"engine_id":ENGINE_ID,"ruleset_id":RULESET_ID,"ruleset_sha256":RULESET_SHA256};manifest_json=json.dumps(manifest,sort_keys=True,separators=(",",":"));input_hash=hashlib.sha256(manifest_json.encode()).hexdigest();run=IssueAnalysisRun(run_id=str(uuid4()),case_id=case_id,pack_id=pack.pack_id,engine_id=ENGINE_ID,ruleset_id=RULESET_ID,ruleset_status=RULESET["status"],ruleset_sha256=RULESET_SHA256,input_sha256=input_hash,input_manifest_json=manifest_json,status="completed",completed_at=datetime.now(timezone.utc));findings=[]
  for key,title,locator,concepts,support_terms,contrary_terms,needs_notice in RULES:
   source=sources.get(locator)
   if not source:continue
   relevant=[(r,c) for r,c in chunks if any(term in c.text.casefold() for term in concepts) and not any(marker in c.text.casefold() for marker in PROMPT_MARKERS+UNVALIDATED_MARKERS) and "?" not in c.text and not re.search(r"\b(did not|didn't|never)\s+(enter|send|give|notify)\b",c.text.casefold())]
   if not relevant:continue
   support=[(r,c) for r,c in relevant if any(term in c.text.casefold() for term in support_terms) and not any(negation in c.text.casefold() for negation in ("did not refuse","didn't refuse","did not fail","not broken"))];contrary=[(r,c) for r,c in relevant if any(term in c.text.casefold() for term in contrary_terms)]
   notice_present=any(any(term in c.text.casefold() for term in ("written notice","notified","certified mail","sent notice")) for _,c in chunks)
   missing=[*CONDITIONS[key],DATE_SCOPE_CONDITION]
   if support and contrary:label="conflicting"
   elif support:label="missing_facts"
   elif contrary:label="not_supported"
   else:label="possible"
   finding=IssueFinding(finding_id=str(uuid4()),run_id=run.run_id,case_id=case_id,issue_key=key,title=title,label=label,rationale="Evidence contains terms relevant to the cited statutory element; this is a candidate for human review, not a legal conclusion.",confidence="moderate" if support or contrary else "low",source_id=source.source_id,element_id=f"{source.source_id}:full-text");citations=[]
   for kind,items in (("support",support),("contrary",contrary)):
    for record,chunk in items:citations.append(FindingCitation(citation_id=str(uuid4()),finding_id=finding.finding_id,kind=kind,chunk_id=chunk.chunk_id,evidence_id=record.evidence_id,original_filename=record.display_filename,provenance=record.source_label,imported_at=record.imported_at,quote=chunk.text,ordinal=chunk.ordinal,page_number=chunk.page_number,paragraph_index=chunk.paragraph_index,char_start=chunk.char_start,char_end=chunk.char_end,text_sha256=chunk.text_sha256))
   citations.append(FindingCitation(citation_id=str(uuid4()),finding_id=finding.finding_id,kind="legal",quote=source.excerpt,source_id=source.source_id,locator=source.locator,authority_title=source.title,canonical_url=source.canonical_url,retrieved_at=source.retrieved_at,as_of=pack.as_of,source_status=pack.status,approval_status=pack.approval_status,text_sha256=source.sha256))
   miss=[FindingMissingFact(missing_id=str(uuid4()),finding_id=finding.finding_id,fact_key=k,description=d) for k,d in missing];quals=[FindingQualification(qualification_id=str(uuid4()),finding_id=finding.finding_id,code="not_approved_authority",description="Authority is source_checked but not approved_for_matching; verify the official published law and obtain human review."),FindingQualification(qualification_id=str(uuid4()),finding_id=finding.finding_id,code="applicability",description="Sections 27-40-110 and 27-40-120 and the facts must be reviewed for territorial scope and exclusions.")]
   findings.append((finding,citations,miss,quals))
  with Session(self.engine) as session:
   session.add(run);session.flush()
   for finding,citations,miss,quals in findings:session.add(finding);session.flush();session.add_all(citations+miss+quals)
   session.commit();session.refresh(run)
   for finding,_,_,_ in findings:session.refresh(finding)
  return run,[item[0] for item in findings],pack
 def runs(self,case_id):
  _load_case(case_id)
  with Session(self.engine) as session:return list(session.exec(select(IssueAnalysisRun).where(IssueAnalysisRun.case_id==case_id).order_by(IssueAnalysisRun.created_at.desc())).all())
 def findings(self,case_id):
  _load_case(case_id)
  with Session(self.engine) as session:return list(session.exec(select(IssueFinding).where(IssueFinding.case_id==case_id).order_by(IssueFinding.created_at.desc())).all())
 def detail(self,case_id,finding_id):
  _load_case(case_id)
  with Session(self.engine) as session:
   finding=session.exec(select(IssueFinding).where(IssueFinding.case_id==case_id,IssueFinding.finding_id==finding_id)).first()
   if not finding:raise HTTPException(404,"Issue finding not found")
   citations=list(session.exec(select(FindingCitation).where(FindingCitation.finding_id==finding_id)).all());missing=list(session.exec(select(FindingMissingFact).where(FindingMissingFact.finding_id==finding_id)).all());quals=list(session.exec(select(FindingQualification).where(FindingQualification.finding_id==finding_id)).all());dispositions=list(session.exec(select(FindingDisposition).where(FindingDisposition.finding_id==finding_id).order_by(FindingDisposition.version)).all());run=session.get(IssueAnalysisRun,finding.run_id)
  evidence_cache={}
  for citation in citations:
   if citation.kind in {"support","contrary"}:
    if citation.evidence_id not in evidence_cache:evidence_cache[citation.evidence_id]={chunk.chunk_id:chunk for chunk in self.evidence.chunks(case_id,citation.evidence_id)}
    chunk=evidence_cache[citation.evidence_id].get(citation.chunk_id);record=self.evidence.imports.get(case_id,citation.evidence_id)
    if not chunk or chunk.text!=citation.quote or chunk.text_sha256!=citation.text_sha256 or citation.original_filename!=record.display_filename or citation.provenance!=record.source_label or citation.imported_at.replace(tzinfo=None)!=record.imported_at.replace(tzinfo=None):raise HTTPException(409,"Stored evidence citation failed integrity verification")
   elif citation.kind=="legal":
    pack,source,_=self.legal.source(run.pack_id,citation.source_id)
    if source.excerpt!=citation.quote or source.sha256!=citation.text_sha256 or source.locator!=citation.locator or citation.authority_title!=source.title or citation.canonical_url!=source.canonical_url or citation.retrieved_at.replace(tzinfo=None)!=source.retrieved_at.replace(tzinfo=None) or citation.as_of!=pack.as_of or citation.source_status!=pack.status or citation.approval_status!=pack.approval_status:raise HTTPException(409,"Stored legal citation failed integrity verification")
  return finding,citations,missing,quals,dispositions
 def disposition(self,case_id,finding_id,value,note):
  self.detail(case_id,finding_id)
  with Session(self.engine) as session:
   session.connection().exec_driver_sql("BEGIN IMMEDIATE");versions=session.exec(select(FindingDisposition.version).where(FindingDisposition.finding_id==finding_id)).all();item=FindingDisposition(disposition_id=str(uuid4()),finding_id=finding_id,version=max(versions,default=0)+1,value=value,note=note);session.add(item);session.commit();session.refresh(item);return item
