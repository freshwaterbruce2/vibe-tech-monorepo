"""Synthetic storage tests for the bundled source-checked legal pack."""
from fastapi.testclient import TestClient
from main import app
from vibe_justice.services.legal_pack_service import LegalPackService
from vibe_justice.models.legal_pack import LegalPack,LegalRuleElement,LegalSource
from vibe_justice.legal_packs import sc_residential_landlord_tenant_2025 as bundled
from sqlmodel import Session,select
HEADERS={"X-API-Key":"legal-pack-test-key"}

def test_install_list_detail_restart_and_no_matching_approval(tmp_path,monkeypatch):
 monkeypatch.setenv("VIBE_JUSTICE_API_KEY","legal-pack-test-key");monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path))
 with TestClient(app) as client:
  assert client.get("/api/legal-packs").status_code==401
  response=client.get("/api/legal-packs",headers=HEADERS);assert response.status_code==200
  packs=response.json()["packs"];assert len(packs)==1;pack=packs[0]
  assert pack["jurisdiction"]=="South Carolina";assert pack["status"]=="source_checked"
  assert pack["retrieval_status"]=="offline_verified";assert pack["approval_status"]=="not_approved_for_matching"
  assert pack["as_of"]=="current through the 2025 Session";assert len(pack["sha256"])==64
  locators={source["locator"] for source in pack["sources"]}
  assert {"DISCLAIMER","SECTION 27-40-110","SECTION 27-40-120","SECTION 27-40-440","SECTION 27-40-610"}.issubset(locators)
  disclaimer=next(source for source in pack["sources"] if source["locator"]=="DISCLAIMER")
  assert "this version of the South Carolina Code is not official" in disclaimer["excerpt"]
  source=next(source for source in pack["sources"] if source["locator"]=="SECTION 27-40-440")
  detail=client.get(f'/api/legal-packs/{pack["pack_id"]}/sources/{source["source_id"]}',headers=HEADERS)
  assert detail.status_code==200;body=detail.json();assert body["excerpt"].startswith("SECTION 27-40-440.")
  assert body["approval_status"]=="not_approved_for_matching";assert body["pack_status"]=="source_checked"
  assert body["version"]==pack["version"];assert body["as_of"]==pack["as_of"];assert body["status"]=="source_checked"
  assert body["elements"][0]["authority_text"]==body["excerpt"]
  assert body["elements"][0]["status"]=="source_checked"
  assert client.get(f'/api/legal-packs/{pack["pack_id"]}/sources/missing',headers=HEADERS).status_code==404
  # Re-instantiation is idempotent and returns the same immutable version/hash.
  assert LegalPackService().list()[0].sha256==pack["sha256"]
  assert client.get("/api/legal-packs",headers=HEADERS).json()==response.json()

def test_missing_or_tampered_snapshot_fails_closed(tmp_path,monkeypatch):
 monkeypatch.setenv("VIBE_JUSTICE_API_KEY","legal-pack-test-key");monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path))
 with TestClient(app) as client:
  pack=client.get("/api/legal-packs",headers=HEADERS).json()["packs"][0]
  service=LegalPackService();stored=service.list()[0];snapshot=tmp_path/stored.snapshot_path
  snapshot.write_text("tampered",encoding="utf-8")
  assert client.get("/api/legal-packs",headers=HEADERS).status_code==409
  snapshot.unlink()
  assert client.get("/api/legal-packs",headers=HEADERS).status_code==409

def test_all_persisted_safety_metadata_and_elements_are_canonical(tmp_path,monkeypatch):
 monkeypatch.setenv("VIBE_JUSTICE_API_KEY","legal-pack-test-key");monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path));service=LegalPackService();pack=service.list()[0]
 with Session(service.engine) as session:
  stored=session.get(LegalPack,pack.pack_id);stored.approval_status="approved_for_matching";stored.jurisdiction="Anywhere";session.add(stored);session.commit()
 with TestClient(app) as client:assert client.get("/api/legal-packs",headers=HEADERS).status_code==409
 with Session(service.engine) as session:
  stored=session.get(LegalPack,pack.pack_id);stored.approval_status="not_approved_for_matching";stored.jurisdiction="South Carolina";session.add(stored)
  source=session.exec(select(LegalSource).where(LegalSource.pack_id==pack.pack_id,LegalSource.locator=="SECTION 27-40-440")).first();source.canonical_url="https://example.invalid";source.official=False;source.title="invented";session.add(source);session.commit()
 with TestClient(app) as client:assert client.get("/api/legal-packs",headers=HEADERS).status_code==409
 with Session(service.engine) as session:
  source=session.exec(select(LegalSource).where(LegalSource.pack_id==pack.pack_id,LegalSource.locator=="SECTION 27-40-440")).first();text=bundled.SECTIONS["27-40-440"];source.canonical_url=bundled.CODE_URL;source.official=True;source.title=text.splitlines()[0];session.add(source)
  element=session.exec(select(LegalRuleElement).where(LegalRuleElement.source_id==source.source_id)).first();element.authority_text="invented authority";element.applicability="always applies";element.status="approved_for_matching";session.add(element);session.commit()
 with TestClient(app) as client:assert client.get("/api/legal-packs",headers=HEADERS).status_code==409

def test_new_version_keeps_old_version_readable(tmp_path,monkeypatch):
 monkeypatch.setenv("VIBE_JUSTICE_API_KEY","legal-pack-test-key");monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path));original=LegalPackService().list()[0]
 monkeypatch.setattr(bundled,"VERSION","2025-session-v2-test");monkeypatch.setattr(bundled,"AS_OF","current through the 2025 Session; test revision")
 upgraded=LegalPackService();packs=upgraded.list();assert {p.pack_id for p in packs}=={original.pack_id,"sc-residential-landlord-tenant-act@2025-session-v2-test"}
 old_pack,old_sources=upgraded.sources(original.pack_id);assert old_pack.sha256==original.sha256;assert len(old_sources)==11
 with TestClient(app) as client:
  response=client.get("/api/legal-packs",headers=HEADERS);assert response.status_code==200;assert len(response.json()["packs"])==2

def test_injected_element_count_fails_closed(tmp_path,monkeypatch):
 monkeypatch.setenv("VIBE_JUSTICE_API_KEY","legal-pack-test-key");monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path));service=LegalPackService();pack=service.list()[0]
 with Session(service.engine) as session:
  source=session.exec(select(LegalSource).where(LegalSource.pack_id==pack.pack_id,LegalSource.locator=="SECTION 27-40-440")).first();session.add(LegalRuleElement(element_id=f"{source.source_id}:injected",source_id=source.source_id,pack_id=pack.pack_id,ordinal=1,authority_text="injected",applicability="always"));session.commit()
 with TestClient(app) as client:assert client.get("/api/legal-packs",headers=HEADERS).status_code==409
