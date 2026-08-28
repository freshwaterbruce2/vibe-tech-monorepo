"""
Analysis Service for document comparison against legal frameworks
"""

from vibe_justice.services.ai_service import get_ai_service
from vibe_justice.services.retrieval_service import RetrievalService


class AnalysisService:
    def __init__(self):
        self.ai_service = get_ai_service()
        self.retrieval_service = RetrievalService()

    def analyze_document(self, document_text: str, domain: str) -> str:
        """
        Analyzes a document against legal frameworks using DeepSeek R1.
        """
        # For now, direct AI analysis without RAG
        # In production, this would retrieve relevant laws first

        prompt = f"""
        Analyze the following document for legal compliance and issues.
        Domain: {domain}

        Document:
        {document_text[:3000]}  # Limit for token safety

        Please provide:
        1. Key legal issues identified
        2. Relevant statutes or regulations
        3. Potential violations
        4. Recommendations
        """

        response = self.ai_service.generate_response(prompt, domain, use_reasoning=True)
        return response