"""
Integration Test for Kraken API Authentication and Nonce Management
"""
import pytest
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from config import Config
from kraken_client import KrakenClient

# Explicitly load the correct .env file from the app directory
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

@pytest.mark.asyncio
async def test_kraken_authentication():
    """
    Verify that the client can authenticate with Kraken API using the corrected nonce logic.
    This test ensures that:
    1. Keys are loaded correctly.
    2. NonceManager generates valid nanosecond nonces (accepted by Kraken).
    3. Public endpoints (SystemStatus) work.
    4. Private endpoints (Balance) work.
    """
    config = Config()
    
    # Skip if keys are not configured (e.g. in CI without secrets)
    if not config.kraken_api_key or config.kraken_api_key.startswith("YOUR_"):
        pytest.skip("Kraken API keys not configured")
        
    print(f"\nAPI Key loaded: {config.kraken_api_key[:8]}...")

    async with KrakenClient(config) as client:
        # Verify Nonce Manager State
        assert client.nonce_manager is not None
        current_nonce = int(client.nonce_manager.get_nonce())
        assert current_nonce > 1_700_000_000_000_000_000, "Nonce should be in Nanoseconds (>1.7e18)"
        
        # Test 1: Public Endpoint
        status = await client.get_system_status()
        assert status.get('status') in ['online', 'maintenance', 'cancel_only', 'post_only']
        
        # Test 2: Private Endpoint (The real test of auth)
        balance = await client.get_account_balance()
        assert isinstance(balance, dict)
        # We expect at least some keys (e.g. ZUSD, XXLM) or empty dict if brand new, 
        # but the request itself must not raise an 'Invalid Nonce' exception.

