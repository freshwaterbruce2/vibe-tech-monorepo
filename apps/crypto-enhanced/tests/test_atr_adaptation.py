"""
Test ATR Adaptation - Ensures position sizing adapts to volatility

Core principle: Risk LESS during volatility spikes, risk MORE during calm periods

These tests validate:
1. Position size decreases as ATR increases (inverse relationship)
2. Position size increases as ATR decreases
3. Smooth adaptation (no sudden jumps)
4. Respects min/max bounds during extreme volatility
"""

import pandas as pd
import pytest

from tests.conftest import compute_atr, synthetic_price_series


def test_size_follows_atr_direction(risk_manager):
    """Position size should decrease as volatility rises"""
    series = synthetic_price_series(regime="rising_vol", n=300, seed=42)
    atr = compute_atr(series).bfill()

    sizes = []
    for price, atr_val in zip(series, atr):
        size = risk_manager.position_size_fraction(
            price=price, atr=atr_val, balance=1000, symbol="BTC/USDT"
        )
        sizes.append(size)

    # Convert to pandas Series for rolling analysis
    s = pd.Series(sizes)
    roll = s.rolling(30, min_periods=30).mean().dropna()

    # Assert: Average position size at END should be notably lower than START
    # (volatility is rising throughout the series)
    assert roll.iloc[-1] < roll.iloc[0] * 0.9, (
        f"Position size should decrease ~10%+ as volatility rises (start: {roll.iloc[0]:.4f}, end: {roll.iloc[-1]:.4f})"
    )


def test_size_increases_as_volatility_falls(risk_manager):
    """Position size should increase as volatility falls"""
    series = synthetic_price_series(regime="falling_vol", n=300, seed=43)
    atr = compute_atr(series).bfill()

    sizes = []
    for price, atr_val in zip(series, atr):
        size = risk_manager.position_size_fraction(
            price=price, atr=atr_val, balance=1000, symbol="ETH/USDT"
        )
        sizes.append(size)

    s = pd.Series(sizes)
    roll = s.rolling(30, min_periods=30).mean().dropna()

    # Assert: Position size should INCREASE as volatility falls
    assert roll.iloc[-1] > roll.iloc[0] * 1.1, (
        f"Position size should increase ~10%+ as volatility falls (start: {roll.iloc[0]:.4f}, end: {roll.iloc[-1]:.4f})"
    )


def test_volatile_spikes_reduce_size_immediately(risk_manager):
    """Volatility spikes should cause immediate position size reduction"""
    series = synthetic_price_series(regime="spiky_vol", n=300, seed=44)
    atr = compute_atr(series).bfill()

    sizes = []
    atr_values = []

    for price, atr_val in zip(series, atr):
        size = risk_manager.position_size_fraction(
            price=price, atr=atr_val, balance=1000, symbol="SOL/USDT"
        )
        sizes.append(size)
        atr_values.append(atr_val)

    s = pd.Series(sizes)
    atr_s = pd.Series(atr_values)

    # Find periods where ATR spiked significantly
    atr_pct_change = atr_s.pct_change()
    spike_indices = atr_pct_change[atr_pct_change > 0.5].index  # 50%+ ATR increase
    spike_indices = spike_indices[spike_indices > 10]  # Ignore warmup period

    if len(spike_indices) > 0:
        # Check that position size dropped after spike
        for idx in spike_indices:
            if idx < len(s) - 5:  # Need lookahead
                pre_spike = s.iloc[idx - 1]
                post_spike = s.iloc[idx : idx + 5].mean()

                assert post_spike < pre_spike * 0.95, (
                    f"Position size should drop ~5%+ after volatility spike at index {idx}"
                )


def test_stable_market_maintains_consistent_sizing(risk_manager):
    """Stable volatility should result in stable position sizing"""
    series = synthetic_price_series(regime="stable", n=200, seed=45)
    atr = compute_atr(series).bfill()

    sizes = []
    for price, atr_val in zip(series, atr):
        size = risk_manager.position_size_fraction(
            price=price, atr=atr_val, balance=1000, symbol="XLM/USD"
        )
        sizes.append(size)

    s = pd.Series(sizes)

    # Calculate coefficient of variation (std / mean)
    # Should be low for stable volatility regime
    cv = s.std() / s.mean()

    assert cv < 0.2, (
        f"Position size variation should be low (<20%) in stable market (CV: {cv:.2%})"
    )


def test_extreme_atr_respects_bounds(risk_manager):
    """Even with extreme ATR, position size should stay within configured bounds"""
    # Test with artificially extreme ATR values
    extreme_atr_values = [0.001, 0.01, 0.1, 1.0, 10.0, 100.0]  # From tiny to huge
    price = 50000  # BTC price

    for atr_val in extreme_atr_values:
        size = risk_manager.position_size_fraction(
            price=price, atr=atr_val, balance=1000, symbol="BTC/USDT"
        )

        # Should ALWAYS respect min/max bounds
        assert risk_manager.min_fraction <= size <= risk_manager.max_fraction, (
            f"Position size {size:.4f} violated bounds [{risk_manager.min_fraction}, {risk_manager.max_fraction}] with ATR={atr_val}"
        )


def test_different_balances_scale_appropriately(risk_manager):
    """Position sizing should scale with different account balances"""
    series = synthetic_price_series(regime="stable", n=50, seed=46)
    atr = compute_atr(series).bfill()

    # Take middle values to avoid edge effects
    mid_price = series.iloc[25]
    mid_atr = atr.iloc[25]

    balances = [100, 1000, 10000, 100000]
    fractions = []

    for balance in balances:
        frac = risk_manager.position_size_fraction(
            price=mid_price, atr=mid_atr, balance=balance, symbol="ETH/USDT"
        )
        fractions.append(frac)

    # Fractions should be similar regardless of balance
    # (we're testing fraction, not absolute size)
    frac_std = pd.Series(fractions).std()

    assert frac_std < 0.01, (
        f"Position fractions should be consistent across balances (std: {frac_std:.4f})"
    )


@pytest.mark.parametrize("regime", ["rising_vol", "falling_vol", "spiky_vol", "stable"])
def test_all_regimes_respect_bounds(risk_manager, regime):
    """Test that all volatility regimes produce valid position sizes"""
    series = synthetic_price_series(regime=regime, n=200, seed=47)
    atr = compute_atr(series).bfill()

    sizes = []
    for price, atr_val in zip(series, atr):
        size = risk_manager.position_size_fraction(
            price=price, atr=atr_val, balance=1000, symbol="SOL/USDT"
        )
        sizes.append(size)

    # ALL sizes must be within bounds
    s = pd.Series(sizes)
    assert (s >= risk_manager.min_fraction).all(), (
        f"Some positions below min in regime '{regime}'"
    )
    assert (s <= risk_manager.max_fraction).all(), (
        f"Some positions above max in regime '{regime}'"
    )
