import os
import random
import time
import requests

from dotenv import load_dotenv

load_dotenv()


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
        Executes a reasoning-heavy legal research prompt via OpenRouter proxy with exponential backoff.
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
                    self.proxy_endpoint,
                    json={
                        "model": self.model,
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
                    headers={"Content-Type": "application/json"},
                    timeout=self.timeout
                )

                response.raise_for_status()
                data = response.json()
                analysis = data["choices"][0]["message"]["content"]
                return analysis

            except requests.exceptions.RequestException as e:
                attempt += 1
                if attempt >= max_retries:
                    return f"AI Error after {max_retries} attempts: {str(e)}. Is the OpenRouter proxy running on localhost:3001?"

                print(
                    f"[AI RETRY] Attempt {attempt} failed: {e}. Retrying in {backoff}s..."
                )
                time.sleep(backoff)

                # Exponential backoff with jitter
                backoff = (backoff * 2) + random.uniform(0, 1)

            except Exception as e:
                return f"AI Error: {str(e)}"

        return "AI Error: Maximum retries exceeded."
