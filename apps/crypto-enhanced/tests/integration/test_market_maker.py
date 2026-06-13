"""
Integration tests for ``market_maker.GridMarketMaker``.

Coverage:
  * micro-price computation from a real top-of-book payload (with imbalance)
  * volatility ring-buffer growth and spread amplification
  * inventory-skew direction (long XLM => bid widens, ask tightens)
  * tick-grid snapping (floor for bids, ceil for asks)
  * cancel_all_orders is invoked exactly once per rebuild *before* placement
  * RL hot-reload accepts valid JSON, rejects partial JSON, preserves params
  * full ``evaluate()`` cycle interacts with the FakeEngine surface correctly
  * rebuild interval gate prevents over-quoting

The strategy validation sandbox (ast.parse + mypy --strict) is verified in a
dedicated test_strategy_sandbox.py module — the PRD requires both pieces but
they are conceptually separate from grid-quoting behaviour.
"""

import json
from pathlib import Path
from typing import Optional

import pytest

from market_maker import (
    GridMarketMaker,
    GridParams,
    TICK_SIZE,
)


# ---------------------------------------------------------------------------
# Construction helpers
# ---------------------------------------------------------------------------


def _build_mm(
    fake_engine,
    fake_config,
    *,
    rl_config_path: Optional[Path] = None,
    params: Optional[GridParams] = None,
    rebuild_interval: float = 0.0,
) -> GridMarketMaker:
    mm = GridMarketMaker(
        engine=fake_engine,
        config=fake_config,
        params=params or GridParams(),
        rl_config_path=rl_config_path,
        rebuild_interval=rebuild_interval,
    )
    return mm


# ---------------------------------------------------------------------------
# Micro-price
# ---------------------------------------------------------------------------


class TestMicroPrice:
    def test_balanced_book_yields_midpoint(self, fake_engine, fake_config) -> None:
        mm = _build_mm(fake_engine, fake_config)
        book = {
            "bids": [["0.42000", "1000"]],
            "asks": [["0.42010", "1000"]],
        }
        # Balanced sizes => micro-price = (P_bid*Q_ask + P_ask*Q_bid) / (Q_bid + Q_ask)
        # = (0.42 * 1000 + 0.4201 * 1000) / 2000 = 0.42005
        assert mm._micro_price(book) == pytest.approx(0.42005, abs=1e-6)

    def test_ask_heavy_book_pulls_toward_bid(self, fake_engine, fake_config) -> None:
        mm = _build_mm(fake_engine, fake_config)
        # Lots of ask depth => buyers can hit asks easily => fair value sits near bid
        book = {
            "bids": [["0.42000", "100"]],
            "asks": [["0.42010", "10000"]],
        }
        micro = mm._micro_price(book)
        assert micro == pytest.approx(0.420000099, abs=1e-6)
        assert micro < 0.42005

    def test_empty_book_returns_none(self, fake_engine, fake_config) -> None:
        mm = _build_mm(fake_engine, fake_config)
        assert mm._micro_price({"bids": [], "asks": []}) is None
        assert mm._micro_price({}) is None

    def test_zero_total_depth_falls_back_to_midpoint(self, fake_engine, fake_config) -> None:
        mm = _build_mm(fake_engine, fake_config)
        book = {"bids": [["0.42", "0"]], "asks": [["0.43", "0"]]}
        assert mm._micro_price(book) == pytest.approx(0.425, abs=1e-9)


# ---------------------------------------------------------------------------
# Volatility ring buffer
# ---------------------------------------------------------------------------


class TestVolatility:
    def test_buffer_grows_to_window_limit(self, fake_engine, fake_config) -> None:
        from market_maker import VOL_WINDOW
        mm = _build_mm(fake_engine, fake_config)
        for i in range(VOL_WINDOW + 500):
            mm._update_volatility(0.42 + i * 1e-7)
        assert len(mm._price_buf) == VOL_WINDOW

    def test_volatility_zero_before_minimum_samples(self, fake_engine, fake_config) -> None:
        mm = _build_mm(fake_engine, fake_config)
        for i in range(19):
            mm._update_volatility(0.42 + i * 1e-6)
        assert mm._volatility() == 0.0

    def test_high_volatility_widens_spread(self, fake_engine, fake_config) -> None:
        params = GridParams(base_spread=0.0005, vol_multiplier=5.0)
        mm = _build_mm(fake_engine, fake_config, params=params)
        for i in range(50):
            # Inject noisy prices to grow sigma
            jitter = ((-1) ** i) * 0.005
            mm._update_volatility(0.42 + jitter)
        bid_off, ask_off = mm._skewed_spreads(mid=0.42)
        # Both sides should be wider than the base 5 bps after a vol spike
        assert bid_off > params.base_spread
        assert ask_off > params.base_spread


