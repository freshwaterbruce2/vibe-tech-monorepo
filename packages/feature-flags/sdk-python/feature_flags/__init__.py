"""
Feature Flags Python SDK

Optimized for trading systems with:
- Async-first design
- Instant kill switch propagation
- Local caching with fallback
- WebSocket real-time updates
"""

from .types import (
    Environment,
    FlagType,
    KillSwitchPriority,
    FeatureFlag,
    EvaluationContext,
    EvaluationResult,
    KillSwitchEvent,
    ClientConfig,
)
from .client import FeatureFlagClient
from .kill_switch import KillSwitchHandler

__all__ = [
    # Types
    "Environment",
    "FlagType",
    "KillSwitchPriority",
    "FeatureFlag",
    "EvaluationContext",
    "EvaluationResult",
    "KillSwitchEvent",
    "ClientConfig",
    # Client
    "FeatureFlagClient",
    "KillSwitchHandler",
]

__version__ = "0.1.0"
