"""
Evidence API endpoints

Supports:
- Uploading evidence files (txt/pdf/docx) into DATA_DIRECTORY/uploads (D:\\learning-system by default)
- Listing uploaded evidence
- Indexing extracted text into ChromaDB for RAG chat
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from vibe_justice.services.evidence_service import EvidenceService
from vibe_justice.utils.auth import require_api_key
from vibe_justice.utils.domain import normalize_domain

router = APIRouter()
evidence_service = EvidenceService()


class EvidenceFile(BaseModel):
    filename: str
    size_bytes: int
    uploaded_at: str


class UploadEvidenceResponse(BaseModel):
    filename: str
    size_bytes: int
    message: str


class IndexEvidenceRequest(BaseModel):
    filename: str
    domain: str = "general"
    chunk_size: int = 1200
    overlap: int = 200


class IndexEvidenceResponse(BaseModel):
    domain: str
    filename: str
    chunks_indexed: int
    message: str


@router.get("/files", response_model=List[EvidenceFile])
async def list_evidence_files():
    return evidence_service.list_files()


@router.post("/upload", response_model=UploadEvidenceResponse, dependencies=[Depends(require_api_key)])
async def upload_evidence(file: UploadFile = File(...), category: str = Form("other")):
    try:
        result = evidence_service.save_upload(file, category=category)
        return UploadEvidenceResponse(
            filename=result["filename"],
            size_bytes=result["size_bytes"],
            message=f"Uploaded successfully ({result.get('category', 'other')})",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Evidence upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload evidence")


@router.post("/index", response_model=IndexEvidenceResponse, dependencies=[Depends(require_api_key)])
async def index_evidence(request: IndexEvidenceRequest):
    domain = normalize_domain(request.domain)
    try:
        result = evidence_service.index_file(
            filename=request.filename,
            domain=domain,
            chunk_size=request.chunk_size,
            overlap=request.overlap,
        )
        return IndexEvidenceResponse(
            domain=domain,
            filename=request.filename,
            chunks_indexed=result["chunks_indexed"],
            message="Indexed successfully",
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Evidence file not found")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Evidence index error: {e}")
        raise HTTPException(status_code=500, detail="Failed to index evidence")


class DeleteRequest(BaseModel):
    filename: str


class DeleteResponse(BaseModel):
    deleted: str
    message: str


@router.post("/delete", response_model=DeleteResponse, dependencies=[Depends(require_api_key)])
async def delete_evidence(request: DeleteRequest):
    """Delete an evidence file and remove from index."""
    try:
        result = evidence_service.delete_file(request.filename)
        return DeleteResponse(deleted=result["deleted"], message="Deleted successfully")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        print(f"Delete error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete file")


class StatusResponse(BaseModel):
    filename: str
    status: str
    chunks: int
    collections: List[str] = []


@router.get("/status/{filename}", response_model=StatusResponse)
async def get_evidence_status(filename: str):
    """Get index status for an evidence file."""
    try:
        result = evidence_service.get_index_status(filename)
        return StatusResponse(
            filename=filename,
            status=result["status"],
            chunks=result.get("chunks", 0),
            collections=result.get("collections", []),
        )
    except Exception as e:
        print(f"Status error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get status")


class PreviewResponse(BaseModel):
    filename: str
    preview: str
    total_chars: int


@router.get("/preview/{filename}", response_model=PreviewResponse)
async def get_evidence_preview(filename: str):
    """Get text preview of an evidence file."""
    try:
        result = evidence_service.get_preview(filename)
        return PreviewResponse(
            filename=result["filename"],
            preview=result["preview"],
            total_chars=result["total_chars"],
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        print(f"Preview error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get preview")
