import json
import os
import re
import shutil
import tempfile
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from vibe_justice.utils.auth import require_api_key
from vibe_justice.utils.export_engine import generate_case_export, open_in_explorer
from vibe_justice.utils.paths import get_cases_directory, get_log_directory

# Define router with prefix and tags directly here, so main.py can just include it
router = APIRouter(prefix="/cases", tags=["Cases"])


class CaseCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=1, max_length=64)
    jurisdiction: str = Field(min_length=1, max_length=120)
    goals: str = Field(min_length=1, max_length=4000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not CASE_ID_PATTERN.fullmatch(value):
            raise ValueError("Invalid case ID")
        return value


class CaseRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=64)
    created_at: str
    status: str = Field(min_length=1, max_length=64)
    jurisdiction: str = Field(min_length=1, max_length=120)
    research_goals: str = Field(min_length=1, max_length=4000)
    assigned_agent: str = Field(min_length=1, max_length=120)
    is_archived: bool
    archived_at: Optional[str] = None


class CurrentCaseRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    case_id: str = Field(min_length=1, max_length=64)

    @field_validator("case_id")
    @classmethod
    def validate_case_id(cls, value: str) -> str:
        if not CASE_ID_PATTERN.fullmatch(value):
            raise ValueError("Invalid case ID")
        return value


class CurrentCaseResponse(BaseModel):
    current_case: Optional[CaseRecord]


CASE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")

CURRENT_CASE_STATE_FILE = "case_state.json"


