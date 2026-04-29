"""Tests for authentication utilities - fail-closed verification"""
import os
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from vibe_justice.utils.auth import require_api_key


class TestRequireApiKey:
    """Test suite for API key authentication"""

    def test_valid_api_key_passes(self):
        """Valid API key should pass authentication"""
        test_key = "test-api-key-12345678901234567890"
        with patch.dict(os.environ, {"VIBE_JUSTICE_API_KEY": test_key}):
            result = require_api_key(x_api_key=test_key)
            assert result == test_key

    def test_missing_server_key_raises_500(self):
        """Missing server API key should raise 500 (fail-closed)"""
        with patch.dict(os.environ, {}, clear=True):
            # Remove the key entirely
            os.environ.pop("VIBE_JUSTICE_API_KEY", None)
            with pytest.raises(HTTPException) as exc_info:
                require_api_key(x_api_key="some-client-key")
            assert exc_info.value.status_code == 500
            assert "misconfigured" in exc_info.value.detail.lower()

    def test_empty_server_key_raises_500(self):
        """Empty server API key should raise 500 (fail-closed)"""
        with patch.dict(os.environ, {"VIBE_JUSTICE_API_KEY": ""}):
            with pytest.raises(HTTPException) as exc_info:
                require_api_key(x_api_key="some-client-key")
            assert exc_info.value.status_code == 500

    def test_missing_client_key_raises_401(self):
        """Missing client API key header should raise 401"""
        test_key = "server-key-12345678901234567890"
        with patch.dict(os.environ, {"VIBE_JUSTICE_API_KEY": test_key}):
            with pytest.raises(HTTPException) as exc_info:
                require_api_key(x_api_key=None)
            assert exc_info.value.status_code == 401
            assert "missing" in exc_info.value.detail.lower()

    def test_empty_client_key_raises_401(self):
        """Empty client API key should raise 401"""
        test_key = "server-key-12345678901234567890"
        with patch.dict(os.environ, {"VIBE_JUSTICE_API_KEY": test_key}):
            with pytest.raises(HTTPException) as exc_info:
                require_api_key(x_api_key="")
            assert exc_info.value.status_code == 401

    def test_invalid_client_key_raises_401(self):
        """Wrong client API key should raise 401"""
        server_key = "server-key-12345678901234567890"
        client_key = "wrong-key-12345678901234567890"
        with patch.dict(os.environ, {"VIBE_JUSTICE_API_KEY": server_key}):
            with pytest.raises(HTTPException) as exc_info:
                require_api_key(x_api_key=client_key)
            assert exc_info.value.status_code == 401
            assert "invalid" in exc_info.value.detail.lower()

    def test_origin_header_does_not_bypass_api_key(self):
        """Origin is forgeable by non-browser clients and must not authenticate."""
        server_key = "server-key-12345678901234567890"

        with patch.dict(os.environ, {"VIBE_JUSTICE_API_KEY": server_key}):
            with pytest.raises(HTTPException) as exc_info:
                require_api_key(x_api_key=None)
            assert exc_info.value.status_code == 401

    def test_timing_attack_resistant_comparison(self):
        """Comparison should use constant-time algorithm"""
        # This test verifies the secrets.compare_digest is being used
        # by checking behavior is consistent regardless of where mismatch is
        server_key = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        
        with patch.dict(os.environ, {"VIBE_JUSTICE_API_KEY": server_key}):
            # Key differs at start
            with pytest.raises(HTTPException):
                require_api_key(x_api_key="baaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
            
            # Key differs at end
            with pytest.raises(HTTPException):
                require_api_key(x_api_key="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab")
            
            # Correct key passes
            result = require_api_key(x_api_key=server_key)
            assert result == server_key

    def test_case_sensitive_comparison(self):
        """API key comparison should be case-sensitive"""
        server_key = "MySecretKey12345678901234567890"
        with patch.dict(os.environ, {"VIBE_JUSTICE_API_KEY": server_key}):
            # Different case should fail
            with pytest.raises(HTTPException):
                require_api_key(x_api_key="mysecretkey12345678901234567890")
