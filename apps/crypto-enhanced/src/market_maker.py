"""
Grid market maker for XLM/USD (PRD §4).

Design notes:
- Fair value = volume-weighted micro-price from top-of-book L2 data
  P_micro = (P_bid * Q_ask + P_ask * Q_bid) / (Q_bid + Q_ask)
- Volatility-scaled spread over a 6000-sample / 10-minute ring buffer
- Inventory skew: bid_offset = base*(1+α*q_norm), ask_offset = base*(1-α*q_norm)
- Grid prices snapped to Kraken's tick_size grid (floor bids, ceil asks)
- RL params hot-reloaded from JSON file with schema validation guard
- Cancels all open orders before each grid rebuild; run without concurrent
  directional strategies to avoid unintended cross-cancellation.
"""

import asyncio
import json
import logging
import math
import time
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from statistics import stdev
from typing import Dict, List, Optional, Tuple

from strategies import Strategy, round_price

logger = logging.getLogger(__name__)

TICK_SIZE: float = 0.00001          # XLM/USD min price increment on Kraken
VOL_WINDOW: int = 6000              # ring buffer size (100 ms cadence → 10 min)
_RL_REQUIRED_KEYS: Tuple[str, ...] = (
    "base_spread", "skew_alpha", "vol_multiplier",
    "grid_levels", "level_volume_usd", "max_inventory_usd",
)


@dataclass
class GridParams:
    base_spread: float = 0.0005     # base half-spread (5 bps)
    skew_alpha: float = 0.30        # inventory skew intensity
    vol_multiplier: float = 2.0     # spread = base * (1 + vol_mult * σ/mid)
    grid_levels: int = 3            # bid + ask levels each side
    level_volume_usd: float = 3.0   # notional per grid level
    max_inventory_usd: float = 10.0 # full-skew inventory threshold


@dataclass
class GridLevel:
    side: str           # 'buy' or 'sell'
    price: float
    volume_xlm: float
    req_id: Optional[int] = None    # req_id returned by add_order


