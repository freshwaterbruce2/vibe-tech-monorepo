import json
import logging
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

from vibe_justice.utils.paths import get_data_directory

# Constants - OPTIMIZED for budget protection
DEFAULT_BUDGET_FILENAME = "token_usage.json"
MAX_DAILY_COST = 2.00  # USD (reduced from $5)
MAX_REQUESTS_PER_MINUTE = 15  # Reduced from 20

# DeepSeek pricing (Dec 2025)
# Chat: $0.14/1M input, $0.28/1M output
# Reasoner: $0.55/1M input, $2.19/1M output
COST_PER_1K_INPUT_CHAT = 0.00014
COST_PER_1K_OUTPUT_CHAT = 0.00028
COST_PER_1K_INPUT_REASONER = 0.00055
COST_PER_1K_OUTPUT_REASONER = 0.00219


def _default_usage_data() -> Dict:
    return {
        "total_cost": 0.0,
        "daily_cost": 0.0,
        "last_reset": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "requests_this_minute": 0,
        "last_request_time": time.time(),
    }


class TokenBudget:
    def __init__(self, persistence_path: Optional[str] = None):
        base_dir = get_data_directory()
        self.path = (
            Path(persistence_path)
            if persistence_path
            else base_dir / DEFAULT_BUDGET_FILENAME
        )
        self.logger = logging.getLogger("TokenBudget")
        self._lock = threading.RLock()
        self._ensure_storage()
        self.usage_data = self._load()

    def _ensure_storage(self):
        with self._lock:
            if not self.path.parent.exists():
                self.path.parent.mkdir(parents=True, exist_ok=True)
            if not self.path.exists():
                self._save(_default_usage_data())

    def _load(self) -> Dict:
        with self._lock:
            data: Dict
            try:
                with open(self.path, "r") as f:
                    data = json.load(f)
            except Exception:
                data = {}
            if not isinstance(data, dict):
                data = {}
            merged = _default_usage_data()
            merged.update(data)
            return merged

    def _save(self, data: Dict):
        with self._lock:
            tmp_path = self.path.with_suffix(self.path.suffix + ".tmp")
            with open(tmp_path, "w") as f:
                json.dump(data, f, indent=4)
            tmp_path.replace(self.path)

    def check_budget(self) -> bool:
        """Returns True if request is allowed, False if budget exceeded."""
        with self._lock:
            self._reset_counters_if_needed()

            # Rate Limit check
            if self.usage_data["requests_this_minute"] >= MAX_REQUESTS_PER_MINUTE:
                self.logger.warning("Rate limit exceeded.")
                return False

            # Daily Cost check
            if self.usage_data["daily_cost"] >= MAX_DAILY_COST:
                self.logger.warning(
                    f"Daily budget exceeded (${self.usage_data['daily_cost']:.2f} / ${MAX_DAILY_COST})"
                )
                return False

            return True

    def record_usage(
        self,
        estimated_input_tokens: int,
        estimated_output_tokens: int,
        model: str = "chat",
    ):
        """Records usage with model-specific cost calculation."""
        with self._lock:
            self._reset_counters_if_needed()

            # Use model-specific costs
            if model == "reasoner" or model == "deepseek-reasoner":
                cost = (estimated_input_tokens / 1000 * COST_PER_1K_INPUT_REASONER) + (
                    estimated_output_tokens / 1000 * COST_PER_1K_OUTPUT_REASONER
                )
            else:
                cost = (estimated_input_tokens / 1000 * COST_PER_1K_INPUT_CHAT) + (
                    estimated_output_tokens / 1000 * COST_PER_1K_OUTPUT_CHAT
                )

            self.usage_data["total_cost"] += cost
            self.usage_data["daily_cost"] += cost
            self.usage_data["requests_this_minute"] += 1
            self.usage_data["last_request_time"] = time.time()

            self._save(self.usage_data)

    def _reset_counters_if_needed(self):
        self.usage_data = _default_usage_data() | self.usage_data
        current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        current_time = time.time()

        # Daily Reset
        if self.usage_data.get("last_reset") != current_date:
            self.usage_data["daily_cost"] = 0.0
            self.usage_data["last_reset"] = current_date

        # Minute Reset (Rate Limit)
        if current_time - self.usage_data.get("last_request_time", 0) > 60:
            self.usage_data["requests_this_minute"] = 0
            self.usage_data["last_request_time"] = current_time

        self._save(self.usage_data)
