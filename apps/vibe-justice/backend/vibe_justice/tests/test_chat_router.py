"""
Tests for Chat API Router
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI


class TestChatRouter:
    """Tests for chat API endpoints"""

    @pytest.fixture
    def mock_ai_service(self):
        """Create mock AI service"""
        mock = MagicMock()
        mock.generate_response_streaming.return_value = {
            "answer": "Test AI response",
            "reasoning": "Test reasoning content"
        }
        mock.is_complex_legal_query.return_value = True
        mock.reasoning_model = "deepseek-reasoner"
        mock.chat_model = "deepseek-chat"
        return mock

    @pytest.fixture
    def mock_retrieval_service(self):
        """Create mock retrieval service"""
        mock = MagicMock()
        mock.retrieve_context.return_value = ["Context 1", "Context 2"]
        return mock

    @pytest.fixture
    def client(self, mock_ai_service, mock_retrieval_service):
        """Create test client with mocked services"""
        # Patch the module-level instances before importing the router
        with patch('vibe_justice.api.chat.ai_service', mock_ai_service):
            with patch('vibe_justice.api.chat.retrieval_service', mock_retrieval_service):
                from vibe_justice.api.chat import router
                test_app = FastAPI()
                test_app.include_router(router, prefix="/api/chat")
                yield TestClient(test_app)

    def test_simple_chat_success(self, client, mock_ai_service):
        """POST /simple should return AI response"""
        response = client.post("/api/chat/simple", json={
            "message": "What are my legal rights?",
            "domain": "general"
        })

        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert "reasoning" in data
        assert "model_used" in data
        assert data["content"] == "Test AI response"
        assert data["reasoning"] == "Test reasoning content"

    def test_simple_chat_empty_message_returns_400(self, client):
        """POST /simple with empty message should return 400"""
        response = client.post("/api/chat/simple", json={
            "message": "",
            "domain": "general"
        })

        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()

    def test_simple_chat_with_domain(self, client, mock_ai_service):
        """POST /simple should pass domain to AI service"""
        response = client.post("/api/chat/simple", json={
            "message": "Unemployment benefits question",
            "domain": "sc_unemployment"
        })

        assert response.status_code == 200
        mock_ai_service.generate_response_streaming.assert_called_once()
        call_args = mock_ai_service.generate_response_streaming.call_args
        assert call_args[0][1] == "sc_unemployment"

    def test_simple_chat_with_use_reasoning_true(self, client, mock_ai_service):
        """POST /simple with use_reasoning=true should force reasoning model"""
        response = client.post("/api/chat/simple", json={
            "message": "Simple question",
            "domain": "general",
            "use_reasoning": True
        })

        assert response.status_code == 200
        data = response.json()
        assert data["model_used"] == "deepseek-reasoner"

    def test_simple_chat_model_selection_complex_query(self, client, mock_ai_service):
        """POST /simple should select reasoning model for complex queries"""
        mock_ai_service.is_complex_legal_query.return_value = True

        response = client.post("/api/chat/simple", json={
            "message": "Analyze the legal implications",
            "domain": "general"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["model_used"] == "deepseek-reasoner"

    def test_simple_chat_model_selection_simple_query(self, client, mock_ai_service):
        """POST /simple should select chat model for simple queries"""
        mock_ai_service.is_complex_legal_query.return_value = False

        response = client.post("/api/chat/simple", json={
            "message": "Hello",
            "domain": "general"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["model_used"] == "deepseek-chat"

    def test_simple_chat_handles_ai_service_error(self, client, mock_ai_service):
        """POST /simple should return 500 on AI service error"""
        mock_ai_service.generate_response_streaming.side_effect = Exception("AI service error")

        response = client.post("/api/chat/simple", json={
            "message": "Test question",
            "domain": "general"
        })

        assert response.status_code == 500
        assert "AI service error" in response.json()["detail"]

    def test_rag_chat_success(self, client, mock_ai_service, mock_retrieval_service):
        """POST /rag should return AI response with context"""
        mock_ai_service.generate_rag_response_streaming.return_value = {
            "answer": "RAG response",
            "reasoning": "RAG reasoning"
        }

        response = client.post("/api/chat/rag", json={
            "message": "Legal question with context",
            "domain": "general"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "RAG response"
        assert data["reasoning"] == "RAG reasoning"

    def test_rag_chat_empty_message_returns_400(self, client):
        """POST /rag with empty message should return 400"""
        response = client.post("/api/chat/rag", json={
            "message": "",
            "domain": "general"
        })

        assert response.status_code == 400

    def test_rag_chat_falls_back_to_simple_when_no_context(self, client, mock_ai_service, mock_retrieval_service):
        """POST /rag should fallback to simple response when no context found"""
        mock_retrieval_service.retrieve_context.return_value = []

        response = client.post("/api/chat/rag", json={
            "message": "Question without context",
            "domain": "general"
        })

        assert response.status_code == 200
        mock_ai_service.generate_response_streaming.assert_called_once()

    def test_rag_chat_passes_domain_to_retrieval(self, client, mock_ai_service, mock_retrieval_service):
        """POST /rag should pass domain to retrieval service"""
        mock_ai_service.generate_rag_response_streaming.return_value = {
            "answer": "RAG response",
            "reasoning": "RAG reasoning"
        }

        response = client.post("/api/chat/rag", json={
            "message": "Test question",
            "domain": "unemployment"
        })

        assert response.status_code == 200
        mock_retrieval_service.retrieve_context.assert_called_once()
        call_args = mock_retrieval_service.retrieve_context.call_args
        assert call_args[0][1] == "unemployment"

    def test_rag_chat_handles_retrieval_error(self, client, mock_retrieval_service):
        """POST /rag should return 500 on retrieval service error"""
        mock_retrieval_service.retrieve_context.side_effect = Exception("Database error")

        response = client.post("/api/chat/rag", json={
            "message": "Test question",
            "domain": "general"
        })

        assert response.status_code == 500
        assert "Database error" in response.json()["detail"]
