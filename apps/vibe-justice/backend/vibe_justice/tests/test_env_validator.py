"""Tests for environment validation - startup security checks"""
import os
import sys
from unittest.mock import patch, MagicMock

import pytest

from vibe_justice.utils.env_validator import (
    REQUIRED_ENV_VARS,
    validate_environment,
)


class TestRequiredEnvVars:
    """Test required environment variable definitions"""

    def test_api_key_is_required(self):
        """VIBE_JUSTICE_API_KEY should be required"""
        assert "VIBE_JUSTICE_API_KEY" in REQUIRED_ENV_VARS

    def test_openrouter_key_is_required(self):
        """OPENROUTER_API_KEY should be required (2026 migration)"""
        assert "OPENROUTER_API_KEY" in REQUIRED_ENV_VARS

    def test_has_minimum_required_vars(self):
        """Should have at least the critical security vars"""
        assert len(REQUIRED_ENV_VARS) >= 2


class TestValidateEnvironment:
    """Test environment validation function"""

    def test_exits_when_missing_vars(self):
        """Should sys.exit(1) when required vars are missing"""
        with patch.dict(os.environ, {}, clear=True):
            # Clear all env vars
            for var in REQUIRED_ENV_VARS:
                os.environ.pop(var, None)
            
            with pytest.raises(SystemExit) as exc_info:
                validate_environment()
            assert exc_info.value.code == 1

    def test_prints_missing_vars(self, capsys):
        """Should print which variables are missing"""
        with patch.dict(os.environ, {}, clear=True):
            for var in REQUIRED_ENV_VARS:
                os.environ.pop(var, None)
            
            with pytest.raises(SystemExit):
                validate_environment()
            
            captured = capsys.readouterr()
            assert "VIBE_JUSTICE_API_KEY" in captured.out
            assert "SECURITY ERROR" in captured.out or "Missing" in captured.out

    def test_passes_when_all_vars_set(self, capsys):
        """Should not exit when all required vars are set"""
        valid_env = {
            "VIBE_JUSTICE_API_KEY": "a" * 32,  # 32 chars
            "OPENROUTER_API_KEY": "sk-or-test-key-here",
        }

        with patch.dict(os.environ, valid_env, clear=False):
            # Should not raise SystemExit
            validate_environment()

    def test_warns_on_short_api_key(self, capsys):
        """Should warn if API key is less than 32 characters"""
        short_key_env = {
            "VIBE_JUSTICE_API_KEY": "short",  # < 32 chars
            "OPENROUTER_API_KEY": "sk-or-test-key-here",
        }

        with patch.dict(os.environ, short_key_env, clear=False):
            validate_environment()

            captured = capsys.readouterr()
            assert "WARNING" in captured.out or "32 characters" in captured.out

    def test_no_warning_on_long_api_key(self, capsys):
        """Should not warn if API key is >= 32 characters"""
        long_key_env = {
            "VIBE_JUSTICE_API_KEY": "a" * 64,  # > 32 chars
            "OPENROUTER_API_KEY": "sk-or-test-key-here",
        }

        with patch.dict(os.environ, long_key_env, clear=False):
            validate_environment()

            captured = capsys.readouterr()
            # Should not have the warning about 32 characters
            assert "32 characters" not in captured.out

    def test_suggests_secure_key_generation(self, capsys):
        """Should suggest generating a secure key when missing"""
        with patch.dict(os.environ, {}, clear=True):
            for var in REQUIRED_ENV_VARS:
                os.environ.pop(var, None)
            
            with pytest.raises(SystemExit):
                validate_environment()
            
            captured = capsys.readouterr()
            # Should show example .env format
            assert ".env" in captured.out or "VIBE_JUSTICE_API_KEY" in captured.out
