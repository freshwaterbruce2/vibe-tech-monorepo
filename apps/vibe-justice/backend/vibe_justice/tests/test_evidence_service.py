from unittest.mock import MagicMock, patch

import pytest
from vibe_justice.services.evidence_service import EvidenceService


@pytest.fixture
def evidence_service(tmp_data_dir):
    with patch(
        "vibe_justice.services.evidence_service.get_data_directory",
        return_value=str(tmp_data_dir),
    ):
        service = EvidenceService()
        return service


def test_index_file_mocked(evidence_service):
    """Test file indexing with mocked dependencies"""
    # Mock services
    evidence_service.file_service.save_upload = MagicMock(
        return_value={"filename": "doc.pdf"}
    )
    evidence_service.extraction_service.extract_text = MagicMock(
        return_value="sample text"
    )

    # Create the physical file because index_file checks for existence
    file_path = evidence_service.uploads_dir / "doc.pdf"
    file_path.touch()

    # Mock _ensure_chroma
    mock_client = MagicMock()
    mock_coll = MagicMock()
    mock_client.get_or_create_collection.return_value = mock_coll
    evidence_service._ensure_chroma = MagicMock(return_value=mock_client)

    result = evidence_service.index_file("doc.pdf", domain="criminal")

    assert result["status"] == "indexed"
    assert evidence_service._ensure_chroma.called
    assert mock_coll.upsert.called


def test_get_index_status_mocked(evidence_service):
    """Test getting index status with mocked ChromaDB"""
    mock_client = MagicMock()
    mock_coll = MagicMock()
    mock_coll.get.return_value = {"ids": ["id1", "id2"]}
    mock_client.list_collections.return_value = [mock_coll]
    evidence_service._ensure_chroma = MagicMock(return_value=mock_client)

    status = evidence_service.get_index_status("doc.pdf")
    assert status["chunks"] == 2
    assert status["status"] == "indexed"
