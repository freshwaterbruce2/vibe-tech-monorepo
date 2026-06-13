"""
Kraken decay-based rate limiter (leaky bucket).

Kraken's penalty model:
    - Order placement:    +1 point
    - Order cancellation: +8 points
    - Counter decays at `decay_rate` points/second (Pro tier: 3.75/s)
    - Exceeding max triggers EOrder:Rate limit exceeded

Sustainable throughput formula (PRD §5):
    E_sustained = (decay_rate * 60) / (9 - 8 * fill_rate)

Pro tier example at 50% fill rate:
    (3.75 * 60) / (9 - 4) = 225 / 5 = 45 events/minute
"""

import asyncio
import time
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

ORDER_PENALTY = 1
CANCEL_PENALTY = 8


@dataclass
class RateLimitConfig:
    max_counter: int = 80           # Pro tier max
    decay_rate: float = 3.75        # Points/second (Pro tier)
    throttle_threshold: float = 0.90  # Halt new orders at 90% of max


class KrakenRateLimiter:
    """Thread-safe async leaky-bucket rate limiter for Kraken order operations."""

    def __init__(self, config: Optional[RateLimitConfig] = None) -> None:
        self._cfg = config or RateLimitConfig()
        self._counter: float = 0.0
        self._last_decay: float = time.monotonic()
        self._lock = asyncio.Lock()
        self._throttled = False

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _apply_decay(self) -> None:
        """Decay the counter by the time elapsed since last call."""
        now = time.monotonic()
        elapsed = now - self._last_decay
        self._counter = max(0.0, self._counter - self._cfg.decay_rate * elapsed)
        self._last_decay = now

    def _throttle_limit(self) -> float:
        return self._cfg.max_counter * self._cfg.throttle_threshold

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    @property
    def utilization(self) -> float:
        """Current counter as fraction of max (0.0 – 1.0+)."""
        return self._counter / self._cfg.max_counter

    @property
    def is_throttled(self) -> bool:
        return self._throttled

    async def acquire_order(self) -> bool:
        """
        Check permission to place an order (+1 point).
        Returns True if allowed, False if above the 90% throttle threshold.
        """
        async with self._lock:
            self._apply_decay()
            projected = self._counter + ORDER_PENALTY

            if projected >= self._throttle_limit():
                if not self._throttled:
                    logger.warning(
                        "Rate limiter throttling orders: %.1f/%.0f (%.0f%%)",
                        projected, self._cfg.max_counter, self.utilization * 100,
                    )
                self._throttled = True
                return False

            self._counter = projected
            self._throttled = False
            return True

    async def acquire_cancel(self) -> bool:
        """
        Check permission to cancel an order (+8 points).
        Cancellations are expensive; they throttle sooner.
        """
        async with self._lock:
            self._apply_decay()
            projected = self._counter + CANCEL_PENALTY

            if projected >= self._throttle_limit():
                if not self._throttled:
                    logger.warning(
                        "Rate limiter throttling cancellation: %.1f/%.0f",
                        projected, self._cfg.max_counter,
                    )
                self._throttled = True
                return False

            self._counter = projected
            self._throttled = False
            return True

    async def wait_for_capacity(self, timeout: float = 30.0) -> bool:
        """
        Block until the counter decays below the throttle threshold.
        Returns True when capacity opens up, False on timeout.
        """
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            async with self._lock:
                self._apply_decay()
                if self.utilization < self._cfg.throttle_threshold:
                    self._throttled = False
                    return True
            await asyncio.sleep(0.25)

        logger.error("Rate limiter wait_for_capacity timed out after %.1fs", timeout)
        return False

    def sustainable_rate(self, fill_rate: float = 0.5) -> float:
        """
        Events per minute the system can sustain given `fill_rate`.
        E_sustained = (D * 60) / (9 - 8F)
        """
        denominator = 9 - 8 * fill_rate
        if denominator <= 0:
            return float("inf")
        return (self._cfg.decay_rate * 60) / denominator

    def status(self) -> dict:
        return {
            "counter": round(self._counter, 2),
            "max_counter": self._cfg.max_counter,
            "utilization_pct": round(self.utilization * 100, 1),
            "throttled": self._throttled,
            "sustainable_rate_50pct_fill": round(self.sustainable_rate(0.5), 1),
            "sustainable_rate_90pct_fill": round(self.sustainable_rate(0.9), 1),
        }
