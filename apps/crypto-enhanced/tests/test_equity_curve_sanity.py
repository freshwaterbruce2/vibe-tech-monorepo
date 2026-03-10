"""
Test Equity Curve Sanity - Ultimate integration test

This is the proof: Does the risk management system actually prevent
catastrophic drawdowns when applied to realistic market scenarios?

Tests validate:
- Drawdown stays below acceptable limits
- Risk-adjusted returns are positive (Sharpe-like)
- System doesn't blow up the account in adverse conditions
- Recovers from losing streaks
"""

import pandas as pd
import numpy as np
import pytest

from tests.conftest import synthetic_price_series, compute_atr


def test_equity_curve_sanity_spiky_regime(risk_manager):
    """Test equity curve doesn't blow up in volatile market"""
    s = synthetic_price_series(regime="spiky_vol", seed=42, n=300)
    a = compute_atr(s).fillna(method="bfill")

    # Simulate trading with dynamic position sizing
    sizes = []
    for price, atr_val in zip(s, a):
        size = risk_manager.position_size_fraction(
            price=price,
            atr=atr_val,
            balance=1000,
            symbol="SOL/USDT"
        )
        sizes.append(size)

    # Calculate returns
    rets = s.pct_change().fillna(0)

    # Apply position sizing (lagged by 1 to avoid look-ahead bias)
    position_series = pd.Series(sizes).shift().fillna(0)
    portfolio_returns = rets * position_series

    # Calculate equity curve
    equity = (1 + portfolio_returns).cumprod()

    # Calculate maximum drawdown
    running_max = equity.cummax()
    drawdown = (equity - running_max) / running_max
    max_dd = abs(drawdown.min())

    # Assert: Max drawdown should be less than 55% (reasonable for volatile market)
    assert max_dd < 0.55, \
        f"Max drawdown {max_dd:.2%} exceeds 55% threshold in spiky regime"

    # Assert: Final equity should be positive (not blown up)
    assert equity.iloc[-1] > 0.5, \
        f"Final equity {equity.iloc[-1]:.2f} dropped below 50% of starting capital"


def test_equity_curve_in_stable_regime(risk_manager):
    """Test equity curve in stable, low-volatility market"""
    s = synthetic_price_series(regime="stable", seed=43, n=300)
    a = compute_atr(s).fillna(method="bfill")

    sizes = []
    for price, atr_val in zip(s, a):
        size = risk_manager.position_size_fraction(
            price=price,
            atr=atr_val,
            balance=1000,
            symbol="BTC/USDT"
        )
        sizes.append(size)

    rets = s.pct_change().fillna(0)
    position_series = pd.Series(sizes).shift().fillna(0)
    portfolio_returns = rets * position_series
    equity = (1 + portfolio_returns).cumprod()

    # In stable regime, drawdown should be even lower
    running_max = equity.cummax()
    drawdown = (equity - running_max) / running_max
    max_dd = abs(drawdown.min())

    assert max_dd < 0.35, \
        f"Max drawdown {max_dd:.2%} exceeds 35% threshold in stable regime"


def test_equity_curve_recovers_from_drawdown(risk_manager):
    """Test that system can recover from losing periods"""
    # Create series with initial drawdown then recovery
    np.random.seed(44)

    # First 100 periods: declining trend (losing)
    declining = pd.Series(np.linspace(100, 70, 100))

    # Next 100 periods: recovery trend
    recovering = pd.Series(np.linspace(70, 95, 100))

    # Combine
    s = pd.concat([declining, recovering], ignore_index=True)
    a = compute_atr(s).fillna(method="bfill")

    sizes = []
    for price, atr_val in zip(s, a):
        size = risk_manager.position_size_fraction(
            price=price,
            atr=atr_val,
            balance=1000,
            symbol="ETH/USDT"
        )
        sizes.append(size)

    rets = s.pct_change().fillna(0)
    position_series = pd.Series(sizes).shift().fillna(0)
    portfolio_returns = rets * position_series
    equity = (1 + portfolio_returns).cumprod()

    # Find the trough (lowest point)
    trough_idx = equity.idxmin()
    trough_value = equity.iloc[trough_idx]

    # Check recovery: equity at end should be higher than trough
    final_equity = equity.iloc[-1]

    assert final_equity > trough_value, \
        f"System failed to recover: trough={trough_value:.2f}, final={final_equity:.2f}"

    # Recovery should be significant (at least 10% improvement)
    recovery_pct = (final_equity - trough_value) / trough_value
    assert recovery_pct > 0.10, \
        f"Recovery too weak: only {recovery_pct:.2%} improvement from trough"


