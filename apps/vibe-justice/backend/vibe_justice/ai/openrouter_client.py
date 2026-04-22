"""
OpenRouter AI Client for Vibe-Justice Legal Research Assistant
Uses OpenRouter API for multi-model AI access (2026 standards)
"""

import os
import random
import time
from typing import List

import requests

from dotenv import load_dotenv

load_dotenv()


def _build_fallback_chain(primary_env: str, default_primary: str) -> List[str]:
    """Build an ordered model fallback chain.

    Priority 1: ``<primary_env>`` (e.g. PRIMARY_CHAT_MODEL) if set.
    Priority 2: the supplied default primary.
    Always followed by a hardcoded rescue chain of known-good DeepSeek models.
    Duplicates are removed while preserving order.
    """
    chain = [
        os.getenv(primary_env, default_primary),
        "deepseek/deepseek-chat-v3",
        "deepseek/deepseek-r1",
    ]
    seen: set[str] = set()
    ordered: List[str] = []
    for model in chain:
        if model and model not in seen:
            seen.add(model)
            ordered.append(model)
    return ordered


class OpenRouterClient:
    """
    OpenRouter API client for legal AI assistance.

    Features (January 2026):
    - Direct OpenRouter API integration (no proxy needed)
    - Multi-model support via unified endpoint
    - Automatic model selection based on query complexity
    - Exponential backoff retry logic
    """

    def __init__(self):
        # OpenRouter API Configuration (2026 standards)
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.base_url = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")
        self.chat_endpoint = f"{self.base_url}/chat/completions"

        # Optional: Usage tracking (recommended by OpenRouter)
        self.site_url = os.getenv("OPENROUTER_SITE_URL", "")
        self.site_name = os.getenv("OPENROUTER_SITE_NAME", "Vibe-Justice")

        # Timeout configuration
        self.timeout = float(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "60"))
        self.max_retries = int(os.getenv("OPENROUTER_MAX_RETRIES", "2"))

        # Model selection (best models for legal work as of Jan 2026)
        # FREE reasoning model for complex legal analysis
        self.reasoning_model = os.getenv(
            "OPENROUTER_REASONING_MODEL",
            "deepseek/deepseek-r1-0528:free"
        )
        # Ultra-cheap chat model for simple queries
        self.chat_model = os.getenv(
            "OPENROUTER_CHAT_MODEL",
            "deepseek/deepseek-chat"
        )

    def _get_headers(self) -> dict:
        """Get OpenRouter API headers with optional tracking."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Add optional tracking headers (recommended by OpenRouter)
        if self.site_url:
            headers["HTTP-Referer"] = self.site_url
        if self.site_name:
            headers["X-Title"] = self.site_name

        return headers

    def perform_legal_research(self, jurisdiction: str, goals: str, max_retries: int = 5) -> str:
        """
        Execute reasoning-heavy legal research using OpenRouter with exponential backoff.

        Iterates a model fallback chain: if the primary model returns 404 or
        429, the next model in the chain is tried. Transient errors still
        retry on the current model up to ``max_retries``.

        Args:
            jurisdiction: Legal jurisdiction (e.g., "South Carolina")
            goals: Research objectives
            max_retries: Maximum retry attempts per model

        Returns:
            Legal research analysis in Markdown format
        """
        prompt = f"""
        ROLE: Senior Legal Research Assistant.
        JURISDICTION: {jurisdiction}
        TASK: Conduct an initial legal analysis for the following goals:
        {goals}

        REQUIREMENTS:
        1. Identify key statutes or codes relevant to this jurisdiction.
        2. Outline potential legal hurdles or procedural requirements.
        3. Suggest a 3-step action plan for the next phase of research.
        4. Format the output in clean Markdown.
        """

        fallback_chain = _build_fallback_chain(
            "PRIMARY_REASONING_MODEL", self.reasoning_model
        )
        last_error: str = "no attempts made"

        for model in fallback_chain:
            attempt = 0
            backoff = 2  # Start with 2 seconds
            while attempt < max_retries:
                try:
                    response = requests.post(
                        self.chat_endpoint,
                        json={
                            "model": model,
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are a professional paralegal assistant specializing in South Carolina and Federal law.",
                                },
                                {"role": "user", "content": prompt},
                            ],
                            "temperature": 0.7,
                            "max_tokens": 12000,
                        },
                        headers=self._get_headers(),
                        timeout=self.timeout,
                    )

                    # On a 404 (unknown model) or 429 (quota), advance to the
                    # next model in the fallback chain without retrying.
                    if response.status_code in (404, 429):
                        last_error = (
                            f"model '{model}' returned HTTP {response.status_code}"
                        )
                        print(f"[AI FALLBACK] {last_error}; trying next model")
                        break

                    response.raise_for_status()
                    data = response.json()
                    return data["choices"][0]["message"]["content"]

                except requests.exceptions.RequestException as e:
                    attempt += 1
                    last_error = str(e)
                    if attempt >= max_retries:
                        break
                    print(
                        f"[AI RETRY] Attempt {attempt} on {model} failed: {e}. "
                        f"Retrying in {backoff}s..."
                    )
                    time.sleep(backoff)
                    backoff = (backoff * 2) + random.uniform(0, 1)

                except Exception as e:
                    # Non-HTTP errors (JSON decode, etc.) — abort all fallbacks.
                    return f"AI Error: {str(e)}"

        return (
            f"AI Error after exhausting fallback chain ({', '.join(fallback_chain)}): "
            f"{last_error}. Check OPENROUTER_API_KEY configuration."
        )
