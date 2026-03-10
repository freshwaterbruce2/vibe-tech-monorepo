"""
Test OHLC Timestamp Safety Utilities

These tests validate that timestamp drift is prevented and ATR calculations
remain accurate even when merging data from multiple sources.
"""

import numpy as np
import pandas as pd
import pytest
from data.ohlc_utils import (
    compute_safe_atr,
    detect_timestamp_drift,
    prep_ohlc,
    safe_merge_ohlc,
    validate_ohlc_integrity,
)


def test_prep_ohlc_converts_float_to_int64():
    """Float timestamps should be rounded and converted to int64"""
    # Create DataFrame with float drift
    df = pd.DataFrame(
        {
            "timestamp_s": [1733625600.0000002, 1733625660.0000001, 1733625720.9999999],
            "close": [100, 101, 102],
        }
    )

    cleaned = prep_ohlc(df)

    # Should be int64
    assert cleaned["timestamp_s"].dtype == "int64"

    # Should round correctly
    assert cleaned["timestamp_s"].tolist() == [1733625600, 1733625660, 1733625721]


def test_prep_ohlc_removes_duplicates():
    """Duplicate timestamps should be removed (keeping last)"""
    df = pd.DataFrame(
        {
            "timestamp_s": [1000, 1060, 1060, 1120],  # Duplicate at 1060
            "close": [100, 101, 102, 103],  # 102 is latest for duplicate
        }
    )

    cleaned = prep_ohlc(df)

    # Should have 3 rows (duplicate removed)
    assert len(cleaned) == 3

    # Should keep last value for duplicate
    row_1060 = cleaned[cleaned["timestamp_s"] == 1060]
    assert row_1060["close"].iloc[0] == 102


def test_prep_ohlc_sorts_timestamps():
    """Unsorted timestamps should be sorted"""
    df = pd.DataFrame(
        {
            "timestamp_s": [1120, 1000, 1060],  # Out of order
            "close": [103, 100, 101],
        }
    )

    cleaned = prep_ohlc(df)

    # Should be sorted
    assert cleaned["timestamp_s"].is_monotonic_increasing
    assert cleaned["timestamp_s"].tolist() == [1000, 1060, 1120]


def test_safe_merge_ohlc_handles_drift():
    """Merge should tolerate small timestamp drift"""
    base = pd.DataFrame({"timestamp_s": [1000, 1060, 1120], "close": [100, 101, 102]})

    # Side data with slight drift (+0.5 seconds)
    side = pd.DataFrame(
        {
            "timestamp_s": [1000, 1060, 1121],  # 1121 instead of 1120
            "volume": [1000, 1100, 1200],
        }
    )

    base = prep_ohlc(base)
    side = prep_ohlc(side)

    merged = safe_merge_ohlc(base, side, tolerance_seconds=2.0)

    # Should merge successfully
    assert len(merged) == 3

    # Volume should be matched despite 1s drift
    assert merged.loc[merged["timestamp_s"] == 1120, "volume"].iloc[0] == 1200


def test_safe_merge_ohlc_warns_on_large_drift():
    """Large drift beyond tolerance should be logged"""
    base = pd.DataFrame({"timestamp_s": [1000, 1060, 1120], "close": [100, 101, 102]})

    # Side data with large drift (>2s)
    side = pd.DataFrame(
        {
            "timestamp_s": [1000, 1060, 1125],  # 5s drift
            "volume": [1000, 1100, 1200],
        }
    )

    base = prep_ohlc(base)
    side = prep_ohlc(side)

    merged = safe_merge_ohlc(base, side, tolerance_seconds=2.0)

    # Should still have 3 rows
    assert len(merged) == 3

    # But last row should have NaN volume (beyond tolerance)
    assert pd.isna(merged.loc[merged["timestamp_s"] == 1120, "volume"].iloc[0])


def test_compute_safe_atr_on_clean_data():
    """ATR calculation should work on validated data"""
    df = pd.DataFrame(
        {
            "timestamp_s": range(1000, 1000 + 60 * 20, 60),  # 20 candles, 1min apart
            "open": [100, 101, 99, 102, 100] * 4,
            "high": [105, 106, 104, 107, 105] * 4,
            "low": [95, 94, 96, 93, 95] * 4,
            "close": [100, 101, 99, 102, 100] * 4,
            "volume": [1000] * 20,
        }
    )

    df = prep_ohlc(df)
    atr = compute_safe_atr(df, period=14)

    # Should have same length as input
    assert len(atr) == len(df)

    # Should not have NaN (bfilled)
    assert not atr.isna().any()

    # ATR should be positive
    assert (atr > 0).all()


def test_compute_safe_atr_rejects_invalid_data():
    """ATR calculation should fail validation on bad data"""
    # Create invalid data (high < low)
    df = pd.DataFrame(
        {
            "timestamp_s": [1000, 1060, 1120],
            "high": [100, 101, 99],  # Last high < low
            "low": [95, 94, 100],  # Last low > high
            "close": [98, 99, 99],
        }
    )

    df = prep_ohlc(df)

    with pytest.raises(ValueError, match="failed validation"):
        compute_safe_atr(df, validate=True)


def test_validate_ohlc_integrity_passes_clean_data():
    """Clean OHLC data should pass all validation checks"""
    df = pd.DataFrame(
        {
            "timestamp_s": [1000, 1060, 1120],
            "open": [98, 100, 101],
            "high": [102, 103, 104],
            "low": [97, 99, 100],
            "close": [100, 101, 102],
            "volume": [1000, 1100, 1200],
        }
    )

    df = prep_ohlc(df)
    issues = validate_ohlc_integrity(df)

    assert issues == [], f"Validation failed: {issues}"


