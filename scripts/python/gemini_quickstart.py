"""
Quick Start Guide for Google Gemini API
Simple examples to get you started
"""
from google import genai
import time

# Your API key
API_KEY = "AIzaSyC7C8ygLq8DR77XXDOJV45_DnjLJVfnGlU"

# Create client
client = genai.Client(api_key=API_KEY)

# Helper function to avoid rate limits
def wait_for_rate_limit():
    """Wait 5 seconds between requests to avoid hitting rate limits"""
    time.sleep(5)

# =============================================================================
# Example 1: Simple Text Generation
# =============================================================================
print("Example 1: Simple Question")
print("-" * 60)

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="What is Python?"
)

print(response.text)

wait_for_rate_limit()  # Avoid rate limit

# =============================================================================
# Example 2: Code Generation
# =============================================================================
print("\n\nExample 2: Code Generation")
print("-" * 60)

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Write a Python function to check if a number is prime"
)

print(response.text)

wait_for_rate_limit()  # Avoid rate limit

# =============================================================================
# Example 3: Multi-turn Conversation
# =============================================================================
print("\n\nExample 3: Conversation")
print("-" * 60)

# First message
response1 = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="My favorite color is blue. Remember that."
)
print(f"AI: {response1.text}")

wait_for_rate_limit()  # Avoid rate limit

# Follow-up (Note: Gemini is stateless, so we need to provide context)
response2 = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Based on our conversation, what's my favorite color?"
)
print(f"AI: {response2.text}")

# =============================================================================
# Example 4: Available Models
# =============================================================================
print("\n\nBest Models to Use:")
print("-" * 60)
print("gemini-2.5-flash       - Fast, good for most tasks")
print("gemini-2.5-pro         - Better quality, slower")
print("gemini-3-flash-preview - Latest experimental fast model")
print("gemini-3-pro-preview   - Latest experimental high-quality model")
