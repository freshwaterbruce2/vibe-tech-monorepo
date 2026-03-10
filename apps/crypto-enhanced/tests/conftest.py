"""
Shared fixtures for crypto trading system tests

This module provides:
- Risk manager fixtures
- Synthetic price generation for various volatility regimes
- ATR calculation helpers
- Test data generators
"""

import numpy as np
import pandas as pd
import pytest
from risk.enhanced_risk_manager import EnhancedRiskManager


@pytest.fixture
def risk_manager():
    """Standard risk manager for testing"""
    return EnhancedRiskManager(
        base_kelly_fraction=0.05,
        max_leverage=3.0,
        min_position_fraction=0.001,
        max_position_fraction=0.25,
    )


@pytest.fixture
def conservative_risk_manager():
    """More conservative risk manager for stress tests"""
    return EnhancedRiskManager(
        base_kelly_fraction=0.01,  # Half the normal Kelly
        max_leverage=2.0,  # Lower leverage
        min_position_fraction=0.005,
        max_position_fraction=0.15,  # Lower max position
    )


@pytest.fixture
def aggressive_risk_manager():
    """More aggressive risk manager for comparison"""
    return EnhancedRiskManager(
        base_kelly_fraction=0.05,  # Higher Kelly
        max_leverage=5.0,  # Higher leverage
        min_position_fraction=0.02,
        max_position_fraction=0.40,  # Higher max position
    )


def synthetic_price_series(n=300, regime="rising_vol", seed=0):
    """
    Generate synthetic price series with different volatility regimes

    Args:
        n: Number of data points
        regime: Volatility regime - "rising_vol", "falling_vol", "spiky_vol", "stable"
        seed: Random seed for reproducibility

    Returns:
        pd.Series of prices with specified regime characteristics
    """
    rng = np.random.default_rng(seed)
    base_returns = rng.normal(0, 0.001, n)

    if regime == "rising_vol":
        # Volatility increases linearly
        sigmas = np.linspace(0.002, 0.02, n)
    elif regime == "falling_vol":
        # Volatility decreases linearly
        sigmas = np.linspace(0.02, 0.002, n)
    elif regime == "spiky_vol":
        # Occasional volatility spikes
        sigmas = np.full(n, 0.01)  # 1% baseline volatility (realistic for crypto)
        sigmas[::25] = 0.08  # Spike every 25 periods (8% volatility)
    else:  # "stable"
        # Constant moderate volatility
        sigmas = np.full(n, 0.006)

    # Generate returns with time-varying volatility
    rets = base_returns + rng.normal(0, 1, n) * sigmas

    # Convert to price series starting at 100
    prices = 100 * (1 + rets).cumprod()

    return pd.Series(prices, name="close")


def compute_atr(close, period=14):
    """
    Compute Average True Range (ATR) from price series

    ATR measures volatility by decomposing the entire range of an asset price
    for that period. Uses exponentially weighted moving average.

    Args:
        close: pandas Series of closing prices
        period: ATR period (default 14)

    Returns:
        pandas Series of ATR values
    """
    # Approximate high/low from close (for testing)
    high = close * 1.0005  # Assume 0.05% spread above
    low = close * 0.9995  # Assume 0.05% spread below

    # True Range components:
    # 1. Current high - current low
    # 2. abs(current high - previous close)
    # 3. abs(current low - previous close)
    tr = pd.concat(
        [
            (high - low),
            (high - close.shift()).abs(),
            (low - close.shift()).abs(),
        ],
        axis=1,
    ).max(axis=1)

    # ATR is exponentially weighted moving average of TR
    return (
        tr.ewm(alpha=1 / period, adjust=False).mean().bfill()
    )  # Use bfill() instead of deprecated fillna(method="bfill")


@pytest.fixture
def sample_price_data():
    """Generate sample price data for quick tests"""
    return synthetic_price_series(n=100, regime="stable", seed=42)


@pytest.fixture
def sample_atr_data(sample_price_data):
    """Generate sample ATR data for quick tests"""
    return compute_atr(sample_price_data)


def generate_trade_sequence(n_trades=50, win_rate=0.55, avg_win=10, avg_loss=8, seed=0):
    """
    Generate realistic trade P&L sequence

    Args:
        n_trades: Number of trades to generate
        win_rate: Probability of winning trade (0-1)
        avg_win: Average win amount in dollars
        avg_loss: Average loss amount in dollars
        seed: Random seed

    Returns:
        List of trade P&L values
    """
    rng = np.random.default_rng(seed)

    # Generate win/loss sequence
    wins = rng.random(n_trades) < win_rate

    trades = []
    for is_win in wins:
        if is_win:
            # Win with some variance
            pnl = rng.normal(avg_win, avg_win * 0.2)
        else:
            # Loss with some variance (negative)
            pnl = -rng.normal(avg_loss, avg_loss * 0.2)
        trades.append(pnl)

    return trades


@pytest.fixture
def profitable_trade_history():
    """Generate profitable trade history for testing"""
    return generate_trade_sequence(
        n_trades=100, win_rate=0.60, avg_win=12, avg_loss=8, seed=123
    )


@pytest.fixture
def losing_trade_history():
    """Generate losing trade history for testing"""
    return generate_trade_sequence(
        n_trades=100, win_rate=0.40, avg_win=8, avg_loss=12, seed=456
    )
