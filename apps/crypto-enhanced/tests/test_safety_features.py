"""
Tests for fail-closed safety features:
  - Session loss limit (_monitor_session_loss_limit)
  - Disconnect order guard (_guard_pending_orders_on_disconnect)
  - Halt trading (_halt_trading)
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Add src to path so bare imports work (matches project convention)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from trading_engine import TradingEngine


def _make_engine(
    max_daily_loss_usd=12.0,
    min_balance_required=15.0,
):
    """Build a TradingEngine with fully mocked collaborators."""
    config = MagicMock()
    config.max_daily_loss_usd = max_daily_loss_usd
    config.min_balance_required = min_balance_required
    config.min_balance_alert = 50.0
    config.engine_loop_interval = 30
    config.trading_pairs = ["XLM/USD"]
    config.max_position_size = 10.0
    config.max_total_exposure = 10.0
    config.max_positions = 3
    config.use_enhanced_risk = False

    ws = MagicMock()
    ws.register_callback = MagicMock()
    ws.private_ws = MagicMock()  # default: connected

    kraken = MagicMock()
    db = MagicMock()
    db.log_event = AsyncMock()

    engine = TradingEngine(kraken, ws, db, config)
    # Stub async methods that _halt_trading may call
    engine.cancel_all_orders = AsyncMock()
    engine.close_position = AsyncMock()
    return engine


# ──────────────────────────────────────────────────────────────────────
# _monitor_session_loss_limit
# ──────────────────────────────────────────────────────────────────────


class TestSessionLossLimit:
    def test_halts_when_loss_exceeds_limit(self):
        engine = _make_engine(max_daily_loss_usd=12.0)
        engine.session_start_equity = 100.0
        engine.get_capital_summary = MagicMock(
            return_value={"total_portfolio_usd": 85.0}
        )

        asyncio.run(engine._monitor_session_loss_limit())

        assert engine.trading_halted is True
        assert "limit" in engine.trading_halt_reason.lower()
        engine.db.log_event.assert_called_once()

    def test_continues_when_loss_below_limit(self):
        engine = _make_engine(max_daily_loss_usd=12.0)
        engine.session_start_equity = 100.0
        engine.get_capital_summary = MagicMock(
            return_value={"total_portfolio_usd": 95.0}
        )

        asyncio.run(engine._monitor_session_loss_limit())

        assert engine.trading_halted is False

    def test_noop_when_max_daily_loss_is_zero(self):
        engine = _make_engine(max_daily_loss_usd=0)
        engine.session_start_equity = 100.0

        asyncio.run(engine._monitor_session_loss_limit())

        assert engine.trading_halted is False

    def test_noop_when_max_daily_loss_is_negative(self):
        engine = _make_engine(max_daily_loss_usd=-5)
        engine.session_start_equity = 100.0

        asyncio.run(engine._monitor_session_loss_limit())

        assert engine.trading_halted is False

    def test_noop_when_session_start_equity_is_none(self):
        engine = _make_engine(max_daily_loss_usd=12.0)
        engine.session_start_equity = None
        # _capture_session_baseline needs market_data to set equity
        engine.market_data = {}

        asyncio.run(engine._monitor_session_loss_limit())

        assert engine.trading_halted is False

    def test_noop_when_already_halted(self):
        engine = _make_engine(max_daily_loss_usd=12.0)
        engine.trading_halted = True
        engine.session_start_equity = 100.0

        asyncio.run(engine._monitor_session_loss_limit())

        # Should not call log_event again
        engine.db.log_event.assert_not_called()


# ──────────────────────────────────────────────────────────────────────
# _guard_pending_orders_on_disconnect
# ──────────────────────────────────────────────────────────────────────


class TestDisconnectOrderGuard:
    def test_cancels_orders_when_ws_disconnected_with_pending(self):
        engine = _make_engine()
        engine.websocket.private_ws = None  # disconnected
        engine.pending_orders = {"order1": {}, "order2": {}}

        asyncio.run(engine._guard_pending_orders_on_disconnect())

        engine.cancel_all_orders.assert_awaited_once()
        assert engine._disconnect_orders_cancelled is True

    def test_noop_when_ws_connected(self):
        engine = _make_engine()
        engine.websocket.private_ws = MagicMock()  # connected
        engine.pending_orders = {"order1": {}}

        asyncio.run(engine._guard_pending_orders_on_disconnect())

        engine.cancel_all_orders.assert_not_awaited()

    def test_noop_when_no_pending_orders(self):
        engine = _make_engine()
        engine.websocket.private_ws = None
        engine.pending_orders = {}

        asyncio.run(engine._guard_pending_orders_on_disconnect())

        engine.cancel_all_orders.assert_not_awaited()

    def test_only_cancels_once(self):
        engine = _make_engine()
        engine.websocket.private_ws = None
        engine.pending_orders = {"order1": {}}
        engine._disconnect_orders_cancelled = True

        asyncio.run(engine._guard_pending_orders_on_disconnect())

        engine.cancel_all_orders.assert_not_awaited()

    def test_resets_flag_when_ws_reconnects(self):
        engine = _make_engine()
        engine._disconnect_orders_cancelled = True
        engine.websocket.private_ws = MagicMock()  # reconnected
        engine.pending_orders = {"order1": {}}

        asyncio.run(engine._guard_pending_orders_on_disconnect())

        # Flag should be reset since ws is connected
        assert engine._disconnect_orders_cancelled is False


# ──────────────────────────────────────────────────────────────────────
# _halt_trading
# ──────────────────────────────────────────────────────────────────────


class TestHaltTrading:
    def test_sets_halted_flag_and_reason(self):
        engine = _make_engine()

        asyncio.run(engine._halt_trading("test reason"))

        assert engine.trading_halted is True
        assert engine.trading_halt_reason == "test reason"

    def test_disables_all_strategies(self):
        engine = _make_engine()
        s1 = MagicMock(enabled=True)
        s2 = MagicMock(enabled=True)
        engine.strategies = [s1, s2]

        asyncio.run(engine._halt_trading("test"))

        assert s1.enabled is False
        assert s2.enabled is False

    def test_logs_critical_event(self):
        engine = _make_engine()

        asyncio.run(engine._halt_trading("balance too low"))

        engine.db.log_event.assert_called_once_with(
            "trading_halted",
            "balance too low",
            severity="CRITICAL",
            metadata={"close_positions": False, "cancel_orders": True},
        )

    def test_cancels_orders_by_default(self):
        engine = _make_engine()
        engine.pending_orders = {"order1": {}}

        asyncio.run(engine._halt_trading("reason", cancel_orders=True))

        engine.cancel_all_orders.assert_awaited_once()

    def test_closes_positions_when_requested(self):
        engine = _make_engine()
        engine.open_positions = {"pos1": {"pair": "XLM/USD"}}

        asyncio.run(
            engine._halt_trading("reason", close_positions=True, cancel_orders=False)
        )

        engine.close_position.assert_awaited_once()

    def test_idempotent_second_call_is_noop(self):
        engine = _make_engine()

        asyncio.run(engine._halt_trading("first halt"))
        engine.db.log_event.reset_mock()

        asyncio.run(engine._halt_trading("second halt"))

        # Should not log again
        engine.db.log_event.assert_not_called()
        # Reason should remain the first one
        assert engine.trading_halt_reason == "first halt"
