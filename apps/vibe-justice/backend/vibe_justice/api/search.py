"""
Search API endpoints for web policy search and document indexing.

Provides endpoints for searching company policies online and downloading
documents to index into the knowledge base.
"""

import ipaddress
import logging
import socket
import tempfile
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, HttpUrl

from vibe_justice.services.evidence_service import EvidenceService
from vibe_justice.services.web_search_service import (
    WebSearchError,
    get_web_search_service,
)
from vibe_justice.utils.auth import require_api_key

from main import limiter  # noqa: E402 — safe: main defines limiter before importing this

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_url_safe(url: str) -> bool:
    """
    SSRF guard for URLs accepted from user input.

    Rejects:
      - non-http/https schemes (file://, gopher://, ftp://, etc.)
      - hostnames that resolve to RFC1918 / loopback / link-local /
        IPv6 ULA / multicast / unspecified / reserved ranges.
    """
    try:
        parsed = urlparse(url)
    except Exception:
        return False

    if parsed.scheme not in ("http", "https"):
        return False
    if not parsed.hostname:
        return False

    hostname = parsed.hostname

    # If hostname is already a literal IP, parse it directly; otherwise resolve.
    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        try:
            resolved = socket.gethostbyname(hostname)
            ip = ipaddress.ip_address(resolved)
        except (socket.gaierror, ValueError):
            # Can't resolve → treat as unsafe (fail closed)
            return False

    # Block any private / internal / reserved ranges.
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return False

    return True

# Initialize services
web_search_service = get_web_search_service()
evidence_service = EvidenceService()


# ----- Request/Response Models -----


class PolicySearchRequest(BaseModel):
    """Request model for policy search."""

    query: str = Field(..., min_length=1, description="Search query string")
    company: Optional[str] = Field(
        None, description="Company name (walmart, sedgwick, lincoln_financial)"
    )
    policy_type: Optional[str] = Field(
        None, description="Type of policy (attendance, fmla, claims, etc.)"
    )
    max_results: Optional[int] = Field(
        10, ge=1, le=50, description="Maximum number of results"
    )


class SearchResultItem(BaseModel):
    """Single search result item."""

    title: str
    url: str
    snippet: str
    source: str


class PolicySearchResponse(BaseModel):
    """Response model for policy search."""

    results: List[SearchResultItem]
    query: str
    total_results: int


class PolicyDownloadRequest(BaseModel):
    """Request model for downloading and indexing a policy document."""

    url: HttpUrl = Field(..., description="URL of the document to download")
    domain: str = Field(..., min_length=1, description="Domain to index into")
    title: str = Field(..., min_length=1, description="Document title for reference")


class PolicyDownloadResponse(BaseModel):
    """Response model for policy download."""

    success: bool
    message: str
    filename: Optional[str] = None
    chunks_indexed: Optional[int] = None


# ----- API Endpoints -----


@router.post("/search", response_model=PolicySearchResponse, dependencies=[Depends(require_api_key)])
@limiter.limit("30/minute")
async def search_policies(request: Request, body: PolicySearchRequest):
    """
    Search for company policies and legal documents online.

    Uses DuckDuckGo Search API to find relevant policy documents,
    with optional company-specific search templates for targeted results.

    Args:
        request: PolicySearchRequest with query, optional company and policy_type

    Returns:
        PolicySearchResponse with list of search results

    Raises:
        HTTPException 400: Invalid request parameters
        HTTPException 500: Search service error
    """
    try:
        logger.info(
            f"Searching policies: query='{body.query}', company={body.company}"
        )

        # Execute search
        results = web_search_service.search_policies(
            query=body.query,
            company=body.company,
            policy_type=body.policy_type,
            max_results=body.max_results,
        )

        # Convert to response model
        result_items = [
            SearchResultItem(
                title=r.title,
                url=r.url,
                snippet=r.snippet,
                source=r.source,
            )
            for r in results
        ]

        return PolicySearchResponse(
            results=result_items,
            query=body.query,
            total_results=len(result_items),
        )

    except WebSearchError as e:
        logger.error(f"Web search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in policy search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/download", response_model=PolicyDownloadResponse, dependencies=[Depends(require_api_key)])
@limiter.limit("30/minute")
async def download_policy(request: Request, body: PolicyDownloadRequest):
    """
    Download a policy document and index it into the knowledge base.

    Downloads the document from the specified URL, saves it locally,
    and indexes the extracted text into ChromaDB for RAG retrieval.

    Args:
        request: PolicyDownloadRequest with url, domain, and title

    Returns:
        PolicyDownloadResponse with success status and indexing details

    Raises:
        HTTPException 400: Invalid URL or domain
        HTTPException 500: Download or indexing error
    """
    try:
        url_str = str(body.url)
        logger.info(f"Downloading policy: url={url_str}, domain={body.domain}")

        # SSRF guard — block file://, loopback, RFC1918, link-local, etc.
        if not _is_url_safe(url_str):
            logger.warning(f"Blocked unsafe URL: {url_str}")
            raise HTTPException(status_code=400, detail="URL not allowed")

        # Download the document
        try:
            content = web_search_service.download_document(url_str)
        except WebSearchError as e:
            logger.error(f"Download failed: {e}")
            raise HTTPException(status_code=400, detail=f"Download failed: {str(e)}")

        if not content:
            raise HTTPException(status_code=400, detail="Downloaded empty document")

        # Determine file extension from URL or content type
        extension = _get_file_extension(url_str)

        # Create a safe filename from the title
        safe_title = "".join(c if c.isalnum() or c in "._- " else "_" for c in body.title)
        filename = f"{safe_title[:50]}{extension}"

        # Save to uploads directory
        upload_path = evidence_service.uploads_dir / filename
        evidence_service.uploads_dir.mkdir(parents=True, exist_ok=True)

        with open(upload_path, "wb") as f:
            f.write(content)

        logger.info(f"Saved document: {filename} ({len(content)} bytes)")

        # Index the document
        try:
            index_result = evidence_service.index_file(filename, body.domain)
            chunks_indexed = index_result.get("chunks_indexed", 0)
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail="Failed to save document")
        except ValueError as e:
            # No text could be extracted
            raise HTTPException(
                status_code=400,
                detail=f"Could not extract text from document: {str(e)}",
            )

        return PolicyDownloadResponse(
            success=True,
            message=f"Document indexed successfully with {chunks_indexed} chunks",
            filename=filename,
            chunks_indexed=chunks_indexed,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error downloading policy: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


def _get_file_extension(url: str) -> str:
    """Extract file extension from URL or default to .html."""
    try:
        path = Path(url.split("?")[0])
        suffix = path.suffix.lower()
        if suffix in (".pdf", ".doc", ".docx", ".txt", ".html", ".htm"):
            return suffix
        return ".html"
    except Exception:
        return ".html"
