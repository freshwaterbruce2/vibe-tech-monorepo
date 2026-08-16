"""Synthetic-only contract coverage for durable offline evidence retrieval."""
from fastapi.testclient import TestClient
from io import BytesIO
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from main import app
from vibe_justice.services.evidence_import_service import EvidenceImportService

HEADERS = {"X-API-Key": "retrieval-test-key"}


def create_case(client, case_id):
    response = client.post("/api/cases/create", headers=HEADERS, json={
        "name": case_id, "jurisdiction": "Synthetic", "goals": "Test retrieval."
    })
    assert response.status_code == 201


def upload(client, case_id, text, name="synthetic.txt"):
    response = client.post(f"/api/cases/{case_id}/evidence", headers=HEADERS,
        files={"file": (name, text.encode(), "text/plain")}, data={"source_label": "Synthetic fixture"})
    assert response.status_code == 201
    return response.json()


def two_page_pdf(text):
    output=BytesIO(); writer=PdfWriter()
    for _ in range(2):
        page=writer.add_blank_page(width=612,height=792)
        font=DictionaryObject({NameObject("/Type"):NameObject("/Font"),NameObject("/Subtype"):NameObject("/Type1"),NameObject("/BaseFont"):NameObject("/Helvetica")})
        font_ref=writer._add_object(font)
        page[NameObject("/Resources")]=DictionaryObject({NameObject("/Font"):DictionaryObject({NameObject("/F1"):font_ref})})
        stream=DecodedStreamObject(); stream.set_data(f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode("ascii"))
        page[NameObject("/Contents")]=writer._add_object(stream)
    writer.write(output); return output.getvalue()


