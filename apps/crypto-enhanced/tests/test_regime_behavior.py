"""
Test Regime Detection - Validates market state classification

Regime types:
- "calm": Low volatility, ranging market (safest to trade)
- "trending": Directional movement with moderate volatility
- "choppy": High volatility with no clear direction (reduce exposure)
- "high_volatility": Extreme volatility, risk-off mode (minimal exposure)

These tests ensure the system correctly identifies and responds to market conditions
"""

import numpy as np
import pytest

from tests.conftest import synthetic_price_series, compute_atr


def test_regime_detection_marks_high_volatility(risk_manager):
    """Spiky volatility regime should be detected as high_volatility"""
    series = synthetic_price_series(regime="spiky_vol", n=300, seed=42)
    atr = compute_atr(series).fillna(method="bfill")

    regimes = []
    for price, atr_val in zip(series, atr):
        regime = risk_manager.detect_regime(
            atr=atr_val,
            price=price,
            symbol="ETH/USDT"
        )
        regimes.append(regime)

    # Should detect multiple high volatility periods
    high_vol_count = regimes.count("high_volatility")
    assert high_vol_count > 5, \
        f"Expected >5 high_volatility detections in spiky regime, got {high_vol_count}"


def test_stable_regime_detected_as_calm(risk_manager):
    """Stable volatility should be detected as calm"""
    series = synthetic_price_series(regime="stable", n=200, seed=43)
    atr = compute_atr(series).fillna(method="bfill")

    regimes = []
    for price, atr_val in zip(series, atr):
        regime = risk_manager.detect_regime(
            atr=atr_val,
            price=price,
            symbol="BTC/USDT"
        )
        regimes.append(regime)

    # Most should be calm or normal (not high volatility)
    calm_count = regimes.count("calm")
    high_vol_count = regimes.count("high_volatility")

    assert calm_count > high_vol_count * 2, \
        f"Stable regime should produce more 'calm' than 'high_volatility' (calm: {calm_count}, high_vol: {high_vol_count})"


def test_regime_changes_are_detected(risk_manager):
    """System should detect regime transitions"""
    # Create regime that transitions from stable → spiky
    stable = synthetic_price_series(regime="stable", n=150, seed=44)
    spiky = synthetic_price_series(regime="spiky_vol", n=150, seed=45)

    # Concatenate to create transition
    import pandas as pd
    series = pd.concat([stable, spiky], ignore_index=True)
    atr = compute_atr(series).fillna(method="bfill")

    regimes = []
    for price, atr_val in zip(series, atr):
        regime = risk_manager.detect_regime(
            atr=atr_val,
            price=price,
            symbol="SOL/USDT"
        )
        regimes.append(regime)

    # Check first half (stable) vs second half (spiky)
    first_half = regimes[:150]
    second_half = regimes[150:]

    high_vol_first = first_half.count("high_volatility")
    high_vol_second = second_half.count("high_volatility")

    assert high_vol_second > high_vol_first * 2, \
        f"Second half (spiky) should have more high_volatility detections (first: {high_vol_first}, second: {high_vol_second})"


def test_regime_stats_tracking(risk_manager):
    """Regime stats should be tracked and retrievable"""
    series = synthetic_price_series(regime="spiky_vol", n=100, seed=46)
    atr = compute_atr(series).fillna(method="bfill")

    # Process some data
    for price, atr_val in zip(series, atr):
        risk_manager.detect_regime(
            atr=atr_val,
            price=price,
            symbol="XLM/USD"
        )

    # Get regime stats
    stats = risk_manager.get_regime_stats(symbol="XLM/USD")

    # Should have populated stats
    assert "regime" in stats
    assert "current_atr" in stats
    assert "avg_atr" in stats
    assert "atr_ratio" in stats
    assert "data_points" in stats

    # Should have collected data
    assert stats["data_points"] > 0
    assert stats["current_atr"] > 0
    assert stats["avg_atr"] > 0


