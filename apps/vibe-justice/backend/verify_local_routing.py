import asyncio
import sys
from unittest.mock import AsyncMock, MagicMock

# 1. Mock the dependencies BEFORE importing the module to be tested
mock_ai_service = MagicMock()
# Use MagicMock for synchronous methods
mock_ai_service.generate_response_streaming = MagicMock(
    return_value={"answer": "Cloud", "reasoning": "Cloud", "model": "deepseek"}
)
mock_ai_service.generate_local_response_streaming = MagicMock(
    return_value={"answer": "Local", "reasoning": "None", "model": "ollama"}
)
mock_ai_service.is_complex_legal_query = MagicMock(return_value=False)

# Patch the get_ai_service to return our mock
import vibe_justice.api.chat

vibe_justice.api.chat.ai_service = mock_ai_service

from vibe_justice.api.chat import ChatRequest, simple_chat


async def verify_routing():
    print("Locked & Loaded: Verifying Air Gap Routing...")

    # ---------------------------------------------------------
    # Test 1: Cloud Request (Default)
    # ---------------------------------------------------------
    print("\n[Test 1] Cloud Request ('cloud')")
    req_cloud = ChatRequest(
        message="Test Cloud", domain="general", use_reasoning=True, model_type="cloud"
    )
    await simple_chat(req_cloud)

    # Verify cloud method called
    if mock_ai_service.generate_response_streaming.called:
        print("✅ SUCCESS: Cloud method called for cloud request.")
    else:
        print("❌ FAILURE: Cloud method NOT called for cloud request.")

    # Verify local method NOT called
    if not mock_ai_service.generate_local_response_streaming.called:
        print("✅ SUCCESS: Local method REJECTED (Air Gap Active).")
    else:
        print("❌ FAILURE: Local method LEAKED into cloud request.")

    # Reset mocks
    mock_ai_service.generate_response_streaming.reset_mock()
    mock_ai_service.generate_local_response_streaming.reset_mock()

    # ---------------------------------------------------------
    # Test 2: Local Request (Secure)
    # ---------------------------------------------------------
    print("\n[Test 2] Local Request ('local')")
    req_local = ChatRequest(message="Test Local", domain="general", model_type="local")
    resp = await simple_chat(req_local)

    # Verify local method called
    if mock_ai_service.generate_local_response_streaming.called:
        print("✅ SUCCESS: Local method called for secure request.")
    else:
        print("❌ FAILURE: Local method NOT called for secure request.")

    # Verify cloud method NOT called (CRITICAL)
    if not mock_ai_service.generate_response_streaming.called:
        print("✅ SUCCESS: Cloud method REJECTED (Air Gap Confirmed).")
    else:
        print("❌ FAILURE: Cloud method LEAKED into secure request!")

    print("\nVerification Complete.")


if __name__ == "__main__":
    asyncio.run(verify_routing())