def test_validate_ohlc_integrity_detects_high_less_than_low():
    """Should detect when High < Low"""
    df = pd.DataFrame(
        {
            "timestamp_s": [1000, 1060, 1120],
            "open": [100, 100, 100],
            "high": [100, 101, 98],  # Last high < low
            "low": [95, 94, 99],  # Last low > high
            "close": [98, 99, 98],
            "volume": [1000, 1000, 1000],
        }
    )

    df = prep_ohlc(df)
    issues = validate_ohlc_integrity(df)

    assert any("High < Low" in issue for issue in issues)


def test_validate_ohlc_integrity_detects_close_outside_range():
    """Should detect when Close is outside [Low, High]"""
    df = pd.DataFrame(
        {
            "timestamp_s": [1000, 1060, 1120],
            "open": [100, 100, 100],
            "high": [100, 101, 102],
            "low": [95, 94, 96],
            "close": [98, 99, 94],  # Last close < low
            "volume": [1000, 1000, 1000],
        }
    )

    df = prep_ohlc(df)
    issues = validate_ohlc_integrity(df)

    assert any("Close < Low" in issue for issue in issues)


def test_validate_ohlc_integrity_detects_nan_values():
    """Should detect NaN in OHLC columns"""
    df = pd.DataFrame(
        {
            "timestamp_s": [1000, 1060, 1120],
            "open": [100, 100, 100],
            "high": [100, 101, np.nan],  # NaN high
            "low": [95, 94, 96],
            "close": [98, 99, 98],
            "volume": [1000, 1000, 1000],
        }
    )

    df = prep_ohlc(df)
    issues = validate_ohlc_integrity(df)

    assert any("NaN" in issue and "high" in issue for issue in issues)


def test_detect_timestamp_drift_finds_irregular_intervals():
    """Should detect irregular timestamp intervals"""
    df = pd.DataFrame(
        {
            "timestamp_s": [
                1000,
                1060,
                1125,
                1180,
            ],  # 1125 is irregular (should be 1120)
            "close": [100, 101, 102, 103],
        }
    )

    df = prep_ohlc(df)
    irregular_count, max_drift = detect_timestamp_drift(df, expected_interval_s=60)

    assert irregular_count == 2  # Two irregular intervals (1060->1125 and 1125->1180)
    assert max_drift == 5  # 5 seconds drift at position 2


def test_float_drift_poisons_atr_without_fix():
    """Demonstrates the problem: float drift causes bad ATR"""
    # Create two "identical" datasets with float drift
    base = pd.DataFrame(
        {
            "time": [1000.0, 1060.0, 1120.0],
            "high": [105, 106, 104],
            "low": [95, 94, 96],
            "close": [100, 101, 99],
        }
    )

    # Same data but with tiny float errors
    drifted = pd.DataFrame(
        {
            "time": [1000.0000001, 1060.0000002, 1119.9999999],  # Drift
            "high": [105, 106, 104],
            "low": [95, 94, 96],
            "close": [100, 101, 99],
        }
    )

    # Naive merge (WRONG)
    naive_merged = pd.merge(
        base, drifted, on="time", how="outer", suffixes=("_base", "_drift")
    )

    # Will create duplicate rows due to float mismatch
    assert len(naive_merged) > 3, "Float drift created duplicate rows"

    # Correct approach with prep_ohlc
    base_clean = prep_ohlc(base.rename(columns={"time": "timestamp_s"}))
    drift_clean = prep_ohlc(drifted.rename(columns={"time": "timestamp_s"}))

    safe_merged = safe_merge_ohlc(base_clean, drift_clean, tolerance_seconds=1.0)

    # Should have exactly 3 rows
    assert len(safe_merged) == 3, "Safe merge eliminated drift duplicates"


def test_millisecond_timestamps_handled_correctly():
    """Should handle millisecond timestamps correctly"""
    df = pd.DataFrame(
        {
            "timestamp_ms": [1733625600000, 1733625660000, 1733625720000],
            "close": [100, 101, 102],
        }
    )

    # Prep as milliseconds
    cleaned = prep_ohlc(df, ts_col="timestamp_ms", unit="ms")

    assert cleaned["timestamp_ms"].dtype == "int64"
    assert cleaned["timestamp_ms"].is_monotonic_increasing


@pytest.mark.parametrize("tolerance_ms", [100, 250, 500, 1000])
def test_merge_tolerance_levels(tolerance_ms):
    """Test different tolerance levels for merge"""
    base = pd.DataFrame({"timestamp_ms": [1000, 1100, 1200], "close": [100, 101, 102]})

    # Side data with varying drift
    side = pd.DataFrame(
        {
            "timestamp_ms": [1000, 1105, 1205],  # 5ms drift
            "volume": [1000, 1100, 1200],
        }
    )

    base = prep_ohlc(base, ts_col="timestamp_ms")
    side = prep_ohlc(side, ts_col="timestamp_ms")

    merged = safe_merge_ohlc(
        base, side, ts_col="timestamp_ms", tolerance_ms=tolerance_ms
    )

    # With 5ms drift, should match if tolerance >= 5ms
    if tolerance_ms >= 5:
        # Should have no NaN
        assert not merged["volume"].isna().any()
    # If tolerance < 5ms, some rows won't match (depends on direction)
