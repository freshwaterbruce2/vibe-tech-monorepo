"""
Test Position Sizing Bounds - Critical safety checks

These tests are the "guard rails" that prevent catastrophic mistakes:
- No position exceeds max fraction of capital
- No position falls below minimum (avoiding dust trades)
- Extreme inputs don't break the system
- All scenarios respect configured boundaries

This is the safety net that prevents the bot from destroying your account.
"""

import math

import pytest

from tests.conftest import compute_atr, synthetic_price_series


def test_position_sizing_within_bounds(risk_manager):
    """Position size must ALWAYS stay within min/max bounds"""
    # Test various ATR values from tiny to extreme
    atr_values = [0.5, 5, 25, 100]
    price = 50000  # BTC price
    balance = 500

    for atr in atr_values:
        size = risk_manager.position_size_fraction(
            price=price, atr=atr, balance=balance, symbol="BTC/USDT"
        )

        assert risk_manager.min_fraction <= size <= risk_manager.max_fraction, (
            f"Position size {size:.4f} violated bounds with ATR={atr}"
        )


def test_zero_or_negative_inputs_handled_safely(risk_manager):
    """System should handle invalid inputs gracefully"""
    # Zero price
    size = risk_manager.position_size_fraction(
        price=0, atr=1.0, balance=1000, symbol="ETH/USDT"
    )
    assert size == float(risk_manager.min_fraction)

    # Negative price (should never happen, but be safe)
    size = risk_manager.position_size_fraction(
        price=-100, atr=1.0, balance=1000, symbol="ETH/USDT"
    )
    assert size == float(risk_manager.min_fraction)

    # Zero ATR
    size = risk_manager.position_size_fraction(
        price=1000, atr=0, balance=1000, symbol="SOL/USDT"
    )
    assert risk_manager.min_fraction <= size <= risk_manager.max_fraction

    # Zero balance
    size = risk_manager.position_size_fraction(
        price=1000, atr=10, balance=0, symbol="SOL/USDT"
    )
    assert size == float(risk_manager.min_fraction)


def test_tiny_balance_still_respects_bounds(risk_manager):
    """Even with $1 balance, position sizing should be sane"""
    tiny_balance = 1.0
    price = 50000  # Expensive asset
    atr = 500  # High volatility

    size = risk_manager.position_size_fraction(
        price=price, atr=atr, balance=tiny_balance, symbol="BTC/USDT"
    )

    # Should still be within bounds
    assert risk_manager.min_fraction <= size <= risk_manager.max_fraction

    # Absolute position would be tiny ($0.01 to $0.25), but fraction is valid
    absolute_size = tiny_balance * size
    assert 0 < absolute_size <= tiny_balance


def test_huge_balance_still_respects_bounds(risk_manager):
    """Even with $1M balance, position sizing should be sane"""
    huge_balance = 1_000_000.0
    price = 0.50  # Cheap asset
    atr = 0.01  # Low volatility

    size = risk_manager.position_size_fraction(
        price=price, atr=atr, balance=huge_balance, symbol="XLM/USD"
    )

    # Should still be within bounds
    assert risk_manager.min_fraction <= size <= risk_manager.max_fraction

    # Absolute size could be large, but fraction is capped
    absolute_size = huge_balance * size
    assert absolute_size <= huge_balance * float(risk_manager.max_fraction)


def test_max_fraction_never_exceeded_across_scenarios(risk_manager):
    """Test comprehensive scenarios - max should NEVER be exceeded"""
    scenarios = [
        # (price, atr, balance)
        (50000, 100, 1000),  # High price, high ATR
        (0.10, 0.001, 100),  # Tiny price, tiny ATR
        (1000, 0.5, 10000),  # Mid price, low ATR
        (100, 50, 500),  # Mid price, very high ATR
        (0.50, 0.01, 50),  # Low price, low ATR, low balance
    ]

    for price, atr, balance in scenarios:
        size = risk_manager.position_size_fraction(
            price=price, atr=atr, balance=balance, symbol="TEST/USDT"
        )

        assert size <= risk_manager.max_fraction, (
            f"Max exceeded: size={size:.4f}, max={risk_manager.max_fraction}, price={price}, atr={atr}, balance={balance}"
        )


def test_min_fraction_never_undercut_across_scenarios(risk_manager):
    """Test comprehensive scenarios - min should NEVER be undercut (except invalid inputs)"""
    scenarios = [
        # (price, atr, balance)
        (50000, 5000, 1000),  # High price, extreme ATR
        (100, 100, 100),  # Equal price/ATR/balance
        (1, 0.1, 1000),  # Tiny price
        (10000, 1000, 10000),  # High ATR relative to price
    ]

    for price, atr, balance in scenarios:
        size = risk_manager.position_size_fraction(
            price=price, atr=atr, balance=balance, symbol="TEST/USDT"
        )

        assert size >= risk_manager.min_fraction, (
            f"Min undercut: size={size:.4f}, min={risk_manager.min_fraction}, price={price}, atr={atr}, balance={balance}"
        )


def test_approve_trade_rejects_oversized_position(risk_manager):
    """Trade approval should reject positions that are too large"""
    balance = 1000
    max_position = balance * float(risk_manager.max_fraction)

    # Try to open position larger than max
    oversized_position = max_position * 1.2

    approved, reason = risk_manager.approve_trade(
        position_size_usd=oversized_position,
        balance=balance,
        current_exposure=0,
        regime="calm",
    )

    assert not approved, "Should reject oversized position"
    assert "too large" in reason.lower()


