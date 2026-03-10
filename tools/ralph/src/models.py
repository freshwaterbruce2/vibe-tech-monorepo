"""Data models for Project Health Scanner."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path


class ProjectType(Enum):
    """Detected project type based on config files."""
    NODE = "node"
    PYTHON = "python"
    RUST = "rust"
    UNKNOWN = "unknown"


@dataclass
class ProjectHealth:
    """Health metrics for a single project."""
    
    # Identity
    name: str
    path: Path
    project_type: ProjectType
    
    # Metrics
    last_modified: datetime | None = None
    staleness_days: int = 0
    todo_count: int = 0
    has_tests: bool = False
    readme_exists: bool = False
    line_count: int = 0
    
    # Computed
    health_score: float = 0.0
    
    def __post_init__(self):
        """Calculate staleness from last_modified."""
        if self.last_modified:
            delta = datetime.now() - self.last_modified
            self.staleness_days = delta.days


@dataclass
class ScanResult:
    """Container for all scanned projects."""
    
    root_path: Path
    projects: list[ProjectHealth] = field(default_factory=list)
    scan_time: datetime = field(default_factory=datetime.now)
    errors: list[str] = field(default_factory=list)
    
    @property
    def total_projects(self) -> int:
        return len(self.projects)
    
    @property
    def sorted_by_score(self) -> list[ProjectHealth]:
        """Return projects sorted by health score (highest = needs attention)."""
        return sorted(self.projects, key=lambda p: p.health_score, reverse=True)
