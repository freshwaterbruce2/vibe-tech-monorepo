"""Shared, fail-closed backend startup policy."""

from __future__ import annotations

import ipaddress
import os
from typing import Any

import uvicorn

from vibe_justice.utils.env_validator import validate_environment
from vibe_justice.utils.database import upgrade_database
from vibe_justice.utils.paths import verify_permissions


def _enabled(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def is_production() -> bool:
    return os.getenv("VIBE_JUSTICE_ENV", "development").strip().lower() == "production"


def docs_enabled() -> bool:
    """Expose interactive API documentation only by explicit development opt-in."""
    return not is_production() and _enabled("VIBE_JUSTICE_ENABLE_DOCS")


def resolve_bind_host() -> str:
    """Return a safe bind host, rejecting accidental network exposure."""
    host = os.getenv("VIBE_JUSTICE_BIND_HOST", "127.0.0.1").strip() or "127.0.0.1"
    try:
        is_loopback = ipaddress.ip_address(host).is_loopback
    except ValueError:
        is_loopback = host.lower() == "localhost"

    if not is_loopback and not _enabled("VIBE_JUSTICE_ALLOW_UNSAFE_BIND"):
        raise RuntimeError(
            "Refusing non-loopback backend bind. Set "
            "VIBE_JUSTICE_ALLOW_UNSAFE_BIND=true only for an explicitly approved deployment."
        )
    return host


def validate_startup() -> None:
    """Validate secrets, storage, and binding before opening a listener."""
    if is_production():
        validate_environment(strict=True)
    resolve_bind_host()
    verify_permissions()
    upgrade_database()


def run_server(app: Any, *, reload: bool = False, port: int = 8000) -> None:
    """Run the backend through the single shared startup policy."""
    validate_startup()
    uvicorn.run(app, host=resolve_bind_host(), port=port, reload=reload)
