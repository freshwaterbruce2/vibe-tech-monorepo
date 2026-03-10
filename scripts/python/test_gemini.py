"""
Test script for Google Gemini API
"""
from google import genai
import os

# Get API key from environment or paste yours here
API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyC7C8ygLq8DR77XXDOJV45_DnjLJVfnGlU")

# Create client
client = genai.Client(api_key=API_KEY)

# Test 1: Simple text generation
print("=" * 60)
print("Test 1: Simple Text Generation")
print("=" * 60)

response = client.models.generate_content(
    model="gemini-2.5-flash",  # Latest stable model
    contents="Explain how AI works in a few words"
)

print(f"\nPrompt: Explain how AI works in a few words")
print(f"\nResponse:\n{response.text}")

# Test 2: List available models
print("\n" + "=" * 60)
print("Test 2: Available Models")
print("=" * 60)

try:
    models = client.models.list()
    print("\nAvailable Gemini models:")
    for model in models:
        if hasattr(model, 'name'):
            print(f"  - {model.name}")
except Exception as e:
    print(f"Could not list models: {e}")

# Test 3: Structured output
print("\n" + "=" * 60)
print("Test 3: Structured Output")
print("=" * 60)

response = client.models.generate_content(
    model="gemini-2.5-flash",  # Latest stable model
    contents="List 3 programming languages and their main uses"
)

print(f"\nPrompt: List 3 programming languages and their main uses")
print(f"\nResponse:\n{response.text}")

print("\n" + "=" * 60)
print("All tests completed successfully!")
print("=" * 60)
