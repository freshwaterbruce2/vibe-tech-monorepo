"""TypeCheck healing loop — detects TypeScript compilation errors per project."""

import re
import subprocess
from pathlib import Path

from .base_loop import BaseLoop

# Pattern: src/foo.ts(12,5): error TS2304: Cannot find name 'x'.
TS_ERROR_RE = re.compile(
    r"^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$", re.MULTILINE
)


class TypeCheckLoop(BaseLoop):
    """Runs tsc --noEmit across projects and reports type errors."""

    def detect_issues(self, projects: list[Path]) -> list[dict]:
        """Run tsc --noEmit and parse output for type errors."""
        issues: list[dict] = []

        for project in projects:
            tsconfig = project / "tsconfig.json"
            if not tsconfig.exists():
                continue

            try:
                result = subprocess.run(
                    ["pnpm", "tsc", "--noEmit", "--pretty", "false"],
                    capture_output=True,
                    text=True,
                    cwd=str(project),
                    timeout=self.config.timeout_seconds,
                    encoding="utf-8",
                    errors="replace",
                )

                if result.returncode != 0:
                    output = result.stdout + result.stderr
                    matches = TS_ERROR_RE.findall(output)

                    if matches:
                        for file_path, line, col, code, message in matches:
                            # Resolve relative paths
                            fp = Path(file_path)
                            if not fp.is_absolute():
                                fp = project / fp

                            issues.append({
                                "project": project.name,
                                "file": str(fp),
                                "type": "typecheck",
                                "code": code,
                                "message": message.strip(),
                                "line": int(line),
                                "column": int(col),
                            })
                    else:
                        # Couldn't parse — record as generic error
                        issues.append({
                            "project": project.name,
                            "file": None,
                            "type": "typecheck_generic",
                            "message": output[:500] if output else "tsc failed with no output",
                        })

            except subprocess.TimeoutExpired:
                issues.append({
                    "project": project.name,
                    "file": None,
                    "type": "typecheck_timeout",
                    "message": f"tsc timeout after {self.config.timeout_seconds}s",
                })
            except FileNotFoundError:
                continue

        return issues

    def fix_issue(self, issue: dict) -> bool:
        """TypeCheck fixes are conservative — only handle known safe patterns.

        Currently: report-only. TypeScript errors typically require human judgment.
        Future: auto-add missing imports for well-known patterns.
        """
        # TypeScript errors are rarely auto-fixable safely
        return False
