"""Shared pytest fixtures for vibe-justice tests."""
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from main import app

# Import services after mocking
from vibe_justice.services.extraction_service import ExtractionService
from vibe_justice.services.file_service import FileService


# ============================================================================
# Directory Fixtures
# ============================================================================

@pytest.fixture
def tmp_data_dir(tmp_path):
    """Create a temporary data directory"""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    return data_dir


@pytest.fixture
def tmp_cases_dir(tmp_data_dir):
    """Create a temporary cases directory"""
    cases_dir = tmp_data_dir / "cases"
    cases_dir.mkdir()
    return cases_dir


@pytest.fixture
def tmp_uploads_dir(tmp_data_dir):
    """Create a temporary uploads directory"""
    uploads_dir = tmp_data_dir / "uploads"
    uploads_dir.mkdir()
    return uploads_dir


@pytest.fixture
def tmp_logs_dir(tmp_path):
    """Create a temporary logs directory"""
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir()
    return logs_dir


# ============================================================================
# Service Fixtures
# ============================================================================

@pytest.fixture
def file_service(tmp_uploads_dir):
    """Create a FileService instance with temp directory"""
    return FileService(tmp_uploads_dir)


@pytest.fixture
def extraction_service():
    """Create an ExtractionService instance"""
    return ExtractionService()


# ============================================================================
# Environment Fixtures
# ============================================================================

@pytest.fixture
def mock_env_vars(tmp_data_dir, tmp_logs_dir):
    """Set up mock environment variables for testing"""
    env_vars = {
        "VIBE_JUSTICE_DATA_DIR": str(tmp_data_dir),
        "VIBE_JUSTICE_LOG_DIR": str(tmp_logs_dir),
        "VIBE_JUSTICE_API_KEY": "test-api-key-" + "x" * 32,
        "OPENAI_API_KEY": "sk-test-key-12345",
        "DEEPSEEK_API_KEY": "dk-test-key-12345",
    }
    
    # Store original values
    original = {k: os.environ.get(k) for k in env_vars}
    
    # Set test values
    os.environ.update(env_vars)
    
    yield env_vars
    
    # Restore original values
    for key, value in original.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


@pytest.fixture
def clean_env():
    """Remove all VIBE_JUSTICE environment variables"""
    keys_to_remove = [k for k in os.environ if k.startswith("VIBE_JUSTICE")]
    original = {k: os.environ.pop(k) for k in keys_to_remove}
    
    yield
    
    # Restore
    os.environ.update(original)


# ============================================================================
# Sample Data Fixtures
# ============================================================================

@pytest.fixture
def sample_case_metadata():
    """Sample case metadata for testing"""
    return {
        "case_id": "TEST-001",
        "title": "Test Case",
        "description": "A test case for unit testing",
        "created_at": "2026-01-12T00:00:00+00:00",
        "status": "active",
        "tags": ["test", "unit-test"],
    }


@pytest.fixture
def sample_evidence_metadata():
    """Sample evidence metadata for testing"""
    return {
        "evidence_id": "EVD-001",
        "case_id": "TEST-001",
        "filename": "test_document.pdf",
        "category": "document",
        "uploaded_at": "2026-01-12T00:00:00+00:00",
    }


@pytest.fixture
def sample_pdf_content():
    """Sample PDF-like content for testing extraction"""
    return b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"


@pytest.fixture
def sample_text_file(tmp_uploads_dir):
    """Create a sample text file for testing"""
    file_path = tmp_uploads_dir / "sample.txt"
    file_path.write_text("Sample content for testing.\nLine 2.\nLine 3.")
    return file_path


# ============================================================================
# API Testing Fixtures
# ============================================================================

@pytest.fixture
def mock_api_key():
    """Valid mock API key for testing"""
    return "test-api-key-" + "x" * 32


@pytest.fixture
def api_headers(mock_api_key):
    """Headers for API requests with valid API key"""
    return {"X-API-Key": mock_api_key}


# ============================================================================
# Async Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def event_loop_policy():
    """Configure event loop for async tests"""
    import asyncio
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

@pytest.fixture(scope="module")
def client():
    """Synchronous TestClient for FastAPI"""
    yield TestClient(app)

@pytest.fixture
async def ac():
    """Async httpx client for API tests"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        yield ac
