import os
from dotenv import load_dotenv
import requests

load_dotenv()
api_key = os.getenv('OPENROUTER_API_KEY')
print(f'API KEY loaded: {api_key[:5]}...' if api_key else 'NO API KEY')

headers = {
    'Authorization': f'Bearer {api_key}',
    'HTTP-Referer': 'http://localhost:8000',
    'X-Title': 'Vibe-Justice Test'
}
data = {
    'model': 'deepseek/deepseek-chat',
    'messages': [{'role': 'user', 'content': 'hello'}]
}
try:
    response = requests.post('https://openrouter.ai/api/v1/chat/completions', headers=headers, json=data)
    print(f'Status: {response.status_code}')
    print(response.text)
except Exception as e:
    print(f'Exception: {e}')
