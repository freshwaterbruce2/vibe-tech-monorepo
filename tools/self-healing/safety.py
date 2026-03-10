"""Safety gate — validates files against blocked-path rules before any write."""

from fnmatch import fnmatch
from pathlib import Path

from .config import SafetyConfig


class SafetyGate:
    """Checks whether a file is safe for automated modification.

    Uses glob-pattern matching against the blocked_paths list.
    Also enforces file-size limits.
    """

    def __init__(self, config: SafetyConfig, repo_root: Path | None = None):
        self.blocked_paths = config.blocked_paths
        self.max_file_size_kb = config.max_file_size_kb
        self.kill_switch = config.kill_switch
        self.repo_root = repo_root or Path(r"C:\dev")

    # File-based kill switch path (operator can create this to halt all healing)
    KILL_SWITCH_FILE = Path(r"D:\self-healing\KILL_SWITCH")

    def is_killed(self) -> bool:
        """Check if the kill switch is active (config flag OR sentinel file)."""
        if self.kill_switch:
            return True
        if self.KILL_SWITCH_FILE.exists():
            return True
        return False

    def is_safe(self, file_path: Path | str) -> tuple[bool, str]:
        """Check if a file is safe to auto-fix.

        Returns (is_safe, reason). Reason is empty string if safe.
        """
        if self.kill_switch:
            return False, "Kill switch is active"

        file_path = Path(file_path)

        # Make relative for pattern matching
        try:
            rel_path = file_path.relative_to(self.repo_root)
        except ValueError:
            rel_path = file_path
        rel_str = str(rel_path).replace("\\", "/")

        # Check against blocked patterns
        for pattern in self.blocked_paths:
            if fnmatch(rel_str, pattern):
                return False, f"Blocked by pattern: {pattern}"

        # Check file size
        if file_path.exists() and file_path.is_file():
            size_kb = file_path.stat().st_size / 1024
            if size_kb > self.max_file_size_kb:
                return (
                    False,
                    f"File too large: {size_kb:.0f}KB > {self.max_file_size_kb}KB",
                )

        return True, ""

    def filter_safe_files(
        self, files: list[Path | str]
    ) -> tuple[list[Path], list[tuple[Path, str]]]:
        """Partition files into safe and blocked lists.

        Returns (safe_files, blocked_files_with_reasons).
        """
        safe: list[Path] = []
        blocked: list[tuple[Path, str]] = []

        for f in files:
            p = Path(f)
            is_ok, reason = self.is_safe(p)
            if is_ok:
                safe.append(p)
            else:
                blocked.append((p, reason))

        return safe, blocked
