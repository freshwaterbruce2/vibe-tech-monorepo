"""Project scanner - discovers and analyzes projects in monorepo."""

import os
from datetime import datetime
from pathlib import Path

from .models import ProjectHealth, ProjectType, ScanResult

# Directories to skip when scanning
SKIP_DIRS = {
    "node_modules",
    ".venv",
    "__pycache__",
    ".git",
    ".nx",
    "dist",
    "dist_final",
    "build",
    ".cache",
    "coverage",
    ".turbo",
    ".pnpm",
    "_internal",
    "vendor",
    "out",
    ".next",
    ".output",
}

# Source file extensions to count
SOURCE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".rs"}


class ProjectScanner:
    """Scans monorepo for projects and collects health metrics."""

    def __init__(self, root_path: Path | str):
        self.root_path = Path(root_path)
        self.errors: list[str] = []

    def scan(self) -> ScanResult:
        """Scan root_path/apps and root_path/packages for projects."""
        projects: list[ProjectHealth] = []

        # Scan apps/
        apps_dir = self.root_path / "apps"
        if apps_dir.exists():
            projects.extend(self._scan_directory(apps_dir))

        # Scan packages/
        packages_dir = self.root_path / "packages"
        if packages_dir.exists():
            projects.extend(self._scan_directory(packages_dir))

        return ScanResult(
            root_path=self.root_path,
            projects=projects,
            errors=self.errors,
        )

    def _scan_directory(self, directory: Path) -> list[ProjectHealth]:
        """Scan a directory for project subdirectories."""
        projects = []

        try:
            for item in directory.iterdir():
                if item.is_dir() and not item.name.startswith("."):
                    project = self._analyze_project(item)
                    if project:
                        projects.append(project)
        except PermissionError as e:
            self.errors.append(f"Permission denied: {directory}")
        except Exception as e:
            self.errors.append(f"Error scanning {directory}: {e}")

        return projects

    def _analyze_project(self, project_path: Path) -> ProjectHealth | None:
        """Analyze a single project directory."""
        project_type = self._detect_project_type(project_path)

        # Skip if not a recognizable project
        if project_type == ProjectType.UNKNOWN:
            return None

        return ProjectHealth(
            name=project_path.name,
            path=project_path,
            project_type=project_type,
            last_modified=self._get_last_modified(project_path),
            todo_count=self._count_todos(project_path),
            has_tests=self._has_tests(project_path),
            readme_exists=self._has_readme(project_path),
            line_count=self._count_lines(project_path),
        )

    def _detect_project_type(self, path: Path) -> ProjectType:
        """Detect project type from config files."""
        if (path / "package.json").exists():
            return ProjectType.NODE
        if (path / "requirements.txt").exists() or (path / "pyproject.toml").exists():
            return ProjectType.PYTHON
        if (path / "Cargo.toml").exists():
            return ProjectType.RUST
        if (path / "project.json").exists():
            # Nx project without package.json - treat as Node
            return ProjectType.NODE
        return ProjectType.UNKNOWN

    def _get_last_modified(self, path: Path) -> datetime | None:
        """Get most recent modification time of source files."""
        latest: datetime | None = None

        for root, dirs, files in os.walk(path):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

            for file in files:
                file_path = Path(root) / file
                if file_path.suffix in SOURCE_EXTENSIONS:
                    try:
                        mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                        if latest is None or mtime > latest:
                            latest = mtime
                    except (PermissionError, OSError):
                        continue

        return latest

    def _count_todos(self, path: Path) -> int:
        """Count TODO, FIXME, HACK comments in source files."""
        count = 0
        markers = (b"TODO", b"FIXME", b"HACK")

        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

            for file in files:
                file_path = Path(root) / file
                if file_path.suffix in SOURCE_EXTENSIONS:
                    try:
                        content = file_path.read_bytes()
                        for marker in markers:
                            count += content.count(marker)
                    except (PermissionError, OSError):
                        continue

        return count

    def _has_tests(self, path: Path) -> bool:
        """Check if project has test files."""
        test_patterns = {
            "test_",
            "_test.py",
            ".test.ts",
            ".test.tsx",
            ".spec.ts",
            ".spec.tsx",
        }

        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

            # Check for tests/ or __tests__ directory
            if "tests" in dirs or "__tests__" in dirs or "test" in dirs:
                return True

            # Check for test files
            for file in files:
                if any(pattern in file for pattern in test_patterns):
                    return True

        return False

    def _has_readme(self, path: Path) -> bool:
        """Check if README exists."""
        return (path / "README.md").exists() or (path / "README").exists()

    def _count_lines(self, path: Path) -> int:
        """Count total lines in source files."""
        total = 0

        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

            for file in files:
                file_path = Path(root) / file
                if file_path.suffix in SOURCE_EXTENSIONS:
                    try:
                        total += len(file_path.read_bytes().splitlines())
                    except (PermissionError, OSError):
                        continue

        return total

    def scan_as_dict(self) -> dict:
        """Return scan results as structured dict for programmatic use."""
        result = self.scan()
        return {
            "total_projects": result.total_projects,
            "scan_time": result.scan_time,
            "errors": result.errors,
            "projects": [
                {
                    "name": p.name,
                    "path": str(p.path),
                    "type": p.project_type.value
                    if hasattr(p.project_type, "value")
                    else str(p.project_type),
                    "health_score": p.health_score,
                    "staleness_days": p.staleness_days,
                    "todo_count": p.todo_count,
                    "has_tests": p.has_tests,
                    "has_readme": p.readme_exists,
                    "line_count": p.line_count,
                }
                for p in result.projects
            ],
        }
