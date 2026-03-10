import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from vibe_justice.utils.auth import require_api_key
from vibe_justice.utils.export_engine import generate_case_export, open_in_explorer
from vibe_justice.utils.paths import get_cases_directory, get_log_directory

# Define router with prefix and tags directly here, so main.py can just include it
router = APIRouter(prefix="/cases", tags=["Cases"])


class CaseCreateRequest(BaseModel):
    name: str
    jurisdiction: str
    goals: str


CASE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")


def normalize_case_id(raw_case_id: str) -> str:
    candidate = (raw_case_id or "").strip()
    if not candidate:
        raise HTTPException(status_code=400, detail="Case ID is required")
    if not CASE_ID_PATTERN.match(candidate):
        raise HTTPException(status_code=400, detail="Invalid case ID")
    return candidate


@router.post("/create", dependencies=[Depends(require_api_key)])
async def create_case(request: CaseCreateRequest):
    """
    Receives signal from ProDashboard to initialize a new autonomous workspace.
    """
    # 1. Path Configuration (Strictly D: drive as per system specs)
    case_id = normalize_case_id(request.name)
    case_root = get_cases_directory() / case_id
    log_dir = get_log_directory()
    log_file = log_dir / "system_activity.log"  # Central log for UI LogViewer

    # Ensure log directory exists (resilience)
    log_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 2. Workspace Initialization
        case_root.mkdir(parents=True, exist_ok=True)
        (case_root / "research").mkdir(exist_ok=True)
        (case_root / "evidence").mkdir(exist_ok=True)

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

        with open(case_root / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=4)

        # 4. Trigger the Autonomous Loop (The Signal File)
        # Your Monitoring Loop looks for this file to start the Learning Loop
        with open(case_root / "active.signal", "w") as f:
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

        return {"status": "success", "case_path": str(case_root)}

    except Exception as e:
        # Log error to UI so user knows why it failed
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(
                    f"[{datetime.now(timezone.utc)}] [ERROR] Create Case Failed: {str(e)}\n"
                )
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
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

                        case_list.append(data)
                except Exception:
                    continue  # Skip corrupted metadata

    # Sort by created_at desc
    case_list.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return case_list


@router.post("/archive/{case_id}", dependencies=[Depends(require_api_key)])
async def archive_case(case_id: str):
    """
    Soft delete a case by setting is_archived=True in metadata.
    """
    safe_case_id = normalize_case_id(case_id)
    case_path = get_cases_directory() / safe_case_id
    metadata_path = case_path / "metadata.json"

    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Case not found")

    try:
        with open(metadata_path, "r") as f:
            data = json.load(f)

        data["is_archived"] = True
        data["archived_at"] = datetime.now(timezone.utc).isoformat()
        data["status"] = "Archived"

        with open(metadata_path, "w") as f:
            json.dump(data, f, indent=4)

        return {"status": "success", "message": f"Case {safe_case_id} archived"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/restore/{case_id}", dependencies=[Depends(require_api_key)])
async def restore_case(case_id: str):
    """
    Restore a case by setting is_archived=False in metadata.
    """
    safe_case_id = normalize_case_id(case_id)
    case_path = get_cases_directory() / safe_case_id
    metadata_path = case_path / "metadata.json"

    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Case not found")

    try:
        with open(metadata_path, "r") as f:
            data = json.load(f)

        data["is_archived"] = False
        data["archived_at"] = None
        data["status"] = "Active"  # Reset status to active

        with open(metadata_path, "w") as f:
            json.dump(data, f, indent=4)

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
