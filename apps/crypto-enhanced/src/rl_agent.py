"""
Reinforcement learning pipeline for market-maker parameter tuning (PRD §6).

Architecture:
  CryptoMMEnv  — OpenAI Gymnasium environment wrapping historic trade data.
  RLAgent      — PPO agent (Stable-Baselines3) with background training loop
                 and atomic JSON export of learned GridParams.

The exported JSON is consumed by GridMarketMaker.reload_params() with zero
downtime — file is written atomically (tmp → rename) so the reader never
sees a partial write.

Dependencies (optional at import time):
  pip install stable-baselines3 gymnasium
  Both are guarded with ImportError so the rest of the system loads even
  when they are absent.
"""

import json
import logging
import os
import threading
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Attempt optional imports — module is usable without them in passive mode.
try:
    import numpy as np
    import gymnasium as gym
    from gymnasium import spaces
    _GYM_AVAILABLE = True
except ImportError:
    _GYM_AVAILABLE = False
    logger.warning("rl_agent: gymnasium not installed — CryptoMMEnv unavailable")

try:
    from stable_baselines3 import PPO
    from stable_baselines3.common.callbacks import BaseCallback
    _SB3_AVAILABLE = True
except ImportError:
    _SB3_AVAILABLE = False
    logger.warning("rl_agent: stable-baselines3 not installed — RLAgent unavailable")

from market_maker import GridParams, _RL_REQUIRED_KEYS


# ---------------------------------------------------------------------------
# Gymnasium environment
# ---------------------------------------------------------------------------

if _GYM_AVAILABLE:
    class CryptoMMEnv(gym.Env):
        """
        Simulated market-making environment for XLM/USD.

        Observation (7 floats):
          [mid_price, spread, volatility, inventory_norm,
           bid_depth_ratio, ask_depth_ratio, time_of_day_norm]

        Action (6 floats — all normalised to [0, 1] then rescaled):
          [base_spread, skew_alpha, vol_multiplier,
           grid_levels_frac, level_volume_usd, max_inventory_usd]

        Reward: realised P&L over the step minus a quadratic inventory penalty.
        """

        metadata = {"render_modes": []}

        # Observation bounds
        _OBS_LOW  = np.array([0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0], dtype=np.float32)
        _OBS_HIGH = np.array([1.0, 0.1, 0.05, 1.0, 1.0, 1.0, 1.0], dtype=np.float32)

        def __init__(self, price_series: "np.ndarray", spread_series: "np.ndarray",
                     inventory_penalty: float = 0.1, episode_steps: int = 1000) -> None:
            super().__init__()
            self.price_series = price_series.astype(np.float32)
            self.spread_series = spread_series.astype(np.float32)
            self.inventory_penalty = inventory_penalty
            self.episode_steps = min(episode_steps, len(price_series) - 1)

            self.observation_space = spaces.Box(
                low=self._OBS_LOW, high=self._OBS_HIGH, dtype=np.float32
            )
            self.action_space = spaces.Box(
                low=np.float32(0.0), high=np.float32(1.0), shape=(6,), dtype=np.float32
            )

            self._step = 0
            self._inventory = 0.0
            self._cash = 0.0
            self._last_mid = 0.0

        def _obs(self) -> "np.ndarray":
            idx = self._step
            mid = float(self.price_series[idx])
            spread = float(self.spread_series[idx]) if idx < len(self.spread_series) else 0.001
            # Normalise mid to [0, 1] using a 200-bar rolling max
            window = self.price_series[max(0, idx - 200): idx + 1]
            p_max = float(window.max()) if len(window) > 0 else mid
            mid_norm = mid / p_max if p_max > 0 else 0.5

            # Compute short-window realised vol
            if idx >= 20:
                vol = float(np.std(self.price_series[idx - 20: idx]))
                vol_norm = min(vol / mid, 0.05) if mid > 0 else 0.0
            else:
                vol_norm = 0.0

            inv_norm = max(-1.0, min(1.0, self._inventory / 100.0))  # 100 XLM = full
            # Placeholder depth ratios (real implementation would use book data)
            bid_depth = 0.5
            ask_depth = 0.5
            tod_norm = (idx % 86400) / 86400.0  # time-of-day if step ≈ 1 second

            return np.array(
                [mid_norm, spread, vol_norm, inv_norm, bid_depth, ask_depth, tod_norm],
                dtype=np.float32,
            )

        def _decode_action(self, action: "np.ndarray") -> GridParams:
            """Map normalised [0,1] action vector to GridParams."""
            a = np.clip(action, 0.0, 1.0)
            return GridParams(
                base_spread=float(0.0001 + a[0] * 0.009),    # 1–90 bps
                skew_alpha=float(a[1]),                        # 0–1
                vol_multiplier=float(a[2] * 5.0),             # 0–5×
                grid_levels=max(1, int(round(1 + a[3] * 4))), # 1–5
                level_volume_usd=float(1.0 + a[4] * 9.0),    # $1–$10
                max_inventory_usd=float(5.0 + a[5] * 45.0),  # $5–$50
            )

        def _step_reward(self, params: GridParams) -> float:
            idx = self._step
            if idx >= len(self.price_series) - 1:
                return 0.0
            mid = float(self.price_series[idx])
            next_mid = float(self.price_series[idx + 1])
            price_move = next_mid - mid

            # Simplified P&L: spread capture on both sides minus inventory drift
            half_spread = params.base_spread * mid
            capture_pnl = half_spread * params.grid_levels * 2  # per-cycle approximation
            inventory_cost = self.inventory_penalty * (self._inventory ** 2) * abs(price_move)

            # Inventory drift: positive if long and price rises, negative otherwise
            inv_pnl = self._inventory * price_move

            return float(capture_pnl + inv_pnl - inventory_cost)

        def step(self, action: "np.ndarray"):
            params = self._decode_action(action)
            reward = self._step_reward(params)
            self._step += 1
            terminated = self._step >= self.episode_steps
            truncated = False
            obs = self._obs()
            return obs, reward, terminated, truncated, {}

        def reset(self, *, seed=None, options=None):
            super().reset(seed=seed)
            # Start at a random position within the series
            if seed is not None:
                rng = np.random.default_rng(seed)
                max_start = max(0, len(self.price_series) - self.episode_steps - 1)
                self._step = int(rng.integers(0, max_start + 1)) if max_start > 0 else 0
            else:
                self._step = 0
            self._inventory = 0.0
            self._cash = 0.0
            self._last_mid = float(self.price_series[self._step]) if len(self.price_series) > 0 else 0.0
            return self._obs(), {}

        def render(self):
            pass


