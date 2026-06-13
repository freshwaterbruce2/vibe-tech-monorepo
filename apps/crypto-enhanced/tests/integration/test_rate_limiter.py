"""
Integration tests for ``rate_limiter.KrakenRateLimiter``.

These tests exercise the decay-based leaky bucket end-to-end:
  * verify the Pro-tier decay rate (-3.75 points/s) reduces the counter as expected
  * confirm throttling engages at the 90 % utilisation boundary
  * confirm the +1 / +8 penalties match Kraken's add_order / cancel_order schedule
  * verify ``wait_for_capacity`` blocks then returns once decay catches up
  * verify the sustainable-rate formula  E = (D * 60) / (9 - 8F)

Tests use ``time.monotonic`` patching where decay would otherwise require real wall
time — keeps the suite deterministic and sub-second.
"""

import asyncio
from typing import List
from unittest.mock import patch

import pytest

from rate_limiter import (
    CANCEL_PENALTY,
    KrakenRateLimiter,
    ORDER_PENALTY,
    RateLimitConfig,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


class FakeClock:
    """Monotonic clock the tests can advance manually."""

    def __init__(self, start: float = 1_000_000.0) -> None:
        self.now = start

    def tick(self, seconds: float) -> None:
        self.now += seconds

    def __call__(self) -> float:
        return self.now


def _pro_config(**overrides) -> RateLimitConfig:
    """Default Pro-tier config so individual tests can override one field."""
    base = dict(max_counter=80, decay_rate=3.75, throttle_threshold=0.90)
    base.update(overrides)
    return RateLimitConfig(**base)


# ---------------------------------------------------------------------------
# Decay behaviour
# ---------------------------------------------------------------------------


class TestDecay:
    @pytest.mark.asyncio
    async def test_decay_rate_matches_kraken_pro_tier(self) -> None:
        """After 4 seconds at 3.75 pts/s the counter must drop by 15 points."""
        clock = FakeClock()
        with patch("rate_limiter.time.monotonic", clock):
            limiter = KrakenRateLimiter(_pro_config())
            # Spend 7 cancels to fill the counter quickly (7 * 8 = 56 points)
            for _ in range(7):
                clock.tick(0.001)
                assert await limiter.acquire_cancel()
            counter_before = limiter._counter
            assert counter_before == pytest.approx(56.0, abs=0.05)

            clock.tick(4.0)
            await limiter.acquire_order()   # forces a decay apply + 1 point
            # decay reduced by 3.75 * 4 = 15; then +1 for the order
            expected = counter_before - 15.0 + ORDER_PENALTY
            assert limiter._counter == pytest.approx(expected, abs=0.05)

    @pytest.mark.asyncio
    async def test_counter_never_decays_below_zero(self) -> None:
        clock = FakeClock()
        with patch("rate_limiter.time.monotonic", clock):
            limiter = KrakenRateLimiter(_pro_config())
            assert await limiter.acquire_order()         # counter = 1
            clock.tick(10_000.0)                         # massive decay
            await limiter.acquire_order()                # forces decay apply
            assert limiter._counter == pytest.approx(ORDER_PENALTY, abs=0.05)


# ---------------------------------------------------------------------------
# Penalty schedule
# ---------------------------------------------------------------------------


class TestPenaltySchedule:
    @pytest.mark.asyncio
    async def test_order_costs_one_point(self) -> None:
        limiter = KrakenRateLimiter(_pro_config())
        assert await limiter.acquire_order()
        assert limiter._counter == pytest.approx(ORDER_PENALTY, abs=0.01)
        assert ORDER_PENALTY == 1

    @pytest.mark.asyncio
    async def test_cancel_costs_eight_points(self) -> None:
        limiter = KrakenRateLimiter(_pro_config())
        assert await limiter.acquire_cancel()
        assert limiter._counter == pytest.approx(CANCEL_PENALTY, abs=0.01)
        assert CANCEL_PENALTY == 8


# ---------------------------------------------------------------------------
# Throttle threshold (90 %)
# ---------------------------------------------------------------------------


class TestThrottleThreshold:
    @pytest.mark.asyncio
    async def test_throttles_at_90_percent_utilisation(self) -> None:
        """
        Order requests must be rejected once the projected counter crosses
        max_counter * throttle_threshold (= 72 of 80 by default). With a
        frozen clock the limiter never decays, so the granted count equals
        exactly the threshold boundary (71 orders).
        """
        clock = FakeClock()
        with patch("rate_limiter.time.monotonic", clock):
            limiter = KrakenRateLimiter(_pro_config())
            granted = 0
            for _ in range(200):
                # NB: clock intentionally NOT advanced so no decay happens.
                if await limiter.acquire_order():
                    granted += 1
                else:
                    break
            assert limiter.is_throttled is True
            # Throttle fires when projected (counter + 1) >= 72  =>  counter == 71
            assert granted == 71
            assert limiter.utilization == pytest.approx(0.8875, abs=1e-6)

    @pytest.mark.asyncio
    async def test_cancel_throttles_sooner_than_orders(self) -> None:
        clock = FakeClock()
        with patch("rate_limiter.time.monotonic", clock):
            limiter = KrakenRateLimiter(_pro_config())
            granted_cancels = 0
            for _ in range(50):
                # Clock frozen so counter accumulates by +8 each grant.
                if await limiter.acquire_cancel():
                    granted_cancels += 1
                else:
                    break
            # After 8 cancels counter = 64; ninth projected = 72 >= 72 => denied.
            assert granted_cancels == 8
            assert limiter.is_throttled is True

    @pytest.mark.asyncio
    async def test_throttle_clears_after_decay(self) -> None:
        clock = FakeClock()
        with patch("rate_limiter.time.monotonic", clock):
            limiter = KrakenRateLimiter(_pro_config())
            for _ in range(71):
                assert await limiter.acquire_order()
            assert await limiter.acquire_order() is False
            assert limiter.is_throttled is True

            # 20 seconds of decay = 75 points removed; counter goes to 0.
            clock.tick(20.0)
            assert await limiter.acquire_order() is True
            assert limiter.is_throttled is False


# ---------------------------------------------------------------------------
# wait_for_capacity
# ---------------------------------------------------------------------------


class TestWaitForCapacity:
    @pytest.mark.asyncio
    async def test_returns_true_when_counter_decays_below_threshold(self) -> None:
        clock = FakeClock()
        with patch("rate_limiter.time.monotonic", clock):
            limiter = KrakenRateLimiter(_pro_config())
            # Drive counter to 79 (9 cancels = 72, then 7 orders = +7 -> 79).
            for _ in range(9):
                await limiter.acquire_cancel()
                if limiter.is_throttled:
                    break
            # Force counter precisely to 79 so utilisation starts > threshold.
            limiter._counter = 79.0

            real_sleep = asyncio.sleep

            async def fake_sleep(_seconds: float) -> None:
                _ = _seconds            # silence unused-arg warning
                clock.tick(5.0)         # 18.75 pts removed per call
                await real_sleep(0)     # yield to event loop

            with patch("rate_limiter.asyncio.sleep", fake_sleep):
                ok = await limiter.wait_for_capacity(timeout=30.0)
            assert ok is True
            assert limiter.utilization < 0.90
            assert limiter.is_throttled is False

    @pytest.mark.asyncio
    async def test_times_out_when_load_never_clears(self) -> None:
        clock = FakeClock()
        with patch("rate_limiter.time.monotonic", clock):
            limiter = KrakenRateLimiter(_pro_config())
            # Pin counter above the 72 threshold so utilisation never drops
            # below 0.9 within the (1.0 s) timeout even with slow decay.
            limiter._counter = 79.0
            limiter._last_decay = clock()

            real_sleep = asyncio.sleep

            async def stalled_sleep(_seconds: float) -> None:
                _ = _seconds
                clock.tick(0.05)        # 0.1875 pts decay per poll
                await real_sleep(0)

            with patch("rate_limiter.asyncio.sleep", stalled_sleep):
                ok = await limiter.wait_for_capacity(timeout=1.0)
            # 1.0 s of fake-clock waited; ~3.75 pts decayed — counter ~75.25,
            # utilisation ~0.94 — still above the 0.9 throttle threshold.
            assert ok is False
            assert limiter.utilization > 0.90


# ---------------------------------------------------------------------------
# Sustainable rate formula
# ---------------------------------------------------------------------------


class TestSustainableRate:
    @pytest.mark.asyncio
    async def test_pro_tier_at_50_percent_fill(self) -> None:
        limiter = KrakenRateLimiter(_pro_config())
        # E = (3.75 * 60) / (9 - 8*0.5) = 225 / 5 = 45 events/min
        assert limiter.sustainable_rate(0.5) == pytest.approx(45.0, abs=0.01)

    @pytest.mark.asyncio
    async def test_pro_tier_at_90_percent_fill(self) -> None:
        limiter = KrakenRateLimiter(_pro_config())
        # E = 225 / (9 - 7.2) = 225 / 1.8 = 125 events/min
        assert limiter.sustainable_rate(0.9) == pytest.approx(125.0, abs=0.01)

    @pytest.mark.asyncio
    async def test_status_dict_is_serialisable(self) -> None:
        limiter = KrakenRateLimiter(_pro_config())
        assert await limiter.acquire_order()
        status = limiter.status()
        expected_keys = {
            "counter",
            "max_counter",
            "utilization_pct",
            "throttled",
            "sustainable_rate_50pct_fill",
            "sustainable_rate_90pct_fill",
        }
        assert expected_keys.issubset(status.keys())
        assert status["sustainable_rate_50pct_fill"] == pytest.approx(45.0, abs=0.01)


# ---------------------------------------------------------------------------
# Concurrency safety
# ---------------------------------------------------------------------------


class TestConcurrency:
    @pytest.mark.asyncio
    async def test_parallel_acquire_does_not_exceed_threshold(self) -> None:
        """
        Fire 200 acquire_order() coroutines concurrently. The lock must ensure
        the granted count converges on the threshold. Wall-clock decay between
        lock acquisitions can lift the cap by exactly one extra grant, so the
        bound is 71 or 72 — never more.
        """
        limiter = KrakenRateLimiter(_pro_config())
        results: List[bool] = await asyncio.gather(
            *[limiter.acquire_order() for _ in range(200)]
        )
        granted = sum(results)
        assert granted in (71, 72)
        assert limiter.utilization <= 0.90 + 1e-6
