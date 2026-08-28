"""
Timezone-aware timestamp utilities for Vibe-Justice.

All timestamps in Vibe-Justice should be UTC-aware to ensure:
1. Consistent behavior across timezones
2. Proper sorting and comparison of timestamps
3. Correct storage in SQLite (which stores text)
4. Accurate log correlation

Usage:
    from vibe_justice.utils.timestamps import (
        get_utc_now,
        format_iso,
        format_filename,
        format_log,
        format_date,
        parse_iso,
    )
"""
from datetime import datetime, timezone
from typing import Optional


def get_utc_now() -> datetime:
    """
    Returns the current time aware of UTC timezone.

    Returns:
        datetime: Timezone-aware datetime in UTC

    Example:
        >>> now = get_utc_now()
        >>> now.tzinfo == timezone.utc
        True
    """
    return datetime.now(timezone.utc)


def format_iso(dt: Optional[datetime] = None) -> str:
    """
    Format datetime as ISO 8601 string with timezone.

    Args:
        dt: Datetime to format (defaults to current UTC time)

    Returns:
        ISO 8601 formatted string (e.g., "2026-01-12T14:30:00+00:00")

    Example:
        >>> format_iso()  # Current time
        '2026-01-12T14:30:00+00:00'
        >>> format_iso(get_utc_now())
        '2026-01-12T14:30:00+00:00'
    """
    if dt is None:
        dt = get_utc_now()
    elif dt.tzinfo is None:
        # Make naive datetime UTC-aware
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def format_filename(dt: Optional[datetime] = None) -> str:
    """
    Format datetime for use in filenames (no special characters).

    Args:
        dt: Datetime to format (defaults to current UTC time)

    Returns:
        Filename-safe string (e.g., "20260112_143000")

    Example:
        >>> format_filename()
        '20260112_143000'
    """
    if dt is None:
        dt = get_utc_now()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%Y%m%d_%H%M%S")


def format_log(dt: Optional[datetime] = None) -> str:
    """
    Format datetime for log entries (human-readable).

    Args:
        dt: Datetime to format (defaults to current UTC time)

    Returns:
        Log-friendly string (e.g., "2026-01-12 14:30:00")

    Example:
        >>> format_log()
        '2026-01-12 14:30:00'
    """
    if dt is None:
        dt = get_utc_now()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def format_date(dt: Optional[datetime] = None) -> str:
    """
    Format datetime as date-only string.

    Args:
        dt: Datetime to format (defaults to current UTC time)

    Returns:
        Date string (e.g., "2026-01-12")

    Example:
        >>> format_date()
        '2026-01-12'
    """
    if dt is None:
        dt = get_utc_now()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%Y-%m-%d")


def parse_iso(iso_string: str) -> datetime:
    """
    Parse ISO 8601 string to timezone-aware datetime.

    Args:
        iso_string: ISO 8601 formatted string

    Returns:
        Timezone-aware datetime (converted to UTC if needed)

    Raises:
        ValueError: If string cannot be parsed

    Example:
        >>> dt = parse_iso("2026-01-12T14:30:00+00:00")
        >>> dt.tzinfo == timezone.utc
        True
    """
    # Handle Z suffix (ISO 8601 UTC indicator)
    if iso_string.endswith("Z"):
        iso_string = iso_string[:-1] + "+00:00"

    dt = datetime.fromisoformat(iso_string)

    # Ensure timezone-aware
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt


def ensure_utc(dt: datetime) -> datetime:
    """
    Ensure a datetime is timezone-aware in UTC.

    Args:
        dt: Datetime that may or may not be timezone-aware

    Returns:
        Timezone-aware datetime in UTC

    Example:
        >>> from datetime import datetime
        >>> naive = datetime(2026, 1, 12, 14, 30, 0)
        >>> aware = ensure_utc(naive)
        >>> aware.tzinfo == timezone.utc
        True
    """
    if dt.tzinfo is None:
        # Assume naive datetime is UTC
        return dt.replace(tzinfo=timezone.utc)
    elif dt.tzinfo != timezone.utc:
        # Convert to UTC
        return dt.astimezone(timezone.utc)
    return dt
