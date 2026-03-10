"""
Async Feature Flag Client for Python

Optimized for trading systems with:
- Async-first design
- Instant kill switch propagation via WebSocket
- Local caching with sync access for kill switches
- Graceful degradation when server is unavailable
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Optional, Any

import aiohttp
import websockets
from websockets.client import WebSocketClientProtocol

from .types import (
    ClientConfig,
    Environment,
    EvaluationContext,
    EvaluationResult,
    EvaluationReason,
    FeatureFlag,
    FlagType,
    FlagValue,
    KillSwitchEvent,
    KillSwitchPriority,
    Variant,
    TargetingRule,
    KillSwitchConfig,
)
from .cache import FlagCache
from .hash import is_in_percentage_rollout, assign_variant
from .kill_switch import KillSwitchHandler, DefaultKillSwitchHandler

logger = logging.getLogger(__name__)

KILL_SWITCH_POLL_INTERVAL = 1.0  # seconds


class FeatureFlagClient:
    """
    Async feature flag client optimized for trading systems.
    
    Example:
        from feature_flags import FeatureFlagClient, ClientConfig, Environment
        
        config = ClientConfig(
            server_url="http://localhost:3100",
            environment=Environment.PROD,
            enable_websocket=True,
        )
        
        client = FeatureFlagClient(config, kill_switch_handler=my_handler)
        await client.initialize()
        
        # Sync check (uses cache) - safe for hot paths
        if client.is_kill_switch_active("trading.emergency_stop"):
            return  # Don't trade!
        
        # Async check with context
        if await client.is_enabled("trading.new_strategy", user_id="account123"):
            await execute_new_strategy()
    """
    
    def __init__(
        self,
        config: ClientConfig,
        kill_switch_handler: Optional[KillSwitchHandler] = None,
    ):
        self.config = config
        self.cache = FlagCache(config.cache_max_age_ms)
        self.kill_switch_handler = kill_switch_handler or DefaultKillSwitchHandler()
        
        self._session: Optional[aiohttp.ClientSession] = None
        self._ws: Optional[WebSocketClientProtocol] = None
        self._initialized = False
        self._refresh_task: Optional[asyncio.Task] = None
        self._ws_task: Optional[asyncio.Task] = None
        self._ks_poll_task: Optional[asyncio.Task] = None
        self._running = False
    
    async def initialize(self) -> None:
        """Initialize the client - fetch flags and start background tasks."""
        if self._initialized:
            return
        
        self._session = aiohttp.ClientSession(
            headers=self._get_headers(),
            timeout=aiohttp.ClientTimeout(total=10),
        )
        
        # Initial fetch
        await self.refresh_flags()
        
        self._running = True
        
        # Start background tasks
        self._refresh_task = asyncio.create_task(self._polling_loop())
        self._ks_poll_task = asyncio.create_task(self._kill_switch_polling_loop())
        
        if self.config.enable_websocket:
            self._ws_task = asyncio.create_task(self._websocket_loop())
        
        self._initialized = True
        logger.info("Feature flag client initialized")
    
    def is_kill_switch_active(self, flag_key: str) -> bool:
        """
        Check if a kill switch is active (SYNCHRONOUS).
        
        This is the FASTEST way to check kill switches - uses local cache only.
        Use this in hot paths like order execution.
        
        Args:
            flag_key: The kill switch key (e.g., "trading.emergency_stop")
        
        Returns:
            True if the kill switch is currently active
        """
        flag = self.cache.get(flag_key)
        if flag is None or flag.type != FlagType.KILL_SWITCH:
            return False
        return flag.enabled
    
    def is_enabled_sync(self, flag_key: str) -> bool:
        """
        Synchronous check using cached value only.
        
        Use this when you need sync access and can tolerate slightly stale data.
        For kill switches, always use is_kill_switch_active() instead.
        """
        result = self._evaluate_cached(flag_key, EvaluationContext(
            environment=self.config.environment,
            app_name=self.config.app_name,
            app_version=self.config.app_version,
        ))
        return result.enabled
    
    async def is_enabled(
        self,
        flag_key: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        **attributes: Any,
    ) -> bool:
        """
        Check if a feature flag is enabled.
        
        Args:
            flag_key: The feature flag key
            user_id: User identifier for consistent bucketing
            session_id: Session identifier (fallback for user_id)
            **attributes: Additional attributes for targeting rules
        
        Returns:
            True if the flag is enabled for this context
        """
        context = EvaluationContext(
            environment=self.config.environment,
            user_id=user_id,
            session_id=session_id,
            app_name=self.config.app_name,
            app_version=self.config.app_version,
            attributes=attributes,
        )
        
        result = self._evaluate_cached(flag_key, context)
        return result.enabled
    
    async def get_variant(
        self,
        flag_key: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        **attributes: Any,
    ) -> tuple[Optional[str], Optional[dict[str, Any]]]:
        """
        Get variant assignment for A/B tests.
        
        Returns:
            Tuple of (variant_key, payload) or (None, None) if not in test
        """
        context = EvaluationContext(
            environment=self.config.environment,
            user_id=user_id,
            session_id=session_id,
            app_name=self.config.app_name,
            app_version=self.config.app_version,
            attributes=attributes,
        )
        
        result = self._evaluate_cached(flag_key, context)
        
        if not result.enabled or result.variant is None:
            return None, None
        
        return result.variant, result.payload
    
    def evaluate(
        self, 
        flag_key: str, 
        context: EvaluationContext
    ) -> EvaluationResult:
        """Full evaluation with reason (synchronous, uses cache)."""
        return self._evaluate_cached(flag_key, context)
    
    async def refresh_flags(self) -> None:
        """Force refresh all flags from server."""
        if not self._session:
            return
        
        try:
            async with self._session.get(
                f"{self.config.server_url}/api/flags"
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    for flag_data in data.get("flags", []):
                        flag = self._parse_flag(flag_data)
                        self.cache.set(flag.key, flag)
                    logger.debug(f"Refreshed {len(data.get('flags', []))} flags")
                else:
                    logger.warning(f"Failed to refresh flags: {response.status}")
        except Exception as e:
            logger.error(f"Error refreshing flags: {e}")
    
    async def close(self) -> None:
        """Clean up resources."""
        self._running = False
        
        if self._refresh_task:
            self._refresh_task.cancel()
        if self._ws_task:
            self._ws_task.cancel()
        if self._ks_poll_task:
            self._ks_poll_task.cancel()
        
        if self._ws:
            await self._ws.close()
        
        if self._session:
            await self._session.close()
        
        self._initialized = False
        logger.info("Feature flag client closed")
    
    # -------------------------------------------------------------------------
    # Private Methods
    # -------------------------------------------------------------------------
    
    def _evaluate_cached(
        self,
        flag_key: str,
        context: EvaluationContext
    ) -> EvaluationResult:
        """Evaluate a flag using cached data."""
        flag = self.cache.get(flag_key)
        
        if flag is None:
            return EvaluationResult(
                flag_key=flag_key,
                enabled=False,
                reason=EvaluationReason.ERROR,
            )
        
        # Kill switch - always check first
        if flag.type == FlagType.KILL_SWITCH:
            return EvaluationResult(
                flag_key=flag_key,
                enabled=flag.enabled,
                reason=(
                    EvaluationReason.KILL_SWITCH_ACTIVE 
                    if flag.enabled 
                    else EvaluationReason.DEFAULT_VALUE
                ),
            )
        
        # Check global enabled
        if not flag.enabled:
            return EvaluationResult(
                flag_key=flag_key,
                enabled=False,
                reason=EvaluationReason.FLAG_DISABLED,
            )
        
        # Get environment value
        env_value = flag.environments.get(context.environment.value)
        if not env_value or not env_value.enabled:
            return EvaluationResult(
                flag_key=flag_key,
                enabled=False,
                reason=EvaluationReason.FLAG_DISABLED,
            )
        
        # Check targeting rules
        for rule in flag.rules:
            if not rule.enabled:
                continue
            if self._evaluate_rule(rule, context):
                return EvaluationResult(
                    flag_key=flag_key,
                    enabled=True,
                    reason=EvaluationReason.TARGETING_RULE_MATCH,
                    rule_id=rule.id,
                )
        
        # Percentage rollout
        if env_value.percentage is not None:
            identifier = context.user_id or context.session_id or "anonymous"
            in_rollout = is_in_percentage_rollout(
                identifier, flag_key, env_value.percentage
            )
            return EvaluationResult(
                flag_key=flag_key,
                enabled=in_rollout,
                reason=EvaluationReason.PERCENTAGE_ROLLOUT,
            )
        
        # Variant assignment
        if flag.variants:
            identifier = context.user_id or context.session_id or "anonymous"
            variants_data = [
                {"key": v.key, "weight": v.weight} 
                for v in flag.variants
            ]
            variant_key = assign_variant(identifier, flag_key, variants_data)
            variant = next(
                (v for v in flag.variants if v.key == variant_key), 
                None
            )
            return EvaluationResult(
                flag_key=flag_key,
                enabled=True,
                variant=variant_key,
                payload=variant.payload if variant else None,
                reason=EvaluationReason.VARIANT_ASSIGNMENT,
            )
        
        # Default enabled
        return EvaluationResult(
            flag_key=flag_key,
            enabled=True,
            reason=EvaluationReason.DEFAULT_VALUE,
        )
    
    def _evaluate_rule(
        self, 
        rule: TargetingRule, 
        context: EvaluationContext
    ) -> bool:
        """Evaluate a single targeting rule."""
        attr_value = self._get_attribute(rule.attribute, context)
        
        if rule.operator == "equals":
            return attr_value == rule.value
        elif rule.operator == "not_equals":
            return attr_value != rule.value
        elif rule.operator == "contains":
            return str(rule.value) in str(attr_value)
        elif rule.operator == "in_list":
            return attr_value in rule.value
        elif rule.operator == "percentage":
            identifier = context.user_id or context.session_id or "anonymous"
            return is_in_percentage_rollout(identifier, rule.id, float(rule.value))
        
        return False
    
    def _get_attribute(
        self, 
        attribute: str, 
        context: EvaluationContext
    ) -> Any:
        """Get attribute value from context."""
        # Check standard fields
        if attribute == "environment":
            return context.environment.value
        elif attribute == "user_id":
            return context.user_id
        elif attribute == "app_name":
            return context.app_name
        elif attribute == "app_version":
            return context.app_version
        
        # Check custom attributes
        return context.attributes.get(attribute)
    
    def _parse_flag(self, data: dict) -> FeatureFlag:
        """Parse flag data from JSON."""
        return FeatureFlag(
            id=data["id"],
            key=data["key"],
            name=data["name"],
            description=data.get("description", ""),
            type=FlagType(data["type"]),
            enabled=data["enabled"],
            environments={
                k: FlagValue(
                    enabled=v.get("enabled", False),
                    percentage=v.get("percentage"),
                )
                for k, v in data.get("environments", {}).items()
            },
            rules=[
                TargetingRule(
                    id=r["id"],
                    attribute=r["attribute"],
                    operator=r["operator"],
                    value=r["value"],
                    enabled=r.get("enabled", True),
                )
                for r in data.get("rules", [])
            ],
            variants=[
                Variant(
                    key=v["key"],
                    name=v.get("name", v["key"]),
                    weight=v["weight"],
                    payload=v.get("payload"),
                )
                for v in data.get("variants", [])
            ],
            kill_switch=KillSwitchConfig(
                priority=KillSwitchPriority(data["killSwitch"]["priority"]),
                notify_on_trigger=data["killSwitch"].get("notifyOnTrigger", True),
                webhook_url=data["killSwitch"].get("webhookUrl"),
            ) if data.get("killSwitch") else None,
            tags=data.get("tags", []),
        )
    
    async def _polling_loop(self) -> None:
        """Background task to refresh flags periodically."""
        while self._running:
            await asyncio.sleep(self.config.refresh_interval_ms / 1000)
            await self.refresh_flags()
    
    async def _kill_switch_polling_loop(self) -> None:
        """Fast polling for kill switches (backup to WebSocket)."""
        while self._running:
            await asyncio.sleep(KILL_SWITCH_POLL_INTERVAL)
            await self._check_kill_switches()
    
    async def _check_kill_switches(self) -> None:
        """Check for kill switch changes."""
        if not self._session:
            return
        
        try:
            async with self._session.get(
                f"{self.config.server_url}/api/kill-switch/active"
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    for flag_data in data.get("flags", []):
                        flag = self._parse_flag(flag_data)
                        cached = self.cache.get(flag.key)
                        
                        # Detect activation
                        if cached and not cached.enabled and flag.enabled:
                            event = KillSwitchEvent(
                                flag_key=flag.key,
                                action="activated",
                                priority=flag.kill_switch.priority if flag.kill_switch else KillSwitchPriority.NORMAL,
                                timestamp=datetime.now(),
                            )
                            await self.kill_switch_handler.handle_event(event)
                        
                        self.cache.set(flag.key, flag)
        except Exception:
            pass  # Silent fail - WebSocket is primary
    
    async def _websocket_loop(self) -> None:
        """WebSocket connection for real-time updates."""
        ws_url = self.config.server_url.replace("http", "ws") + "/ws/flags"
        
        while self._running:
            try:
                async with websockets.connect(
                    ws_url,
                    extra_headers=self._get_headers(),
                ) as ws:
                    self._ws = ws
                    logger.debug("WebSocket connected")
                    
                    async for message in ws:
                        await self._handle_ws_message(message)
                        
            except Exception as e:
                logger.warning(f"WebSocket error: {e}, reconnecting...")
                await asyncio.sleep(5)
    
    async def _handle_ws_message(self, message: str) -> None:
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "flag_update":
                flag = self._parse_flag(data["payload"]["flag"])
                self.cache.set(flag.key, flag)
                logger.debug(f"Flag updated: {flag.key}")
                
            elif msg_type == "kill_switch":
                event_data = data["payload"]["event"]
                event = KillSwitchEvent(
                    flag_key=event_data["flagKey"],
                    action=event_data["action"],
                    priority=KillSwitchPriority(event_data["priority"]),
                    timestamp=datetime.fromisoformat(event_data["timestamp"]),
                    triggered_by=event_data.get("triggeredBy"),
                    reason=event_data.get("reason"),
                )
                await self.kill_switch_handler.handle_event(event)
                
            elif msg_type == "ping":
                if self._ws:
                    await self._ws.send(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat(),
                    }))
                    
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
    
    def _get_headers(self) -> dict[str, str]:
        """Get HTTP headers for requests."""
        headers = {
            "X-Environment": self.config.environment.value,
            "X-App-Name": self.config.app_name,
            "X-App-Version": self.config.app_version,
        }
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        return headers