def test_index_search_citations_are_durable_exact_and_case_scoped(tmp_path, monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY", "retrieval-test-key")
    monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR", str(tmp_path))
    text = (
        "On March 12, 2026, Jordan wrote: I will not repair the heater until you pay an extra fee.\n"
        "The tenant did not refuse access and sent a written repair request.\n"
        "Repeated promise.\nRepeated promise.\n"
    )
    with TestClient(app) as client:
        create_case(client, "CASE-A"); create_case(client, "CASE-B")
        item = upload(client, "CASE-A", text)
        evidence_id = item["evidence_id"]
        route = f"/api/cases/CASE-A/evidence/{evidence_id}/index"
        assert client.post(route).status_code == 401
        indexed = client.post(route, headers=HEADERS)
        assert indexed.status_code == 200
        wrapper = indexed.json()
        assert wrapper["evidence_id"] == evidence_id
        assert wrapper["status"] == "indexed"
        assert wrapper["chunk_count"] == 4
        assert len(wrapper["text_sha256"]) == 64
        chunks = wrapper["chunks"]
        assert len(chunks) == 4
        assert chunks[0]["quote"] == text.splitlines()[0]
        assert text[chunks[0]["char_start"]:chunks[0]["char_end"]] == chunks[0]["quote"]
        assert chunks[2]["quote"] == chunks[3]["quote"]
        assert chunks[2]["chunk_id"] != chunks[3]["chunk_id"]
        assert client.post(route, headers=HEADERS).json() == wrapper
        assert client.get(f"/api/cases/CASE-B/evidence/{evidence_id}/chunks", headers=HEADERS).status_code == 404
        assert client.post(f"/api/cases/CASE-B/evidence/{evidence_id}/index", headers=HEADERS).status_code == 404

        search_wrapper = client.get("/api/cases/CASE-A/evidence/search", headers=HEADERS,
                           params={"q": "I will not repair the heater", "limit": 10}).json()
        assert search_wrapper["query"] == "I will not repair the heater"
        assert search_wrapper["total"] == len(search_wrapper["results"])
        exact = search_wrapper["results"]
        assert exact[0]["quote"] == chunks[0]["quote"]
        assert exact[0]["score"] > 2
        assert exact[0]["original_filename"] == "synthetic.txt"
        assert set(("not", "repair", "heater")).issubset(exact[0]["match_terms"])
        assert client.get("/api/cases/CASE-A/evidence/search", headers=HEADERS,
                          params={"q": "written access request"}).json()["results"][0]["ordinal"] == 1
        assert client.get("/api/cases/CASE-A/evidence/search", headers=HEADERS,
                          params={"q": "March 12 2026"}).json()["results"][0]["ordinal"] == 0
        assert client.get("/api/cases/CASE-A/evidence/search", headers=HEADERS,
                          params={"q": "unrelated zebra"}).json()["results"] == []
        assert client.get("/api/cases/CASE-B/evidence/search", headers=HEADERS,
                          params={"q": "heater"}).json()["results"] == []

        # A new service/connection sees the same durable chunks after restart.
        assert EvidenceImportService().get("CASE-A", evidence_id).sha256 == item["sha256"]
        chunks_wrapper = client.get(f"/api/cases/CASE-A/evidence/{evidence_id}/chunks", headers=HEADERS).json()
        assert chunks_wrapper == {"evidence_id": evidence_id, "status": "indexed", "chunks": chunks}
        assert client.get(f"/api/cases/CASE-A/evidence/{evidence_id}/original", headers=HEADERS).content == text.encode()


def test_tampered_or_missing_extracted_text_is_excluded_and_original_unchanged(tmp_path, monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY", "retrieval-test-key")
    monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR", str(tmp_path))
    original_bytes = b"Synthetic original remains immutable.\n"
    with TestClient(app) as client:
        create_case(client, "INTEGRITY")
        item = upload(client, "INTEGRITY", original_bytes.decode())
        evidence_id = item["evidence_id"]
        index_url = f"/api/cases/INTEGRITY/evidence/{evidence_id}/index"
        assert client.post(index_url, headers=HEADERS).status_code == 200
        manager = EvidenceImportService()
        attempt = next(a for a in manager.attempts(evidence_id) if a.status == "succeeded")
        text_path = manager.resolve(attempt.text_path)
        text_path.write_text("tampered derivative", encoding="utf-8")
        direct = client.get(f"/api/cases/INTEGRITY/evidence/{evidence_id}/chunks", headers=HEADERS)
        assert direct.status_code == 409
        assert "failed integrity verification" in direct.json()["detail"]
        assert client.get("/api/cases/INTEGRITY/evidence/search", headers=HEADERS,
                          params={"q": "immutable"}).json()["results"] == []
        stale = client.get(f"/api/cases/INTEGRITY/evidence/{evidence_id}/chunks", headers=HEADERS)
        assert stale.status_code == 409
        assert client.post(index_url, headers=HEADERS).status_code == 409
        text_path.unlink()
        assert client.post(index_url, headers=HEADERS).status_code == 409
        assert client.get(f"/api/cases/INTEGRITY/evidence/{evidence_id}/original", headers=HEADERS).content == original_bytes


def test_preindex_tamper_and_empty_text_fail_closed(tmp_path, monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY", "retrieval-test-key")
    monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR", str(tmp_path))
    with TestClient(app) as client:
        create_case(client, "PREINDEX")
        item=upload(client,"PREINDEX","trusted derivative")
        manager=EvidenceImportService(); attempt=next(a for a in manager.attempts(item["evidence_id"]) if a.status=="succeeded")
        manager.resolve(attempt.text_path).write_text("changed before first index",encoding="utf-8")
        url=f'/api/cases/PREINDEX/evidence/{item["evidence_id"]}'
        assert client.post(url+"/index",headers=HEADERS).status_code==409
        assert client.get(url+"/chunks",headers=HEADERS).status_code==409

        empty=upload(client,"PREINDEX","  \n\t",name="empty.txt")
        empty_url=f'/api/cases/PREINDEX/evidence/{empty["evidence_id"]}'
        assert client.post(empty_url+"/index",headers=HEADERS).json()["detail"]=="no_searchable_text"
        assert client.get(empty_url+"/chunks",headers=HEADERS).json()["detail"]=="no_searchable_text"


def test_identical_pdf_text_has_distinct_exact_page_locators(tmp_path, monkeypatch):
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY", "retrieval-test-key")
    monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR", str(tmp_path))
    repeated="Identical statement on both pages."
    with TestClient(app) as client:
        create_case(client,"PDF-PAGES")
        response=client.post("/api/cases/PDF-PAGES/evidence",headers=HEADERS,
            files={"file":("pages.pdf",two_page_pdf(repeated),"application/pdf")},data={"source_label":"Synthetic PDF"})
        assert response.status_code==201
        evidence_id=response.json()["evidence_id"]
        indexed=client.post(f"/api/cases/PDF-PAGES/evidence/{evidence_id}/index",headers=HEADERS)
        assert indexed.status_code==200
        matching=[c for c in indexed.json()["chunks"] if repeated in c["quote"]]
        assert [c["page_number"] for c in matching]==[1,2]
        assert matching[0]["quote"]==matching[1]["quote"]
        assert matching[0]["char_start"] != matching[1]["char_start"]
