"""Ad-hoc Moonshot/Kimi connectivity probe.

Resolves the API key from the environment only — never hardcode the secret.
Matches the conventions in vibe_justice/services/ai_service.py
(MOONSHOT_API_KEY / MOONSHOT_API_BASE).
"""

import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('MOONSHOT_API_KEY')
api_base = os.getenv('MOONSHOT_API_BASE', 'https://api.moonshot.ai/v1')

if not api_key:
    print('CRITICAL: MOONSHOT_API_KEY is not set in the environment.', file=sys.stderr)
    sys.exit(1)

print(f'Loaded Moonshot API key: sk-...{api_key[-4:]}')

headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json',
}
data = {
    'model': 'moonshot-v1-32k',
    'messages': [{'role': 'user', 'content': 'Hello from Vibe-Justice!'}],
}
response = requests.post(f'{api_base}/chat/completions', headers=headers, json=data)
print(f'Status: {response.status_code}')
print(response.text)
