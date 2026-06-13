"""
Integration tests for ``rl_agent``.

The PPO training loop is expensive and depends on stable-baselines3, so the
heavy ``RLAgent.start_training()`` path is exercised behind a feature flag.
The rest of the surface — atomic export, params_to_dict, status, thread
lifecycle when SB3/gym are absent — is fully covered with lightweight stubs.
"""

import importlib
import json
import sys
import time
from pathlib import Path

import pytest

import rl_agent
from market_maker import GridParams, _RL_REQUIRED_KEYS


# ---------------------------------------------------------------------------
# Atomic JSON export
# ---------------------------------------------------------------------------


class TestAtomicWrite:
    def test_writes_full_payload(self, tmp_path: Path) -> None:
        target = tmp_path / "rl_params.json"
        payload = {"base_spread": 0.001, "skew_alpha": 0.3}
        rl_agent._atomic_write_json(target, payload)
        assert target.exists()
        loaded = json.loads(target.read_text(encoding="utf-8"))
        assert loaded == payload

    def test_replaces_existing_file_in_place(self, tmp_path: Path) -> None:
        target = tmp_path / "rl_params.json"
        target.write_text(json.dumps({"old": 1}), encoding="utf-8")
        rl_agent._atomic_write_json(target, {"new": 2})
        loaded = json.loads(target.read_text(encoding="utf-8"))
        assert loaded == {"new": 2}

    def test_temp_file_is_cleaned_up(self, tmp_path: Path) -> None:
        target = tmp_path / "rl_params.json"
        rl_agent._atomic_write_json(target, {"x": 1})
        assert not (tmp_path / "rl_params.tmp").exists()

    def test_sequential_writes_each_fully_replace_payload(self, tmp_path: Path) -> None:
        """
        Many sequential writes: every read after the writer returns must match the
        last-written payload exactly. Asserts the contract that ``_atomic_write_json``
        never leaves the destination in a partial state after returning.

        Multi-process / multi-thread concurrent-writer races are NOT part of
        the atomic-write guarantee — production uses a single RLAgent training
        thread, and Windows ``os.replace`` is only atomic from a reader's
        perspective if no other handle is holding the destination.
        """
        target = tmp_path / "rl_params.json"
        for i in range(200):
            payload = {"i": i, "noise": "x" * 100}
            rl_agent._atomic_write_json(target, payload)
            assert json.loads(target.read_text(encoding="utf-8")) == payload


# ---------------------------------------------------------------------------
# params_to_dict <-> GridParams round-trip
# ---------------------------------------------------------------------------


class TestParamsRoundTrip:
    def test_dict_contains_every_required_key(self) -> None:
        gp = GridParams()
        d = rl_agent.params_to_dict(gp)
        for key in _RL_REQUIRED_KEYS:
            assert key in d
        # And nothing extra that the reader would reject:
        assert set(d.keys()) == set(_RL_REQUIRED_KEYS)

    def test_reload_consumes_export(self, tmp_path: Path, fake_engine, fake_config) -> None:
        from market_maker import GridMarketMaker

        rl_params = GridParams(
            base_spread=0.0007, skew_alpha=0.31,
            vol_multiplier=2.5, grid_levels=4,
            level_volume_usd=3.5, max_inventory_usd=15.0,
        )
        target = tmp_path / "rl_params.json"
        rl_agent._atomic_write_json(target, rl_agent.params_to_dict(rl_params))

        mm = GridMarketMaker(
            engine=fake_engine, config=fake_config,
            params=GridParams(), rl_config_path=target, rebuild_interval=0.0,
        )
        assert mm.reload_params() is True
        assert mm.params == rl_params


# ---------------------------------------------------------------------------
# Agent lifecycle without SB3
# ---------------------------------------------------------------------------