def test_approve_trade_rejects_excessive_total_exposure(risk_manager):
    """Trade approval should reject trades that would exceed total exposure limit"""
    balance = 1000
    risk_manager.max_leverage = 1.0  # Force 1:1 leverage for this test
    current_exposure = balance * 0.21  # 21%

    # New position would push over 25% but is individually valid (5% < 25%)
    # Total would be 26% > 25%
    new_position = balance * 0.05  # 5%

    approved, reason = risk_manager.approve_trade(
        position_size_usd=new_position,
        balance=balance,
        current_exposure=current_exposure,
        regime="calm",
    )

    assert not approved, "Should reject trade that would exceed exposure limit"
    assert "exceed" in reason.lower() or "exposure" in reason.lower()


def test_approve_trade_accepts_reasonable_position(risk_manager):
    """Trade approval should accept properly sized positions"""
    balance = 1000
    reasonable_position = balance * 0.10  # 10% position, well within limits

    approved, reason = risk_manager.approve_trade(
        position_size_usd=reasonable_position,
        balance=balance,
        current_exposure=0,
        regime="calm",
    )

    assert approved, f"Should approve reasonable position: {reason}"
    assert "approved" in reason.lower()


def test_approve_trade_restricts_high_volatility_regime(risk_manager):
    """High volatility regime should have stricter position limits"""
    balance = 1000

    # Position that would be OK in calm market
    moderate_position = balance * 0.20  # 20%

    # Should be approved in calm regime
    approved_calm, _ = risk_manager.approve_trade(
        position_size_usd=moderate_position,
        balance=balance,
        current_exposure=0,
        regime="calm",
    )

    # Should be REJECTED in high volatility regime (max is halved)
    approved_high_vol, reason = risk_manager.approve_trade(
        position_size_usd=moderate_position,
        balance=balance,
        current_exposure=0,
        regime="high_volatility",
    )

    assert approved_calm, "Should approve in calm regime"
    assert not approved_high_vol, f"Should reject in high volatility regime: {reason}"


def test_approve_trade_blocks_on_high_drawdown(risk_manager):
    """Trade approval should block new positions during high drawdown"""
    balance = 1000
    reasonable_position = balance * 0.10

    # Simulate 25% drawdown (above 20% threshold)
    high_drawdown = 0.25

    approved, reason = risk_manager.approve_trade(
        position_size_usd=reasonable_position,
        balance=balance,
        current_exposure=0,
        regime="calm",
        max_drawdown=high_drawdown,
    )

    assert not approved, "Should block trades during high drawdown"
    assert "drawdown" in reason.lower()


def test_stop_loss_distance_adapts_to_regime(risk_manager):
    """Stop-loss distance should adapt based on market regime"""
    price = 50000
    atr = 500

    # Calculate stop-loss for different regimes
    stop_calm = risk_manager.calculate_stop_loss_distance(
        price=price, atr=atr, regime="calm"
    )

    stop_trending = risk_manager.calculate_stop_loss_distance(
        price=price, atr=atr, regime="trending"
    )

    stop_choppy = risk_manager.calculate_stop_loss_distance(
        price=price, atr=atr, regime="choppy"
    )

    stop_high_vol = risk_manager.calculate_stop_loss_distance(
        price=price, atr=atr, regime="high_volatility"
    )

    # Stops should be progressively wider
    assert stop_calm < stop_trending, "Trending stops should be wider than calm"
    assert stop_trending < stop_choppy, "Choppy stops should be wider than trending"
    assert stop_choppy < stop_high_vol, "High vol stops should be widest"


def test_stop_loss_respects_minimum(risk_manager):
    """Stop-loss should never be too tight (prevents noise stops)"""
    price = 1000
    tiny_atr = 0.1  # Extremely low volatility

    stop_distance = risk_manager.calculate_stop_loss_distance(
        price=price, atr=tiny_atr, regime="calm"
    )

    # Should be at least 1% of price (minimum)
    min_expected = price * 0.01
    assert stop_distance >= min_expected, (
        f"Stop-loss {stop_distance} below minimum {min_expected}"
    )


@pytest.mark.parametrize("regime", ["calm", "trending", "choppy", "high_volatility"])
def test_all_regimes_produce_valid_stops(risk_manager, regime):
    """All regimes should produce valid stop-loss distances"""
    price = 1000
    atr = 20

    stop = risk_manager.calculate_stop_loss_distance(
        price=price, atr=atr, regime=regime
    )

    # Stop should be positive and reasonable (between 0.5% and 10% of price)
    assert 0 < stop < price * 0.10, (
        f"Invalid stop distance {stop} for regime '{regime}'"
    )


def test_nan_and_inf_handled_gracefully(risk_manager):
    """System should handle NaN and Inf without crashing"""
    # NaN ATR
    size = risk_manager.position_size_fraction(
        price=1000, atr=float("nan"), balance=1000, symbol="TEST/USDT"
    )
    assert not math.isnan(size), "Should not return NaN"
    assert risk_manager.min_fraction <= size <= risk_manager.max_fraction

    # Inf ATR (should clamp to min position)
    size = risk_manager.position_size_fraction(
        price=1000, atr=float("inf"), balance=1000, symbol="TEST/USDT"
    )
    assert not math.isinf(size), "Should not return Inf"
    assert risk_manager.min_fraction <= size <= risk_manager.max_fraction
