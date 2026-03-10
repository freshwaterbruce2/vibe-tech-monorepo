"""Self-Healing Monorepo System — Config Loader & Validation."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


DEFAULT_CONFIG_PATHS = [
    Path(r"C:\dev\.github\self-healing-config.yml"),
]


@dataclass
class LoopConfig:
    """Configuration for an individual healing loop."""

    enabled: bool = True
    scope: str = "affected"
    auto_apply: bool = False
    max_retries: int = 3
    timeout_seconds: int = 180
    threshold_days: int = 90
    checks: list[str] = field(default_factory=list)


@dataclass
class SafetyConfig:
    """Safety constraints for self-healing."""

    blocked_paths: list[str] = field(default_factory=list)
    max_file_size_kb: int = 500
    kill_switch: bool = False


@dataclass
class HealingConfig:
    """Top-level self-healing configuration."""

    safety: SafetyConfig
    loops: dict[str, LoopConfig]
    dry_run: bool = True
    log_path: Path = Path(r"D:\logs\self-healing")
    report_format: str = "json"
    notify: str = "console"


def load_config(config_path: Path | None = None) -> HealingConfig:
    """Load and validate self-healing configuration.

    Searches default paths if no explicit path given.
    Raises FileNotFoundError if no config found.
    """
    paths = [config_path] if config_path else DEFAULT_CONFIG_PATHS

    raw: dict[str, Any] = {}
    for p in paths:
        if p and p.exists():
            with open(p, "r", encoding="utf-8") as f:
                raw = yaml.safe_load(f) or {}
            break
    else:
        raise FileNotFoundError(
            f"No self-healing config found. Searched: {[str(p) for p in paths]}"
        )

    # Parse safety block
    safety_raw = raw.get("safety", {})
    safety = SafetyConfig(
        blocked_paths=safety_raw.get("blocked_paths", []),
        max_file_size_kb=safety_raw.get("max_file_size_kb", 500),
        kill_switch=safety_raw.get("kill_switch", False),
    )

    # Parse healing loops
    loops_raw = raw.get("healing_loops", {})
    loops: dict[str, LoopConfig] = {}
    for name, settings in loops_raw.items():
        if isinstance(settings, dict):
            loops[name] = LoopConfig(
                enabled=settings.get("enabled", True),
                scope=settings.get("scope", "affected"),
                auto_apply=settings.get("auto_apply", False),
                max_retries=settings.get("max_retries", 3),
                timeout_seconds=settings.get("timeout_seconds", 180),
                threshold_days=settings.get("threshold_days", 90),
                checks=settings.get("checks", []),
            )

    # Parse defaults
    defaults = raw.get("defaults", {})

    return HealingConfig(
        safety=safety,
        loops=loops,
        dry_run=defaults.get("dry_run", True),
        log_path=Path(defaults.get("log_path", r"D:\logs\self-healing")),
        report_format=defaults.get("report_format", "json"),
        notify=defaults.get("notify", "console"),
    )
