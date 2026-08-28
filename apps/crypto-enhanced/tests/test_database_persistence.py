"""SQLite persistence tests using temporary databases only."""

import asyncio
import json
from datetime import datetime, timedelta

from database import Database


def run_async(coro):
    """Run async database code from sync pytest tests."""
    return asyncio.run(coro)


def test_initialize_creates_expected_tables_and_close_resets_connection(tmp_path):
    """Database initialization should create the current app schema."""

    async def scenario():
        db = Database(str(tmp_path / "trading.db"))
        await db.initialize()

        assert await db.is_connected()
        assert db.conn is not None

        cursor = await db.conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
        tables = {row[0] for row in await cursor.fetchall()}

        assert {
            "orders",
            "trades",
            "positions",
            "market_data",
            "performance",
            "events",
            "executions",
            "balance_history",
        }.issubset(tables)

        await db.close()
        assert db.conn is None

    run_async(scenario())


def test_context_manager_closes_database_connection(tmp_path):
    """The async context manager should always close the connection."""

    async def scenario():
        db = Database(str(tmp_path / "trading.db"))

        async with db as active_db:
            assert active_db is db
            assert await db.is_connected()

        assert db.conn is None

    run_async(scenario())


def test_log_order_persists_websocket_and_rest_order_shapes(tmp_path):
    """Order logging should normalize both WebSocket and REST-style payloads."""

    async def scenario():
        async with Database(str(tmp_path / "trading.db")) as db:
            await db.log_order(
                {
                    "order_id": "WS-1",
                    "symbol": "XLM/USD",
                    "side": "buy",
                    "order_type": "limit",
                    "volume": 25.0,
                    "price": 0.12,
                    "status": "open",
                    "source": "websocket",
                }
            )
            await db.log_order(
                {
                    "txid": ["REST-1"],
                    "descr": {
                        "pair": "BTC/USD",
                        "type": "sell",
                        "ordertype": "market",
                    },
                    "vol": 0.5,
                    "price": 42000.0,
                }
            )

            orders = {order["order_id"]: order for order in await db.get_orders()}

        websocket_order = orders["WS-1"]
        rest_order = orders["REST-1"]

        assert websocket_order["pair"] == "XLM/USD"
        assert websocket_order["side"] == "buy"
        assert websocket_order["order_type"] == "limit"
        assert websocket_order["volume"] == 25.0
        assert websocket_order["status"] == "open"
        assert json.loads(websocket_order["metadata"])["source"] == "websocket"

        assert rest_order["pair"] == "BTC/USD"
        assert rest_order["side"] == "sell"
        assert rest_order["order_type"] == "market"
        assert rest_order["status"] == "new"

    run_async(scenario())


def test_log_trade_and_performance_metrics_use_current_columns(tmp_path):
    """Trades and performance metrics should persist through current columns."""

    async def scenario():
        async with Database(str(tmp_path / "trading.db")) as db:
            await db.log_trade(
                {
                    "trade_id": "TRADE-1",
                    "order_id": "WS-1",
                    "pair": "XLM/USD",
                    "side": "buy",
                    "price": 0.1234,
                    "volume": 50.0,
                    "fee": 0.01,
                    "time": 1700000000,
                }
            )
            await db.log_trade(
                {
                    "trade_id": "TRADE-2",
                    "order_id": "WS-2",
                    "pair": "BTC/USD",
                    "side": "sell",
                    "price": 42000.0,
                    "volume": 0.1,
                    "fee": 2.5,
                    "time": "2026-01-01T00:00:00Z",
                }
            )
            await db.log_performance(
                {
                    "total_pnl": 12.5,
                    "win_rate": 0.75,
                    "sharpe_ratio": 1.4,
                    "max_drawdown": 0.08,
                    "total_trades": 8,
                    "winning_trades": 6,
                    "losing_trades": 2,
                }
            )

            xlm_trades = await db.get_trades(pair="XLM/USD")
            latest_metrics = await db.get_performance_metrics()

        assert len(xlm_trades) == 1
        assert xlm_trades[0]["trade_id"] == "TRADE-1"
        assert xlm_trades[0]["volume"] == 50.0
        assert xlm_trades[0]["executed_at"].endswith("Z")

        assert latest_metrics["total_pnl"] == 12.5
        assert latest_metrics["win_rate"] == 0.75
        assert json.loads(latest_metrics["metadata"])["winning_trades"] == 6

    run_async(scenario())


def test_event_execution_and_balance_history_persistence(tmp_path):
    """Auxiliary runtime telemetry should round-trip through SQLite."""

    async def scenario():
        async with Database(str(tmp_path / "trading.db")) as db:
            await db.log_event(
                "startup_validator",
                "checks passed",
                severity="INFO",
                metadata={"checks": 4},
            )
            await db.log_execution(
                {
                    "order_id": "ORDER-1",
                    "exec_id": "EXEC-1",
                    "exec_type": "trade",
                    "trade_id": "TRADE-1",
                    "symbol": "XLM/USD",
                    "side": "buy",
                    "last_qty": 10.0,
                    "last_price": 0.12,
                    "liquidity_ind": "m",
                    "cost": 1.2,
                    "order_userref": 99,
                    "order_status": "filled",
                    "order_type": "limit",
                    "fee_usd_equiv": 0.01,
                    "timestamp": "2026-01-01T00:00:00Z",
                }
            )
            await db.log_balance(125.5, 3000.0, source="unit-test")

            events = await db.get_events(event_type="startup_validator")
            executions = await db.get_recent_executions()
            cursor = await db.conn.execute(
                "SELECT usd_balance, xlm_balance, source FROM balance_history"
            )
            balances = await cursor.fetchall()

        assert len(events) == 1
        assert events[0]["message"] == "checks passed"
        assert json.loads(events[0]["metadata"]) == {"checks": 4}

        assert len(executions) == 1
        assert executions[0]["exec_id"] == "EXEC-1"
        assert executions[0]["symbol"] == "XLM/USD"
        assert json.loads(executions[0]["metadata"])["order_status"] == "filled"

        assert balances == [(125.5, 3000.0, "unit-test")]

    run_async(scenario())


def test_position_logging_and_daily_pnl_use_current_position_schema(tmp_path):
    """Daily P&L should only include today's closed positions."""

    async def scenario():
        async with Database(str(tmp_path / "trading.db")) as db:
            await db.log_position(
                {
                    "position_id": "OPEN-1",
                    "pair": "XLM/USD",
                    "side": "long",
                    "entry_price": 0.1,
                    "volume": 100.0,
                    "status": "open",
                }
            )

            today = datetime.now().isoformat()
            yesterday = (datetime.now() - timedelta(days=1)).isoformat()

            await db.conn.executemany(
                """
                INSERT INTO positions (
                    position_id, pair, side, entry_price, volume, status, closed_at, pnl
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    ("CLOSED-TODAY-1", "XLM/USD", "long", 0.1, 100.0, "closed", today, 4.25),
                    ("CLOSED-TODAY-2", "XLM/USD", "long", 0.1, 50.0, "closed", today, -1.0),
                    ("CLOSED-OLD", "XLM/USD", "long", 0.1, 10.0, "closed", yesterday, 99.0),
                ],
            )
            await db.conn.commit()

            daily_pnl = await db.get_daily_pnl()
            cursor = await db.conn.execute(
                "SELECT status, metadata FROM positions WHERE position_id = ?",
                ("OPEN-1",),
            )
            open_position = await cursor.fetchone()

        assert daily_pnl == 3.25
        assert open_position[0] == "open"
        assert json.loads(open_position[1])["position_id"] == "OPEN-1"

    run_async(scenario())
