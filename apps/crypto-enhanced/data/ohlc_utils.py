"""
Safe OHLC handling utilities to prevent timestamp drift poisoning

Critical Problem:
-----------------
Float timestamps (e.g., 1733625600.0000002) cause micro-errors in pandas merge/concat
operations. This leads to:
- Misaligned candles in indicator calculations
- Silent ATR/SMA/EMA corruption
- Risk management failures based on bad volatility data

Solution:
---------
1. Store timestamps as int64 (seconds or milliseconds)
2. Use pd.merge_asof with tolerance for safe joining
3. Validate monotonic time and no duplicates
4. Log when rows are dropped due to drift

Author: Bruce Freshwater (Vibe-Tech)
Date: 2025-12-09
"""

import logging
import pandas as pd
from pandas import Timedelta
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


def prep_ohlc(
    df: pd.DataFrame,
    ts_col: str = "timestamp_s",
    unit: str = "s"
) -> pd.DataFrame:
    """
    Prepare OHLC DataFrame for safe merging

    Args:
        df: Raw OHLC DataFrame
        ts_col: Name of timestamp column
        unit: Time unit - "s" for seconds, "ms" for milliseconds

    Returns:
        Cleaned DataFrame with int64 timestamps, sorted, deduplicated

    Example:
        >>> raw_df = fetch_kraken_candles(...)
        >>> clean_df = prep_ohlc(raw_df.rename(columns={"time": "timestamp_s"}))
    """
    # Make a copy to avoid modifying original
    df = df.copy()

    # Enforce int64 timestamps
    if pd.api.types.is_float_dtype(df[ts_col]):
        # Round to nearest second/millisecond to eliminate float drift
        df[ts_col] = df[ts_col].round().astype("int64")
        logger.debug(f"Converted float timestamps to int64 in column '{ts_col}'")
    else:
        df[ts_col] = df[ts_col].astype("int64")

    # Sort by timestamp (required for merge_asof)
    df = df.sort_values(ts_col)

    # Remove duplicate timestamps (keep last, as it's usually most recent data)
    orig_len = len(df)
    df = df.drop_duplicates(ts_col, keep="last")

    if len(df) < orig_len:
        dropped = orig_len - len(df)
        logger.warning(
            f"Dropped {dropped} duplicate timestamp(s) from {ts_col}. "
            f"This may indicate feed issues."
        )

    return df


def safe_merge_ohlc(
    base: pd.DataFrame,
    side: pd.DataFrame,
    ts_col: str = "timestamp_s",
    tolerance_seconds: Optional[float] = 1.0,
    tolerance_ms: Optional[int] = None,
    direction: str = "nearest"
) -> pd.DataFrame:
    """
    Safely merge two OHLC DataFrames using merge_asof with drift tolerance

    This prevents silent misalignment from timestamp float drift.

    Args:
        base: Primary OHLC DataFrame (already prepped)
        side: Secondary DataFrame to merge (already prepped)
        ts_col: Timestamp column name
        tolerance_seconds: Max drift in seconds (ignored if tolerance_ms set)
        tolerance_ms: Max drift in milliseconds (overrides tolerance_seconds)
        direction: 'nearest', 'forward', or 'backward'

    Returns:
        Merged DataFrame with validated timestamps

    Example:
        >>> candles = prep_ohlc(kraken_candles)
        >>> ws_data = prep_ohlc(websocket_snapshots)
        >>> merged = safe_merge_ohlc(candles, ws_data, tolerance_seconds=0.5)
    """
    # Determine tolerance as INTEGER (pandas requires int for int64 columns)
    # If timestamps are in seconds, tolerance is in seconds
    # If timestamps are in milliseconds, tolerance is in milliseconds
    if tolerance_ms is not None:
        tolerance = int(tolerance_ms)  # Integer milliseconds
    elif tolerance_seconds is not None:
        # Check if column appears to be milliseconds (values > 10^10)
        sample_val = base[ts_col].iloc[0] if len(base) > 0 else 0
        if sample_val > 10**10:  # Likely milliseconds
            tolerance = int(tolerance_seconds * 1000)  # Convert to ms
        else:
            tolerance = int(tolerance_seconds)  # Integer seconds
    else:
        tolerance = 1  # Default 1 second

    # Ensure both are sorted
    base = base.sort_values(ts_col)
    side = side.sort_values(ts_col)

    # Track original length
    base_len = len(base)

    # Perform safe merge
    merged = pd.merge_asof(
        base,
        side,
        on=ts_col,
        direction=direction,
        tolerance=tolerance
    )

    # Validate merge didn't change base row count
    if len(merged) != base_len:
        logger.error(
            f"Merge changed row count: {base_len} -> {len(merged)}. "
            f"This indicates a merge logic error."
        )

    # Check for rows that couldn't be matched (NaN in side columns)
    side_cols = [c for c in side.columns if c != ts_col and c in merged.columns]
    if side_cols:
        unmatched = merged[side_cols].isna().any(axis=1).sum()
        if unmatched > 0:
            logger.warning(
                f"{unmatched}/{len(merged)} rows exceeded tolerance {tolerance}. "
                f"This may indicate feed drift or delayed data."
            )

    return merged


