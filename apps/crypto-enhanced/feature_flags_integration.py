"""
Feature Flags Integration for Crypto Trading Bot
Handles emergency kill switches and feature toggles
"""

import asyncio
from typing import Optional

from feature_flags import (
    ClientConfig,
    Environment,
    FeatureFlagClient,
    KillSwitchHandler,
)


class TradingBotKillSwitch(KillSwitchHandler):
    """
    Kill switch handler for emergency trading stops
    Triggered when trading.emergency_stop flag is activated
    """

    def __init__(self, bot):
        """
        Args:
            bot: Reference to the main trading bot instance
        """
        self.bot = bot

    async def on_kill_switch_triggered(self, flag_key: str, context: dict):
        """
        Called when any kill switch is activated

        Args:
            flag_key: The flag that was triggered (e.g. "trading.emergency_stop")
            context: Additional context about the trigger
        """
        if flag_key == "trading.emergency_stop":
            print("🛑 EMERGENCY STOP ACTIVATED - Halting all trading operations")
            await self.bot.emergency_shutdown()


class FeatureFlagsService:
    """
    Centralized feature flags service for the trading bot
    """

    def __init__(self, bot, server_url: str = "http://localhost:3100"):
        self.bot = bot
        self.server_url = server_url
        self.client: Optional[FeatureFlagClient] = None
        self._initialized = False

    async def initialize(self, environment: str = "prod"):
        """
        Initialize the feature flags client

        Args:
            environment: 'dev', 'staging', or 'prod'
        """
        if self._initialized:
            return

        env = Environment.PROD if environment == "prod" else Environment.DEV

        config = ClientConfig(
            server_url=self.server_url,
            environment=env,
            enable_websocket=True,  # Real-time updates via WebSocket
        )

        self.client = FeatureFlagClient(
            config, kill_switch_handler=TradingBotKillSwitch(self.bot)
        )

        await self.client.initialize()
        self._initialized = True
        print(f"✅ Feature flags initialized (environment: {environment})")

    def is_emergency_stop_active(self) -> bool:
        """
        Check if emergency stop is active
        This is a SYNCHRONOUS check (uses cache, ultra-fast)
        Call this before EVERY trade operation

        Returns:
            True if trading should stop immediately
        """
        if not self.client:
            return False
        return self.client.is_kill_switch_active("trading.emergency_stop")

    async def is_enabled(self, flag_key: str, **context) -> bool:
        """
        Check if a feature is enabled

        Args:
            flag_key: The feature flag key
            **context: Additional context (user_id, account_id, etc.)

        Returns:
            True if the feature is enabled
        """
        if not self.client:
            return False
        return await self.client.is_enabled(flag_key, **context)


# Example usage in your trading bot:
"""
from feature_flags_integration import FeatureFlagsService

class TradingBot:
    def __init__(self):
        self.flags = FeatureFlagsService(self)

    async def start(self):
        await self.flags.initialize(environment="prod")
        await self.run_trading_loop()

    async def execute_trade(self, symbol, amount):
        # CRITICAL: Check kill switch FIRST (before every trade)
        if self.flags.is_emergency_stop_active():
            return  # STOP IMMEDIATELY

        # Check other feature flags
        if await self.flags.is_enabled("trading.new_strategy"):
            await self.execute_new_strategy(symbol, amount)
        else:
            await self.execute_legacy_strategy(symbol, amount)

    async def emergency_shutdown(self):
        # Cancel all open orders
        await self.cancel_all_orders()
        # Close all positions
        await self.close_all_positions()
        # Stop the trading loop
        self.should_stop = True
        print("🛑 Emergency shutdown complete")
"""
