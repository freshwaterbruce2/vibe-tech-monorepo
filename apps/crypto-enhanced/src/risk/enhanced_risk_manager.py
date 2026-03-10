"""
Enhanced Risk Manager with ATR-based Dynamic Position Sizing

Key Features:
- Adaptive position sizing based on volatility (ATR)
- Regime detection (calm, trending, choppy, high volatility)
- Kelly Criterion with fractional leverage
- Drawdown protection
- Dynamic stop-loss adjustment based on volatility
"""

import logging
from collections import deque
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class EnhancedRiskManager:
    """
    ATR-based adaptive risk management system

    The core principle: Risk less during volatility spikes, risk more during calm periods
    """

    def __init__(
        self,
        base_kelly_fraction: float = 0.02,  # 2% base Kelly fraction (conservative)
        max_leverage: float = 3.0,  # Maximum leverage multiplier
        min_position_fraction: float = 0.01,  # Minimum 1% of capital per trade
        max_position_fraction: float = 0.25,  # Maximum 25% of capital per trade
        atr_lookback: int = 14,  # ATR calculation period
        regime_lookback: int = 50,  # Regime detection lookback
    ):
        self.base_kelly = Decimal(str(base_kelly_fraction))
        self.max_leverage = Decimal(str(max_leverage))
        self.min_fraction = Decimal(str(min_position_fraction))
        self.max_fraction = Decimal(str(max_position_fraction))
        self.atr_lookback = atr_lookback
        self.regime_lookback = regime_lookback

        # Regime state tracking
        self._price_history: Dict[str, deque] = {}
        self._atr_history: Dict[str, deque] = {}
        self._last_regime: Dict[str, str] = {}

        logger.info(
            f"EnhancedRiskManager initialized: "
            f"kelly={base_kelly_fraction}, max_lev={max_leverage}, "
            f"position_range=[{min_position_fraction}, {max_position_fraction}]"
        )

    def position_size_fraction(
        self,
        price: float,
        atr: float,
        balance: float,
        symbol: str = "XLM/USD",
        win_rate: Optional[float] = None,
        avg_win: Optional[float] = None,
        avg_loss: Optional[float] = None,
    ) -> float:
        """
        Calculate optimal position size as fraction of balance

        Args:
            price: Current asset price
            atr: Average True Range (volatility measure)
            balance: Current account balance
            symbol: Trading pair symbol
            win_rate: Historical win rate (optional, for Kelly)
            avg_win: Average win amount (optional, for Kelly)
            avg_loss: Average loss amount (optional, for Kelly)

        Returns:
            Position size fraction (0.0 to 1.0)
        """
        if atr <= 0 or price <= 0 or balance <= 0:
            logger.warning(
                f"Invalid inputs: price={price}, atr={atr}, balance={balance}"
            )
            return float(self.min_fraction)

        # Calculate volatility-adjusted fraction
        volatility_pct = (atr / price) * 100  # ATR as % of price

        # Inverse relationship: higher volatility → smaller position
        # Base case: 1% volatility = 1.0x multiplier
        # 2% volatility = 0.5x multiplier (reduce by half)
        # 5% volatility = 0.2x multiplier (reduce to 1/5)
        volatility_multiplier = (
            min(1.0 / volatility_pct, 1.0) if volatility_pct > 0 else 1.0
        )

        # Apply Kelly Criterion if we have historical data
        kelly_fraction = self.base_kelly
        if win_rate and avg_win and avg_loss and avg_loss > 0:
            # Kelly = (win_rate * avg_win - (1 - win_rate) * avg_loss) / avg_loss
            win_rate_decimal = Decimal(str(win_rate))
            avg_win_decimal = Decimal(str(avg_win))
            avg_loss_decimal = Decimal(str(avg_loss))

            kelly_numerator = (win_rate_decimal * avg_win_decimal) - (
                (1 - win_rate_decimal) * avg_loss_decimal
            )
            kelly_fraction = kelly_numerator / avg_loss_decimal

            # Apply fractional Kelly (never use full Kelly - too aggressive)
            kelly_fraction = kelly_fraction * self.base_kelly

            # Clamp to reasonable bounds
            kelly_fraction = max(
                self.min_fraction, min(kelly_fraction, self.max_fraction)
            )

        # Combine Kelly with volatility adjustment
        position_fraction = float(kelly_fraction) * volatility_multiplier

        # Apply final bounds
        position_fraction = max(
            float(self.min_fraction), min(position_fraction, float(self.max_fraction))
        )

        # Track price for regime detection
        self._update_price_history(symbol, price)
        self._update_atr_history(symbol, atr)

        logger.debug(
            f"{symbol}: vol={volatility_pct:.2f}%, vol_mult={volatility_multiplier:.3f}, "
            f"kelly={float(kelly_fraction):.4f}, final_frac={position_fraction:.4f}"
        )

        return position_fraction

    def detect_regime(self, atr: float, price: float, symbol: str = "XLM/USD") -> str:
        """
        Detect market regime based on volatility and price action

        Regimes:
        - "calm": Low volatility, ranging market
        - "trending": Directional movement with moderate volatility
        - "choppy": High volatility with no clear direction
        - "high_volatility": Extreme volatility, risk-off mode

        Args:
            atr: Current ATR value
            price: Current price
            symbol: Trading pair

        Returns:
            Regime classification string
        """
        self._update_price_history(symbol, price)
        self._update_atr_history(symbol, atr)

        if symbol not in self._atr_history or len(self._atr_history[symbol]) < 5:
            # Not enough history - use current ATR/price ratio
            vol_pct = (atr / price) * 100 if price > 0 else 0
            if vol_pct > 3.0:  # >3% volatility is high
                return "high_volatility"
            return "unknown"

        # Get recent ATR values
        recent_atrs = list(self._atr_history[symbol])
        avg_atr = sum(recent_atrs) / len(recent_atrs)
        current_atr_ratio = atr / avg_atr if avg_atr > 0 else 1.0

        # Also check absolute volatility level
        vol_pct = (atr / price) * 100 if price > 0 else 0

        # Get recent prices for trend detection
        if symbol in self._price_history and len(self._price_history[symbol]) >= 20:
            recent_prices = list(self._price_history[symbol])[-20:]

            # Simple trend detection: compare recent vs earlier prices
            first_half_avg = sum(recent_prices[:10]) / 10
            second_half_avg = sum(recent_prices[10:]) / 10
            price_change_pct = (
                abs((second_half_avg - first_half_avg) / first_half_avg)
                if first_half_avg > 0
                else 0
            )

            # Classify regime (more sensitive high_volatility detection)
            if current_atr_ratio > 1.5 or vol_pct > 3.0:  # Lower threshold for high vol
                regime = "high_volatility"
            elif current_atr_ratio > 1.2 or vol_pct > 2.0:
                regime = "choppy"
            elif price_change_pct > 0.05:  # >5% directional move
                regime = "trending"
            else:
                regime = "calm"
        else:
            # Not enough price history - use ATR-based classification
            if current_atr_ratio > 1.5 or vol_pct > 3.0:
                regime = "high_volatility"
            elif current_atr_ratio > 1.2 or vol_pct > 2.0:
                regime = "choppy"
            else:
                regime = "calm"

        # Store and log regime changes
        if symbol in self._last_regime and self._last_regime[symbol] != regime:
            logger.info(
                f"{symbol}: Regime change {self._last_regime[symbol]} → {regime} (ATR ratio: {current_atr_ratio:.2f}, vol%: {vol_pct:.2f}%)"
            )

        self._last_regime[symbol] = regime
        return regime

    def calculate_stop_loss_distance(
        self, price: float, atr: float, regime: str, atr_multiplier: float = 2.0
    ) -> float:
        """
        Calculate adaptive stop-loss distance based on volatility and regime

        Args:
            price: Current price
            atr: Current ATR
            regime: Market regime
            atr_multiplier: Base multiplier for ATR-based stops

        Returns:
            Stop-loss distance in price units
        """
        # Adjust multiplier based on regime
        regime_adjustments = {
            "calm": 1.2,  # Tighter stops in calm markets (was 1.5)
            "trending": 2.0,  # Wider stops in trends (was 2.5)
            "choppy": 2.3,  # Widest stops in choppy markets (was 3.0, then 2.4)
            "high_volatility": 2.45,  # Extra wide in volatility spikes (was 3.5 to 2.8 to 2.4, now 2.45)
            "unknown": 2.0,  # Default for unknown regime
        }

        adjusted_multiplier = atr_multiplier * regime_adjustments.get(regime, 2.0)
        stop_distance = atr * adjusted_multiplier

        # Ensure minimum stop distance (don't get stopped on noise)
        min_stop_pct = 0.01  # 1% minimum
        min_stop_distance = price * min_stop_pct

        return max(stop_distance, min_stop_distance)

    def approve_trade(
        self,
        position_size_usd: float,
        balance: float,
        current_exposure: float,
        regime: str,
        max_drawdown: Optional[float] = None,
    ) -> Tuple[bool, str]:
        """
        Approve or reject trade based on risk parameters

        Args:
            position_size_usd: Proposed position size in USD
            balance: Current account balance
            current_exposure: Current total exposure
            regime: Current market regime
            max_drawdown: Current drawdown (optional)

        Returns:
            Tuple of (approved: bool, reason: str)
        """
        if balance <= 0:
            return False, "Invalid balance"

        # Check 1: Position size vs balance
        position_fraction = position_size_usd / balance
        if position_fraction > float(self.max_fraction):
            return (
                False,
                f"Position too large: {position_fraction:.2%} > {float(self.max_fraction):.2%}",
            )

        # Check 2: Total exposure
        total_exposure_after = current_exposure + position_size_usd
        max_total_exposure = (
            balance * float(self.max_fraction) * float(self.max_leverage)
        )

        if total_exposure_after > max_total_exposure:
            return (
                False,
                f"Would exceed max exposure: ${total_exposure_after:.2f} > ${max_total_exposure:.2f}",
            )

        # Check 3: Regime-based restrictions
        if regime == "high_volatility":
            # Reduce max position size by 50% in high volatility
            adjusted_max = float(self.max_fraction) * 0.5
            if position_fraction > adjusted_max:
                return (
                    False,
                    f"High volatility regime: position {position_fraction:.2%} > {adjusted_max:.2%}",
                )

        # Check 4: Drawdown protection
        if max_drawdown is not None and max_drawdown > 0.20:  # 20% drawdown threshold
            return False, f"Drawdown too high: {max_drawdown:.2%} > 20%"

        return True, "Trade approved"

    def _update_price_history(self, symbol: str, price: float):
        """Maintain rolling price history for regime detection"""
        if symbol not in self._price_history:
            self._price_history[symbol] = deque(maxlen=self.regime_lookback)
        self._price_history[symbol].append(price)

    def _update_atr_history(self, symbol: str, atr: float):
        """Maintain rolling ATR history for regime detection"""
        if symbol not in self._atr_history:
            self._atr_history[symbol] = deque(maxlen=self.regime_lookback)
        self._atr_history[symbol].append(atr)

    def get_regime_stats(self, symbol: str = "XLM/USD") -> Dict:
        """Get current regime statistics for monitoring"""
        if symbol not in self._atr_history or not self._atr_history[symbol]:
            return {"regime": "unknown", "data_points": 0}

        recent_atrs = list(self._atr_history[symbol])
        avg_atr = sum(recent_atrs) / len(recent_atrs)
        current_atr = recent_atrs[-1]

        return {
            "regime": self._last_regime.get(symbol, "unknown"),
            "current_atr": current_atr,
            "avg_atr": avg_atr,
            "atr_ratio": current_atr / avg_atr if avg_atr > 0 else 1.0,
            "data_points": len(recent_atrs),
        }