class TestUnavailableDependencies:
    def test_start_training_returns_false_when_libs_missing(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        agent = rl_agent.RLAgent(
            price_series=[1.0] * 10,
            spread_series=[0.001] * 10,
            config_path=tmp_path / "rl_params.json",
        )
        # Force the "deps missing" branch even if libs happen to be installed.
        monkeypatch.setattr(agent, "_available", False)
        assert agent.start_training() is False
        assert agent.is_running() is False

    def test_stop_is_idempotent_when_never_started(self, tmp_path: Path) -> None:
        agent = rl_agent.RLAgent(
            price_series=[1.0] * 10,
            spread_series=[0.001] * 10,
            config_path=tmp_path / "rl_params.json",
        )
        # Should not raise even though the thread was never spawned.
        agent.stop_training()
        assert agent.is_running() is False

    def test_status_dict_exposes_runtime_info(self, tmp_path: Path) -> None:
        agent = rl_agent.RLAgent(
            price_series=[1.0] * 10,
            spread_series=[0.001] * 10,
            config_path=tmp_path / "rl_params.json",
        )
        status = agent.status()
        assert {"available", "running", "config_path", "best_params"} <= set(status.keys())
        assert status["running"] is False
        assert status["config_path"].endswith("rl_params.json")


# ---------------------------------------------------------------------------
# Background loop sketch (without real PPO training)
# ---------------------------------------------------------------------------


class TestTrainingLoopStub:
    def test_loop_writes_export_then_respects_stop_signal(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        """
        Replace ``_train_once`` with a deterministic stub so the loop is exercised
        without invoking PPO. Verifies the loop:
          1. calls the trainer at least once
          2. writes JSON via _atomic_write_json
          3. exits within the join timeout when stop_training() is called
        """
        agent = rl_agent.RLAgent(
            price_series=[0.42] * 100,
            spread_series=[0.001] * 100,
            config_path=tmp_path / "rl_params.json",
            retrain_interval_s=0.05,
        )
        agent._available = True       # bypass the gym/sb3 guard

        call_count = {"n": 0}

        def fake_train_once() -> GridParams:
            call_count["n"] += 1
            return GridParams(base_spread=0.0009, grid_levels=3)

        monkeypatch.setattr(agent, "_train_once", fake_train_once)
        agent.start_training()
        time.sleep(0.2)               # let the loop run a few iterations
        agent.stop_training()
        assert agent.is_running() is False
        assert call_count["n"] >= 1
        exported = json.loads(
            (tmp_path / "rl_params.json").read_text(encoding="utf-8")
        )
        assert exported["base_spread"] == pytest.approx(0.0009)
        assert exported["grid_levels"] == 3

    def test_loop_continues_after_trainer_exception(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        agent = rl_agent.RLAgent(
            price_series=[0.42] * 50,
            spread_series=[0.001] * 50,
            config_path=tmp_path / "rl_params.json",
            retrain_interval_s=0.05,
        )
        agent._available = True

        attempts = {"n": 0}

        def flaky_trainer() -> GridParams:
            attempts["n"] += 1
            if attempts["n"] == 1:
                raise RuntimeError("first attempt fails")
            return GridParams(base_spread=0.001)

        monkeypatch.setattr(agent, "_train_once", flaky_trainer)
        agent.start_training()
        time.sleep(0.25)
        agent.stop_training()
        # Trainer must have been retried after the exception.
        assert attempts["n"] >= 2


# ---------------------------------------------------------------------------
# Optional import resilience
# ---------------------------------------------------------------------------


def test_module_loads_without_optional_deps() -> None:
    """
    Verifies the documented contract: the module imports cleanly even if
    ``gymnasium`` and ``stable_baselines3`` are absent. We simulate that by
    blanking the cached imports and reloading.
    """
    saved = {name: sys.modules.get(name) for name in
             ("gymnasium", "stable_baselines3")}
    sys.modules["gymnasium"] = None        # type: ignore[assignment]
    sys.modules["stable_baselines3"] = None  # type: ignore[assignment]
    try:
        reloaded = importlib.reload(rl_agent)
        agent = reloaded.RLAgent(
            price_series=[1.0],
            spread_series=[0.001],
            config_path=Path("D:/data/rl_params.json"),
        )
        assert agent.start_training() is False
    finally:
        for name, mod in saved.items():
            if mod is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = mod
        importlib.reload(rl_agent)
