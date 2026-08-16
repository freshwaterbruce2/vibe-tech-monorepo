"""Deterministic installer and integrity verifier for bundled legal packs."""
import hashlib,json,os
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy import event
from sqlmodel import Session,SQLModel,create_engine,select
from vibe_justice.legal_packs import sc_residential_landlord_tenant_2025 as bundled
from vibe_justice.models.legal_pack import LegalPack,LegalRuleElement,LegalSource
from vibe_justice.utils.paths import get_data_directory
def sha(value:bytes)->str:return hashlib.sha256(value).hexdigest()
JURISDICTION="South Carolina";MATTER_TYPE="residential landlord-tenant";PACK_STATUS="source_checked";APPROVAL_STATUS="not_approved_for_matching";SOURCE_STATUS="source_checked"
APPLICABILITY="Potentially applicable only to South Carolina residential rental arrangements governed by Chapter 40, Title 27; Section 27-40-120 exclusions and case facts require explicit human review."
class LegalPackService:
 def __init__(self):
  self.data_root=get_data_directory().resolve(); self.engine=create_engine(f"sqlite:///{(self.data_root/'vibe_justice.sqlite3').as_posix()}",connect_args={"check_same_thread":False})
  @event.listens_for(self.engine,"connect")
  def pragmas(connection,_):
   cursor=connection.cursor();cursor.execute("PRAGMA journal_mode=WAL");cursor.execute("PRAGMA busy_timeout=5000");cursor.execute("PRAGMA foreign_keys=ON");cursor.close()
  SQLModel.metadata.create_all(self.engine);self.install_bundled()
 def _payload(self):return {"pack_key":bundled.PACK_KEY,"jurisdiction":JURISDICTION,"matter_type":MATTER_TYPE,"status":PACK_STATUS,"approval_status":APPROVAL_STATUS,"version":bundled.VERSION,"as_of":bundled.AS_OF,"retrieved_at":bundled.RETRIEVED_AT,"canonical_url":bundled.CODE_URL,"disclaimer_url":bundled.DISCLAIMER_URL,"disclaimer":bundled.DISCLAIMER,"sections":bundled.SECTIONS}
 def _bytes(self):return (json.dumps(self._payload(),ensure_ascii=False,sort_keys=True,indent=2)+"\n").encode()
 def _snapshot(self):return self.data_root/"legal-packs"/bundled.PACK_KEY/bundled.VERSION/"official-source-excerpts.json"
 def install_bundled(self):
  data=self._bytes();digest=sha(data);path=self._snapshot();pack_id=f"{bundled.PACK_KEY}@{bundled.VERSION}"
  with Session(self.engine) as session:existing=session.get(LegalPack,pack_id)
  if existing:self._verify(existing);return existing
  path.parent.mkdir(parents=True,exist_ok=True)
  if path.exists():
   if sha(path.read_bytes())!=digest:raise HTTPException(409,"Bundled legal source snapshot failed integrity verification")
  else:
   temp=path.with_suffix(".tmp")
   with temp.open("xb") as output:output.write(data);output.flush();os.fsync(output.fileno())
   os.replace(temp,path)
  retrieved=datetime.fromisoformat(bundled.RETRIEVED_AT);pack=LegalPack(pack_id=pack_id,pack_key=bundled.PACK_KEY,jurisdiction=JURISDICTION,matter_type=MATTER_TYPE,version=bundled.VERSION,as_of=bundled.AS_OF,retrieved_at=retrieved,status=PACK_STATUS,approval_status=APPROVAL_STATUS,snapshot_path=path.relative_to(self.data_root).as_posix(),sha256=digest)
  sources=[];elements=[];disclaimer_id=f"{pack_id}:disclaimer"
  sources.append(LegalSource(source_id=disclaimer_id,pack_id=pack_id,ordinal=0,title="South Carolina Code of Laws online-version disclaimer",canonical_url=bundled.DISCLAIMER_URL,locator="DISCLAIMER",excerpt=bundled.DISCLAIMER,sha256=sha(bundled.DISCLAIMER.encode()),retrieved_at=retrieved,status=SOURCE_STATUS))
  for ordinal,(section,text) in enumerate(bundled.SECTIONS.items(),start=1):
   source_id=f"{pack_id}:{section}";sources.append(LegalSource(source_id=source_id,pack_id=pack_id,ordinal=ordinal,title=text.splitlines()[0],canonical_url=bundled.CODE_URL,locator=f"SECTION {section}",excerpt=text,sha256=sha(text.encode()),retrieved_at=retrieved,status=SOURCE_STATUS));elements.append(LegalRuleElement(element_id=f"{source_id}:full-text",source_id=source_id,pack_id=pack_id,ordinal=0,authority_text=text,applicability=APPLICABILITY,status=SOURCE_STATUS))
  with Session(self.engine) as session:
   session.add(pack);session.flush();session.add_all(sources);session.flush();session.add_all(elements);session.commit();session.refresh(pack)
  return pack
 def _verify(self,pack):
  expected_relative=f"legal-packs/{pack.pack_key}/{pack.version}/official-source-excerpts.json";path=(self.data_root/expected_relative).resolve()
  try:path.relative_to(self.data_root)
  except ValueError as exc:raise HTTPException(409,"Stored legal source path is invalid") from exc
  if pack.snapshot_path!=expected_relative or not path.is_file() or sha(path.read_bytes())!=pack.sha256:raise HTTPException(409,"Bundled legal source snapshot failed integrity verification")
  try:payload=json.loads(path.read_text(encoding="utf-8"))
  except (OSError,ValueError) as exc:raise HTTPException(409,"Bundled legal source snapshot is invalid") from exc
  try:
   expected_retrieved=datetime.fromisoformat(payload["retrieved_at"]).replace(tzinfo=None)
   canonical=(pack.pack_id==f'{payload["pack_key"]}@{payload["version"]}' and pack.pack_key==payload["pack_key"] and pack.version==payload["version"] and pack.jurisdiction==payload["jurisdiction"] and pack.matter_type==payload["matter_type"] and pack.as_of==payload["as_of"] and pack.status==payload["status"]==PACK_STATUS and pack.approval_status==payload["approval_status"]==APPROVAL_STATUS and pack.retrieved_at.replace(tzinfo=None)==expected_retrieved)
  except (KeyError,TypeError,ValueError) as exc:raise HTTPException(409,"Legal pack manifest is incomplete") from exc
  if not canonical:raise HTTPException(409,"Legal pack metadata failed integrity verification")
  return payload
 def list(self):
  with Session(self.engine) as session:packs=list(session.exec(select(LegalPack).order_by(LegalPack.pack_id)).all())
  for pack in packs:self._verify(pack)
  return packs
 def sources(self,pack_id):
  with Session(self.engine) as session:
   pack=session.get(LegalPack,pack_id)
   if not pack:raise HTTPException(404,"Legal pack not found")
   payload=self._verify(pack);sources=list(session.exec(select(LegalSource).where(LegalSource.pack_id==pack_id).order_by(LegalSource.ordinal)).all());elements=list(session.exec(select(LegalRuleElement).where(LegalRuleElement.pack_id==pack_id).order_by(LegalRuleElement.source_id,LegalRuleElement.ordinal)).all())
  retrieved=datetime.fromisoformat(payload["retrieved_at"]).replace(tzinfo=None);expected_sources=[];expected_elements=[]
  expected_sources.append((f'{pack_id}:disclaimer',pack_id,0,"South Carolina Code of Laws online-version disclaimer",payload["disclaimer_url"],True,SOURCE_STATUS,"DISCLAIMER",payload["disclaimer"],sha(payload["disclaimer"].encode()),retrieved))
  for ordinal,(section,text) in enumerate(payload["sections"].items(),start=1):
   source_id=f"{pack_id}:{section}";expected_sources.append((source_id,pack_id,ordinal,text.splitlines()[0],payload["canonical_url"],True,SOURCE_STATUS,f"SECTION {section}",text,sha(text.encode()),retrieved));expected_elements.append((f"{source_id}:full-text",source_id,pack_id,0,text,APPLICABILITY,SOURCE_STATUS))
  actual_sources=[(s.source_id,s.pack_id,s.ordinal,s.title,s.canonical_url,s.official,s.status,s.locator,s.excerpt,s.sha256,s.retrieved_at.replace(tzinfo=None)) for s in sources]
  actual_elements=[(e.element_id,e.source_id,e.pack_id,e.ordinal,e.authority_text,e.applicability,e.status) for e in elements]
  if actual_sources!=expected_sources or actual_elements!=expected_elements:raise HTTPException(409,"Legal source metadata failed integrity verification")
  return pack,sources
 def source(self,pack_id,source_id):
  pack,sources=self.sources(pack_id);source=next((item for item in sources if item.source_id==source_id),None)
  if not source:raise HTTPException(404,"Legal source not found")
  if sha(source.excerpt.encode())!=source.sha256:raise HTTPException(409,"Legal source record failed integrity verification")
  with Session(self.engine) as session:elements=list(session.exec(select(LegalRuleElement).where(LegalRuleElement.source_id==source_id).order_by(LegalRuleElement.ordinal)).all())
  return pack,source,elements
