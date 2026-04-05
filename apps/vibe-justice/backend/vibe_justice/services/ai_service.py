"""
AI Service for Vibe-Justice Legal Research Assistant
Multi-provider AI: Kimi K2.5 (chat) + Gemini 3.1 Pro (reasoning)
"""

import os
import requests
from typing import Optional, List, Dict, Any


class AIService:
    """
    Multi-provider AI service for legal research.

    Models (March 2026):
    - Kimi K2.5 via Moonshot API: Fast chat for simple queries ($0.60/$2.50 per 1M tokens)
    - Gemini 3.1 Pro via Google API: Deep reasoning for complex legal analysis
    - OpenRouter fallback if neither direct API key is set
    """

    def __init__(self):
        # API Keys
        self.moonshot_key = os.getenv("MOONSHOT_API_KEY")
        self.google_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")

        # API Base URLs
        self.moonshot_base = os.getenv("MOONSHOT_API_BASE", "https://api.moonshot.ai/v1")
        self.gemini_base = os.getenv("GEMINI_API_BASE", "https://generativelanguage.googleapis.com/v1beta")
        self.openrouter_base = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")

        # Optional: Usage tracking (OpenRouter)
        self.site_url = os.getenv("OPENROUTER_SITE_URL", "")
        self.site_name = os.getenv("OPENROUTER_SITE_NAME", "Vibe-Justice")

        # Model selection — Kimi K2.5 for chat, Gemini 3.1 Pro for reasoning
        self.reasoning_model = os.getenv(
            "REASONING_MODEL",
            "gemini-3.1-pro-preview" if self.google_key else "deepseek/deepseek-r1-0528:free"
        )
        self.chat_model = os.getenv(
            "CHAT_MODEL",
            "kimi-k2.5" if self.moonshot_key else "deepseek/deepseek-chat"
        )

    def _is_gemini(self, model: str) -> bool:
        return "gemini" in model.lower()

    def _is_moonshot(self, model: str) -> bool:
        return "kimi" in model.lower() or "moonshot" in model.lower()

    def _normalize_moonshot_model(self, model: str) -> str:
        """Map OpenRouter-style Kimi aliases to Moonshot's native model IDs."""
        normalized = model.strip().lower()
        model_aliases = {
            "kimi-k2.5": "moonshot-v1-32k",
            "moonshotai/kimi-k2.5": "moonshot-v1-32k",
        }
        return model_aliases.get(normalized, model)

    def _call_model(
        self,
        model: str,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.3,
        max_tokens: int = 4000,
        timeout: int = 60,
    ) -> str:
        """
        Unified model caller that routes to the correct provider API.
        Handles Gemini (Google), Kimi (Moonshot), and OpenRouter formats.
        """
        if self._is_gemini(model):
            return self._call_gemini(model, system_prompt, user_message, temperature, max_tokens, timeout)
        elif self._is_moonshot(model):
            model = self._normalize_moonshot_model(model)
            return self._call_openai_compat(
                endpoint=f"{self.moonshot_base}/chat/completions",
                headers={"Authorization": f"Bearer {self.moonshot_key}", "Content-Type": "application/json"},
                model=model,
                system_prompt=system_prompt,
                user_message=user_message,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )
        else:
            # OpenRouter fallback
            headers = {"Authorization": f"Bearer {self.openrouter_key}", "Content-Type": "application/json"}
            if self.site_url:
                headers["HTTP-Referer"] = self.site_url
            if self.site_name:
                headers["X-Title"] = self.site_name
            return self._call_openai_compat(
                endpoint=f"{self.openrouter_base}/chat/completions",
                headers=headers,
                model=model,
                system_prompt=system_prompt,
                user_message=user_message,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )

    def _call_openai_compat(
        self, endpoint: str, headers: dict, model: str,
        system_prompt: str, user_message: str,
        temperature: float, max_tokens: int, timeout: int,
    ) -> str:
        """Call an OpenAI-compatible API (Moonshot, OpenRouter, etc.)."""
        response = requests.post(
            endpoint,
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            headers=headers,
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    def _call_gemini(
        self, model: str, system_prompt: str, user_message: str,
        temperature: float, max_tokens: int, timeout: int,
    ) -> str:
        """Call Google Gemini API (different request/response format)."""
        url = f"{self.gemini_base}/models/{model}:generateContent"
        response = requests.post(
            url,
            params={"key": self.google_key},
            json={
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"role": "user", "parts": [{"text": user_message}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                },
            },
            headers={"Content-Type": "application/json"},
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]

    def _get_headers(self) -> Dict[str, str]:
        """Get default API headers (Legacy compat)."""
        if self._is_moonshot(self.chat_model):
            return {"Authorization": f"Bearer {self.moonshot_key}", "Content-Type": "application/json"}
        headers = {"Authorization": f"Bearer {self.openrouter_key}", "Content-Type": "application/json"}
        if self.site_url:
            headers["HTTP-Referer"] = self.site_url
        if self.site_name:
            headers["X-Title"] = self.site_name
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
        Generate AI response with automatic model selection.

        Args:
            message: User's question or prompt
            domain: Legal domain for system prompt
            use_reasoning: Force reasoning model (None = auto-select)

        Returns:
            AI response text
        """
        try:
            if use_reasoning is None:
                use_reasoning = self.is_complex_legal_query(message)

            model = self.reasoning_model if use_reasoning else self.chat_model
            provider = "Gemini" if self._is_gemini(model) else "Kimi" if self._is_moonshot(model) else "OpenRouter"
            print(f"Using model: {model} via {provider} (reasoning={'ON' if use_reasoning else 'OFF'})")

            return self._call_model(
                model=model,
                system_prompt=self.get_system_prompt(domain),
                user_message=message,
                temperature=0.3,
                max_tokens=4000,
                timeout=60,
            )

        except requests.exceptions.RequestException as e:
            print(f"Error calling AI API: {e}")
            return f"Error: Unable to connect to AI service. Check API key configuration."
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
        Generate AI response with reasoning/answer split.

        Args:
            message: User's question or prompt
            domain: Legal domain for system prompt
            use_reasoning: Force reasoning model (None = auto-select)

        Returns:
            Dict with 'reasoning' and 'answer' keys
        """
        try:
            if use_reasoning is None:
                use_reasoning = self.is_complex_legal_query(message)

            model = self.reasoning_model if use_reasoning else self.chat_model
            provider = "Gemini" if self._is_gemini(model) else "Kimi" if self._is_moonshot(model) else "OpenRouter"
            print(f"Using model: {model} via {provider} (reasoning={'ON' if use_reasoning else 'OFF'})")

            answer = self._call_model(
                model=model,
                system_prompt=self.get_system_prompt(domain),
                user_message=message,
                temperature=0.7,
                max_tokens=12000,
                timeout=120,
            )

            return {"reasoning": "", "answer": answer}

        except requests.exceptions.RequestException as e:
            print(f"Error calling AI API: {e}")
            return {"reasoning": "", "answer": f"Error: Unable to connect to AI service. Check API key configuration."}
        except Exception as e:
            print(f"Error in generate_response_streaming: {e}")
            return {"reasoning": "", "answer": f"Error: {str(e)}"}

    def generate_rag_response(
        self,
        query: str,
        context_chunks: List[str],
        domain: str = "general",
        use_reasoning: Optional[bool] = None
    ) -> str:
        """
        Generate RAG response with legal context.

        Args:
            query: User's question
            context_chunks: Retrieved legal document chunks
            domain: Legal domain
            use_reasoning: Force reasoning model (None = auto-select)

        Returns:
            AI response incorporating context
        """
        try:
            if use_reasoning is None:
                use_reasoning = self.is_complex_legal_query(query)

            model = self.reasoning_model if use_reasoning else self.chat_model

            context_text = "\n\n".join([
                f"[Context {i+1}]: {chunk}"
                for i, chunk in enumerate(context_chunks)
            ])

            augmented_message = (
                f"Using the following legal context, provide a thorough analysis.\n\n"
                f"LEGAL CONTEXT:\n{context_text}\n\n"
                f"USER QUESTION:\n{query}\n\n"
                f"Please reason through this step-by-step, considering all legal implications."
            )

            return self._call_model(
                model=model,
                system_prompt=self.get_system_prompt(domain),
                user_message=augmented_message,
                temperature=0.3,
                max_tokens=8000,
                timeout=120,
            )

        except requests.exceptions.RequestException as e:
            print(f"Error calling AI API: {e}")
            return f"Error: Unable to connect to AI service. Check API key configuration."
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
        Generate RAG response with reasoning/answer split.

        Args:
            query: User's question
            context_chunks: Retrieved legal document chunks
            domain: Legal domain
            use_reasoning: Force reasoning model (None = auto-select)

        Returns:
            Dict with 'reasoning' and 'answer' keys
        """
        try:
            if use_reasoning is None:
                use_reasoning = self.is_complex_legal_query(query)

            model = self.reasoning_model if use_reasoning else self.chat_model
            provider = "Gemini" if self._is_gemini(model) else "Kimi" if self._is_moonshot(model) else "OpenRouter"
            print(f"RAG with model: {model} via {provider} (reasoning={'ON' if use_reasoning else 'OFF'})")

            context_text = "\n\n".join([
                f"[Context {i+1}]: {chunk}"
                for i, chunk in enumerate(context_chunks)
            ])

            augmented_message = (
                f"Using the following legal context, provide a thorough analysis.\n\n"
                f"LEGAL CONTEXT:\n{context_text}\n\n"
                f"USER QUESTION:\n{query}\n\n"
                f"Please reason through this step-by-step, considering all legal implications."
            )

            answer = self._call_model(
                model=model,
                system_prompt=self.get_system_prompt(domain),
                user_message=augmented_message,
                temperature=0.7,
                max_tokens=12000,
                timeout=120,
            )

            return {"reasoning": "", "answer": answer}

        except requests.exceptions.RequestException as e:
            print(f"Error calling AI API: {e}")
            return {"reasoning": "", "answer": f"Error: Unable to connect to AI service. Check API key configuration."}
        except Exception as e:
            print(f"Error in generate_rag_response_streaming: {e}")
            return {"reasoning": "", "answer": f"Error: {str(e)}"}


# Singleton instance
_ai_service_instance: Optional[AIService] = None


def get_ai_service() -> AIService:
    """Get singleton AI service instance."""
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService()
    return _ai_service_instance

