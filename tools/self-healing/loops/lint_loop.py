"""Lint healing loop — detects and fixes ESLint errors per project."""

import subprocess
from pathlib import Path

from .base_loop import BaseLoop

# Build artifact directories to exclude from ESLint scanning.
# These produce tens of thousands of false positives (minified vendor code,
# Vite pre-bundled deps, compiled output, backup snapshots, etc.).
IGNORE_PATTERNS: list[str] = [
    "dist/**",
    "build/**",
    "package/**",
    ".vite-cache/**",
    "_backups/**",
    "*.min.js",
    "coverage/**",
    ".next/**",
    ".output/**",
]


def _eslint_ignore_args() -> list[str]:
    """Build --ignore-pattern flags for ESLint."""
    args: list[str] = []
    for pattern in IGNORE_PATTERNS:
        args.extend(["--ignore-pattern", pattern])
    return args


class LintLoop(BaseLoop):
    """Runs ESLint across projects, collects errors, and optionally auto-fixes."""

    def detect_issues(self, projects: list[Path]) -> list[dict]:
        """Run ESLint in report-only mode and parse output."""
        issues: list[dict] = []
        ignore_args = _eslint_ignore_args()

        for project in projects:
            pkg_json = project / "package.json"
            if not pkg_json.exists():
                continue

            try:
                result = subprocess.run(
                    ["pnpm", "eslint", ".", "--format", "json", "--no-fix"]
                    + ignore_args,
                    capture_output=True,
                    text=True,
                    cwd=str(project),
                    timeout=self.config.timeout_seconds,
                    encoding="utf-8",
                    errors="replace",
                )

                stdout = result.stdout or ""
                if result.returncode != 0 and stdout.strip():
                    import json

                    try:
                        eslint_output = json.loads(stdout)
                    except json.JSONDecodeError:
                        issues.append({
                            "project": project.name,
                            "file": None,
                            "type": "lint_parse_error",
                            "message": f"Could not parse ESLint output for {project.name}",
                        })
                        continue

                    for file_report in eslint_output:
                        file_path = file_report.get("filePath", "")
                        for msg in file_report.get("messages", []):
                            severity = msg.get("severity", 0)
                            if severity >= 1:
                                issues.append({
                                    "project": project.name,
                                    "file": file_path,
                                    "type": "lint",
                                    "rule": msg.get("ruleId", "unknown"),
                                    "message": msg.get("message", ""),
                                    "line": msg.get("line", 0),
                                    "severity": "error" if severity == 2 else "warning",
                                    "fixable": msg.get("fix") is not None,
                                })

            except subprocess.TimeoutExpired:
                issues.append({
                    "project": project.name,
                    "file": None,
                    "type": "lint_timeout",
                    "message": f"ESLint timeout after {self.config.timeout_seconds}s",
                })
            except (FileNotFoundError, OSError, Exception) as e:
                issues.append({
                    "project": project.name,
                    "file": None,
                    "type": "lint_error",
                    "message": f"ESLint failed for {project.name}: {e}",
                })

        return issues

    def fix_issue(self, issue: dict) -> bool:
        """Run ESLint --fix on the specific file."""
        file_path = issue.get("file")
        if not file_path:
            return False

        fp = Path(file_path)
        if not fp.exists():
            return False

        # Backup before fix
        self.create_backup(fp)

        try:
            result = subprocess.run(
                ["pnpm", "eslint", str(fp), "--fix"] + _eslint_ignore_args(),
                capture_output=True,
                text=True,
                timeout=60,
                encoding="utf-8",
                errors="replace",
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
