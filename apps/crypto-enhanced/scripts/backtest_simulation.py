import os
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

from risk.enhanced_risk_manager import EnhancedRiskManager


def detailed_synthetic_price_series(n=1000, regime="spiky_vol", seed=42):
    """Generate high-resolution synthetic data for backtesting"""
    rng = np.random.default_rng(seed)

    # Base trend
    if regime == "trending_up":
        trend = np.linspace(0, 0.5, n)  # 50% gain
        vol_base = 0.005
    elif regime == "crash":
        trend = np.linspace(0, -0.4, n)  # 40% loss
        vol_base = 0.02
    else:  # spiky/choppy
        trend = np.zeros(n)
        vol_base = 0.01

    # Volatility structure
    vol = np.full(n, vol_base)
    if "spiky" in regime:
        # Add random spikes
        spike_locs = rng.choice(n, size=int(n * 0.05), replace=False)
        vol[spike_locs] = vol_base * 5.0

    # Generate returns
    rets = rng.normal(0, vol, n) + (trend[1] - trend[0] if n > 1 else 0)

    # Price path
    prices = 100 * (1 + rets).cumprod()

    # Generate timestamp index (hourly)
    start_date = datetime.now() - timedelta(hours=n)
    dates = [start_date + timedelta(hours=i) for i in range(n)]

    return pd.DataFrame(
        {
            "timestamp": dates,
            "close": prices,
            "high": prices * (1 + vol / 2),
            "low": prices * (1 - vol / 2),
            "open": prices,  # Simplified
        }
    )


def run_simulation():
    print("=" * 60)
    print("RUNNING SYNTHETIC BACKTEST (Crypto-Enhanced)")
    print("=" * 60)

    # 1. Setup Environment
    risk_manager = EnhancedRiskManager(
        base_kelly_fraction=0.05,
        max_leverage=1.0,  # Conservative for test
        min_position_fraction=0.01,
        max_position_fraction=0.20,
    )

    # 2. Generate Data (2000 hours ~ 3 months)
    print("\nGenerating synthetic market data (Regime: Trending Up)...")
    df = detailed_synthetic_price_series(n=2000, regime="trending_up")

    # Calculate indicators
    df["atr"] = (df["high"] - df["low"]).rolling(14).mean().bfill()
    df["ma_fast"] = df["close"].rolling(20).mean()
    df["ma_slow"] = df["close"].rolling(50).mean()
    df["ema_trend"] = df["close"].ewm(span=200).mean()

    # RSI Calculation
    delta = df["close"].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df["rsi"] = 100 - (100 / (1 + rs))

    # 3. Simulate Loop
    balance = 10000.0
    position = 0.0
    entry_price = 0.0
    trades = []
    equity_curve = [balance]

    print(f"Starting Balance: ${balance:.2f}")

    for i in range(200, len(df)):
        row = df.iloc[i]
        prev_row = df.iloc[i - 1]

        # Enhanced Logic: Crossover + Trend + RSI
        crossover = (
            row["ma_fast"] > row["ma_slow"]
            and prev_row["ma_fast"] <= prev_row["ma_slow"]
        )
        trend_filter = row["close"] > row["ema_trend"]  # Trade with long term trend
        momentum_ok = row["rsi"] < 70  # Not overbought

        long_signal = crossover and trend_filter and momentum_ok

        # Exit Signal: Breakdown or RSI Overbought
        exit_signal = (row["ma_fast"] < row["ma_slow"]) or (row["rsi"] > 85)

        # Market Regime (Simplified detection from Price relative to MA)
        regime = (
            "trending" if abs(row["close"] - row["ma_slow"]) > row["atr"] else "calm"
        )
        if row["atr"] > df["atr"].mean() * 1.5:
            regime = "high_volatility"

        # Execute Strategy
        if position == 0 and long_signal:
            # Risk Check
            # Risk Check
            approved, reason = risk_manager.approve_trade(
                balance=balance,
                current_exposure=0.0,
                position_size_usd=balance * 0.95,  # 95% equity
                regime=regime,
            )

            # Pack into dict to match expected usage below
            trade_decision = {"approved": approved, "reason": reason}

            if trade_decision["approved"]:
                position = balance / row["close"]
                entry_price = row["close"]
                # Stop loss distance
                sl_dist = risk_manager.calculate_stop_loss_distance(
                    price=row["close"], atr=row["atr"], regime=regime
                )
                stop_loss = row["close"] - sl_dist
                print(
                    f"[{df.index[i]}] BUY @ {row['close']:.2f} | Regime: {regime} | Stop: {stop_loss:.2f}"
                )

        elif position > 0 and (exit_signal or row["low"] < stop_loss):
            exit_price = row["close"]
            if row["low"] < stop_loss:
                exit_price = stop_loss
                print(f"[{df.index[i]}] STOP LOSS triggered @ {exit_price:.2f}")
            else:
                print(f"[{df.index[i]}] SELL @ {exit_price:.2f}")

            pnl = (exit_price - entry_price) * position
            balance += pnl
            trades.append(pnl)
            position = 0.0

        equity_curve.append(balance)

    # Stats
    # Calculation helper
    wins = [t for t in trades if t > 0]
    win_rate = len(wins) / len(trades) if trades else 0.0

    # Calculate Max Drawdown
    equity_series = pd.Series(equity_curve)
    rolling_max = equity_series.cummax()
    drawdown = (equity_series - rolling_max) / rolling_max
    max_dd = drawdown.min()

    print("\nSimulation Complete.")
    print(f"Final Balance: ${balance:.2f} ({((balance / 10000) - 1) * 100:.2f}%)")
    print(f"Total Trades: {len(trades)}")
    print(f"Win Rate: {win_rate * 100:.1f}%")
    print(f"Max Drawdown: {max_dd * 100:.2f}%")


if __name__ == "__main__":
    run_simulation()
