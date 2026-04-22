"""
AI Service for Vibe-Justice Legal Research Assistant
Uses OpenRouter API for multi-model AI access (2026 standards)
"""

import os
import requests
from typing import Optional, List, Dict, Any


class AIService:
    """
    OpenRouter AI service with multi-model support for legal research.

    Features (January 2026):
    - Direct OpenRouter API integration
    - Automatic model selection based on query complexity
    - deepseek/deepseek-r1-0528:free: FREE reasoning for complex legal analysis
    - deepseek/deepseek-chat: Ultra-cheap chat ($0.0003/$0.0012 per 1M tokens)
    - Usage tracking via HTTP-Referer and X-Title headers
    """

    def __init__(self):
        # API Configurations
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")
        self.moonshot_key = os.getenv("MOONSHOT_API_KEY")
        
        self.openrouter_base = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")
        self.moonshot_base = os.getenv("MOONSHOT_API_BASE", "https://api.moonshot.ai/v1")

        # Optional: Usage tracking (OpenRouter)
        self.site_url = os.getenv("OPENROUTER_SITE_URL", "")
        self.site_name = os.getenv("OPENROUTER_SITE_NAME", "Vibe-Justice")

        # Model selection
        self.reasoning_model = os.getenv(
            "OPENROUTER_REASONING_MODEL",
            "deepseek/deepseek-r1-0528:free"
        )
        self.chat_model = os.getenv(
            "OPENROUTER_CHAT_MODEL",
            "moonshotai/kimi-k2.5" if self.moonshot_key else "deepseek/deepseek-chat"
        )

    def _get_api_config(self, model: str) -> tuple[str, dict]:
        """Get the appropriate API endpoint and headers based on the model."""
        if "moonshot" in model.lower() or "kimi" in model.lower():
            if not self.moonshot_key:
                raise ValueError("MOONSHOT_API_KEY is required for Moonshot/Kimi models")

            # No alias remapping here — pass the configured model straight through.
            # If the provider does not recognise the name it will 404 honestly and
            # the caller's fallback chain can pick a different model.

            headers = {
                "Authorization": f"Bearer {self.moonshot_key}",
                "Content-Type": "application/json"
            }
            return f"{self.moonshot_base}/chat/completions", headers
            
        else:
            if not self.openrouter_key:
                raise ValueError("OPENROUTER_API_KEY is required for OpenRouter models")
                
            headers = {
                "Authorization": f"Bearer {self.openrouter_key}",
                "Content-Type": "application/json"
            }
            if self.site_url:
                headers["HTTP-Referer"] = self.site_url
            if self.site_name:
                headers["X-Title"] = self.site_name
                
            return f"{self.openrouter_base}/chat/completions", headers

    def _get_headers(self) -> Dict[str, str]:
        """Get default OpenRouter API headers with optional tracking (Legacy compat)."""
        _, headers = self._get_api_config(self.chat_model)
        return headers

    def is_complex_legal_query(self, query: str) -> bool:
        """
        Determine if query requires reasoning model based on complexity indicators.

        Args:
            query: User's question

        Returns:
            True if query is complex and requires R1 reasoning
        """
        complex_indicators = [
            "analyze", "compare", "interpret", "implications",
            "violation", "legally", "statute", "precedent",
            "appeal", "rights", "obligations", "liability",
            "case law", "regulation", "compliance", "breach",
            "tort", "negligence", "damages", "remedy",
            "jurisdiction", "constitutional", "statutory"
        ]

        query_lower = query.lower()
        return any(indicator in query_lower for indicator in complex_indicators)

    def get_system_prompt(self, domain: str = "general") -> str:
        """
        Get domain-specific system prompt.

        Args:
            domain: Legal domain (general, unemployment, labor, etc.)

        Returns:
            System prompt string
        """
        # Domain alias mapping
        domain_aliases = {
            "sc_unemployment": "unemployment",
            "walmart_sedgwick": "labor"
        }
        domain = domain_aliases.get(domain, domain)

        prompts = {
            "general": (
                "You are a legal research assistant specializing in South Carolina law. "
                "Provide accurate, well-reasoned legal analysis based on SC statutes and case law. "
                "Always cite relevant legal sources and explain your reasoning clearly."
            ),
            "unemployment": (
                "You are a legal expert in South Carolina unemployment law (SC Code Title 41). "
                "Analyze unemployment benefit claims, misconduct determinations, and appeals. "
                "Reference specific SC Code sections and relevant case law. "
                "Focus on claimant rights, employer obligations, and procedural requirements."
            ),
            "labor": (
                "You are a legal expert in South Carolina labor and employment law. "
                "Analyze workplace disputes, discrimination claims, and employment contracts. "
                "Reference SC labor statutes, federal laws (Title VII, ADA, FMLA), and case law."
            )
        }

        return prompts.get(domain, prompts["general"])

    def generate_response(
        self,
        message: str,
        domain: str = "general",
        use_reasoning: Optional[bool] = None
    ) -> str:
        """
        Generate AI response with automatic model selection via OpenRouter proxy.

        Args:
            message: User's question or prompt
            domain: Legal domain for system prompt
            use_reasoning: Force reasoning model (None = auto-select)

        Returns:
            AI response text
        """
        try:
            # Auto-select model based on query complexity
            if use_reasoning is None:
                use_reasoning = self.is_complex_legal_query(message)

            model = self.reasoning_model if use_reasoning else self.chat_model

            print(f"Using model: {model} via OpenRouter proxy (reasoning={'ON' if use_reasoning else 'OFF'})")

            system_prompt = self.get_system_prompt(domain)

            # Get dynamic endpoint and headers
            endpoint, headers = self._get_api_config(model)

            # Pass the configured model straight through — no alias remapping.
            # If the provider doesn't recognise it they will 404 and the
            # ai/openrouter_client fallback chain handles recovery.
            actual_model = model

            # Call API
            response = requests.post(
                endpoint,
                json={
                    "model": actual_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 4000
                },
                headers=headers,
                timeout=60
            )

            response.raise_for_status()
            data = response.json()

            return data["choices"][0]["message"]["content"]

        except requests.exceptions.RequestException as e:
            print(f"Error calling OpenRouter API: {e}")
            return f"Error: Unable to connect to OpenRouter. Check OPENROUTER_API_KEY configuration."
        except Exception as e:
            print(f"Error in generate_response: {e}")
            return f"Error: {str(e)}"

    def generate_response_streaming(
        self,
        message: str,
        domain: str = "general",
        use_reasoning: Optional[bool] = None
    ) -> Dict[str, str]:
        """
        Generate AI response (non-streaming for now - proxy streaming support TBD).

        Note: Streaming support requires SSE (Server-Sent Events) setup with the proxy.
        For now, returns complete response with reasoning content if available.

        Args:
            message: User's question or prompt
            domain: Legal domain for system prompt
            use_reasoning: Force reasoning model (None = auto-select)

        Returns:
            Dict with 'reasoning' and 'answer' keys
        """
        try:
            # Auto-select model based on query complexity
            if use_reasoning is None:
                use_reasoning = self.is_complex_legal_query(message)

            model = self.reasoning_model if use_reasoning else self.chat_model

            print(f"Using model: {model} via OpenRouter proxy (reasoning={'ON' if use_reasoning else 'OFF'})")

            system_prompt = self.get_system_prompt(domain)

            # Get dynamic endpoint and headers
            endpoint, headers = self._get_api_config(model)

            # Pass the configured model straight through — no alias remapping.
            # If the provider doesn't recognise it they will 404 and the
            # ai/openrouter_client fallback chain handles recovery.
            actual_model = model

            # Call API
            response = requests.post(
                endpoint,
                json={
                    "model": actual_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 12000  # Higher for reasoning models
                },
                headers=headers,
                timeout=120  # Longer timeout for reasoning
            )

            response.raise_for_status()
            data = response.json()

            # Extract answer content
            answer = data["choices"][0]["message"]["content"]

            # TODO: Add streaming support via SSE for real-time reasoning display
            return {
                "reasoning": "",  # Reasoning embedded in answer for now
                "answer": answer
            }

        except requests.exceptions.RequestException as e:
            print(f"Error calling OpenRouter API: {e}")
            return {
                "reasoning": "",
                "answer": f"Error: Unable to connect to OpenRouter. Check OPENROUTER_API_KEY configuration."
            }
        except Exception as e:
            print(f"Error in generate_response_streaming: {e}")
            return {
                "reasoning": "",
                "answer": f"Error: {str(e)}"
            }

    def generate_rag_response(
        self,
        query: str,
        context_chunks: List[str],
        domain: str = "general",
        use_reasoning: Optional[bool] = None
    ) -> str:
        """
        Generate RAG (Retrieval-Augmented Generation) response with legal context via OpenRouter proxy.

        Args:
            query: User's question
            context_chunks: Retrieved legal document chunks
            domain: Legal domain
            use_reasoning: Force reasoning model (None = auto-select)

        Returns:
            AI response incorporating context
        """
        try:
            # Auto-select model based on query complexity
            if use_reasoning is None:
                use_reasoning = self.is_complex_legal_query(query)

            model = self.reasoning_model if use_reasoning else self.chat_model

            system_prompt = self.get_system_prompt(domain)

            # Format context chunks
            context_text = "\n\n".join([
                f"[Context {i+1}]: {chunk}"
                for i, chunk in enumerate(context_chunks)
            ])

            # Augmented message with context
            augmented_message = (
                f"Using the following legal context, provide a thorough analysis.\n\n"
                f"LEGAL CONTEXT:\n{context_text}\n\n"
                f"USER QUESTION:\n{query}\n\n"
                f"Please reason through this step-by-step, considering all legal implications."
            )

            # Get dynamic endpoint and headers
            endpoint, headers = self._get_api_config(model)

            # Pass the configured model straight through — no alias remapping.
            # If the provider doesn't recognise it they will 404 and the
            # ai/openrouter_client fallback chain handles recovery.
            actual_model = model

            # Call API
            response = requests.post(
                endpoint,
                json={
                    "model": actual_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": augmented_message}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 8000
                },
                headers=headers,
                timeout=120
            )

            response.raise_for_status()
            data = response.json()

            return data["choices"][0]["message"]["content"]

        except requests.exceptions.RequestException as e:
            print(f"Error calling OpenRouter API: {e}")
            return f"Error: Unable to connect to OpenRouter. Check OPENROUTER_API_KEY configuration."
        except Exception as e:
            print(f"Error in generate_rag_response: {e}")
            return f"Error: {str(e)}"

    def generate_rag_response_streaming(
        self,
        query: str,
        context_chunks: List[str],
        domain: str = "general",
        use_reasoning: Optional[bool] = None
    ) -> Dict[str, str]:
        """
        Generate RAG response (non-streaming for now - proxy streaming support TBD).

        Note: Streaming support requires SSE (Server-Sent Events) setup with the proxy.
        For now, returns complete response with reasoning content if available.

        Args:
            query: User's question
            context_chunks: Retrieved legal document chunks
            domain: Legal domain
            use_reasoning: Force reasoning model (None = auto-select)

        Returns:
            Dict with 'reasoning' and 'answer' keys
        """
        try:
            # Auto-select model based on query complexity
            if use_reasoning is None:
                use_reasoning = self.is_complex_legal_query(query)

            model = self.reasoning_model if use_reasoning else self.chat_model

            print(f"RAG with model: {model} via OpenRouter proxy (reasoning={'ON' if use_reasoning else 'OFF'})")

            system_prompt = self.get_system_prompt(domain)

            # Format context chunks
            context_text = "\n\n".join([
                f"[Context {i+1}]: {chunk}"
                for i, chunk in enumerate(context_chunks)
            ])

            # Augmented message with context
            augmented_message = (
                f"Using the following legal context, provide a thorough analysis.\n\n"
                f"LEGAL CONTEXT:\n{context_text}\n\n"
                f"USER QUESTION:\n{query}\n\n"
                f"Please reason through this step-by-step, considering all legal implications."
            )

            # Get dynamic endpoint and headers
            endpoint, headers = self._get_api_config(model)

            # Pass the configured model straight through — no alias remapping.
            # If the provider doesn't recognise it they will 404 and the
            # ai/openrouter_client fallback chain handles recovery.
            actual_model = model

            # Call API
            response = requests.post(
                endpoint,
                json={
                    "model": actual_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": augmented_message}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 12000
                },
                headers=headers,
                timeout=120
            )

            response.raise_for_status()
            data = response.json()

            # Extract answer content
            answer = data["choices"][0]["message"]["content"]

            # TODO: Add streaming support via SSE for real-time reasoning display
            return {
                "reasoning": "",  # Reasoning embedded in answer for now
                "answer": answer
            }

        except requests.exceptions.RequestException as e:
            print(f"Error calling OpenRouter API: {e}")
            return {
                "reasoning": "",
                "answer": f"Error: Unable to connect to OpenRouter. Check OPENROUTER_API_KEY configuration."
            }
        except Exception as e:
            print(f"Error in generate_rag_response_streaming: {e}")
            return {
                "reasoning": "",
                "answer": f"Error: {str(e)}"
            }


# Singleton instance
_ai_service_instance: Optional[AIService] = None


def get_ai_service() -> AIService:
    """Get singleton AI service instance."""
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService()
    return _ai_service_instance