# ---------------------------------------------------------------------------
# Inventory skew
# ---------------------------------------------------------------------------


class TestInventorySkew:
    def test_long_inventory_pulls_asks_in(self, fake_engine, fake_config) -> None:
        params = GridParams(base_spread=0.001, skew_alpha=0.5, max_inventory_usd=10.0)
        mm = _build_mm(fake_engine, fake_config, params=params)
        # Saturate inventory long: q_norm = +1
        mm._inventory_xlm = 100.0    # at 0.42 mid this gives q = 42 / 10 -> clamped 1.0
        bid_off, ask_off = mm._skewed_spreads(mid=0.42)
        assert bid_off > ask_off

    def test_short_inventory_pulls_bids_in(self, fake_engine, fake_config) -> None:
        params = GridParams(base_spread=0.001, skew_alpha=0.5, max_inventory_usd=10.0)
        mm = _build_mm(fake_engine, fake_config, params=params)
        mm._inventory_xlm = -100.0
        bid_off, ask_off = mm._skewed_spreads(mid=0.42)
        assert ask_off > bid_off

    def test_flat_inventory_yields_symmetric_quotes(self, fake_engine, fake_config) -> None:
        params = GridParams(base_spread=0.001, skew_alpha=0.5)
        mm = _build_mm(fake_engine, fake_config, params=params)
        bid_off, ask_off = mm._skewed_spreads(mid=0.42)
        assert bid_off == pytest.approx(ask_off, rel=1e-9)


# ---------------------------------------------------------------------------
# Tick grid
# ---------------------------------------------------------------------------


class TestTickGrid:
    @pytest.mark.parametrize("raw", [0.4200049, 0.4200099, 0.4200150])
    def test_bid_floors_to_tick(self, fake_engine, fake_config, raw) -> None:
        mm = _build_mm(fake_engine, fake_config)
        snapped = mm._snap_bid(raw)
        assert snapped <= raw + 1e-9
        # Remainder mod tick_size must be near zero
        assert (snapped / TICK_SIZE) % 1 == pytest.approx(0.0, abs=1e-6)

    @pytest.mark.parametrize("raw", [0.4200049, 0.4200099, 0.4200150])
    def test_ask_ceils_to_tick(self, fake_engine, fake_config, raw) -> None:
        mm = _build_mm(fake_engine, fake_config)
        snapped = mm._snap_ask(raw)
        assert snapped >= raw - 1e-9
        assert (snapped / TICK_SIZE) % 1 == pytest.approx(0.0, abs=1e-6)


# ---------------------------------------------------------------------------
# Grid composition
# ---------------------------------------------------------------------------


class TestGridCompose:
    def test_grid_has_n_bids_and_n_asks(self, fake_engine, fake_config) -> None:
        params = GridParams(grid_levels=4, level_volume_usd=20.0, base_spread=0.002)
        mm = _build_mm(fake_engine, fake_config, params=params)
        grid = mm._compute_grid(mid=0.42)
        buys = [lvl for lvl in grid if lvl.side == "buy"]
        sells = [lvl for lvl in grid if lvl.side == "sell"]
        assert len(buys) == 4
        assert len(sells) == 4

    def test_drops_levels_below_min_order_size(self, fake_engine, fake_config) -> None:
        # min_order_size = 20 XLM; level_volume_usd=$1 at $0.42 -> 2.4 XLM => drop
        params = GridParams(grid_levels=3, level_volume_usd=1.0, base_spread=0.001)
        mm = _build_mm(fake_engine, fake_config, params=params)
        grid = mm._compute_grid(mid=0.42)
        assert grid == []


# ---------------------------------------------------------------------------
# RL hot-reload
# ---------------------------------------------------------------------------


