"""
Security hardening regression tests.

Each test proves one of the 5 CRITICAL fixes applied on
branch `restore/vibe-justice-source-20260319`:

    1. Command injection in export_engine.open_in_explorer
    2. slowapi rate limiter wired into the FastAPI app
    3. require_api_key gates on LLM / destructive endpoints
    4. CORS hardening — no wildcard methods/headers, credentials off
    5. SSRF guard on /api/policy/download

NOTE: pytest.ini sets testpaths=vibe_justice/tests, so this file is NOT
auto-discovered by the default test run. Run explicitly:
    pytest backend/tests/test_security_hardening.py
"""

from pathlib import Path

import pytest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from main import app
from vibe_justice.api.search import _is_url_safe

pytestmark = pytest.mark.security


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def api_headers():
    import os
    key = os.getenv("VIBE_JUSTICE_API_KEY", "test-api-key-" + "x" * 32)
    return {"X-API-Key": key}


# ---------------------------------------------------------------------------
# 1. Command injection
# ---------------------------------------------------------------------------

def test_export_uses_list_args_not_shell_string():
    """open_in_explorer must call subprocess.Popen with a list, never an f-string."""
    src_path = (
        Path(__file__).resolve().parents[1]
        / "vibe_justice"
        / "utils"
        / "export_engine.py"
    )
    source = src_path.read_text(encoding="utf-8")

    assert 'Popen(["explorer"' in source, "Popen must use list-form args"
    # Old vulnerable pattern: subprocess.Popen(f'explorer /select,"{clean_path}"')
    assert "Popen(f'" not in source, "f-string Popen is a command injection vector"
    assert 'Popen(f"' not in source, "f-string Popen is a command injection vector"


# ---------------------------------------------------------------------------
# 2. Rate limiter wired
# ---------------------------------------------------------------------------

def test_rate_limiter_attached_to_app():
    """slowapi Limiter must be attached to app.state and a handler registered."""
    assert hasattr(app.state, "limiter"), "app.state.limiter not wired in main.py"
    from slowapi.errors import RateLimitExceeded
    assert RateLimitExceeded in app.exception_handlers, (
        "RateLimitExceeded handler not registered"
    )


# ---------------------------------------------------------------------------
# 3. Auth gates on LLM / destructive endpoints
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "path",
    [
        "/api/chat/simple",
        "/api/chat/rag",
        "/api/analysis/run",
        "/api/drafting/generate",
        "/api/document-analysis/upload",
        "/api/batch/upload",
        "/api/policy/search",
        "/api/policy/download",
    ],
)
def test_llm_endpoints_require_api_key(client, path):
    """POST without X-API-Key must be rejected before reaching the handler."""
    resp = client.post(path, json={})
    # 401 = no key / bad key; 403 = forbidden; 500 = fail-closed when server API key unset.
    assert resp.status_code in (401, 403, 500), (
        f"POST {path} leaked without auth (got {resp.status_code})"
    )


# ---------------------------------------------------------------------------
# 4. CORS hardening
# ---------------------------------------------------------------------------

def _get_cors_options():
    for mw in app.user_middleware:
        if mw.cls is CORSMiddleware:
            return mw.kwargs
    raise AssertionError("CORSMiddleware not installed")


def test_cors_allowed_methods_explicit():
    opts = _get_cors_options()
    methods = opts.get("allow_methods", [])  # type: ignore[attr-defined]
    assert "*" not in methods, "CORS methods must be an explicit allowlist (no wildcard)"
    for expected in ("GET", "POST", "OPTIONS"):
        assert expected in methods, f"CORS missing {expected}"


def test_cors_allowed_headers_explicit():
    opts = _get_cors_options()
    headers = opts.get("allow_headers", [])  # type: ignore[attr-defined]
    assert "*" not in headers, "CORS headers must be an explicit allowlist (no wildcard)"
    assert "X-API-Key" in headers, "CORS must allow X-API-Key so auth works cross-origin"


def test_cors_credentials_disabled_when_no_cookies():
    """No cookie auth in this app → allow_credentials must be False."""
    opts = _get_cors_options()
    assert opts.get("allow_credentials") is False, (
        "allow_credentials=True is unsafe without cookie auth; app uses X-API-Key only"
    )


# ---------------------------------------------------------------------------
# 5. SSRF guard
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "http://127.0.0.1:8080/admin",
        "http://169.254.169.254/latest/meta-data/",  # AWS IMDS
        "http://10.0.0.1/",
        "http://192.168.1.1/",
        "http://172.16.0.1/",
        "http://[::1]/",
        "file:///etc/passwd",
        "gopher://evil.example/",
        "ftp://internal.example/",
    ],
)
def test_is_url_safe_rejects_internal_and_non_http(url):
    assert _is_url_safe(url) is False, f"_is_url_safe should reject {url}"


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/policy.pdf",
        "http://example.org/terms",
    ],
)
def test_is_url_safe_accepts_public_http(url):
    # Uses live DNS; example.com/example.org resolve to public IPs.
    assert _is_url_safe(url) is True, f"_is_url_safe should accept {url}"


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "http://169.254.169.254/",
        "http://10.0.0.1/",
        "http://192.168.1.1/",
        "file:///etc/passwd",
    ],
)
def test_ssrf_endpoint_rejects_internal_urls(client, api_headers, url):
    """End-to-end: the download endpoint must reject SSRF payloads."""
    resp = client.post(
        "/api/policy/download",
        json={"url": url, "domain": "test", "title": "t"},
        headers=api_headers,
    )
    # 400 = our SSRF guard; 422 = Pydantic HttpUrl schema rejection (also acceptable).
    assert resp.status_code in (400, 422), (
        f"SSRF payload {url} was not blocked (got {resp.status_code})"
    )
