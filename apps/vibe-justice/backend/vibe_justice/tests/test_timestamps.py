"""Tests for timestamp utilities - UTC timezone handling"""
from datetime import datetime, timezone, timedelta

import pytest

from vibe_justice.utils.timestamps import (
    get_utc_now,
    format_iso,
    format_filename,
    format_log,
    format_date,
    parse_iso,
    ensure_utc,
)


class TestGetUtcNow:
    """Test UTC timestamp generation"""

    def test_returns_datetime_object(self):
        """Should return a datetime object"""
        result = get_utc_now()
        assert isinstance(result, datetime)

    def test_returns_timezone_aware(self):
        """Should return timezone-aware datetime"""
        result = get_utc_now()
        assert result.tzinfo is not None

    def test_returns_utc_timezone(self):
        """Should return UTC timezone specifically"""
        result = get_utc_now()
        assert result.tzinfo == timezone.utc

    def test_returns_current_time(self):
        """Should return approximately current time"""
        before = datetime.now(timezone.utc)
        result = get_utc_now()
        after = datetime.now(timezone.utc)

        assert before <= result <= after

    def test_is_not_naive(self):
        """Should not return naive datetime (no timezone)"""
        result = get_utc_now()
        # Naive datetimes have tzinfo = None
        assert result.tzinfo is not None

    def test_isoformat_includes_timezone(self):
        """ISO format string should include timezone info"""
        result = get_utc_now()
        iso_str = result.isoformat()
        # UTC should be represented as +00:00 or Z
        assert "+00:00" in iso_str or "Z" in iso_str

    def test_consistent_timezone_across_calls(self):
        """Multiple calls should all return UTC"""
        results = [get_utc_now() for _ in range(5)]
        for result in results:
            assert result.tzinfo == timezone.utc

    def test_can_compare_across_dst_boundary(self):
        """UTC times should be comparable without DST issues"""
        time1 = get_utc_now()
        time2 = get_utc_now()

        # Should be able to compare without exceptions
        assert time2 >= time1

        # Difference should be computable
        diff = time2 - time1
        assert diff.total_seconds() >= 0


class TestFormatIso:
    """Test ISO 8601 formatting"""

    def test_format_current_time(self):
        """Should format current time when no argument"""
        result = format_iso()
        assert "+00:00" in result
        assert "T" in result

    def test_format_specific_datetime(self):
        """Should format specific datetime"""
        dt = datetime(2026, 1, 12, 14, 30, 0, tzinfo=timezone.utc)
        result = format_iso(dt)
        assert result == "2026-01-12T14:30:00+00:00"

    def test_handles_naive_datetime(self):
        """Should make naive datetime UTC-aware"""
        naive = datetime(2026, 1, 12, 14, 30, 0)
        result = format_iso(naive)
        assert "+00:00" in result


class TestFormatFilename:
    """Test filename-safe formatting"""

    def test_format_current_time(self):
        """Should format current time when no argument"""
        result = format_filename()
        # Should match pattern YYYYMMDD_HHMMSS
        assert len(result) == 15
        assert "_" in result

    def test_format_specific_datetime(self):
        """Should format specific datetime"""
        dt = datetime(2026, 1, 12, 14, 30, 45, tzinfo=timezone.utc)
        result = format_filename(dt)
        assert result == "20260112_143045"

    def test_no_special_characters(self):
        """Should contain only alphanumeric and underscore"""
        result = format_filename()
        assert result.replace("_", "").isalnum()


class TestFormatLog:
    """Test log-friendly formatting"""

    def test_format_current_time(self):
        """Should format current time when no argument"""
        result = format_log()
        # Should match pattern YYYY-MM-DD HH:MM:SS
        assert " " in result
        assert "-" in result
        assert ":" in result

    def test_format_specific_datetime(self):
        """Should format specific datetime"""
        dt = datetime(2026, 1, 12, 14, 30, 45, tzinfo=timezone.utc)
        result = format_log(dt)
        assert result == "2026-01-12 14:30:45"


class TestFormatDate:
    """Test date-only formatting"""

    def test_format_current_date(self):
        """Should format current date when no argument"""
        result = format_date()
        # Should match pattern YYYY-MM-DD
        assert len(result) == 10
        assert result.count("-") == 2

    def test_format_specific_datetime(self):
        """Should format specific datetime"""
        dt = datetime(2026, 1, 12, 14, 30, 45, tzinfo=timezone.utc)
        result = format_date(dt)
        assert result == "2026-01-12"


class TestParseIso:
    """Test ISO 8601 parsing"""

    def test_parse_utc_string(self):
        """Should parse UTC ISO string"""
        result = parse_iso("2026-01-12T14:30:00+00:00")
        assert result.year == 2026
        assert result.month == 1
        assert result.day == 12
        assert result.hour == 14
        assert result.minute == 30
        assert result.tzinfo == timezone.utc

    def test_parse_z_suffix(self):
        """Should handle Z suffix for UTC"""
        result = parse_iso("2026-01-12T14:30:00Z")
        assert result.tzinfo is not None

    def test_parse_naive_string(self):
        """Should make naive parsed datetime UTC-aware"""
        result = parse_iso("2026-01-12T14:30:00")
        assert result.tzinfo == timezone.utc

    def test_roundtrip(self):
        """Should roundtrip through format and parse"""
        original = get_utc_now()
        iso_str = format_iso(original)
        parsed = parse_iso(iso_str)
        assert abs((original - parsed).total_seconds()) < 1


class TestEnsureUtc:
    """Test UTC conversion utility"""

    def test_naive_datetime(self):
        """Should make naive datetime UTC-aware"""
        naive = datetime(2026, 1, 12, 14, 30, 0)
        result = ensure_utc(naive)
        assert result.tzinfo == timezone.utc
        assert result.hour == 14

    def test_already_utc(self):
        """Should return UTC datetime unchanged"""
        utc_dt = datetime(2026, 1, 12, 14, 30, 0, tzinfo=timezone.utc)
        result = ensure_utc(utc_dt)
        assert result == utc_dt

    def test_convert_other_timezone(self):
        """Should convert other timezone to UTC"""
        # Create EST timezone (UTC-5)
        est = timezone(timedelta(hours=-5))
        est_dt = datetime(2026, 1, 12, 9, 30, 0, tzinfo=est)
        result = ensure_utc(est_dt)
        assert result.tzinfo == timezone.utc
        assert result.hour == 14  # 9 AM EST = 2 PM UTC
