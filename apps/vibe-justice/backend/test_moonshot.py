import requests

headers = {
    'Authorization': 'Bearer sk-EUSRfH2KWBZpBib3pEifGtIYvatYiABaTOk144Y9UYlv5zPb',
    'Content-Type': 'application/json'
}
data = {
    'model': 'moonshot-v1-32k',
    'messages': [{'role': 'user', 'content': 'Hello from Vibe-Justice!'}]
}
response = requests.post('https://api.moonshot.ai/v1/chat/completions', headers=headers, json=data)
print(f"Status: {response.status_code}")
print(response.text)
