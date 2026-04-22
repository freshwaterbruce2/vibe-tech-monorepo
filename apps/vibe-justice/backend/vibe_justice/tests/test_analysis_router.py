"""
Tests for Analysis API Router
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI


class TestAnalysisRouter:
    """Tests for analysis API endpoints"""

    @pytest.fixture
    def mock_analysis_service(self):
        """Create mock analysis service"""
        mock = MagicMock()
        mock.analyze_document.return_value = "Analysis result: Key legal issues identified."
        return mock

    @pytest.fixture
    def client(self, mock_analysis_service):
        """Create test client with mocked services"""
        with patch('vibe_justice.api.analysis.analysis_service', mock_analysis_service):
            from vibe_justice.api.analysis import router
            test_app = FastAPI()
            test_app.include_router(router, prefix="/api/analysis")
            yield TestClient(test_app)

    def test_run_analysis_success(self, client, mock_analysis_service):
        """POST /run should return analysis result"""
        response = client.post("/api/analysis/run", json={
            "document_text": "This is a legal document to analyze.",
            "domain": "general"
        })

        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert "Key legal issues identified" in data["result"]

    def test_run_analysis_empty_document_returns_400(self, client):
        """POST /run with empty document should return 400"""
        response = client.post("/api/analysis/run", json={
            "document_text": "",
            "domain": "general"
        })

        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()

    def test_run_analysis_with_domain(self, client, mock_analysis_service):
        """POST /run should pass domain to analysis service"""
        response = client.post("/api/analysis/run", json={
            "document_text": "Unemployment appeal document",
            "domain": "sc_unemployment"
        })

        assert response.status_code == 200
        mock_analysis_service.analyze_document.assert_called_once()
        call_args = mock_analysis_service.analyze_document.call_args
        assert call_args[0][0] == "Unemployment appeal document"
        assert call_args[0][1] == "sc_unemployment"

    def test_run_analysis_default_domain_is_general(self, client, mock_analysis_service):
        """POST /run should default to general domain"""
        response = client.post("/api/analysis/run", json={
            "document_text": "Test document"
        })

        assert response.status_code == 200
        call_args = mock_analysis_service.analyze_document.call_args
        assert call_args[0][1] == "general"

    def test_run_analysis_handles_service_error(self, client, mock_analysis_service):
        """POST /run should return 500 on analysis service error"""
        mock_analysis_service.analyze_document.side_effect = Exception("Analysis failed")

        response = client.post("/api/analysis/run", json={
            "document_text": "Test document",
            "domain": "general"
        })

        assert response.status_code == 500
        assert "Analysis failed" in response.json()["detail"]

    def test_run_analysis_with_long_document(self, client, mock_analysis_service):
        """POST /run should handle long documents"""
        long_document = "Legal text " * 1000

        response = client.post("/api/analysis/run", json={
            "document_text": long_document,
            "domain": "general"
        })

        assert response.status_code == 200
        mock_analysis_service.analyze_document.assert_called_once()

    def test_run_analysis_with_walmart_sedgwick_domain(self, client, mock_analysis_service):
        """POST /run should accept walmart_sedgwick domain"""
        response = client.post("/api/analysis/run", json={
            "document_text": "Walmart employment dispute document",
            "domain": "walmart_sedgwick"
        })

        assert response.status_code == 200
        call_args = mock_analysis_service.analyze_document.call_args
        assert call_args[0][1] == "walmart_sedgwick"

    def test_run_analysis_response_structure(self, client, mock_analysis_service):
        """POST /run should return correct response structure"""
        mock_analysis_service.analyze_document.return_value = "Detailed analysis result"

        response = client.post("/api/analysis/run", json={
            "document_text": "Test document",
            "domain": "general"
        })

        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert isinstance(data["result"], str)
        assert data["result"] == "Detailed analysis result"
