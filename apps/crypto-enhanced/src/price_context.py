"""
Price Context Analyzer - Prevent Bad Entries
Tracks moving averages and only allows entries below average price
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from statistics import mean
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class PriceContextAnalyzer:
    """
    Track price context and filter out bad entries

    Rules:
    1. Only buy if price is below 30-day average
    2. Ideal entry: 5%+ discount from average
    3. Track 7-day, 30-day, and 90-day averages
    """

    def __init__(self, cache_dir: Path):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = self.cache_dir / "price_history.json"

        # Price history storage
        self.price_history: List[Dict] = []  # {timestamp, price}

        # Averages
        self.avg_7d: Optional[float] = None
        self.avg_30d: Optional[float] = None
        self.avg_90d: Optional[float] = None

        # Load from cache
        self._load_cache()

    def _load_cache(self):
        """Load price history from cache"""
        try:
            if self.cache_file.exists():
                with open(self.cache_file, 'r') as f:
                    data = json.load(f)
                    self.price_history = data.get('history', [])
                    logger.info(f"Loaded {len(self.price_history)} historical price points")
                    self._calculate_averages()
        except Exception as e:
            logger.warning(f"Could not load price cache: {e}")
            self.price_history = []

    def _save_cache(self):
        """Save price history to cache"""
        try:
            # Keep only last 90 days
            cutoff = (datetime.now() - timedelta(days=90)).isoformat()
            self.price_history = [
                p for p in self.price_history
                if p['timestamp'] > cutoff
            ]

            data = {
                'history': self.price_history,
                'last_updated': datetime.now().isoformat()
            }

            with open(self.cache_file, 'w') as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            logger.error(f"Could not save price cache: {e}")

    def add_price(self, price: float, timestamp: Optional[datetime] = None):
        """Add a new price point to history"""
        if timestamp is None:
            timestamp = datetime.now()

        self.price_history.append({
            'timestamp': timestamp.isoformat(),
            'price': price
        })

        # Save every 100 price points
        if len(self.price_history) % 100 == 0:
            self._save_cache()

        # Recalculate averages
        self._calculate_averages()

    def _calculate_averages(self):
        """Calculate moving averages"""
        if not self.price_history:
            return

        now = datetime.now()

        # 7-day average
        cutoff_7d = now - timedelta(days=7)
        prices_7d = [
            p['price'] for p in self.price_history
            if datetime.fromisoformat(p['timestamp']) > cutoff_7d
        ]
        self.avg_7d = mean(prices_7d) if prices_7d else None

        # 30-day average
        cutoff_30d = now - timedelta(days=30)
        prices_30d = [
            p['price'] for p in self.price_history
            if datetime.fromisoformat(p['timestamp']) > cutoff_30d
        ]
        self.avg_30d = mean(prices_30d) if prices_30d else None

        # 90-day average
        cutoff_90d = now - timedelta(days=90)
        prices_90d = [
            p['price'] for p in self.price_history
            if datetime.fromisoformat(p['timestamp']) > cutoff_90d
        ]
        self.avg_90d = mean(prices_90d) if prices_90d else None

        if self.avg_30d:
            logger.debug(
                f"Averages: 7d=${self.avg_7d:.4f}, "
                f"30d=${self.avg_30d:.4f}, "
                f"90d=${self.avg_90d:.4f}"
            )

    def should_allow_entry(self, current_price: float, min_discount: float = 0.05) -> Dict:
        """
        Check if entry should be allowed at current price

        Args:
            current_price: Current market price
            min_discount: Minimum discount from average (default 5%)

        Returns:
            Dict with 'allowed' bool and 'reason' string
        """
        # If no data yet, allow entry (bootstrap mode)
        if not self.avg_30d:
            return {
                'allowed': True,
                'reason': 'Bootstrap mode - no historical data',
                'discount': 0.0
            }

        # Calculate discount from 30-day average
        discount = (self.avg_30d - current_price) / self.avg_30d
        discount_pct = discount * 100

        # Check if price is below average with minimum discount
        if discount < min_discount:
            return {
                'allowed': False,
                'reason': f'Price ${current_price:.4f} too close to 30d avg ${self.avg_30d:.4f} (only {discount_pct:.1f}% discount, need {min_discount*100:.1f}%)',
                'discount': discount,
                'avg_30d': self.avg_30d,
                'avg_7d': self.avg_7d
            }

        # Good entry - price is discounted
        return {
            'allowed': True,
            'reason': f'GOOD ENTRY: Price {discount_pct:.1f}% below 30d average (${current_price:.4f} vs ${self.avg_30d:.4f})',
            'discount': discount,
            'avg_30d': self.avg_30d,
            'avg_7d': self.avg_7d
        }

    def get_entry_quality(self, current_price: float) -> str:
        """
        Rate the entry quality

        Returns:
            'EXCELLENT', 'GOOD', 'FAIR', 'POOR', or 'TERRIBLE'
        """
        if not self.avg_30d:
            return 'UNKNOWN'

        discount = (self.avg_30d - current_price) / self.avg_30d

        if discount >= 0.15:  # 15%+ discount
            return 'EXCELLENT'
        elif discount >= 0.10:  # 10-15% discount
            return 'GOOD'
        elif discount >= 0.05:  # 5-10% discount
            return 'FAIR'
        elif discount >= 0.00:  # 0-5% discount
            return 'POOR'
        else:  # Above average
            return 'TERRIBLE'

    def get_summary(self, current_price: float) -> str:
        """Get a formatted summary for logging"""
        if not self.avg_30d:
            return "Price context: No historical data yet"

        discount = (self.avg_30d - current_price) / self.avg_30d
        quality = self.get_entry_quality(current_price)

        summary = f"""
Price Context Analysis:
  Current Price: ${current_price:.4f}
  7-day Average: ${self.avg_7d:.4f if self.avg_7d else 0:.4f}
  30-day Average: ${self.avg_30d:.4f}
  90-day Average: ${self.avg_90d:.4f if self.avg_90d else 0:.4f}

  Discount from 30d avg: {discount*100:.1f}%
  Entry Quality: {quality}

  Historical Points: {len(self.price_history)}
        """.strip()

        return summary
