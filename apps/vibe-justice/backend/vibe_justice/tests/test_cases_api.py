import json

import pytest
from fastapi.testclient import TestClient

from main import app


API_KEY = "test-case-api-key-" + "x" * 32
HEADERS = {"X-API-Key": API_KEY}


@pytest.fixture
def case_client(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    log_dir = tmp_path / "logs"
    monkeypatch.setenv("VIBE_JUSTICE_DATA_DIR", str(data_dir))
    monkeypatch.setenv("VIBE_JUSTICE_LOG_DIR", str(log_dir))
    monkeypatch.setenv("VIBE_JUSTICE_API_KEY", API_KEY)
    with TestClient(app) as client:
        yield client, data_dir


def create_case(client, case_id="CASE-001", **overrides):
    payload = {
        "name": case_id,
        "jurisdiction": "South Carolina",
        "goals": "Review the procedural history.",
        **overrides,
    }
    return client.post("/api/cases/create", json=payload, headers=HEADERS)


def test_case_routes_require_auth(case_client):
    client, _ = case_client
    assert client.get("/api/cases/list").status_code == 401
    assert client.get("/api/cases/current").status_code == 401
    assert client.put("/api/cases/current", json={"case_id": "CASE-001"}).status_code == 401
    assert create_case(client).status_code == 201
    assert client.get("/api/cases/CASE-001").status_code == 401


def test_create_returns_case_and_preserves_workspace_signal(case_client):
    client, data_dir = case_client
    response = create_case(client)
    assert response.status_code == 201
    assert response.json() == {
        "case_id": "CASE-001",
        "name": "CASE-001",
        "created_at": response.json()["created_at"],
        "status": "Initializing",
        "jurisdiction": "South Carolina",
        "research_goals": "Review the procedural history.",
        "assigned_agent": "LegalAssistant_V1",
        "is_archived": False,
        "archived_at": None,
    }
    case_dir = data_dir / "cases" / "CASE-001"
    assert (case_dir / "research").is_dir()
    assert (case_dir / "evidence").is_dir()
    assert (case_dir / "active.signal").read_text() == "SIGNAL_START_RESEARCH"


def test_duplicate_create_is_409_and_does_not_overwrite(case_client):
    client, data_dir = case_client
    assert create_case(client).status_code == 201
    metadata_path = data_dir / "cases" / "CASE-001" / "metadata.json"
    original = metadata_path.read_bytes()

    duplicate = create_case(client, goals="A different goal")

    assert duplicate.status_code == 409
    assert metadata_path.read_bytes() == original


def test_failed_create_removes_only_its_staging_tree(case_client, monkeypatch):
    client, data_dir = case_client
    cases_dir = data_dir / "cases"
    existing_dir = cases_dir / "EXISTING"
    existing_dir.mkdir(parents=True)
    sentinel = existing_dir / "keep.txt"
    sentinel.write_text("do not remove")

    from vibe_justice.api import cases as cases_api

    original_atomic_write = cases_api._atomic_write_json

    def fail_new_case_metadata(path, data):
        if path.parent.name.startswith(".FAILED."):
            raise OSError("injected metadata failure")
        return original_atomic_write(path, data)

    monkeypatch.setattr(cases_api, "_atomic_write_json", fail_new_case_metadata)

    response = create_case(client, "FAILED")

    assert response.status_code == 500
    assert not (cases_dir / "FAILED").exists()
    assert not list(cases_dir.glob(".FAILED.*.tmp"))
    assert sentinel.read_text() == "do not remove"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "../escape", "jurisdiction": "SC", "goals": "Goal"},
        {"name": "CASE-1", "jurisdiction": "", "goals": "Goal"},
        {"name": "CASE-1", "jurisdiction": "SC", "goals": ""},
        {"name": "CASE-1", "jurisdiction": "SC", "goals": "x" * 4001},
        {"name": "CASE-1", "jurisdiction": "SC", "goals": "Goal", "extra": True},
    ],
)
def test_create_rejects_invalid_or_unbounded_fields(case_client, payload):
    client, _ = case_client
    assert client.post("/api/cases/create", json=payload, headers=HEADERS).status_code == 422


def test_list_get_archive_restore_lifecycle(case_client):
    client, _ = case_client
    assert create_case(client, "CASE-OLD").status_code == 201
    assert create_case(client, "CASE-NEW").status_code == 201

    listed = client.get("/api/cases/list", headers=HEADERS)
    assert listed.status_code == 200
    assert [case["case_id"] for case in listed.json()] == ["CASE-NEW", "CASE-OLD"]
    assert client.get("/api/cases/CASE-OLD", headers=HEADERS).json()["case_id"] == "CASE-OLD"
    assert client.get("/api/cases/MISSING", headers=HEADERS).status_code == 404

    archived = client.post("/api/cases/archive/CASE-OLD", headers=HEADERS)
    assert archived.status_code == 200
    assert client.get("/api/cases/list", headers=HEADERS).json()[0]["case_id"] == "CASE-NEW"
    all_cases = client.get("/api/cases/list?include_archived=true", headers=HEADERS).json()
    assert next(case for case in all_cases if case["case_id"] == "CASE-OLD")["is_archived"] is True

    restored = client.post("/api/cases/restore/CASE-OLD", headers=HEADERS)
    assert restored.status_code == 200
    assert client.get("/api/cases/CASE-OLD", headers=HEADERS).json()["is_archived"] is False


def test_current_case_persists_and_archive_clears_it(case_client):
    client, data_dir = case_client
    assert create_case(client).status_code == 201
    assert client.get("/api/cases/current", headers=HEADERS).json() == {"current_case": None}

    selected = client.put(
        "/api/cases/current", json={"case_id": "CASE-001"}, headers=HEADERS
    )
    assert selected.status_code == 200
    assert selected.json()["current_case"]["case_id"] == "CASE-001"

    # A fresh client reads state from disk rather than process-local memory.
    with TestClient(app) as restarted_client:
        persisted = restarted_client.get("/api/cases/current", headers=HEADERS)
        assert persisted.json()["current_case"]["case_id"] == "CASE-001"

    state_path = data_dir / "case_state.json"
    assert json.loads(state_path.read_text())["current_case_id"] == "CASE-001"
    assert client.post("/api/cases/archive/CASE-001", headers=HEADERS).status_code == 200
    assert client.get("/api/cases/current", headers=HEADERS).json() == {"current_case": None}
    assert json.loads(state_path.read_text())["current_case_id"] is None

    assert client.post("/api/cases/restore/CASE-001", headers=HEADERS).status_code == 200
    assert client.get("/api/cases/current", headers=HEADERS).json() == {"current_case": None}


def test_archived_case_cannot_be_selected(case_client):
    client, _ = case_client
    assert create_case(client).status_code == 201
    assert client.post("/api/cases/archive/CASE-001", headers=HEADERS).status_code == 200
    response = client.put(
        "/api/cases/current", json={"case_id": "CASE-001"}, headers=HEADERS
    )
    assert response.status_code == 409


def test_metadata_and_current_state_writes_are_valid_json(case_client):
    client, data_dir = case_client
    assert create_case(client).status_code == 201
    assert client.put(
        "/api/cases/current", json={"case_id": "CASE-001"}, headers=HEADERS
    ).status_code == 200
    assert client.post("/api/cases/archive/CASE-001", headers=HEADERS).status_code == 200

    json.loads((data_dir / "cases" / "CASE-001" / "metadata.json").read_text())
    json.loads((data_dir / "case_state.json").read_text())
    assert not list(data_dir.rglob("*.tmp"))
