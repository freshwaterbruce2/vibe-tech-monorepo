"""Regression tests for the offline paper backtest script."""

from __future__ import annotations

import importlib.util
import sys
from dataclasses import replace
from pathlib import Path


def load_backtest_module():
    """Load scripts/backtest_simulation.py without requiring scripts as a package."""
    module_path = Path(__file__).resolve().parents[1] / "scripts" / "backtest_simulation.py"
    spec = importlib.util.spec_from_file_location("backtest_simulation", module_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_paper_backtest_generates_closed_paper_trades():
    backtest = load_backtest_module()
    config_data = backtest.load_example_config()
    settings = backtest.build_settings(config_data, initial_balance=100.0)
    candles = backtest.detailed_synthetic_price_series(
        n=800,
        regime="range_bound",
        seed=43,
    )

    result = backtest.run_paper_backtest(
        candles=candles,
        settings=settings,
        risk_manager=backtest.build_risk_manager(config_data),
        regime_name="range_bound",
    )

    assert result.total_orders > 0
    assert result.round_trips > 0
    assert result.open_position_xlm == 0
    assert result.max_exposure_usd <= settings.max_total_exposure_usd
    assert min(result.equity_curve) > 0
    assert {trade.action for trade in result.trades} == {"entry", "exit"}


def test_paper_backtest_respects_minimum_order_size():
    backtest = load_backtest_module()
    config_data = backtest.load_example_config()
    settings = replace(
        backtest.build_settings(config_data, initial_balance=100.0),
        min_order_size_xlm=10_000.0,
    )
    candles = backtest.detailed_synthetic_price_series(
        n=300,
        regime="trending_up",
        seed=99,
    )

    result = backtest.run_paper_backtest(
        candles=candles,
        settings=settings,
        risk_manager=backtest.build_risk_manager(config_data),
        regime_name="trending_up",
    )

    assert result.total_orders == 0
    assert result.final_equity == settings.initial_balance
    assert result.max_exposure_usd == 0
