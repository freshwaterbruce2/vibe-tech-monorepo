"""Tests for DB-backed strategy trade limits."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

from strategies import MicroScalpingStrategy


class FakeCursor:
    def __init__(self, count: int):
        self.count = count

    async def fetchone(self):
        return (self.count,)


class FakeConnection:
    def __init__(self, count: int):
        self.count = count
        self.queries = []

    async def execute(self, query: str, params: tuple):
        self.queries.append((query, params))
        return FakeCursor(self.count)


def make_strategy(persisted_count: int, *, max_daily: int = 12, max_hourly: int = 3):
    config = SimpleNamespace(
        xlm_cooldown_minutes=0,
        xlm_min_order_size=20,
        strategies={
            "micro_scalping": {
                "enabled": True,
                "position_size_usd": 8.5,
                "max_daily_trades": max_daily,
                "max_trades_per_hour": max_hourly,
                "enable_above_usd_balance": 50,
            }
        },
    )
    engine = SimpleNamespace(
        db=SimpleNamespace(conn=FakeConnection(persisted_count)),
        trading_halted=False,
        market_data={},
        positions={},
        place_order=AsyncMock(return_value={"order_id": "order-1"}),
    )
    return MicroScalpingStrategy(engine, config), engine


def test_daily_limit_uses_persisted_activity_after_restart():
    strategy, _ = make_strategy(persisted_count=12, max_daily=12)

    assert asyncio.run(strategy.can_trade_with_persisted_limits()) is False


def test_hourly_limit_uses_persisted_activity_after_restart():
    strategy, _ = make_strategy(persisted_count=3, max_daily=12, max_hourly=3)

    assert asyncio.run(strategy.can_trade_with_persisted_limits()) is False


def test_place_trade_rejects_before_order_when_persisted_limit_reached():
    strategy, engine = make_strategy(persisted_count=12, max_daily=12)

    result = asyncio.run(
        strategy.place_trade("buy", volume_usd=8.5, order_type="limit", price=0.3)
    )

    assert "error" in result
    engine.place_order.assert_not_called()
