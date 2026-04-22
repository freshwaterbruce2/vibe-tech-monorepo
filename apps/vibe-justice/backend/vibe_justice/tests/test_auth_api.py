import pytest
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend root to sys.path
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from fastapi.testclient import TestClient
from main import app
from vibe_justice.services.ai_service import get_ai_service
from vibe_justice.utils.auth import require_api_key


@pytest.fixture
def client():
    """TestClient with auth bypassed — these tests smoke-test routing, not auth."""
    app.dependency_overrides[require_api_key] = lambda: "test-api-key"
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(require_api_key, None)


@pytest.fixture
def mock_ai_service(mocker):
    mock_service = mocker.patch("vibe_justice.services.ai_service.get_ai_service")
    mock_instance = MagicMock()
    mock_instance.generate_response_streaming.return_value = {
        "answer": "Mocked response",
        "reasoning": "Mocked reasoning"
    }
    mock_service.return_value = mock_instance
    return mock_instance


class TestAuthEndpoints:
    """Unit tests for authentication-related endpoints (open API smoke tests)."""

    def test_root_endpoint(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["message"] == "Vibe-Justice Backend API"

    def test_health_check(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_chat_simple_no_auth_required(self, client, mock_ai_service):
        """Test chat/simple - no auth required (open endpoint)."""
        response = client.post("/api/chat/simple", json={"message": "test query"})
        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert data["model_used"] in ["deepseek-reasoner", "deepseek-chat", "deepseek/deepseek-chat", "deepseek/deepseek-reasoner", "moonshotai/kimi-k2.5"]

    def test_chat_simple_invalid(self, client):
        """Test invalid input - expects 400 (validation, no auth fail)."""
        response = client.post("/api/chat/simple", json={"message": ""})
        assert response.status_code == 400