"""Focused Phase 2B evidence import contract tests using synthetic bytes only."""
import hashlib
from io import BytesIO
import os
import zipfile
from docx import Document
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfWriter
from main import app
from sqlmodel import Session, select
from vibe_justice.models.evidence import EvidenceRecord
from vibe_justice.services import evidence_import_service as import_module
from vibe_justice.services.evidence_import_service import EvidenceImportService

HEADERS={"X-API-Key":"evidence-test-key"}
def create_case(client,case_id):
    return client.post("/api/cases/create",headers=HEADERS,json={"name":case_id,"jurisdiction":"Synthetic","goals":"Test evidence import."})
def post(client,case_id,name,data,mime="application/octet-stream",source="Synthetic fixture"):
    return client.post(f"/api/cases/{case_id}/evidence",headers=HEADERS,files={"file":(name,data,mime)},data={"source_label":source,"received_from":"Test generator"})
def pdf_bytes():
    stream=BytesIO(); writer=PdfWriter(); writer.add_blank_page(width=72,height=72); writer.write(stream); return stream.getvalue()
def docx_bytes():
    stream=BytesIO(); doc=Document(); doc.add_paragraph("Synthetic evidence text"); doc.save(stream); return stream.getvalue()
def image_bytes(fmt):
    stream=BytesIO(); Image.new("RGB",(4,4),"white").save(stream,format=fmt); return stream.getvalue()
def encrypted_pdf_bytes():
    stream=BytesIO(); writer=PdfWriter(); writer.add_blank_page(width=72,height=72); writer.encrypt("synthetic-password"); writer.write(stream); return stream.getvalue()
