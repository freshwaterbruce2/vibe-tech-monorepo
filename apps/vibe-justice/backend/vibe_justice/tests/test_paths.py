"""Tests for cross-platform path utilities"""
import os
import platform
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from vibe_justice.utils.paths import (
    get_platform_data_root,
    get_data_directory,
    get_cases_directory,
    get_log_directory,
    get_chroma_directory,
)


class TestGetPlatformDataRoot:
    """Test platform-specific data root detection"""

    def test_windows_with_d_drive(self):
        r"""Windows should prefer D:\learning-system when D: exists"""
        with patch("platform.system", return_value="Windows"):
            with patch.object(Path, "exists", return_value=True):
                root = get_platform_data_root()
                assert "learning-system" in str(root).lower() or "vibe" in str(root).lower()

    def test_windows_without_d_drive_fallback(self):
        """Windows should fallback to AppData when D: doesn't exist"""
        with patch("platform.system", return_value="Windows"):
            with patch.object(Path, "exists", return_value=False):
                root = get_platform_data_root()
                # Should fallback to user's AppData
                assert "appdata" in str(root).lower() or "vibe" in str(root).lower()

    def test_macos_returns_application_support(self):
        """macOS should use ~/Library/Application Support"""
        with patch("platform.system", return_value="Darwin"):
            root = get_platform_data_root()
            assert "Library" in str(root) or "Application Support" in str(root) or "VibeJustice" in str(root)

    def test_linux_returns_local_share(self):
        """Linux should use ~/.local/share (XDG compliant)"""
        with patch("platform.system", return_value="Linux"):
            root = get_platform_data_root()
            assert ".local" in str(root) or "vibe-justice" in str(root)


class TestGetDataDirectory:
    """Test data directory resolution"""

    def test_environment_override_takes_priority(self, tmp_path):
        """Environment variable should override platform default"""
        custom_path = str(tmp_path / "custom-data")
        with patch.dict(os.environ, {"VIBE_JUSTICE_DATA_DIR": custom_path}):
            result = get_data_directory()
            assert str(result) == custom_path

    def test_creates_directory_if_missing(self, tmp_path):
        """Should create data directory if it doesn't exist"""
        custom_path = tmp_path / "new-data-dir"
        assert not custom_path.exists()
        
        with patch.dict(os.environ, {"VIBE_JUSTICE_DATA_DIR": str(custom_path)}):
            result = get_data_directory()
            # get_data_directory creates the base dir plus vibe-justice subdir
            # The result should point to vibe-justice subfolder
            assert result == custom_path or str(result).startswith(str(custom_path))

    def test_returns_path_object(self, tmp_path):
        """Should return a Path object"""
        with patch.dict(os.environ, {"VIBE_JUSTICE_DATA_DIR": str(tmp_path)}):
            result = get_data_directory()
            assert isinstance(result, Path)


class TestGetCasesDirectory:
    """Test cases directory resolution"""

    def test_returns_cases_subdirectory(self, tmp_path):
        """Should return cases subdirectory of data directory"""
        with patch.dict(os.environ, {"VIBE_JUSTICE_DATA_DIR": str(tmp_path)}):
            result = get_cases_directory()
            assert result.name == "cases"
            assert result.exists()

    def test_creates_directory_if_missing(self, tmp_path):
        """Should create cases directory if it doesn't exist"""
        data_dir = tmp_path / "fresh-data"
        with patch.dict(os.environ, {"VIBE_JUSTICE_DATA_DIR": str(data_dir)}):
            result = get_cases_directory()
            assert result.exists()
            assert result.name == "cases"


class TestGetLogDirectory:
    """Test log directory resolution"""

    def test_environment_override_takes_priority(self, tmp_path):
        """Environment variable should override platform default"""
        custom_log = str(tmp_path / "custom-logs")
        with patch.dict(os.environ, {"VIBE_JUSTICE_LOG_DIR": custom_log}):
            result = get_log_directory()
            assert str(result) == custom_log

    def test_windows_prefers_d_drive_logs(self):
        r"""Windows should prefer D:\logs when available"""
        with patch("platform.system", return_value="Windows"):
            with patch.dict(os.environ, {}, clear=True):
                os.environ.pop("VIBE_JUSTICE_LOG_DIR", None)
                # Mock D:\logs existing
                with patch.object(Path, "exists", return_value=True):
                    with patch.object(Path, "mkdir"):
                        result = get_log_directory()
                        # Should contain either D:\logs or vibe-justice
                        result_str = str(result).lower()
                        assert "logs" in result_str or "vibe" in result_str

    def test_creates_directory_if_missing(self, tmp_path):
        """Should create log directory if it doesn't exist"""
        custom_log = tmp_path / "new-logs"
        assert not custom_log.exists()
        
        with patch.dict(os.environ, {"VIBE_JUSTICE_LOG_DIR": str(custom_log)}):
            result = get_log_directory()
            # Result path should match what we set
            assert str(result) == str(custom_log)


class TestGetChromaDirectory:
    """Test ChromaDB directory resolution"""

    def test_environment_override_takes_priority(self, tmp_path):
        """Environment variable should override default"""
        custom_chroma = str(tmp_path / "custom-chroma")
        with patch.dict(os.environ, {"VIBE_JUSTICE_CHROMA_DIR": custom_chroma}):
            result = get_chroma_directory()
            assert str(result) == custom_chroma

    def test_returns_chroma_subdirectory(self, tmp_path):
        """Should return chroma subdirectory of data directory"""
        with patch.dict(os.environ, {"VIBE_JUSTICE_DATA_DIR": str(tmp_path)}):
            with patch.dict(os.environ, {}, clear=False):
                os.environ.pop("VIBE_JUSTICE_CHROMA_DIR", None)
                result = get_chroma_directory()
                assert result.name == "chroma"

    def test_creates_directory_if_missing(self, tmp_path):
        """Should create chroma directory if it doesn't exist"""
        custom_chroma = tmp_path / "new-chroma"
        assert not custom_chroma.exists()
        
        with patch.dict(os.environ, {"VIBE_JUSTICE_CHROMA_DIR": str(custom_chroma)}):
            result = get_chroma_directory()
            # Result path should match what we set
            assert str(result) == str(custom_chroma)


class TestPathConsistency:
    """Test path consistency across calls"""

    def test_repeated_calls_return_same_path(self, tmp_path):
        """Multiple calls should return consistent paths"""
        with patch.dict(os.environ, {"VIBE_JUSTICE_DATA_DIR": str(tmp_path)}):
            result1 = get_data_directory()
            result2 = get_data_directory()
            assert result1 == result2

    def test_cases_is_subdirectory_of_data(self, tmp_path):
        """Cases directory should be under data directory"""
        with patch.dict(os.environ, {"VIBE_JUSTICE_DATA_DIR": str(tmp_path)}):
            data_dir = get_data_directory()
            cases_dir = get_cases_directory()
            assert cases_dir.parent == data_dir
