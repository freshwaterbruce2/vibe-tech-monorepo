import atexit
import logging
import os
import signal
import sys

import psutil

logger = logging.getLogger("ProcessGuard")


class ProcessGuard:
    """
    Ensures that when the main process dies, all child processes (AI loops, servers)
    are strictly terminated. avoiding 'orphan' background usage.
    """

    def __init__(self):
        self.parent = psutil.Process(os.getpid())
        self._register_handlers()
        logger.info(f"ProcessGuard armed for PID: {self.parent.pid}")

    def _register_handlers(self):
        # Register standard exit handlers
        atexit.register(self.cleanup_children)

        # Catch signals if supported (Windows has limited signal support)
        try:
            signal.signal(signal.SIGTERM, self._signal_handler)
            signal.signal(signal.SIGINT, self._signal_handler)
        except Exception:
            pass

    def _signal_handler(self, signum, frame):
        logger.info(f"Signal {signum} received. Cleaning up...")
        self.cleanup_children()
        sys.exit(0)

    def cleanup_children(self):
        """Forcefully kills all child processes spawned by this app."""
        try:
            children = self.parent.children(recursive=True)
            if not children:
                return

            logger.warning(
                f"ProcessGuard: Detected {len(children)} child processes. Terminating..."
            )

            for child in children:
                try:
                    logger.info(f"Killing child process: {child.pid} ({child.name()})")
                    child.terminate()
                except psutil.NoSuchProcess:
                    pass

            # Give them a moment to die gracefully
            gone, alive = psutil.wait_procs(children, timeout=3)

            # Use the hammer if they act tough
            for child in alive:
                try:
                    logger.warning(f"Force killing stubborn process: {child.pid}")
                    child.kill()
                except psutil.NoSuchProcess:
                    pass

        except Exception as e:
            logger.error(f"ProcessGuard failed cleanup: {e}")


# Global instance for easy import
_guard = None


def arm_guard():
    global _guard
    if _guard is None:
        _guard = ProcessGuard()
