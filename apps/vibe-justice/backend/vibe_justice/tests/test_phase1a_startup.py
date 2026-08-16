"""Focused Phase 1A startup, route-auth, and containment tests."""

import os
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.routing import APIRoute

from main import app
from vibe_justice.services.file_service import FileService
from vibe_justice.utils.auth import require_api_key
from vibe_justice.utils.startup import resolve_bind_host, validate_startup


def test_bind_defaults_to_loopback():
    with patch.dict(os.environ, {}, clear=True):
        assert resolve_bind_host() == "127.0.0.1"


def test_non_loopback_bind_requires_explicit_opt_in():
    with patch.dict(
        os.environ,
        {"VIBE_JUSTICE_BIND_HOST": "0.0.0.0"},
        clear=True,
    ):
        with pytest.raises(RuntimeError, match="Refusing non-loopback"):
            resolve_bind_host()


def test_production_startup_fails_closed_without_secrets():
    with patch.dict(os.environ, {"VIBE_JUSTICE_ENV": "production"}, clear=True):
        with pytest.raises(SystemExit):
            validate_startup()


def test_every_non_health_api_route_requires_auth():
    unauthenticated = []
    for route in app.routes:
        if not isinstance(route, APIRoute) or route.path == "/api/health":
            continue
        dependency_calls = {dependency.call for dependency in route.dependant.dependencies}
        if require_api_key not in dependency_calls:
            unauthenticated.append(route.path)
    assert unauthenticated == []


def test_file_service_rejects_traversal(tmp_path: Path):
    service = FileService(tmp_path / "uploads")
    with pytest.raises(ValueError, match="Invalid filename"):
        service.delete_file("../outside.txt")
