"""Abstract base for all self-healing loops.

Implements the 5-phase persistence pattern (from Ralph methodology):
  Backup → Fix → Validate → Retry → Learn
"""

import shutil
import subprocess
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from ..config import LoopConfig
from ..safety import SafetyGate


@dataclass
class LoopResult:
    """Outcome of a single healing loop execution."""

    loop_name: str
    status: str = "pending"  # "success" | "partial" | "failed" | "skipped" | "dry_run"
    started_at: str = ""
    duration_seconds: float = 0.0
    projects_scanned: int = 0
    issues_found: int = 0
    issues_fixed: int = 0
    issues_blocked: int = 0
    errors: list[str] = field(default_factory=list)
    details: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "loop_name": self.loop_name,
            "status": self.status,
            "started_at": self.started_at,
            "duration_seconds": round(self.duration_seconds, 2),
            "projects_scanned": self.projects_scanned,
            "issues_found": self.issues_found,
            "issues_fixed": self.issues_fixed,
            "issues_blocked": self.issues_blocked,
            "errors": self.errors,
            "details": self.details,
        }


class BaseLoop(ABC):
    """Abstract healing loop with the 5-phase pattern."""

    def __init__(
        self,
        name: str,
        config: LoopConfig,
        safety: SafetyGate,
        repo_root: Path,
        dry_run: bool = True,
    ):
        self.name = name
        self.config = config
        self.safety = safety
        self.repo_root = repo_root
        self.dry_run = dry_run

    def run(self) -> LoopResult:
        """Execute the full healing loop."""
        if not self.config.enabled:
            return LoopResult(loop_name=self.name, status="skipped")

        if self.safety.is_killed():
            return LoopResult(
                loop_name=self.name,
                status="skipped",
                errors=["Kill switch active"],
            )

        start = time.time()
        result = LoopResult(
            loop_name=self.name,
            started_at=datetime.now().isoformat(),
        )

        try:
            # Phase 1: Discover projects to scan
            projects = self.discover_projects()
            result.projects_scanned = len(projects)

            if not projects:
                result.status = "skipped"
                result.duration_seconds = time.time() - start
                return result

            # Phase 2: Detect issues
            issues = self.detect_issues(projects)
            result.issues_found = len(issues)

            if not issues:
                result.status = "success"
                result.duration_seconds = time.time() - start
                return result

            # Phase 3: Remediate (with safety check + retry)
            for issue in issues:
                file_path = issue.get("file")
                if file_path:
                    is_safe, reason = self.safety.is_safe(file_path)
                    if not is_safe:
                        result.issues_blocked += 1
                        result.details.append(
                            {**issue, "action": "blocked", "reason": reason}
                        )
                        continue

                if self.dry_run:
                    result.details.append({**issue, "action": "dry_run"})
                    continue

                # Attempt fix with retries
                fixed = False
                for attempt in range(1, self.config.max_retries + 1):
                    try:
                        fixed = self.fix_issue(issue)
                        if fixed:
                            result.issues_fixed += 1
                            result.details.append(
                                {**issue, "action": "fixed", "attempt": attempt}
                            )
                            break
                    except Exception as e:
                        if attempt == self.config.max_retries:
                            result.errors.append(
                                f"Fix failed after {attempt} attempts: {e}"
                            )
                            result.details.append(
                                {**issue, "action": "failed", "error": str(e)}
                            )

            # Determine overall status
            if result.issues_fixed == result.issues_found:
                result.status = "success"
            elif result.issues_fixed > 0:
                result.status = "partial"
            elif self.dry_run or not self.config.auto_apply:
                result.status = "dry_run"
            else:
                result.status = "failed"

        except Exception as e:
            result.status = "failed"
            result.errors.append(str(e))

        result.duration_seconds = time.time() - start
        return result

    def discover_projects(self) -> list[Path]:
        """Find projects to scan based on scope config."""
        scope = self.config.scope

        if scope == "all":
            return self._all_projects()
        elif scope == "affected":
            affected = self._affected_projects()
            return affected if affected else self._all_projects()
        elif scope.startswith("project:"):
            name = scope.split(":", 1)[1]
            for d in [self.repo_root / "apps", self.repo_root / "packages", self.repo_root / "backend"]:
                candidate = d / name
                if candidate.exists():
                    return [candidate]
            return []
        return self._all_projects()

    def _all_projects(self) -> list[Path]:
        """List all projects under apps/ and packages/."""
        projects: list[Path] = []
        for parent in ["apps", "packages", "backend"]:
            parent_dir = self.repo_root / parent
            if parent_dir.exists():
                for child in parent_dir.iterdir():
                    if child.is_dir() and not child.name.startswith("."):
                        # Must have a package.json, Cargo.toml, or pyproject.toml
                        if any(
                            (child / f).exists()
                            for f in [
                                "package.json",
                                "Cargo.toml",
                                "pyproject.toml",
                                "project.json",
                            ]
                        ):
                            projects.append(child)
        return projects

    def _affected_projects(self) -> list[Path]:
        """Use Nx to find affected projects (if available)."""
        try:
            result = subprocess.run(
                ["pnpm", "nx", "show", "projects", "--affected"],
                capture_output=True,
                text=True,
                cwd=str(self.repo_root),
                timeout=30,
                encoding="utf-8",
                errors="replace",
            )
            if result.returncode == 0 and result.stdout.strip():
                names = result.stdout.strip().splitlines()
                projects: list[Path] = []
                for name in names:
                    name = name.strip()
                    for parent in ["apps", "packages", "backend"]:
                        candidate = self.repo_root / parent / name
                        if candidate.exists():
                            projects.append(candidate)
                            break
                return projects
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return []

    # --- Backup utility for auto-apply mode ---

    def create_backup(self, target: Path) -> Path | None:
        """Create a ZIP backup of a file or directory before modification."""
        if not target.exists():
            return None
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = target / "_backups" if target.is_dir() else target.parent / "_backups"
        backup_dir.mkdir(exist_ok=True)
        backup_name = f"self-heal_{target.name}_{timestamp}"
        if target.is_dir():
            archive = shutil.make_archive(str(backup_dir / backup_name), "zip", target)
            return Path(archive)
        else:
            dest = backup_dir / f"{backup_name}{target.suffix}"
            shutil.copy2(target, dest)
            return dest

    # --- Abstract methods for subclasses ---

    @abstractmethod
    def detect_issues(self, projects: list[Path]) -> list[dict]:
        """Scan projects and return a list of issue dicts.

        Each dict should have at minimum:
          {"project": str, "file": str|None, "type": str, "message": str}
        """

    @abstractmethod
    def fix_issue(self, issue: dict) -> bool:
        """Attempt to fix a single issue. Returns True if fixed."""
