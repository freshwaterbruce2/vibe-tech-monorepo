"""
Integration tests for ``config_watcher.ConfigWatcher``.

The watcher is a polling daemon — these tests verify:
  * the callback fires when the watched file's mtime changes
  * the callback does NOT fire on startup (mtime is seeded silently)
  * the callback does NOT fire when the file is missing
  * callback exceptions never stop the polling loop
  * start()/stop() lifecycle (idempotent, joinable, thread name set)
  * end-to-end bridge: RL JSON export -> ConfigWatcher -> GridMarketMaker.reload_params

Real polling is used with a 0.05 s interval; total runtime stays well under 2 s.
"""

import json
import os
import threading
import time
from pathlib import Path

import pytest

from config_watcher import ConfigWatcher, DEFAULT_POLL_INTERVAL
from market_maker import GridMarketMaker, GridParams


POLL = 0.05         # fast polling for tests
MAX_WAIT = 2.0


def _bump_mtime(path: Path) -> None:
    """Touch the file so its mtime advances even on coarse-resolution Windows clocks."""
    now = time.time()
    os.utime(path, (now + 5, now + 5))


# ---------------------------------------------------------------------------
# Default poll interval
# ---------------------------------------------------------------------------


def test_default_poll_interval_is_two_seconds() -> None:
    assert DEFAULT_POLL_INTERVAL == 2.0


# ---------------------------------------------------------------------------
# Callback firing
# ---------------------------------------------------------------------------


class TestCallbackFires:
    def test_callback_fires_when_file_changes(self, tmp_path: Path) -> None:
        target = tmp_path / "rl_params.json"
        target.write_text(json.dumps({"x": 1}), encoding="utf-8")

        fired = threading.Event()
        watcher = ConfigWatcher(target, callback=fired.set, poll_interval=POLL)
        watcher.start()
        try:
            time.sleep(POLL * 2)        # let it seed the mtime first
            target.write_text(json.dumps({"x": 2}), encoding="utf-8")
            _bump_mtime(target)
            assert fired.wait(MAX_WAIT) is True
        finally:
            watcher.stop()

    def test_callback_does_not_fire_on_startup(self, tmp_path: Path) -> None:
        target = tmp_path / "rl_params.json"
        target.write_text("{}", encoding="utf-8")

        fired = threading.Event()
        watcher = ConfigWatcher(target, callback=fired.set, poll_interval=POLL)
        watcher.start()
        try:
            # No file change for ~5 polling intervals.
            time.sleep(POLL * 5)
            assert fired.is_set() is False
        finally:
            watcher.stop()

    def test_callback_does_not_fire_for_missing_file(self, tmp_path: Path) -> None:
        target = tmp_path / "nonexistent.json"
        fired = threading.Event()
        watcher = ConfigWatcher(target, callback=fired.set, poll_interval=POLL)
        watcher.start()
        try:
            time.sleep(POLL * 5)
            assert fired.is_set() is False
        finally:
            watcher.stop()

    def test_callback_fires_when_missing_file_appears(self, tmp_path: Path) -> None:
        target = tmp_path / "later.json"
        fired = threading.Event()
        watcher = ConfigWatcher(target, callback=fired.set, poll_interval=POLL)
        watcher.start()
        try:
            time.sleep(POLL * 2)
            target.write_text("{}", encoding="utf-8")
            _bump_mtime(target)
            assert fired.wait(MAX_WAIT) is True
        finally:
            watcher.stop()


# ---------------------------------------------------------------------------
# Exception robustness
# ---------------------------------------------------------------------------


class TestExceptionSafety:
    def test_exception_in_callback_does_not_stop_loop(self, tmp_path: Path) -> None:
        target = tmp_path / "rl_params.json"
        target.write_text("{}", encoding="utf-8")

        calls = {"n": 0}

        def boom() -> None:
            calls["n"] += 1
            raise RuntimeError("test-injected error")

        watcher = ConfigWatcher(target, callback=boom, poll_interval=POLL)
        watcher.start()
        try:
            time.sleep(POLL * 2)
            for i in range(3):
                target.write_text(json.dumps({"i": i}), encoding="utf-8")
                _bump_mtime(target)
                time.sleep(POLL * 4)
            assert calls["n"] >= 2
            assert watcher.is_running() is True
        finally:
            watcher.stop()


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


class TestLifecycle:
    def test_start_is_idempotent(self, tmp_path: Path) -> None:
        target = tmp_path / "rl_params.json"
        target.write_text("{}", encoding="utf-8")
        watcher = ConfigWatcher(target, callback=lambda: None, poll_interval=POLL)
        watcher.start()
        first_thread = watcher._thread
        watcher.start()         # should be no-op
        assert watcher._thread is first_thread
        watcher.stop()

    def test_stop_joins_thread(self, tmp_path: Path) -> None:
        target = tmp_path / "rl_params.json"
        target.write_text("{}", encoding="utf-8")
        watcher = ConfigWatcher(target, callback=lambda: None, poll_interval=POLL)
        watcher.start()
        assert watcher.is_running() is True
        watcher.stop()
        assert watcher.is_running() is False

    def test_thread_is_daemon_and_named(self, tmp_path: Path) -> None:
        target = tmp_path / "named.json"
        target.write_text("{}", encoding="utf-8")
        watcher = ConfigWatcher(target, callback=lambda: None, poll_interval=POLL)
        watcher.start()
        try:
            t = watcher._thread
            assert t is not None
            assert t.daemon is True
            assert "config-watcher" in (t.name or "")
        finally:
            watcher.stop()

    def test_status_dict_shape(self, tmp_path: Path) -> None:
        target = tmp_path / "rl_params.json"
        target.write_text("{}", encoding="utf-8")
        watcher = ConfigWatcher(target, callback=lambda: None, poll_interval=POLL)
        status = watcher.status()
        for key in ("path", "running", "last_mtime", "poll_interval"):
            assert key in status
        assert status["poll_interval"] == POLL


# ---------------------------------------------------------------------------
# End-to-end: RL export -> watcher -> market-maker reload
# ---------------------------------------------------------------------------


class TestEndToEndReloadBridge:
    def test_grid_market_maker_picks_up_rl_export(
        self, tmp_path: Path, fake_engine, fake_config
    ) -> None:
        target = tmp_path / "rl_params.json"
        initial = {
            "base_spread": 0.0005,
            "skew_alpha": 0.30,
            "vol_multiplier": 2.0,
            "grid_levels": 2,
            "level_volume_usd": 3.0,
            "max_inventory_usd": 10.0,
        }
        target.write_text(json.dumps(initial), encoding="utf-8")

        mm = GridMarketMaker(
            engine=fake_engine,
            config=fake_config,
            params=GridParams(),
            rl_config_path=target,
        )
        # First reload picks up the seed file.
        assert mm.reload_params() is True
        assert mm.params.grid_levels == 2

        reload_event = threading.Event()

        def on_change() -> None:
            mm.reload_params()
            reload_event.set()

        watcher = ConfigWatcher(target, callback=on_change, poll_interval=POLL)
        watcher.start()
        try:
            time.sleep(POLL * 2)
            updated = {**initial, "grid_levels": 5, "base_spread": 0.0011}
            target.write_text(json.dumps(updated), encoding="utf-8")
            _bump_mtime(target)
            assert reload_event.wait(MAX_WAIT) is True
            assert mm.params.grid_levels == 5
            assert mm.params.base_spread == pytest.approx(0.0011)
        finally:
            watcher.stop()
