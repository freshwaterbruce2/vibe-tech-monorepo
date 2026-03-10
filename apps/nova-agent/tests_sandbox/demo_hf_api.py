import os
from huggingface_hub import InferenceClient

# 1. Get your token from https://huggingface.co/settings/tokens
# Set it in your terminal: $env:HF_TOKEN="hf_..."
token = os.environ.get("HF_TOKEN")

if not token:
    print("⚠️  HF_TOKEN environment variable not found.")
    print("   To use this script, run: $env:HF_TOKEN='your_hf_token_here'")
    print("   Then run the script again.")
    exit()

# 2. Initialize the client
client = InferenceClient(api_key=token)

# 3. Choose a model supported by the Serverless Inference API
# DeepSeek-V3 is huge, so it might require a Dedicated Endpoint,
# but smaller models like Llama-3-8B run instantly on the free tier.
model_id = "meta-llama/Meta-Llama-3-8B-Instruct"

print(f"Connecting to Hugging Face API ({model_id})...")

messages = [
    {"role": "user", "content": "Explain quantum computing in one sentence."}
]

try:
    completion = client.chat.completions.create(
        model=model_id, 
        messages=messages, 
        max_tokens=100
    )
    print("\nResponse:")
    print(completion.choices[0].message.content)

except Exception as e:
    print(f"\nError: {e}")
    print("\nNote: Large models like DeepSeek-V3 (671B) often require a PRO subscription")
    print("or a Dedicated Inference Endpoint due to their size.")