def shaped_docx(extra_entries=(), large_payload=None):
    stream=BytesIO()
    with zipfile.ZipFile(stream,"w",compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml",'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        archive.writestr("word/document.xml",'<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>')
        for name in extra_entries: archive.writestr(name,b"x")
        if large_payload is not None: archive.writestr("word/large.bin",large_payload)
    return stream.getvalue()

def test_auth_case_scope_duplicate_provenance_restart_and_integrity(tmp_path,monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY","evidence-test-key"); monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path))
    with TestClient(app) as client:
        assert create_case(client,"CASE-A").status_code==201; assert create_case(client,"CASE-B").status_code==201
        assert client.get("/api/cases/CASE-A/evidence").status_code==401
        content=b"Synthetic evidence\n"
        first=post(client,"CASE-A","note.txt",content,"text/plain","First source")
        assert first.status_code==201; body=first.json(); evidence_id=body["evidence_id"]
        assert body["sha256"]==hashlib.sha256(content).hexdigest() and body["status"]=="ready"
        second=post(client,"CASE-A","copy.txt",content,"text/plain","Second source").json()
        assert second["evidence_id"]!=evidence_id and second["same_content_as"]==evidence_id
        assert client.get(f"/api/cases/CASE-B/evidence/{evidence_id}",headers=HEADERS).status_code==404
        assert client.get(f"/api/cases/CASE-A/evidence/{evidence_id}/original",headers=HEADERS).content==content
        assert client.post(f"/api/cases/CASE-A/evidence/{evidence_id}/extract",headers=HEADERS).status_code==200
    with TestClient(app) as restarted:
        reopened=restarted.get("/api/cases/CASE-A/evidence",headers=HEADERS).json()
        assert len(reopened)==2 and reopened[-1]["sha256"]==hashlib.sha256(content).hexdigest()

def test_supported_formats_mime_distrust_and_rejections(tmp_path,monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY","evidence-test-key"); monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path))
    with TestClient(app) as client:
        assert create_case(client,"CASE-FORMATS").status_code==201
        fixtures=[("small.pdf",pdf_bytes()),("small.docx",docx_bytes()),("small.png",image_bytes("PNG")),("small.jpg",image_bytes("JPEG")),("small.tiff",image_bytes("TIFF"))]
        for name,data in fixtures:
            result=post(client,"CASE-FORMATS",name,data,"text/plain")
            assert result.status_code==201,(name,result.text)
        for name,data,status in [("empty.txt",b"",400),("bad.exe",b"x",415),("invoice.pdf.exe",b"x",400),("archive.pdf",b"not pdf",422),("CON.txt",b"x",400),("../escape.txt",b"x",400)]:
            assert post(client,"CASE-FORMATS",name,data).status_code==status

def test_archived_and_missing_cases_rejected(tmp_path,monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY","evidence-test-key"); monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path))
    with TestClient(app) as client:
        assert post(client,"MISSING","a.txt",b"x").status_code==404
        create_case(client,"ARCHIVED"); client.post("/api/cases/archive/ARCHIVED",headers=HEADERS)
        assert post(client,"ARCHIVED","a.txt",b"x").status_code==409

def test_exact_size_boundary_and_stream_measured_oversize(tmp_path,monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY","evidence-test-key"); monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path)); monkeypatch.setattr(import_module,"MAX_FILE_BYTES",16)
    with TestClient(app) as client:
        create_case(client,"BOUNDARY")
        assert post(client,"BOUNDARY","exact.txt",b"x"*16,"text/plain").status_code==201
        rejected=post(client,"BOUNDARY","large.txt",b"x"*17,"text/plain")
        assert rejected.status_code==413
        assert not list((tmp_path/".evidence-staging").glob("*.upload"))

def test_encrypted_pdf_is_preserved_with_durable_visible_status(tmp_path,monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY","evidence-test-key"); monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path))
    content=encrypted_pdf_bytes()
    with TestClient(app) as client:
        create_case(client,"ENCRYPTED"); result=post(client,"ENCRYPTED","locked.pdf",content,"application/pdf")
        assert result.status_code==201; body=result.json(); assert body["status"]=="encrypted"; assert body["attempts"][0]["status"]=="encrypted"
        assert client.get(f'/api/cases/ENCRYPTED/evidence/{body["evidence_id"]}/original',headers=HEADERS).content==content

def test_adversarial_docx_shapes_are_rejected_without_extraction(tmp_path,monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY","evidence-test-key"); monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path))
    with TestClient(app) as client:
        create_case(client,"DOCX-SAFETY")
        traversal=shaped_docx(["../escape.xml"])
        assert post(client,"DOCX-SAFETY","traversal.docx",traversal).status_code==422
        monkeypatch.setattr(import_module,"MAX_DOCX_ENTRIES",3)
        assert post(client,"DOCX-SAFETY","entries.docx",shaped_docx(["a","b"])).status_code==422
        monkeypatch.setattr(import_module,"MAX_DOCX_ENTRIES",2000); monkeypatch.setattr(import_module,"MAX_DOCX_UNCOMPRESSED",100)
        assert post(client,"DOCX-SAFETY","expanded.docx",shaped_docx()).status_code==422
        monkeypatch.setattr(import_module,"MAX_DOCX_UNCOMPRESSED",10_000_000); monkeypatch.setattr(import_module,"MAX_DOCX_RATIO",2)
        assert post(client,"DOCX-SAFETY","ratio.docx",shaped_docx(large_payload=b"0"*10000)).status_code==422

def test_publish_failure_removes_row_staging_and_generated_dirs_only(tmp_path,monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY","evidence-test-key"); monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR",str(tmp_path))
    with TestClient(app) as client:
        create_case(client,"PUBLISH"); sentinel=tmp_path/"cases"/"PUBLISH"/"evidence"/"keep.txt"; sentinel.write_text("untouched")
        real_replace=os.replace
        def fail_publish(source,target):
            if str(source).endswith(".upload"): raise OSError("injected publish failure")
            return real_replace(source,target)
        monkeypatch.setattr(import_module.os,"replace",fail_publish)
        result=post(client,"PUBLISH","failure.txt",b"synthetic")
        assert result.status_code==500; assert sentinel.read_text()=="untouched"
        assert not list((tmp_path/".evidence-staging").glob("*.upload"))
        manager=EvidenceImportService()
        with Session(manager.engine) as session: assert session.exec(select(EvidenceRecord).where(EvidenceRecord.case_id=="PUBLISH")).all()==[]
        generated=[path for path in (tmp_path/"cases"/"PUBLISH"/"evidence").iterdir() if path.is_dir()]
        assert generated==[]
