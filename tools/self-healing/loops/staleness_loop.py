"""Staleness healing loop — identifies stale/abandoned projects.

Wraps the existing Ralph ProjectScanner + scorer for health grading.
"""

import sys
from pathlib import Path

from .base_loop import BaseLoop

# Add Ralph source to path for import
RALPH_PATH = Path(r"C:\dev\tools\ralph")


class StalenessLoop(BaseLoop):
    """Scans projects for staleness using Ralph's health scoring."""

    def detect_issues(self, projects: list[Path]) -> list[dict]:
        """Score each project for staleness and flag those exceeding threshold."""
        issues: list[dict] = []
        threshold = self.config.threshold_days

        # Use Ralph's scanner if available
        try:
            if str(RALPH_PATH) not in sys.path:
                sys.path.insert(0, str(RALPH_PATH))

            from src.scanner import ProjectScanner
            from src.scorer import calculate_health_score

            scanner = ProjectScanner(self.repo_root)
            result = scanner.scan()

            for project in result.projects:
                calculate_health_score(project)

                if project.staleness_days >= threshold:
                    issues.append({
                        "project": project.name,
                        "file": None,
                        "type": "staleness",
                        "message": (
                            f"Stale for {project.staleness_days} days "
                            f"(threshold: {threshold})"
                        ),
                        "staleness_days": project.staleness_days,
                        "health_score": project.health_score,
                        "has_tests": project.has_tests,
                        "has_readme": project.readme_exists,
                        "todo_count": project.todo_count,
                        "line_count": project.line_count,
                    })

        except ImportError:
            # Fallback: basic staleness check without Ralph
            for project in projects:
                staleness = self._basic_staleness(project)
                if staleness >= threshold:
                    issues.append({
                        "project": project.name,
                        "file": None,
                        "type": "staleness",
                        "message": f"Stale for {staleness} days (threshold: {threshold})",
                        "staleness_days": staleness,
                    })

        return issues

    def fix_issue(self, issue: dict) -> bool:
        """Staleness cannot be auto-fixed — always report-only."""
        return False

    @staticmethod
    def _basic_staleness(project: Path) -> int:
        """Simple staleness check: days since newest source file was modified."""
        from datetime import datetime
        import os

        latest = None
        source_exts = {".py", ".ts", ".tsx", ".js", ".jsx", ".rs"}
        skip_dirs = {"node_modules", ".venv", "__pycache__", "dist", ".git"}

        for root, dirs, files in os.walk(project):
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            for f in files:
                fp = Path(root) / f
                if fp.suffix in source_exts:
                    try:
                        mtime = datetime.fromtimestamp(fp.stat().st_mtime)
                        if latest is None or mtime > latest:
                            latest = mtime
                    except OSError:
                        continue

        if latest:
            return (datetime.now() - latest).days
        return 9999
