import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from vibe_justice.utils.auth import require_api_key


@pytest.fixture(autouse=True)
def _bypass_auth():
    """Smoke tests exercise routing, not auth. Bypass require_api_key."""
    app.dependency_overrides[require_api_key] = lambda: "test-api-key"
    yield
    app.dependency_overrides.pop(require_api_key, None)


def test_chat_simple_empty(client):
    """Test /api/chat/simple with empty message (validation)"""
    resp = client.post("/api/chat/simple", json={"message": ""})
    assert resp.status_code == 400  # Explicit check in router

def test_chat_simple_valid(client):
    """Test /api/chat/simple with mock AI response"""
    with patch("vibe_justice.services.ai_service.AIService.generate_response_streaming") as mock_chat:
        mock_chat.return_value = {"answer": "Mock AI answer", "reasoning": "Mock reasoning"}

        resp = client.post("/api/chat/simple", json={"message": "test query"})
        assert resp.status_code == 200
        data = resp.json()
        assert "content" in data
        assert data["content"] == "Mock AI answer"
        mock_chat.assert_called_once()

@pytest.mark.asyncio
async def test_chat_simple_async(ac):
    """Async test for chat/simple"""
    with patch("vibe_justice.services.ai_service.AIService.generate_response_streaming") as mock_chat:
        mock_chat.return_value = {"answer": "Async mock", "reasoning": ""}

        resp = await ac.post("/api/chat/simple", json={"message": "async test"})
        assert resp.status_code == 200
        data = resp.json()
        assert "content" in data