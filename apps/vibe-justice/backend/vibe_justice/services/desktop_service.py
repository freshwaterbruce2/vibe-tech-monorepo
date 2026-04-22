"""
Desktop Commander Service
-------------------------
Safe interface for "Assistant" agents to interact with the Windows 11 desktop.
Strictly enforced to operate ONLY on the D: drive to prevent accidental system damage.
"""

from pathlib import Path
from typing import Any, Dict, List


class DesktopService:
    def __init__(self):
        self.safe_root = Path("D:/").resolve()

    def _validate_path(self, path_str: str) -> Path:
        """Ensures path is absolute and within D: drive."""
        try:
            path = Path(path_str).resolve()
            if not str(path).upper().startswith("D:"):
                # Fallback: if relative, append to safe root
                path = self.safe_root / path_str
                path = path.resolve()

            if not str(path).upper().startswith("D:"):
                raise ValueError(
                    f"Security Alert: Agent attempted to access non-D: drive path: {path}"
                )

            return path
        except Exception as e:
            raise ValueError(f"Invalid path: {e}")

    def list_directory(self, path_str: str) -> List[Dict[str, Any]]:
        target = self._validate_path(path_str)
        if not target.exists() or not target.is_dir():
            raise FileNotFoundError(f"Directory not found: {target}")

        results = []
        for item in target.iterdir():
            results.append(
                {
                    "name": item.name,
                    "type": "dir" if item.is_dir() else "file",
                    "size": item.stat().st_size if item.is_file() else 0,
                    "path": str(item),
                }
            )
        return results

    def read_text_file(self, path_str: str) -> str:
        target = self._validate_path(path_str)
        if not target.is_file():
            raise FileNotFoundError(f"File not found: {target}")

        # Enforce file limits for safety
        if target.stat().st_size > 5 * 1024 * 1024:  # 5MB limit
            raise ValueError("File too large for direct read (limit 5MB)")

        return target.read_text(encoding="utf-8", errors="replace")

    def write_text_file(self, path_str: str, content: str) -> str:
        target = self._validate_path(path_str)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return str(target)