# ---------------------------------------------------------------------------
# Export / IO helpers
# ---------------------------------------------------------------------------

def _atomic_write_json(path: Path, data: Dict[str, Any]) -> None:
    """Write JSON to a temporary file then rename — never leaves a partial file."""
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
    os.replace(tmp, path)   # atomic on POSIX; atomic on Windows (same volume)


def params_to_dict(params: GridParams) -> Dict[str, Any]:
    return {k: getattr(params, k) for k in _RL_REQUIRED_KEYS}


# ---------------------------------------------------------------------------
# RL Agent wrapper
# ---------------------------------------------------------------------------

class RLAgent:
    """
    PPO-based market-making parameter tuner.

    Usage:
        agent = RLAgent(price_series, spread_series, config_path)
        agent.start_training()   # launches background thread
        # ... time passes ...
        agent.stop_training()
        params = agent.best_params()  # GridParams exported to config_path
    """

    def __init__(
        self,
        price_series: Any,                   # np.ndarray when gym available
        spread_series: Any,                  # np.ndarray when gym available
        config_path: Path = Path("D:/data/rl_params.json"),
        total_timesteps: int = 200_000,
        retrain_interval_s: float = 3600.0,  # retrain every hour
    ) -> None:
        self.config_path = Path(config_path)
        self.total_timesteps = total_timesteps
        self.retrain_interval_s = retrain_interval_s

        self._price_series = price_series
        self._spread_series = spread_series
        self._model: Optional[Any] = None   # PPO instance
        self._best_params: GridParams = GridParams()
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._available = _GYM_AVAILABLE and _SB3_AVAILABLE

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def _build_env(self) -> "gym.Env":
        return CryptoMMEnv(
            price_series=self._price_series,
            spread_series=self._spread_series,
        )

    def _train_once(self) -> GridParams:
        """Run one PPO training pass and return the learned GridParams."""
        env = self._build_env()
        if self._model is None:
            self._model = PPO(
                policy="MlpPolicy",
                env=env,
                learning_rate=3e-4,
                n_steps=2048,
                batch_size=64,
                n_epochs=10,
                verbose=0,
            )
        else:
            self._model.set_env(env)

        self._model.learn(total_timesteps=self.total_timesteps, reset_num_timesteps=False)

        # Extract best action from a greedy rollout over the first episode
        obs, _ = env.reset(seed=42)
        best_reward = float("-inf")
        best_action = np.zeros(6, dtype=np.float32)

        for _ in range(env.episode_steps):
            action, _ = self._model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, _ = env.step(action)
            if reward > best_reward:
                best_reward = float(reward)
                best_action = action.copy()
            if terminated or truncated:
                break

        return env._decode_action(best_action)

    def _training_loop(self) -> None:
        logger.info("RLAgent: training loop started (interval=%.0fs)", self.retrain_interval_s)
        while not self._stop_event.is_set():
            try:
                params = self._train_once()
                with self._lock:
                    self._best_params = params
                data = params_to_dict(params)
                _atomic_write_json(self.config_path, data)
                logger.info(
                    "RLAgent: exported params — base_spread=%.5f α=%.3f levels=%d",
                    params.base_spread, params.skew_alpha, params.grid_levels,
                )
            except Exception as exc:
                logger.error("RLAgent: training error: %s", exc)

            # Wait for next interval (or stop signal)
            self._stop_event.wait(timeout=self.retrain_interval_s)

        logger.info("RLAgent: training loop stopped")

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def start_training(self) -> bool:
        """Spawn the background training thread. Returns False if deps missing."""
        if not self._available:
            logger.warning(
                "RLAgent: gymnasium or stable-baselines3 not installed — "
                "training unavailable; GridMarketMaker will use default params"
            )
            return False
        if self._thread and self._thread.is_alive():
            logger.warning("RLAgent: training thread already running")
            return True
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._training_loop, daemon=True, name="rl-trainer"
        )
        self._thread.start()
        logger.info("RLAgent: training thread started (tid=%d)", self._thread.ident or 0)
        return True

    def stop_training(self) -> None:
        """Signal the training loop to stop and wait for it to exit."""
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=30.0)
            if self._thread.is_alive():
                logger.warning("RLAgent: training thread did not exit within 30s")

    def best_params(self) -> GridParams:
        """Return the most recent learned params (thread-safe)."""
        with self._lock:
            return self._best_params

    def is_running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    def status(self) -> Dict[str, Any]:
        return {
            "available": self._available,
            "running": self.is_running(),
            "config_path": str(self.config_path),
            "best_params": params_to_dict(self.best_params()),
        }