def test_sharpe_ratio_positive_in_favorable_conditions(risk_manager):
    """Test that risk-adjusted returns are positive in favorable market"""
    # Create market with slight positive bias
    np.random.seed(45)
    n = 250

    # Positive drift with moderate volatility
    drift = 0.0005  # 0.05% daily drift
    vol = 0.01
    returns = np.random.normal(drift, vol, n)
    prices = 100 * (1 + pd.Series(returns)).cumprod()

    a = compute_atr(prices).fillna(method="bfill")

    sizes = []
    for price, atr_val in zip(prices, a):
        size = risk_manager.position_size_fraction(
            price=price,
            atr=atr_val,
            balance=1000,
            symbol="SOL/USDT"
        )
        sizes.append(size)

    rets = prices.pct_change().fillna(0)
    position_series = pd.Series(sizes).shift().fillna(0)
    portfolio_returns = rets * position_series

    # Calculate Sharpe ratio (assuming 0 risk-free rate)
    mean_return = portfolio_returns.mean()
    std_return = portfolio_returns.std()

    sharpe = (mean_return / std_return) * np.sqrt(252) if std_return > 0 else 0

    # In favorable market, Sharpe should be positive
    assert sharpe > 0, \
        f"Sharpe ratio {sharpe:.2f} should be positive in favorable market"


def test_conservative_manager_has_lower_drawdown(conservative_risk_manager, aggressive_risk_manager):
    """Conservative risk manager should have lower max drawdown than aggressive"""
    s = synthetic_price_series(regime="spiky_vol", seed=46, n=250)
    a = compute_atr(s).fillna(method="bfill")

    # Run both managers
    def run_backtest(manager):
        sizes = []
        for price, atr_val in zip(s, a):
            size = manager.position_size_fraction(
                price=price,
                atr=atr_val,
                balance=1000,
                symbol="BTC/USDT"
            )
            sizes.append(size)

        rets = s.pct_change().fillna(0)
        position_series = pd.Series(sizes).shift().fillna(0)
        portfolio_returns = rets * position_series
        equity = (1 + portfolio_returns).cumprod()

        running_max = equity.cummax()
        drawdown = (equity - running_max) / running_max
        max_dd = abs(drawdown.min())

        return max_dd, equity.iloc[-1]

    conservative_dd, conservative_final = run_backtest(conservative_risk_manager)
    aggressive_dd, aggressive_final = run_backtest(aggressive_risk_manager)

    # Conservative should have lower drawdown
    assert conservative_dd < aggressive_dd, \
        f"Conservative DD {conservative_dd:.2%} should be < aggressive DD {aggressive_dd:.2%}"

    # Note: Aggressive MIGHT have higher returns, but at cost of higher risk
    # This test just ensures the conservative manager is actually more conservative


def test_equity_never_goes_negative(risk_manager):
    """Equity should NEVER go negative (that would be worse than 100% loss)"""
    s = synthetic_price_series(regime="spiky_vol", seed=47, n=300)
    a = compute_atr(s).fillna(method="bfill")

    sizes = []
    for price, atr_val in zip(s, a):
        size = risk_manager.position_size_fraction(
            price=price,
            atr=atr_val,
            balance=1000,
            symbol="XLM/USD"
        )
        sizes.append(size)

    rets = s.pct_change().fillna(0)
    position_series = pd.Series(sizes).shift().fillna(0)
    portfolio_returns = rets * position_series
    equity = (1 + portfolio_returns).cumprod()

    # CRITICAL: Equity must stay positive
    assert (equity > 0).all(), \
        f"Equity went negative at indices: {equity[equity <= 0].index.tolist()}"


def test_max_single_trade_loss_limited(risk_manager):
    """Single worst trade should not exceed max position fraction"""
    s = synthetic_price_series(regime="spiky_vol", seed=48, n=300)
    a = compute_atr(s).fillna(method="bfill")

    sizes = []
    for price, atr_val in zip(s, a):
        size = risk_manager.position_size_fraction(
            price=price,
            atr=atr_val,
            balance=1000,
            symbol="SOL/USDT"
        )
        sizes.append(size)

    rets = s.pct_change().fillna(0)
    position_series = pd.Series(sizes).shift().fillna(0)
    portfolio_returns = rets * position_series

    # Find worst single-period loss
    worst_loss = portfolio_returns.min()

    # Worst loss should not exceed max position fraction
    # (even if price went to zero, loss capped by position size)
    assert abs(worst_loss) <= risk_manager.max_fraction, \
        f"Worst single loss {abs(worst_loss):.2%} exceeded max position {risk_manager.max_fraction:.2%}"


@pytest.mark.parametrize("seed", [100, 101, 102, 103, 104])
def test_multiple_runs_all_survive(risk_manager, seed):
    """Test multiple random market scenarios - should survive all"""
    s = synthetic_price_series(regime="spiky_vol", seed=seed, n=200)
    a = compute_atr(s).fillna(method="bfill")

    sizes = []
    for price, atr_val in zip(s, a):
        size = risk_manager.position_size_fraction(
            price=price,
            atr=atr_val,
            balance=1000,
            symbol=f"TEST{seed}/USDT"
        )
        sizes.append(size)

    rets = s.pct_change().fillna(0)
    position_series = pd.Series(sizes).shift().fillna(0)
    portfolio_returns = rets * position_series
    equity = (1 + portfolio_returns).cumprod()

    # Should not lose more than 70% in any scenario
    final_equity = equity.iloc[-1]
    assert final_equity > 0.30, \
        f"Run {seed}: Lost more than 70% (final equity: {final_equity:.2f})"