def _atomic_write_json(path: Path, data: dict) -> None:
    """Durably replace a JSON file without exposing a partially written file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path: Optional[Path] = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=path.parent, delete=False
        ) as temp_file:
            temp_path = Path(temp_file.name)
            json.dump(data, temp_file, indent=4)
            temp_file.flush()
            os.fsync(temp_file.fileno())
        os.replace(temp_path, path)
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


@contextmanager
def _case_creation_lock(case_root: Path):
    """Hold an atomic sibling lock while publishing a newly staged case."""
    lock_path = case_root.with_name(f"{case_root.name}.create.lock")
    try:
        descriptor = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail="Case creation is in progress") from exc
    os.close(descriptor)
    try:
        yield
    finally:
        lock_path.unlink(missing_ok=True)


def _load_case(case_id: str) -> tuple[CaseRecord, Path]:
    safe_case_id = normalize_case_id(case_id)
    metadata_path = get_cases_directory() / safe_case_id / "metadata.json"
    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Case not found")
    try:
        with open(metadata_path, "r", encoding="utf-8") as metadata_file:
            record = CaseRecord.model_validate(json.load(metadata_file))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=500, detail="Case metadata is invalid") from exc
    return record, metadata_path


def _state_path() -> Path:
    return get_cases_directory().parent / CURRENT_CASE_STATE_FILE


def _read_current_case_id() -> Optional[str]:
    state_path = _state_path()
    if not state_path.exists():
        return None
    try:
        with open(state_path, "r", encoding="utf-8") as state_file:
            value = json.load(state_file).get("current_case_id")
        return normalize_case_id(value) if value is not None else None
    except (OSError, json.JSONDecodeError, AttributeError, HTTPException) as exc:
        raise HTTPException(status_code=500, detail="Current case state is invalid") from exc


def _write_current_case_id(case_id: Optional[str]) -> None:
    _atomic_write_json(
        _state_path(),
        {
            "current_case_id": case_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )


def normalize_case_id(raw_case_id: str) -> str:
    candidate = (raw_case_id or "").strip()
    if not candidate:
        raise HTTPException(status_code=400, detail="Case ID is required")
    if not CASE_ID_PATTERN.match(candidate):
        raise HTTPException(status_code=400, detail="Invalid case ID")
    return candidate


@router.post(
    "/create",
    response_model=CaseRecord,
    status_code=201,
    dependencies=[Depends(require_api_key)],
)
async def create_case(request: CaseCreateRequest):
    """
    Receives signal from ProDashboard to initialize a new autonomous workspace.
    """
    # 1. Path Configuration (Strictly D: drive as per system specs)
    case_id = request.name
    cases_dir = get_cases_directory()
    case_root = cases_dir / case_id
    staging_root = cases_dir / f".{case_id}.{uuid.uuid4().hex}.tmp"
    log_dir = get_log_directory()
    log_file = log_dir / "system_activity.log"  # Central log for UI LogViewer

    # Ensure log directory exists (resilience)
    log_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 2. Build the complete workspace off to the side. The per-case lock
        # prevents concurrent creators from racing the final existence check.
        staging_root.mkdir(parents=False, exist_ok=False)
        (staging_root / "research").mkdir()
        (staging_root / "evidence").mkdir()

        # 3. Metadata Generation
        metadata = {
            "case_id": case_id,
            "name": case_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "Initializing",
            "jurisdiction": request.jurisdiction,
            "research_goals": request.goals,
            "assigned_agent": "LegalAssistant_V1",
            "is_archived": False,
            "archived_at": None,
        }

        _atomic_write_json(staging_root / "metadata.json", metadata)

        # 4. Trigger the Autonomous Loop (The Signal File)
        # Your Monitoring Loop looks for this file to start the Learning Loop
        with open(staging_root / "active.signal", "w") as f:
            f.write("SIGNAL_START_RESEARCH")

        # 5. UI Feedback via Logs
        # Writing directly to the log file that the Native App UI is tailing
        with open(log_file, "a", encoding="utf-8") as f:
            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            f.write(
                f"[{timestamp}] [UI_SIGNAL] Received create request for: {request.name}\n"
            )
            f.write(f"[{timestamp}] [SYSTEM] Workspace created at {case_root}\n")
            f.write(
                f"[{timestamp}] [AGENT] Autonomous research loop engaged for {request.jurisdiction}.\n"
            )

        with _case_creation_lock(case_root):
            if case_root.exists():
                raise HTTPException(status_code=409, detail="Case already exists")
            staging_root.rename(case_root)

        return CaseRecord.model_validate(metadata)

    except Exception as e:
        # Only the uniquely named staging tree created by this request is ever
        # removed. A pre-existing/final case directory is never a cleanup target.
        if staging_root.exists():
            shutil.rmtree(staging_root, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise
        # Log error to UI so user knows why it failed
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(
                    f"[{datetime.now(timezone.utc)}] [ERROR] Create Case Failed: {str(e)}\n"
                )
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list", response_model=list[CaseRecord])
async def list_cases(include_archived: bool = False):
    """
    List all cases from the configured cases directory.
    Reads metadata.json for details.
    """
    cases_dir = get_cases_directory()
    if not cases_dir.exists():
        return []

    case_list = []
    for item in cases_dir.iterdir():
        if item.is_dir():
            metadata_file = item / "metadata.json"
            if metadata_file.exists():
                try:
                    with open(metadata_file, "r") as f:
                        data = json.load(f)

                        # Filter archived
                        if not include_archived and data.get("is_archived", False):
                            continue

                        case_list.append(CaseRecord.model_validate(data))
                except Exception:
                    continue  # Skip corrupted metadata

    # Sort by created_at desc
    case_list.sort(key=lambda case: case.created_at, reverse=True)
    return case_list


@router.get("/current", response_model=CurrentCaseResponse)
async def get_current_case():
    case_id = _read_current_case_id()
    if case_id is None:
        return CurrentCaseResponse(current_case=None)
    record, _ = _load_case(case_id)
    if record.is_archived:
        _write_current_case_id(None)
        return CurrentCaseResponse(current_case=None)
    return CurrentCaseResponse(current_case=record)


@router.put("/current", response_model=CurrentCaseResponse)
async def set_current_case(request: CurrentCaseRequest):
    record, _ = _load_case(request.case_id)
    if record.is_archived:
        raise HTTPException(status_code=409, detail="Archived case cannot be current")
    _write_current_case_id(record.case_id)
    return CurrentCaseResponse(current_case=record)


@router.get("/{case_id}", response_model=CaseRecord)
async def get_case(case_id: str):
    record, _ = _load_case(case_id)
    return record


@router.post("/archive/{case_id}", dependencies=[Depends(require_api_key)])
async def archive_case(case_id: str):
    """
    Soft delete a case by setting is_archived=True in metadata.
    """
    record, metadata_path = _load_case(case_id)
    safe_case_id = record.case_id

    try:
        data = record.model_dump()

        data["is_archived"] = True
        data["archived_at"] = datetime.now(timezone.utc).isoformat()
        data["status"] = "Archived"

        _atomic_write_json(metadata_path, data)
        if _read_current_case_id() == safe_case_id:
            _write_current_case_id(None)

        return {"status": "success", "message": f"Case {safe_case_id} archived"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/restore/{case_id}", dependencies=[Depends(require_api_key)])
async def restore_case(case_id: str):
    """
    Restore a case by setting is_archived=False in metadata.
    """
    record, metadata_path = _load_case(case_id)
    safe_case_id = record.case_id

    try:
        data = record.model_dump()

        data["is_archived"] = False
        data["archived_at"] = None
        data["status"] = "Active"  # Reset status to active

        _atomic_write_json(metadata_path, data)

        return {"status": "success", "message": f"Case {safe_case_id} restored"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/{case_id}", dependencies=[Depends(require_api_key)])
async def export_case(case_id: str, format: str = "docx"):
    """
    Export case summary to specified format (docx, md, txt) and open in Explorer.
    """
    safe_case_id = normalize_case_id(case_id)
    case_path = get_cases_directory() / safe_case_id
    metadata_path = case_path / "metadata.json"

    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Case not found")

    try:
        # Load Data
        with open(metadata_path, "r") as f:
            data = json.load(f)

        # Generate Export
        try:
            file_path = generate_case_export(safe_case_id, data, format)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Open Explorer
        open_in_explorer(file_path)

        return {
            "status": "success",
            "message": f"Exported to {file_path}",
            "path": file_path,
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
