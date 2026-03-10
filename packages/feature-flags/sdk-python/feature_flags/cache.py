"""In-memory cache for feature flags"""

import time
from typing import Optional

from .types import FeatureFlag, FlagType


class FlagCache:
    """
    In-memory cache for feature flags with TTL support.
    
    Kill switches are never considered expired - they're always
    returned from cache for instant access, even if stale.
    """
    
    def __init__(self, max_age_ms: int = 300_000):
        self._cache: dict[str, tuple[FeatureFlag, float]] = {}
        self._max_age_ms = max_age_ms
    
    def get(self, key: str) -> Optional[FeatureFlag]:
        """Get a flag from cache, respecting TTL for non-kill-switches."""
        entry = self._cache.get(key)
        if entry is None:
            return None
        
        flag, timestamp = entry
        
        # Kill switches never expire - always return them
        if flag.type == FlagType.KILL_SWITCH:
            return flag
        
        # Check TTL for other flags
        age_ms = (time.time() - timestamp) * 1000
        if age_ms > self._max_age_ms:
            return None
        
        return flag
    
    def set(self, key: str, flag: FeatureFlag) -> None:
        """Store a flag in cache."""
        self._cache[key] = (flag, time.time())
    
    def delete(self, key: str) -> bool:
        """Remove a flag from cache."""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self) -> None:
        """Clear all cached flags."""
        self._cache.clear()
    
    def get_all(self) -> list[FeatureFlag]:
        """Get all cached flags (regardless of TTL)."""
        return [flag for flag, _ in self._cache.values()]
    
    def get_kill_switches(self) -> list[FeatureFlag]:
        """Get all kill switch flags from cache."""
        return [
            flag for flag, _ in self._cache.values()
            if flag.type == FlagType.KILL_SWITCH
        ]
    
    def get_active_kill_switches(self) -> list[FeatureFlag]:
        """Get all currently active kill switches."""
        return [
            flag for flag in self.get_kill_switches()
            if flag.enabled
        ]
    
    def size(self) -> int:
        """Return number of cached flags."""
        return len(self._cache)
