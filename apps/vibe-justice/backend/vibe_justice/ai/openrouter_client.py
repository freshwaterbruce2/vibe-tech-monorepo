"""
OpenRouter AI Client for Vibe-Justice Legal Research Assistant
Uses OpenRouter API for multi-model AI access (2026 standards)
"""

import os
import random
import time
import requests

from dotenv import load_dotenv

load_dotenv()


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

        # Model selection (March 2026)
        # Gemini 3.1 Pro for complex legal reasoning (via OpenRouter)
        self.reasoning_model = os.getenv(
            "OPENROUTER_REASONING_MODEL",
            "google/gemini-3.1-pro-preview"
        )
        # Kimi K2.5 for fast chat queries (via OpenRouter)
        self.chat_model = os.getenv(
            "OPENROUTER_CHAT_MODEL",
            "moonshotai/kimi-k2.5"
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

        Args:
            jurisdiction: Legal jurisdiction (e.g., "South Carolina")
            goals: Research objectives
            max_retries: Maximum retry attempts

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

        attempt = 0
        backoff = 2  # Start with 2 seconds

        while attempt < max_retries:
            try:
                response = requests.post(
                    self.chat_endpoint,
                    json={
                        "model": self.reasoning_model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a professional paralegal assistant specializing in South Carolina and Federal law.",
                            },
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.7,
                        "max_tokens": 12000
                    },
                    headers=self._get_headers(),
                    timeout=self.timeout
                )

                response.raise_for_status()
                data = response.json()
                analysis = data["choices"][0]["message"]["content"]
                return analysis

            except requests.exceptions.RequestException as e:
                attempt += 1
                if attempt >= max_retries:
                    return f"AI Error after {max_retries} attempts: {str(e)}. Check OPENROUTER_API_KEY configuration."

                print(
                    f"[AI RETRY] Attempt {attempt} failed: {e}. Retrying in {backoff}s..."
                )
                time.sleep(backoff)

                # Exponential backoff with jitter
                backoff = (backoff * 2) + random.uniform(0, 1)

            except Exception as e:
                return f"AI Error: {str(e)}"

        return "AI Error: Maximum retries exceeded."