def compute_safe_atr(
    df: pd.DataFrame,
    period: int = 14,
    high_col: str = "high",
    low_col: str = "low",
    close_col: str = "close",
    validate: bool = True
) -> pd.Series:
    """
    Compute ATR on validated OHLC data

    Args:
        df: OHLC DataFrame with validated timestamps
        period: ATR period (default 14)
        high_col: High price column name
        low_col: Low price column name
        close_col: Close price column name
        validate: Whether to run integrity checks before calculation

    Returns:
        Series of ATR values

    Raises:
        ValueError: If OHLC data fails validation
    """
    if validate:
        # Run integrity checks
        issues = validate_ohlc_integrity(df)
        if issues:
            raise ValueError(f"OHLC data failed validation: {', '.join(issues)}")

    # True Range calculation
    high = df[high_col]
    low = df[low_col]
    close = df[close_col]

    # TR = max(high-low, abs(high-prev_close), abs(low-prev_close))
    hl = high - low
    hc = (high - close.shift()).abs()
    lc = (low - close.shift()).abs()

    tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)

    # ATR = EWM of True Range
    atr = tr.ewm(alpha=1/period, adjust=False).mean()

    # Backfill initial NaN values (from shift operation)
    atr = atr.bfill()

    return atr


def validate_ohlc_integrity(
    df: pd.DataFrame,
    ts_col: str = "timestamp_s",
    required_cols: Optional[list] = None
) -> list:
    """
    Validate OHLC DataFrame integrity

    Checks:
    - Monotonic increasing timestamps
    - No duplicate timestamps
    - No NaN in OHLC columns
    - High >= Low
    - Close within [Low, High]

    Args:
        df: OHLC DataFrame to validate
        ts_col: Timestamp column name
        required_cols: Columns that must exist (defaults to OHLC)

    Returns:
        List of validation issues (empty if all checks pass)
    """
    issues = []

    if required_cols is None:
        required_cols = ["open", "high", "low", "close", "volume"]

    # Check required columns exist
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        issues.append(f"Missing columns: {missing_cols}")
        return issues  # Can't continue without required columns

    # Check timestamp column exists
    if ts_col not in df.columns:
        issues.append(f"Missing timestamp column: {ts_col}")
        return issues

    # Validate monotonic increasing timestamps
    if not df[ts_col].is_monotonic_increasing:
        issues.append(f"Timestamps not monotonic increasing in '{ts_col}'")

    # Check for duplicate timestamps
    duplicates = df[ts_col].duplicated().sum()
    if duplicates > 0:
        issues.append(f"Found {duplicates} duplicate timestamps")

    # Check for NaN in OHLC
    ohlc_cols = ["open", "high", "low", "close"]
    for col in ohlc_cols:
        if col in df.columns:
            nan_count = df[col].isna().sum()
            if nan_count > 0:
                issues.append(f"Found {nan_count} NaN values in '{col}'")

    # Validate High >= Low
    if "high" in df.columns and "low" in df.columns:
        invalid = (df["high"] < df["low"]).sum()
        if invalid > 0:
            issues.append(f"Found {invalid} rows where High < Low")

    # Validate Close within [Low, High]
    if all(col in df.columns for col in ["close", "low", "high"]):
        below_low = (df["close"] < df["low"]).sum()
        above_high = (df["close"] > df["high"]).sum()

        if below_low > 0:
            issues.append(f"Found {below_low} rows where Close < Low")
        if above_high > 0:
            issues.append(f"Found {above_high} rows where Close > High")

    # Log results
    if issues:
        logger.error(f"OHLC validation failed: {', '.join(issues)}")
    else:
        logger.debug("OHLC validation passed")

    return issues


def detect_timestamp_drift(
    df: pd.DataFrame,
    ts_col: str = "timestamp_s",
    expected_interval_s: int = 60
) -> Tuple[int, float]:
    """
    Detect timestamp drift and irregular intervals

    Args:
        df: OHLC DataFrame
        ts_col: Timestamp column name
        expected_interval_s: Expected interval in seconds (e.g., 60 for 1min candles)

    Returns:
        Tuple of (irregular_count, max_drift_seconds)
    """
    if len(df) < 2:
        return 0, 0.0

    # Calculate intervals
    intervals = df[ts_col].diff().dropna()

    # Count irregular intervals (not matching expected)
    irregular = (intervals != expected_interval_s).sum()

    # Find max drift from expected
    max_drift = (intervals - expected_interval_s).abs().max()

    if irregular > 0:
        logger.warning(
            f"Detected {irregular} irregular intervals. "
            f"Max drift: {max_drift}s from expected {expected_interval_s}s"
        )

    return int(irregular), float(max_drift)
