import os
import secrets
from typing import Optional

from fastapi import Header, HTTPException, status


def require_api_key(
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> str:
    """Verify API key with timing-attack protection and fail-closed logic"""
    expected = os.getenv("VIBE_JUSTICE_API_KEY")

    # CRITICAL: Fail-closed - No configuration = No access
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server authentication misconfigured (API key not set)",
        )

    # Validate client provided a key
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: X-API-Key header is missing",
        )

    # SECURE: Timing-attack resistant comparison
    if not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access denied: Invalid API key",
        )

    return x_api_key
