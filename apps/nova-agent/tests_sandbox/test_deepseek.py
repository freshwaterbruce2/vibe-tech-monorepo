# Use a pipeline as a high-level helper
from transformers import pipeline

try:
    pipe = pipeline("text-generation", model="deepseek-ai/DeepSeek-V3.2-Exp", trust_remote_code=True)
    messages = [
        {"role": "user", "content": "Who are you?"},
    ]
    print(pipe(messages))
except Exception as e:
    print(f"Error: {e}")