def test_extreme_atr_ratios_trigger_high_volatility(risk_manager):
    """ATR ratios >2x average should trigger high volatility regime"""
    # Start with stable prices
    series = synthetic_price_series(regime="stable", n=50, seed=47)
    atr_base = compute_atr(series).fillna(method="bfill")

    # Feed stable data first to establish baseline
    for price, atr_val in zip(series, atr_base):
        risk_manager.detect_regime(
            atr=atr_val,
            price=price,
            symbol="BTC/USDT"
        )

    # Now create extreme ATR spike
    avg_atr = list(risk_manager._atr_history["BTC/USDT"])[-1]
    extreme_atr = avg_atr * 2.5  # 2.5x average ATR

    # Should detect as high volatility
    regime = risk_manager.detect_regime(
        atr=extreme_atr,
        price=series.iloc[-1],
        symbol="BTC/USDT"
    )

    assert regime == "high_volatility", \
        f"ATR spike 2.5x average should trigger high_volatility, got '{regime}'"


def test_regime_history_bounded(risk_manager):
    """Regime detection should not grow memory unbounded"""
    series = synthetic_price_series(regime="stable", n=1000, seed=48)  # Large dataset
    atr = compute_atr(series).fillna(method="bfill")

    # Process all data
    for price, atr_val in zip(series, atr):
        risk_manager.detect_regime(
            atr=atr_val,
            price=price,
            symbol="ETH/USDT"
        )

    # Check that history is bounded (not storing all 1000 points)
    price_history_len = len(risk_manager._price_history["ETH/USDT"])
    atr_history_len = len(risk_manager._atr_history["ETH/USDT"])

    assert price_history_len <= risk_manager.regime_lookback, \
        f"Price history grew beyond lookback limit ({price_history_len} > {risk_manager.regime_lookback})"
    assert atr_history_len <= risk_manager.regime_lookback, \
        f"ATR history grew beyond lookback limit ({atr_history_len} > {risk_manager.regime_lookback})"


def test_multiple_symbols_tracked_independently(risk_manager):
    """Different symbols should have independent regime tracking"""
    # Generate different regimes for different symbols
    btc_series = synthetic_price_series(regime="stable", n=100, seed=49)
    eth_series = synthetic_price_series(regime="spiky_vol", n=100, seed=50)

    btc_atr = compute_atr(btc_series).fillna(method="bfill")
    eth_atr = compute_atr(eth_series).fillna(method="bfill")

    # Process BTC (stable)
    btc_regimes = []
    for price, atr_val in zip(btc_series, btc_atr):
        regime = risk_manager.detect_regime(atr=atr_val, price=price, symbol="BTC/USDT")
        btc_regimes.append(regime)

    # Process ETH (spiky)
    eth_regimes = []
    for price, atr_val in zip(eth_series, eth_atr):
        regime = risk_manager.detect_regime(atr=atr_val, price=price, symbol="ETH/USDT")
        eth_regimes.append(regime)

    # BTC should be mostly calm, ETH should have more volatility
    btc_high_vol = btc_regimes.count("high_volatility")
    eth_high_vol = eth_regimes.count("high_volatility")

    assert eth_high_vol > btc_high_vol, \
        f"ETH (spiky) should have more high_volatility than BTC (stable): ETH={eth_high_vol}, BTC={btc_high_vol}"


@pytest.mark.parametrize("seed", [100, 101, 102, 103, 104])
def test_regime_detection_consistency(risk_manager, seed):
    """Regime detection should be consistent across different random seeds"""
    series = synthetic_price_series(regime="spiky_vol", n=200, seed=seed)
    atr = compute_atr(series).fillna(method="bfill")

    regimes = []
    for price, atr_val in zip(series, atr):
        regime = risk_manager.detect_regime(
            atr=atr_val,
            price=price,
            symbol=f"TEST/USDT_{seed}"
        )
        regimes.append(regime)

    # All spiky regimes should detect SOME high volatility
    high_vol_count = regimes.count("high_volatility")
    assert high_vol_count > 0, \
        f"Spiky regime with seed {seed} should detect at least some high_volatility"
