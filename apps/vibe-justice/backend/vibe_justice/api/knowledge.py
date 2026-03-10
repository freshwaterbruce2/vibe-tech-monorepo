"""
Knowledge Base API endpoints for document management.

Provides endpoints for viewing knowledge base status, listing indexed
documents by domain, and managing (deleting) documents.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Path as PathParam
from pydantic import BaseModel, Field

from vibe_justice.services.evidence_service import EvidenceService
from vibe_justice.services.retrieval_service import RetrievalService
from vibe_justice.utils.domain import DOMAINS, get_all_domains, normalize_domain

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
evidence_service = EvidenceService()
retrieval_service = RetrievalService()


# ----- Response Models -----


class DomainStatus(BaseModel):
    """Status for a single domain collection."""

    domain: str
    display_name: str
    collection: str
    document_count: int
    exists: bool


class KnowledgeStatusResponse(BaseModel):
    """Response model for knowledge base status."""

    total_documents: int
    domains: List[DomainStatus]


class DocumentInfo(BaseModel):
    """Information about an indexed document."""

    id: str
    filename: str
    category: str
    size_bytes: int
    index_status: str
    chunks: int
    collections: List[str]


class DocumentListResponse(BaseModel):
    """Response model for document listing."""

    domain: str
    documents: List[DocumentInfo]
    total: int


class DeleteResponse(BaseModel):
    """Response model for document deletion."""

    success: bool
    message: str
    deleted_id: Optional[str] = None


# ----- API Endpoints -----


@router.get("/status", response_model=KnowledgeStatusResponse)
async def get_knowledge_status():
    """
    Get document counts per domain in the knowledge base.

    Returns statistics for each legal domain including document counts
    and collection existence status.

    Returns:
        KnowledgeStatusResponse with domain statistics

    Raises:
        HTTPException 500: Database error
    """
    try:
        logger.info("Getting knowledge base status")

        domain_statuses = []
        total_documents = 0

        # Get stats for each configured domain
        for domain_key, config in DOMAINS.items():
            stats = retrieval_service.get_collection_stats(domain_key)

            doc_count = stats.get("count", 0)
            total_documents += doc_count

            domain_statuses.append(
                DomainStatus(
                    domain=domain_key,
                    display_name=config["display_name"],
                    collection=config["collection"],
                    document_count=doc_count,
                    exists=stats.get("exists", False),
                )
            )

        return KnowledgeStatusResponse(
            total_documents=total_documents,
            domains=domain_statuses,
        )

    except Exception as e:
        logger.error(f"Error getting knowledge status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get knowledge status")


@router.get("/documents/{domain}", response_model=DocumentListResponse)
async def list_domain_documents(
    domain: str = PathParam(..., description="Domain key (e.g., 'sc_unemployment')")
):
    """
    List all documents indexed in a specific domain.

    Returns documents with their metadata including filename, size,
    indexing status, and chunk counts.

    Args:
        domain: Domain key to list documents for

    Returns:
        DocumentListResponse with list of documents

    Raises:
        HTTPException 400: Invalid domain
        HTTPException 500: Database error
    """
    try:
        normalized_domain = normalize_domain(domain)
        logger.info(f"Listing documents for domain: {normalized_domain}")

        # Get all uploaded files
        all_files = evidence_service.list_files()

        # Filter and enrich with index status for this domain
        domain_documents = []

        for file_info in all_files:
            filename = file_info.get("filename", "")
            if not filename:
                continue

            # Get index status for this file
            index_status = evidence_service.get_index_status(filename)
            collections = index_status.get("collections", [])

            # Check if file is indexed in the requested domain's collection
            domain_collection = f"vibe_justice_{normalized_domain}"
            is_in_domain = domain_collection in collections

            # Include file if it's in this domain OR if showing all files for "general"
            if is_in_domain or (normalized_domain == "general" and collections):
                domain_documents.append(
                    DocumentInfo(
                        id=filename,
                        filename=filename,
                        category=file_info.get("category", "unknown"),
                        size_bytes=file_info.get("size", 0),
                        index_status=index_status.get("status", "unknown"),
                        chunks=index_status.get("chunks", 0),
                        collections=collections,
                    )
                )

        return DocumentListResponse(
            domain=normalized_domain,
            documents=domain_documents,
            total=len(domain_documents),
        )

    except Exception as e:
        logger.error(f"Error listing documents for domain {domain}: {e}")
        raise HTTPException(status_code=500, detail="Failed to list documents")


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
async def delete_document(
    document_id: str = PathParam(..., description="Document ID (filename) to delete")
):
    """
    Delete a document from the knowledge base.

    Removes the document file and all indexed chunks from ChromaDB.

    Args:
        document_id: Document ID (filename) to delete

    Returns:
        DeleteResponse with success status

    Raises:
        HTTPException 404: Document not found
        HTTPException 500: Deletion error
    """
    try:
        logger.info(f"Deleting document: {document_id}")

        # Check if file exists
        file_path = evidence_service.uploads_dir / document_id
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Document not found")

        # Delete file and index entries
        result = evidence_service.delete_file(document_id)

        return DeleteResponse(
            success=True,
            message=f"Document '{document_id}' deleted successfully",
            deleted_id=document_id,
        )

    except HTTPException:
        raise
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.get("/domains")
async def list_available_domains():
    """
    List all available legal domains.

    Returns configuration for all supported domains including
    their display names and descriptions.

    Returns:
        List of domain configurations
    """
    try:
        return get_all_domains()
    except Exception as e:
        logger.error(f"Error listing domains: {e}")
        raise HTTPException(status_code=500, detail="Failed to list domains")
