"""
Polling-based config watcher for hot-reloading RL-exported GridParams.

Uses mtime polling (works on Windows without ReadDirectoryChangesW bindings).
Fires a callback when the watched file changes; thread-safe, daemon thread.

Typical usage:
    watcher = ConfigWatcher(
        path=Path("D:/data/rl_params.json"),
        callback=market_maker.reload_params,
    )
    watcher.start()
    ...
    watcher.stop()
"""

import logging
import threading
import time
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger(__name__)

DEFAULT_POLL_INTERVAL: float = 2.0   # seconds between stat() checks


class ConfigWatcher:
    """
    Watches a single file for mtime changes and fires a callback when it updates.
    The callback is invoked on the watcher thread — keep it fast or dispatch async work.
    """

    def __init__(
        self,
        path: Path,
        callback: Callable[[], None],
        poll_interval: float = DEFAULT_POLL_INTERVAL,
    ) -> None:
        self.path = Path(path)
        self.callback = callback
        self.poll_interval = poll_interval

        self._last_mtime: float = 0.0
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    # ------------------------------------------------------------------

    def _current_mtime(self) -> float:
        try:
            return self.path.stat().st_mtime
        except FileNotFoundError:
            return 0.0
        except OSError as exc:
            logger.warning("ConfigWatcher: stat(%s) failed: %s", self.path, exc)
            return self._last_mtime   # keep existing value on transient error

    def _poll_loop(self) -> None:
        logger.info("ConfigWatcher: watching %s (interval=%.1fs)", self.path, self.poll_interval)
        # Seed the mtime without firing on startup
        self._last_mtime = self._current_mtime()

        while not self._stop_event.is_set():
            time.sleep(self.poll_interval)
            mtime = self._current_mtime()
            if mtime != self._last_mtime:
                self._last_mtime = mtime
                logger.info("ConfigWatcher: change detected in %s", self.path)
                try:
                    self.callback()
                except Exception as exc:
                    logger.error("ConfigWatcher: callback error: %s", exc)

        logger.info("ConfigWatcher: stopped watching %s", self.path)

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Start the background polling thread. No-op if already running."""
        if self._thread and self._thread.is_alive():
            logger.debug("ConfigWatcher: already running")
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._poll_loop,
            daemon=True,
            name=f"config-watcher-{self.path.name}",
        )
        self._thread.start()

    def stop(self) -> None:
        """Signal the polling thread to stop and wait for it to exit."""
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=self.poll_interval + 2.0)

    def is_running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    def status(self) -> dict:
        return {
            "path": str(self.path),
            "running": self.is_running(),
            "last_mtime": self._last_mtime,
            "poll_interval": self.poll_interval,
        }
