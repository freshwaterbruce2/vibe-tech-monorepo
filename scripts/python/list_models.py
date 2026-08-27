import os

from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

print("Available Gemini Models:")
print("=" * 60)

try:
    for model in client.models.list():
        print(f"- {model.name}")
        if hasattr(model, 'display_name'):
            print(f"  Display: {model.display_name}")
        if hasattr(model, 'supported_generation_methods'):
            print(f"  Methods: {model.supported_generation_methods}")
        print()
except Exception as e:
    print(f"Error: {e}")
