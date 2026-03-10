"""Type definitions for Feature Flags SDK"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Coroutine, Optional
from datetime import datetime


class Environment(str, Enum):
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"


class FlagType(str, Enum):
    BOOLEAN = "boolean"
    PERCENTAGE = "percentage"
    VARIANT = "variant"
    KILL_SWITCH = "kill_switch"


class KillSwitchPriority(str, Enum):
    CRITICAL = "critical"  # < 100ms propagation
    HIGH = "high"          # < 1s propagation
    NORMAL = "normal"      # < 5s propagation


class EvaluationReason(str, Enum):
    FLAG_DISABLED = "flag_disabled"
    KILL_SWITCH_ACTIVE = "kill_switch_active"
    TARGETING_RULE_MATCH = "targeting_rule_match"
    PERCENTAGE_ROLLOUT = "percentage_rollout"
    VARIANT_ASSIGNMENT = "variant_assignment"
    DEFAULT_VALUE = "default_value"
    ERROR = "error"


@dataclass
class Variant:
    key: str
    name: str
    weight: float  # 0-100
    payload: Optional[dict[str, Any]] = None


@dataclass
class KillSwitchConfig:
    priority: KillSwitchPriority = KillSwitchPriority.NORMAL
    notify_on_trigger: bool = True
    webhook_url: Optional[str] = None
    cooldown_ms: int = 0


@dataclass
class TargetingRule:
    id: str
    attribute: str
    operator: str  # equals, contains, in_list, percentage, etc.
    value: Any
    enabled: bool = True
    return_value: Optional[dict[str, Any]] = None


@dataclass
class FlagValue:
    enabled: bool
    percentage: Optional[float] = None


@dataclass
class FeatureFlag:
    id: str
    key: str
    name: str
    description: str
    type: FlagType
    enabled: bool
    environments: dict[str, FlagValue]
    rules: list[TargetingRule] = field(default_factory=list)
    kill_switch: Optional[KillSwitchConfig] = None
    variants: list[Variant] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class EvaluationContext:
    environment: Environment
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    app_name: Optional[str] = None
    app_version: Optional[str] = None
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvaluationResult:
    flag_key: str
    enabled: bool
    variant: Optional[str] = None
    payload: Optional[dict[str, Any]] = None
    reason: EvaluationReason = EvaluationReason.DEFAULT_VALUE
    rule_id: Optional[str] = None


@dataclass
class KillSwitchEvent:
    flag_key: str
    action: str  # "activated" or "deactivated"
    priority: KillSwitchPriority
    timestamp: datetime
    triggered_by: Optional[str] = None
    reason: Optional[str] = None


# Type alias for kill switch handler callback
KillSwitchCallback = Callable[[KillSwitchEvent], Coroutine[Any, Any, None]]


@dataclass
class ClientConfig:
    server_url: str
    environment: Environment
    api_key: Optional[str] = None
    
    # Polling
    refresh_interval_ms: int = 30_000  # 30 seconds
    
    # Real-time
    enable_websocket: bool = True
    
    # Caching
    enable_local_cache: bool = True
    cache_max_age_ms: int = 300_000  # 5 minutes
    
    # App identification
    app_name: str = "trading-bot"
    app_version: str = "1.0.0"
