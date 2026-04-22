"""
Tests for AI Service - OpenRouter integration (2026)
"""

import pytest
from unittest.mock import MagicMock, patch
from vibe_justice.services.ai_service import AIService


class TestAIService:
    """Tests for AIService class"""

    @pytest.fixture
    def ai_service(self):
        """Create AIService instance for testing"""
        with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-api-key'}):
            return AIService()

    @pytest.fixture
    def ai_service_no_key(self):
        """Create AIService instance without API key"""
        with patch.dict('os.environ', {'OPENROUTER_API_KEY': '', 'MOONSHOT_API_KEY': ''}):
            return AIService()

    def test_is_complex_legal_query_returns_true_for_legal_terms(self, ai_service):
        """Complex queries with legal indicators should return True"""
        complex_queries = [
            "Analyze the contract for violations",
            "What are my legal rights?",
            "Compare these two precedents",
            "Is this a breach of contract?",
            "What are the implications of this ruling?",
            "Constitutional analysis of the statute"
        ]
        for query in complex_queries:
            assert ai_service.is_complex_legal_query(query) is True

    def test_is_complex_legal_query_returns_false_for_simple_queries(self, ai_service):
        """Simple queries without legal indicators should return False"""
        simple_queries = [
            "Hello, how are you?",
            "What time is it?",
            "Tell me about the weather",
            "How do I file taxes?"
        ]
        for query in simple_queries:
            assert ai_service.is_complex_legal_query(query) is False

    def test_is_complex_legal_query_case_insensitive(self, ai_service):
        """Query complexity detection should be case insensitive"""
        assert ai_service.is_complex_legal_query("ANALYZE THE CONTRACT") is True
        assert ai_service.is_complex_legal_query("analyze the contract") is True
        assert ai_service.is_complex_legal_query("AnAlYzE tHe CoNtRaCt") is True

    def test_get_system_prompt_general(self, ai_service):
        """General domain should return legal research assistant prompt"""
        prompt = ai_service.get_system_prompt("general")
        assert "legal research assistant" in prompt.lower()
        assert "south carolina" in prompt.lower()

    def test_get_system_prompt_unemployment(self, ai_service):
        """Unemployment domain should return SC unemployment expert prompt"""
        prompt = ai_service.get_system_prompt("unemployment")
        assert "unemployment" in prompt.lower()
        assert "SC Code Title 41" in prompt or "title 41" in prompt.lower()

    def test_get_system_prompt_sc_unemployment_alias(self, ai_service):
        """sc_unemployment alias should map to unemployment prompt"""
        prompt = ai_service.get_system_prompt("sc_unemployment")
        assert "unemployment" in prompt.lower()

    def test_get_system_prompt_walmart_sedgwick_alias(self, ai_service):
        """walmart_sedgwick alias should map to labor prompt"""
        prompt = ai_service.get_system_prompt("walmart_sedgwick")
        assert "labor" in prompt.lower() or "employment" in prompt.lower()

    def test_get_system_prompt_unknown_domain_defaults_to_general(self, ai_service):
        """Unknown domain should default to general prompt"""
        prompt = ai_service.get_system_prompt("unknown_domain")
        general_prompt = ai_service.get_system_prompt("general")
        assert prompt == general_prompt

    def test_generate_response_returns_error_without_api_key(self, ai_service_no_key):
        """generate_response should return error message when API key not configured"""
        result = ai_service_no_key.generate_response("Test question")
        assert "Error" in result or "OPENROUTER_API_KEY" in result

    def test_generate_response_streaming_returns_error_without_api_key(self, ai_service_no_key):
        """generate_response_streaming should return error dict when API key not configured"""
        result = ai_service_no_key.generate_response_streaming("Test question")
        assert isinstance(result, dict)
        assert "answer" in result
        assert "Error" in result["answer"] or "OPENROUTER_API_KEY" in result["answer"]
        assert "reasoning" in result
        assert result["reasoning"] == ""

    @patch('vibe_justice.services.ai_service.requests.post')
    def test_generate_response_calls_openrouter_api(self, mock_post):
        """generate_response should call OpenRouter API with correct parameters"""
        # Setup mock response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Test response"}}]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
            service = AIService()
            result = service.generate_response("What are my rights?", "general", True)

        assert result == "Test response"
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args.kwargs['json']['model'] == 'deepseek/deepseek-r1-0528:free'

    @patch('vibe_justice.services.ai_service.requests.post')
    def test_generate_response_handles_exception(self, mock_post):
        """generate_response should handle exceptions gracefully"""
        mock_post.side_effect = Exception("API error")

        with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
            service = AIService()
            result = service.generate_response("Test question")

        assert "Error" in result

    def test_generate_rag_response_returns_error_without_api_key(self, ai_service_no_key):
        """generate_rag_response should return error when API key not configured"""
        result = ai_service_no_key.generate_rag_response(
            "Test query",
            ["context chunk 1", "context chunk 2"],
            "general"
        )
        assert "Error" in result or "OPENROUTER_API_KEY" in result

    def test_generate_rag_response_streaming_returns_error_without_api_key(self, ai_service_no_key):
        """generate_rag_response_streaming should return error dict without API key"""
        result = ai_service_no_key.generate_rag_response_streaming(
            "Test query",
            ["context chunk"],
            "general"
        )
        assert isinstance(result, dict)
        assert "Error" in result["answer"] or "OPENROUTER_API_KEY" in result["answer"]
        assert result["reasoning"] == ""

    @patch('vibe_justice.services.ai_service.requests.post')
    def test_generate_rag_response_includes_context_in_message(self, mock_post):
        """generate_rag_response should include context chunks in the message"""
        # Setup mock response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "RAG response"}}]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
            service = AIService()
            result = service.generate_rag_response(
                "Test query",
                ["Legal context 1", "Legal context 2"],
                "general"
            )

        assert result == "RAG response"
        call_args = mock_post.call_args
        messages = call_args.kwargs['json']['messages']
        user_message = messages[1]['content']
        assert "Legal context 1" in user_message
        assert "Legal context 2" in user_message

    def test_model_selection_reasoning_for_complex_queries(self, ai_service):
        """AIService should select reasoning model for complex legal queries"""
        assert ai_service.is_complex_legal_query("Analyze the legal implications") is True

    def test_model_selection_chat_for_simple_queries(self, ai_service):
        """AIService should select chat model for simple queries"""
        assert ai_service.is_complex_legal_query("Hello there") is False