class GridMarketMaker(Strategy):
    """
    Volatility-scaled grid market maker (PRD §4).

    Maintains N bid / N ask limit orders around the micro-price fair value.
    Skews quotes toward inventory neutrality each rebuild cycle.
    Supports hot-reload of RL-exported JSON params with zero downtime.

    IMPORTANT: This strategy calls cancel_all_orders before each rebuild.
    Do not run concurrently with directional strategies.
    """

    def __init__(
        self,
        engine,
        config,
        params: Optional[GridParams] = None,
        rl_config_path: Optional[Path] = None,
        rebuild_interval: float = 5.0,
    ) -> None:
        super().__init__(engine, config, "GridMarketMaker")
        self.params = params or GridParams()
        self.rl_config_path = rl_config_path
        self.rebuild_interval = rebuild_interval

        self._price_buf: deque = deque(maxlen=VOL_WINDOW)
        self._inventory_xlm: float = 0.0
        self._last_rebuild: float = 0.0
        self._rl_config_mtime: float = 0.0
        self._cycle_lock = asyncio.Lock()

        # Market maker operates continuously — bypass daily-trade counter
        self.max_daily_trades = 10_000

    # ------------------------------------------------------------------
    # Overrides
    # ------------------------------------------------------------------

    def can_trade(self) -> bool:
        if not self.enabled:
            return False
        return not getattr(self.engine, "trading_halted", False)

    # ------------------------------------------------------------------
    # Quantitative helpers
    # ------------------------------------------------------------------

    def _micro_price(self, book: Dict) -> Optional[float]:
        """P_micro = (P_bid*Q_ask + P_ask*Q_bid) / (Q_bid + Q_ask)."""
        bids = book.get("bids") or book.get("b") or []
        asks = book.get("asks") or book.get("a") or []
        if not bids or not asks:
            return None
        try:
            p_bid, q_bid = float(bids[0][0]), float(bids[0][1])
            p_ask, q_ask = float(asks[0][0]), float(asks[0][1])
            denom = q_bid + q_ask
            if denom == 0:
                return (p_bid + p_ask) / 2.0
            return (p_bid * q_ask + p_ask * q_bid) / denom
        except (IndexError, ValueError, TypeError):
            return None

    def _update_volatility(self, mid: float) -> None:
        self._price_buf.append(mid)

    def _volatility(self) -> float:
        """Realised σ from ring buffer; 0.0 when fewer than 20 samples."""
        if len(self._price_buf) < 20:
            return 0.0
        try:
            return stdev(self._price_buf)
        except Exception:
            return 0.0

    def _q_norm(self, mid: float) -> float:
        """
        Normalised inventory in [-1, 1].
        Positive = long XLM → push asks tighter, bids wider to reduce inventory.
        """
        if self.params.max_inventory_usd <= 0 or mid <= 0:
            return 0.0
        q = (self._inventory_xlm * mid) / self.params.max_inventory_usd
        return max(-1.0, min(1.0, q))

    def _skewed_spreads(self, mid: float) -> Tuple[float, float]:
        """
        Returns (bid_offset, ask_offset) as fractions of mid.
        bid_offset = base * (1 + α * q_norm)
        ask_offset = base * (1 - α * q_norm)
        Both scaled by realised volatility.
        """
        sigma = self._volatility()
        vol_adj = 1.0 + self.params.vol_multiplier * (sigma / mid if mid > 0 else 0.0)
        base = self.params.base_spread * vol_adj
        q = self._q_norm(mid)
        bid_offset = base * (1.0 + self.params.skew_alpha * q)
        ask_offset = base * (1.0 - self.params.skew_alpha * q)
        # Clamp: at least 1 tick wide, at most 2% (guards against bad vol spikes)
        min_offset = TICK_SIZE / mid if mid > 0 else 1e-6
        bid_offset = max(min_offset, min(0.02, bid_offset))
        ask_offset = max(min_offset, min(0.02, ask_offset))
        return bid_offset, ask_offset

    @staticmethod
    def _snap_bid(price: float) -> float:
        """Floor bid to tick grid."""
        return math.floor(round(price / TICK_SIZE, 8)) * TICK_SIZE

    @staticmethod
    def _snap_ask(price: float) -> float:
        """Ceil ask to tick grid."""
        return math.ceil(round(price / TICK_SIZE, 8)) * TICK_SIZE

    def _compute_grid(self, mid: float) -> List[GridLevel]:
        """
        Build the target grid: N bids below mid, N asks above mid.
        Levels with volume below xlm_min_order_size are dropped.
        """
        if mid <= 0:
            return []

        bid_offset, ask_offset = self._skewed_spreads(mid)
        n = self.params.grid_levels
        levels: List[GridLevel] = []

        for k in range(1, n + 1):
            # Bid side (buy) — snap floor
            bid_price = self._snap_bid(mid * (1.0 - bid_offset * k))
            if bid_price > 0:
                bid_vol = self.params.level_volume_usd / bid_price
                if bid_vol >= self.config.xlm_min_order_size:
                    levels.append(GridLevel(side="buy", price=bid_price, volume_xlm=bid_vol))

            # Ask side (sell) — snap ceil
            ask_price = self._snap_ask(mid * (1.0 + ask_offset * k))
            if ask_price > 0:
                ask_vol = self.params.level_volume_usd / ask_price
                if ask_vol >= self.config.xlm_min_order_size:
                    levels.append(GridLevel(side="sell", price=ask_price, volume_xlm=ask_vol))

        return levels

    # ------------------------------------------------------------------
    # Inventory sync
    # ------------------------------------------------------------------

    def _sync_inventory(self) -> None:
        self._inventory_xlm = sum(
            float(p.get("volume", 0))
            for p in self.engine.positions.values()
            if p.get("pair") == "XLM/USD"
        )

    # ------------------------------------------------------------------
    # Order management
    # ------------------------------------------------------------------

    async def _cancel_all_orders(self) -> None:
        """Cancel all open orders before rebuilding the grid."""
        try:
            await self.engine.websocket.cancel_all_orders()
            logger.debug("GridMarketMaker: cancel_all_orders sent")
        except Exception as exc:
            logger.warning("GridMarketMaker: cancel_all_orders failed: %s", exc)

    async def _place_grid(self, grid: List[GridLevel]) -> int:
        """Submit each grid level as a post-only limit order. Returns placed count."""
        from trading_engine import OrderSide, OrderType

        placed = 0
        for level in grid:
            if getattr(self.engine, "trading_halted", False):
                break
            try:
                side = OrderSide.BUY if level.side == "buy" else OrderSide.SELL
                result = await self.engine.place_order(
                    pair="XLM/USD",
                    side=side,
                    order_type=OrderType.LIMIT,
                    volume=round_price(level.volume_xlm, 8),
                    price=round_price(level.price, 6),
                )
                req_id = result.get("req_id")
                if req_id:
                    level.req_id = req_id
                    placed += 1
            except Exception as exc:
                logger.warning("GridMarketMaker: order placement error at %.6f: %s", level.price, exc)
        return placed

    # ------------------------------------------------------------------
    # RL param hot-reload
    # ------------------------------------------------------------------

    def reload_params(self) -> bool:
        """
        Re-read RL-exported JSON config if it has changed on disk.
        Validates required keys before swapping params — never applies a partial file.
        Returns True when params were updated.
        """
        if not self.rl_config_path or not self.rl_config_path.exists():
            return False
        try:
            mtime = self.rl_config_path.stat().st_mtime
            if mtime <= self._rl_config_mtime:
                return False
            raw = json.loads(self.rl_config_path.read_text(encoding="utf-8"))
            if not all(k in raw for k in _RL_REQUIRED_KEYS):
                logger.error("GridMarketMaker: RL config missing required keys — skipping reload")
                return False
            new_params = GridParams(
                base_spread=float(raw["base_spread"]),
                skew_alpha=float(raw["skew_alpha"]),
                vol_multiplier=float(raw["vol_multiplier"]),
                grid_levels=max(1, int(round(float(raw["grid_levels"])))),
                level_volume_usd=float(raw["level_volume_usd"]),
                max_inventory_usd=float(raw["max_inventory_usd"]),
            )
            self.params = new_params
            self._rl_config_mtime = mtime
            logger.info(
                "GridMarketMaker: hot-reloaded RL params — "
                "base_spread=%.5f α=%.3f vol_mult=%.2f levels=%d",
                new_params.base_spread, new_params.skew_alpha,
                new_params.vol_multiplier, new_params.grid_levels,
            )
            return True
        except Exception as exc:
            logger.error("GridMarketMaker: param reload failed: %s", exc)
            return False

    # ------------------------------------------------------------------
    # Strategy interface
    # ------------------------------------------------------------------

    async def evaluate(self) -> Optional[Dict]:
        """
        One grid rebuild cycle:
          1. Hot-reload RL params if config file changed.
          2. Sync inventory from engine.positions.
          3. Compute micro-price from top-of-book L2 data (ticker fallback).
          4. Update volatility ring buffer.
          5. Cancel all open orders.
          6. Compute and submit new grid.
        Returns a status dict on success, None when skipped or halted.
        """
        if not self.can_trade():
            return None

        now = time.monotonic()
        if now - self._last_rebuild < self.rebuild_interval:
            return None

        if self._cycle_lock.locked():
            return None   # previous cycle still running

        async with self._cycle_lock:
            self._last_rebuild = time.monotonic()
            try:
                self.reload_params()
                self._sync_inventory()

                market_data = self.get_market_data()
                book = market_data.get("book", {})
                mid = self._micro_price(book)
                if mid is None:
                    mid = self.get_current_price()
                if not mid:
                    logger.debug("GridMarketMaker: no mid-price — skipping cycle")
                    return None

                self._update_volatility(mid)

                await self._cancel_all_orders()
                grid = self._compute_grid(mid)
                if not grid:
                    logger.debug("GridMarketMaker: empty grid at mid=%.6f — skipping", mid)
                    return None

                placed = await self._place_grid(grid)

                logger.info(
                    "GridMarketMaker: grid rebuilt — mid=%.6f σ=%.6f "
                    "inv=%.2f XLM placed=%d/%d",
                    mid, self._volatility(), self._inventory_xlm, placed, len(grid),
                )
                return {
                    "mid": mid,
                    "volatility": self._volatility(),
                    "inventory_xlm": self._inventory_xlm,
                    "grid_requested": len(grid),
                    "grid_placed": placed,
                }
            except Exception as exc:
                logger.error("GridMarketMaker: evaluate error: %s", exc)
                return None

    def status(self) -> Dict:
        return {
            "name": self.name,
            "enabled": self.enabled,
            "inventory_xlm": round(self._inventory_xlm, 4),
            "vol_samples": len(self._price_buf),
            "volatility": round(self._volatility(), 8),
            "params": {
                "base_spread": self.params.base_spread,
                "skew_alpha": self.params.skew_alpha,
                "vol_multiplier": self.params.vol_multiplier,
                "grid_levels": self.params.grid_levels,
                "level_volume_usd": self.params.level_volume_usd,
                "max_inventory_usd": self.params.max_inventory_usd,
            },
        }
