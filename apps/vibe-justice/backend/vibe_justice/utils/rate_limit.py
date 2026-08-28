"""
Shared rate limiter for Vibe-Justice FastAPI app.

Extracted into its own module so route files can import ``limiter`` without
pulling in the entire ``main`` module (which triggers a circular import and
forces ``# noqa: E402`` suppressions).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Singleton limiter - imported by main.py and every route module.
limiter = Limiter(key_func=get_remote_address)
