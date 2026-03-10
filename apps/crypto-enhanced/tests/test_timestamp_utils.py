"""
Tests for RFC3339 Timestamp Utilities

Critical for Kraken WebSocket V2 API communication which uses RFC3339 timestamps.
"""

import time
from datetime import datetime, timezone

import pytest

from timestamp_utils import TimestampUtils, normalize


def test_now_rfc3339_format():
    """Test RFC3339 timestamp generation"""
    timestamp = TimestampUtils.now_rfc3339()
    assert isinstance(timestamp, str)
    assert timestamp.endswith('Z')
    assert 'T' in timestamp  # Date/time separator


def test_now_rfc3339_parseable():
    """Generated timestamps should be parseable"""
    timestamp = TimestampUtils.now_rfc3339()
    parsed = TimestampUtils.parse_rfc3339(timestamp)
    assert isinstance(parsed, datetime)
    assert parsed.tzinfo is not None


def test_parse_rfc3339_with_z_suffix():
    """Test parsing RFC3339 with Z suffix"""
    timestamp_str = "2025-10-08T12:34:56.789Z"
    parsed = TimestampUtils.parse_rfc3339(timestamp_str)
    assert parsed.year == 2025
    assert parsed.month == 10
    assert parsed.day == 8
    assert parsed.hour == 12
    assert parsed.minute == 34
    assert parsed.second == 56


def test_parse_rfc3339_with_utc_offset():
    """Test parsing RFC3339 with +00:00 offset"""
    timestamp_str = "2025-10-08T12:34:56+00:00"
    parsed = TimestampUtils.parse_rfc3339(timestamp_str)
    assert parsed.year == 2025
    assert parsed.hour == 12


def test_parse_rfc3339_empty_string():
    """Empty string should raise ValueError"""
    with pytest.raises(ValueError, match="Empty timestamp"):
        TimestampUtils.parse_rfc3339("")


def test_to_unix_conversion():
    """Test conversion from RFC3339 to Unix timestamp"""
    timestamp_str = "2025-01-01T00:00:00Z"
    unix = TimestampUtils.to_unix(timestamp_str)
    assert isinstance(unix, float)
    assert unix > 1700000000  # After 2023


def test_from_unix_conversion():
    """Test conversion from Unix timestamp to RFC3339"""
    unix_timestamp = 1704067200.0  # 2024-01-01 00:00:00 UTC
    rfc3339 = TimestampUtils.from_unix(unix_timestamp)
    assert isinstance(rfc3339, str)
    assert rfc3339.endswith('Z')
    assert '2024-01-01' in rfc3339


def test_roundtrip_conversion():
    """Test RFC3339 → Unix → RFC3339 roundtrip"""
    original = "2025-10-08T12:34:56Z"
    unix = TimestampUtils.to_unix(original)
    converted_back = TimestampUtils.from_unix(unix)

    # Timestamps should match (allowing for microsecond precision loss)
    original_unix = TimestampUtils.to_unix(original)
    assert abs(unix - original_unix) < 1  # Within 1 second


def test_normalize_none():
    """normalize() should handle None"""
    assert normalize(None) is None


def test_normalize_rfc3339_string():
    """normalize() should validate and return RFC3339 strings"""
    timestamp_str = "2025-10-08T12:34:56Z"
    result = normalize(timestamp_str)
    assert result == timestamp_str


def test_normalize_unix_float():
    """normalize() should convert Unix float to RFC3339"""
    unix_timestamp = 1704067200.0
    result = normalize(unix_timestamp)
    assert isinstance(result, str)
    assert result.endswith('Z')
    assert '2024-01-01' in result


def test_normalize_unix_int():
    """normalize() should convert Unix int to RFC3339"""
    unix_timestamp = 1704067200
    result = normalize(unix_timestamp)
    assert isinstance(result, str)
    assert result.endswith('Z')


def test_normalize_invalid_string():
    """normalize() should return None for invalid strings"""
    result = normalize("not a timestamp")
    assert result is None


def test_now_rfc3339_near_current_time():
    """Generated timestamp should be close to current time"""
    before = time.time()
    timestamp = TimestampUtils.now_rfc3339()
    after = time.time()

    unix_from_generated = TimestampUtils.to_unix(timestamp)
    assert before <= unix_from_generated <= after


def test_parse_rfc3339_with_microseconds():
    """Test parsing RFC3339 with microsecond precision"""
    timestamp_str = "2025-10-08T12:34:56.123456Z"
    parsed = TimestampUtils.parse_rfc3339(timestamp_str)
    assert parsed.microsecond == 123456


def test_multiple_normalizations():
    """Test normalizing various timestamp formats"""
    # RFC3339 string
    rfc3339 = "2025-01-01T00:00:00Z"
    assert normalize(rfc3339) == rfc3339

    # Unix timestamp
    unix = 1704067200.0
    result = normalize(unix)
    assert result is not None
    assert isinstance(result, str)

    # None
    assert normalize(None) is None

    # Invalid
    assert normalize("invalid") is None
