"""Dependency healing loop — detects missing, unused, and drifted dependencies."""

import json
from pathlib import Path

from .base_loop import BaseLoop


class DependencyLoop(BaseLoop):
    """Analyzes package.json files for dependency health issues."""

    def detect_issues(self, projects: list[Path]) -> list[dict]:
        """Check each project's dependencies for common problems."""
        issues: list[dict] = []
        checks = self.config.checks or ["missing_deps", "unused_deps", "version_drift"]

        # Collect root-level versions for drift detection
        root_versions: dict[str, str] = {}
        root_pkg = self.repo_root / "package.json"
        if root_pkg.exists():
            root_data = self._read_pkg(root_pkg)
            for section in ["dependencies", "devDependencies"]:
                root_versions.update(root_data.get(section, {}))

        for project in projects:
            pkg_path = project / "package.json"
            if not pkg_path.exists():
                continue

            pkg = self._read_pkg(pkg_path)
            all_deps = {
                **pkg.get("dependencies", {}),
                **pkg.get("devDependencies", {}),
            }

            # Check for version drift against root
            if "version_drift" in checks:
                for dep_name, dep_version in all_deps.items():
                    if dep_name in root_versions:
                        root_ver = root_versions[dep_name]
                        if dep_version != root_ver and not dep_name.startswith("@vibetech/"):
                            issues.append({
                                "project": project.name,
                                "file": str(pkg_path),
                                "type": "version_drift",
                                "message": (
                                    f"{dep_name}: project has {dep_version}, "
                                    f"root has {root_ver}"
                                ),
                                "dependency": dep_name,
                                "project_version": dep_version,
                                "root_version": root_ver,
                            })

            # Check for workspace protocol misuse
            if "missing_deps" in checks:
                for dep_name, dep_version in all_deps.items():
                    if dep_name.startswith("@vibetech/"):
                        if not dep_version.startswith("workspace:"):
                            issues.append({
                                "project": project.name,
                                "file": str(pkg_path),
                                "type": "missing_workspace_protocol",
                                "message": (
                                    f"{dep_name} should use workspace:* "
                                    f"but has {dep_version}"
                                ),
                                "dependency": dep_name,
                            })

            # Check node_modules exists (dependency not installed)
            if "missing_deps" in checks:
                node_modules = project / "node_modules"
                if all_deps and not node_modules.exists():
                    issues.append({
                        "project": project.name,
                        "file": str(pkg_path),
                        "type": "missing_node_modules",
                        "message": "node_modules missing — dependencies not installed",
                    })

        return issues

    def fix_issue(self, issue: dict) -> bool:
        """Dependency fixes are risky — report-only for now.

        Future: could auto-run `pnpm install` for missing_node_modules,
        or update workspace:* for missing_workspace_protocol.
        """
        return False

    @staticmethod
    def _read_pkg(path: Path) -> dict:
        """Read and parse a package.json file."""
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
