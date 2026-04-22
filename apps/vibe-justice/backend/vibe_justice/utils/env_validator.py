"""
Environment variable validation for Vibe-Justice backend (2026 standards)
"""

import os
import sys
import secrets

# Required environment variables (January 2026)
REQUIRED_ENV_VARS = [
    "VIBE_JUSTICE_API_KEY",
    "OPENROUTER_API_KEY"
]

# Optional environment variables with defaults
OPTIONAL_ENV_VARS = {
    "OPENROUTER_API_BASE": "https://openrouter.ai/api/v1",
    "OPENROUTER_SITE_URL": "",
    "OPENROUTER_SITE_NAME": "Vibe-Justice",
    "OPENROUTER_REASONING_MODEL": "deepseek/deepseek-r1-0528:free",
    "OPENROUTER_CHAT_MODEL": "deepseek/deepseek-chat",
    "OPENROUTER_TIMEOUT_SECONDS": "60",
    "OPENROUTER_MAX_RETRIES": "2"
}


def validate_environment():
    """
    Validate required environment variables on startup.

    Required (2026):
    - VIBE_JUSTICE_API_KEY: Internal API authentication
    - OPENROUTER_API_KEY: OpenRouter API access key

    Optional:
    - OPENROUTER_API_BASE: API endpoint (default: https://openrouter.ai/api/v1)
    - OPENROUTER_SITE_URL: For usage tracking
    - OPENROUTER_SITE_NAME: App name for OpenRouter dashboard
    """
    missing = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]

    if missing:
        print("SECURITY ERROR: Missing required environment variables:")
        for var in missing:
            print(f"   - {var}")
        print("\nCreate .env file with:")
        print("# .env (January 2026 - OpenRouter)")
        for var in missing:
            if var == "VIBE_JUSTICE_API_KEY":
                print(f"{var}={secrets.token_urlsafe(32)}")
            elif var == "OPENROUTER_API_KEY":
                print(f"{var}=your_openrouter_api_key_here")
                print("# Get your key at: https://openrouter.ai/keys")
            else:
                print(f"{var}=your_key_here")
        print("\n# Optional (recommended):")
        print("OPENROUTER_SITE_URL=https://your-site.com")
        print("OPENROUTER_SITE_NAME=Vibe-Justice")
        sys.exit(1)

    # Validate API key strength
    api_key = os.getenv("VIBE_JUSTICE_API_KEY")
    if len(api_key) < 32:
        print("WARNING: API key should be at least 32 characters")
        print(f"   Generate secure key: {secrets.token_urlsafe(32)}")

    # Validate OpenRouter API key format
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_key.startswith("sk-or-"):
        print("WARNING: OPENROUTER_API_KEY should start with 'sk-or-'")
        print("   Get your key at: https://openrouter.ai/keys")