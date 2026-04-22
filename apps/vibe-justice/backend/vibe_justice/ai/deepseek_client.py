import os
import random
import time
from typing import List

import requests

from dotenv import load_dotenv

load_dotenv()


def _build_fallback_chain(default_primary: str) -> List[str]:
    """Build the DeepSeek model fallback chain (primary, stable, reasoning)."""
    chain = [
        os.getenv("PRIMARY_CHAT_MODEL", default_primary),
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


class DeepSeekAssistant:
    def __init__(self):
        # Using OpenRouter proxy for cost-effective DeepSeek access
        proxy_url = os.getenv("OPENROUTER_PROXY_URL", "http://localhost:3001")
        self.proxy_endpoint = f"{proxy_url}/api/openrouter/chat"

        # Timeout configuration
        self.timeout = float(os.getenv("DEEPSEEK_TIMEOUT_SECONDS", "60"))
        self.max_retries = int(os.getenv("DEEPSEEK_MAX_RETRIES", "2"))

        # Use DeepSeek R1 (FREE) via OpenRouter for complex legal logic
        self.model = "deepseek/deepseek-r1-0528:free"

    def perform_legal_research(self, jurisdiction, goals, max_retries=5):
        """
        Executes a reasoning-heavy legal research prompt via OpenRouter proxy
        with exponential backoff and a model fallback chain. On HTTP 404
        (unknown model) or 429 (quota/rate limit), advance to the next
        model in the chain without retrying.
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

        fallback_chain = _build_fallback_chain(self.model)
        last_error: str = "no attempts made"

        for model in fallback_chain:
            attempt = 0
            backoff = 2  # Start with 2 seconds
            while attempt < max_retries:
                try:
                    response = requests.post(
                        self.proxy_endpoint,
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
                        headers={"Content-Type": "application/json"},
                        timeout=self.timeout,
                    )

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
                    return f"AI Error: {str(e)}"

        return (
            f"AI Error after exhausting fallback chain ({', '.join(fallback_chain)}): "
            f"{last_error}. Is the OpenRouter proxy running on localhost:3001?"
        )