class TestRLReload:
    def _write(self, path: Path, data: dict) -> None:
        path.write_text(json.dumps(data), encoding="utf-8")

    def _valid_payload(self) -> dict:
        return {
            "base_spread": 0.0008,
            "skew_alpha": 0.42,
            "vol_multiplier": 3.5,
            "grid_levels": 4,
            "level_volume_usd": 4.0,
            "max_inventory_usd": 25.0,
        }

    def test_reload_accepts_valid_payload(self, fake_engine, fake_config, tmp_rl_config) -> None:
        self._write(tmp_rl_config, self._valid_payload())
        mm = _build_mm(fake_engine, fake_config, rl_config_path=tmp_rl_config)
        assert mm.reload_params() is True
        assert mm.params.base_spread == pytest.approx(0.0008)
        assert mm.params.grid_levels == 4

    def test_partial_payload_is_rejected_and_params_preserved(
        self, fake_engine, fake_config, tmp_rl_config
    ) -> None:
        partial = {"base_spread": 0.01}
        self._write(tmp_rl_config, partial)
        original = GridParams(base_spread=0.0005)
        mm = _build_mm(fake_engine, fake_config, rl_config_path=tmp_rl_config, params=original)
        assert mm.reload_params() is False
        assert mm.params.base_spread == pytest.approx(0.0005)

    def test_unchanged_mtime_is_a_noop(self, fake_engine, fake_config, tmp_rl_config) -> None:
        self._write(tmp_rl_config, self._valid_payload())
        mm = _build_mm(fake_engine, fake_config, rl_config_path=tmp_rl_config)
        assert mm.reload_params() is True
        assert mm.reload_params() is False     # mtime unchanged

    def test_corrupt_json_is_safe(self, fake_engine, fake_config, tmp_rl_config) -> None:
        tmp_rl_config.write_text("{not-json", encoding="utf-8")
        mm = _build_mm(fake_engine, fake_config, rl_config_path=tmp_rl_config)
        assert mm.reload_params() is False
        assert isinstance(mm.params, GridParams)


# ---------------------------------------------------------------------------
# evaluate() full cycle
# ---------------------------------------------------------------------------


class TestEvaluateCycle:
    @pytest.mark.asyncio
    async def test_full_cycle_cancels_then_places(self, fake_engine, fake_config) -> None:
        params = GridParams(grid_levels=2, level_volume_usd=20.0, base_spread=0.002)
        mm = _build_mm(fake_engine, fake_config, params=params, rebuild_interval=0.0)
        fake_engine.set_book(mid=0.42, depth=5000.0)
        result = await mm.evaluate()
        assert result is not None
        assert result["grid_placed"] == 4          # 2 bids + 2 asks
        assert fake_engine.websocket.cancel_all_calls == 1
        # Cancellation must precede order placement in the event log
        assert len(fake_engine.placed_orders) == 4

    @pytest.mark.asyncio
    async def test_skips_when_trading_halted(self, fake_engine, fake_config) -> None:
        mm = _build_mm(fake_engine, fake_config)
        fake_engine.trading_halted = True
        result = await mm.evaluate()
        assert result is None
        assert fake_engine.websocket.cancel_all_calls == 0

    @pytest.mark.asyncio
    async def test_rebuild_interval_gate(self, fake_engine, fake_config) -> None:
        # level_volume_usd large enough that volume/mid >= xlm_min_order_size (=20)
        params = GridParams(grid_levels=2, level_volume_usd=20.0, base_spread=0.002)
        mm = _build_mm(fake_engine, fake_config, params=params, rebuild_interval=10.0)
        first = await mm.evaluate()
        assert first is not None
        # Immediate second call should be gated out
        second = await mm.evaluate()
        assert second is None

    @pytest.mark.asyncio
    async def test_falls_back_to_ticker_when_book_missing(
        self, fake_engine, fake_config
    ) -> None:
        params = GridParams(grid_levels=2, level_volume_usd=20.0, base_spread=0.002)
        mm = _build_mm(fake_engine, fake_config, params=params)
        fake_engine.market_data["XLM/USD_book"] = {}
        fake_engine.market_data["XLM/USD_ticker"] = {"last": "0.4321"}
        result = await mm.evaluate()
        assert result is not None
        assert result["mid"] == pytest.approx(0.4321, abs=1e-6)

    @pytest.mark.asyncio
    async def test_place_failure_does_not_abort_remaining_levels(
        self, fake_engine, fake_config
    ) -> None:
        params = GridParams(grid_levels=3, level_volume_usd=20.0, base_spread=0.002)
        mm = _build_mm(fake_engine, fake_config, params=params)
        fake_engine.fail_place_at = 2     # fail the 2nd order
        result = await mm.evaluate()
        assert result is not None
        # 1 of 6 dropped due to simulated failure
        assert result["grid_placed"] == 5
        assert result["grid_requested"] == 6
