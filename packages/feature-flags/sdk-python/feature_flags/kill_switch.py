"""Kill Switch Handler for Trading Systems"""

import logging
from abc import ABC, abstractmethod
from typing import Optional

from .types import KillSwitchEvent, KillSwitchPriority

logger = logging.getLogger(__name__)


class KillSwitchHandler(ABC):
    """
    Abstract base class for handling kill switch events.
    
    Implement this in your trading bot to define what happens
    when kill switches are triggered.
    
    Example:
        class TradingKillSwitch(KillSwitchHandler):
            def __init__(self, order_manager, position_manager):
                self.order_manager = order_manager
                self.position_manager = position_manager
            
            async def on_kill_switch_triggered(self, flag_key: str, context: dict):
                if flag_key == "trading.emergency_stop":
                    await self.order_manager.cancel_all()
                    await self.position_manager.close_all()
                    logger.critical("EMERGENCY STOP ACTIVATED")
                
                elif flag_key == "trading.halt_xlm":
                    await self.order_manager.cancel_symbol("XLM")
                    logger.warning("XLM trading halted")
    """
    
    @abstractmethod
    async def on_kill_switch_triggered(
        self, 
        flag_key: str, 
        context: dict
    ) -> None:
        """
        Called when a kill switch is activated.
        
        This method is called IMMEDIATELY when a kill switch event is received,
        with the highest priority given to CRITICAL kill switches.
        
        Args:
            flag_key: The kill switch flag key (e.g., "trading.emergency_stop")
            context: Additional context about the kill switch activation
        """
        pass
    
    async def on_kill_switch_deactivated(
        self, 
        flag_key: str, 
        context: dict
    ) -> None:
        """
        Called when a kill switch is deactivated.
        
        Override this to implement recovery logic.
        Default implementation just logs the event.
        
        Args:
            flag_key: The kill switch flag key
            context: Additional context about the deactivation
        """
        logger.info(f"Kill switch deactivated: {flag_key}")
    
    async def handle_event(self, event: KillSwitchEvent) -> None:
        """
        Internal method to route kill switch events.
        
        Do not override this method.
        """
        context = {
            "priority": event.priority.value,
            "timestamp": event.timestamp.isoformat(),
            "triggered_by": event.triggered_by,
            "reason": event.reason,
        }
        
        if event.action == "activated":
            logger.warning(
                f"Kill switch ACTIVATED: {event.flag_key} "
                f"(priority: {event.priority.value})"
            )
            await self.on_kill_switch_triggered(event.flag_key, context)
        else:
            await self.on_kill_switch_deactivated(event.flag_key, context)


class DefaultKillSwitchHandler(KillSwitchHandler):
    """
    Default kill switch handler that just logs events.
    
    Use this as a placeholder during development, but ALWAYS
    implement a proper handler for production trading.
    """
    
    async def on_kill_switch_triggered(
        self, 
        flag_key: str, 
        context: dict
    ) -> None:
        logger.critical(
            f"KILL SWITCH TRIGGERED: {flag_key} - "
            "No handler implemented! Implement KillSwitchHandler for production."
        )


class CompositeKillSwitchHandler(KillSwitchHandler):
    """
    Combines multiple kill switch handlers.
    
    Useful when you need different components to react to kill switches.
    
    Example:
        handler = CompositeKillSwitchHandler([
            OrderManagerKillSwitch(order_manager),
            PositionManagerKillSwitch(position_manager),
            NotificationKillSwitch(slack_client),
        ])
    """
    
    def __init__(self, handlers: list[KillSwitchHandler]):
        self.handlers = handlers
    
    async def on_kill_switch_triggered(
        self, 
        flag_key: str, 
        context: dict
    ) -> None:
        # Run all handlers concurrently for fastest response
        import asyncio
        
        tasks = [
            handler.on_kill_switch_triggered(flag_key, context)
            for handler in self.handlers
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Log any errors but don't fail
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(
                    f"Kill switch handler {i} failed: {result}",
                    exc_info=result
                )
    
    async def on_kill_switch_deactivated(
        self, 
        flag_key: str, 
        context: dict
    ) -> None:
        import asyncio
        
        tasks = [
            handler.on_kill_switch_deactivated(flag_key, context)
            for handler in self.handlers
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
