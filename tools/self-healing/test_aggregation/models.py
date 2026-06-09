"""Data models for test result aggregation."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class TestStatus(Enum):
    """Test execution status."""
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    PENDING = "pending"
    FLAKY = "flaky"
    TIMEOUT = "timeout"


class TestType(Enum):
    """Type of test runner."""
    VITEST = "vitest"
    PYTEST = "pytest"
    PLAYWRIGHT = "playwright"
    JEST = "jest"
    UNKNOWN = "unknown"


@dataclass
class TestCase:
    """Individual test case result."""
    name: str
    status: TestStatus
    duration_ms: float = 0.0
    suite_name: str = ""
    package_name: str = ""
    error_message: Optional[str] = None
    error_stack: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    retry_count: int = 0
    flaky_detected: bool = False
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "duration_ms": self.duration_ms,
            "suite_name": self.suite_name,
            "package_name": self.package_name,
            "error_message": self.error_message,
            "error_stack": self.error_stack,
            "retry_count": self.retry_count,
            "flaky_detected": self.flaky_detected,
        }


@dataclass
class TestSuite:
    """Test suite containing multiple test cases."""
    name: str
    package_name: str = ""
    test_type: TestType = TestType.UNKNOWN
    duration_ms: float = 0.0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    exit_code: int = 0
    tests: list[TestCase] = field(default_factory=list)
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    
    @property
    def passed_count(self) -> int:
        return sum(1 for t in self.tests if t.status == TestStatus.PASSED)
    
    @property
    def failed_count(self) -> int:
        return sum(1 for t in self.tests if t.status == TestStatus.FAILED)
    
    @property
    def skipped_count(self) -> int:
        return sum(1 for t in self.tests if t.status == TestStatus.SKIPPED)
    
    @property
    def total_count(self) -> int:
        return len(self.tests)
    
    @property
    def pass_rate(self) -> float:
        if self.total_count == 0:
            return 0.0
        return (self.passed_count / self.total_count) * 100
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "package_name": self.package_name,
            "test_type": self.test_type.value,
            "duration_ms": self.duration_ms,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "exit_code": self.exit_code,
            "summary": {
                "total": self.total_count,
                "passed": self.passed_count,
                "failed": self.failed_count,
                "skipped": self.skipped_count,
                "pass_rate": round(self.pass_rate, 2),
            },
            "tests": [t.to_dict() for t in self.tests],
        }


@dataclass
class CoverageMetrics:
    """Code coverage metrics for a package or overall."""
    lines_total: int = 0
    lines_covered: int = 0
    functions_total: int = 0
    functions_covered: int = 0
    branches_total: int = 0
    branches_covered: int = 0
    statements_total: int = 0
    statements_covered: int = 0
    
    @property
    def lines_pct(self) -> float:
        if self.lines_total == 0:
            return 0.0
        return (self.lines_covered / self.lines_total) * 100
    
    @property
    def functions_pct(self) -> float:
        if self.functions_total == 0:
            return 0.0
        return (self.functions_covered / self.functions_total) * 100
    
    @property
    def branches_pct(self) -> float:
        if self.branches_total == 0:
            return 0.0
        return (self.branches_covered / self.branches_total) * 100
    
    @property
    def statements_pct(self) -> float:
        if self.statements_total == 0:
            return 0.0
        return (self.statements_covered / self.statements_total) * 100
    
    @property
    def overall_pct(self) -> float:
        """Calculate overall coverage as average of all metrics."""
        metrics = [self.lines_pct, self.functions_pct, self.branches_pct, self.statements_pct]
        valid_metrics = [m for m in metrics if m > 0]
        if not valid_metrics:
            return 0.0
        return sum(valid_metrics) / len(valid_metrics)
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "lines": {
                "total": self.lines_total,
                "covered": self.lines_covered,
                "pct": round(self.lines_pct, 2),
            },
            "functions": {
                "total": self.functions_total,
                "covered": self.functions_covered,
                "pct": round(self.functions_pct, 2),
            },
            "branches": {
                "total": self.branches_total,
                "covered": self.branches_covered,
                "pct": round(self.branches_pct, 2),
            },
            "statements": {
                "total": self.statements_total,
                "covered": self.statements_covered,
                "pct": round(self.statements_pct, 2),
            },
            "overall_pct": round(self.overall_pct, 2),
        }


@dataclass
class PackageMetrics:
    """Metrics for a single package/project."""
    name: str
    path: str = ""
    test_suites: list[TestSuite] = field(default_factory=list)
    coverage: Optional[CoverageMetrics] = None
    
    @property
    def total_tests(self) -> int:
        return sum(s.total_count for s in self.test_suites)
    
    @property
    def passed_tests(self) -> int:
        return sum(s.passed_count for s in self.test_suites)
    
    @property
    def failed_tests(self) -> int:
        return sum(s.failed_count for s in self.test_suites)
    
    @property
    def skipped_tests(self) -> int:
        return sum(s.skipped_count for s in self.test_suites)
    
    @property
    def pass_rate(self) -> float:
        if self.total_tests == 0:
            return 0.0
        return (self.passed_tests / self.total_tests) * 100
    
    @property
    def total_duration_ms(self) -> float:
        return sum(s.duration_ms for s in self.test_suites)
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "path": self.path,
            "summary": {
                "total_tests": self.total_tests,
                "passed": self.passed_tests,
                "failed": self.failed_tests,
                "skipped": self.skipped_tests,
                "pass_rate": round(self.pass_rate, 2),
                "duration_ms": round(self.total_duration_ms, 2),
            },
            "coverage": self.coverage.to_dict() if self.coverage else None,
            "test_suites": [s.to_dict() for s in self.test_suites],
        }


@dataclass
class FlakyTest:
    """Represents a flaky test detected across multiple runs."""
    test_name: str
    suite_name: str
    package_name: str
    pass_count: int = 0
    fail_count: int = 0
    total_runs: int = 0
    last_failure_message: Optional[str] = None
    
    @property
    def flakiness_score(self) -> float:
        """Score from 0-1 where higher means more flaky."""
        if self.total_runs < 2:
            return 0.0
        # Flaky if it both passes and fails
        if self.pass_count > 0 and self.fail_count > 0:
            return (self.fail_count / self.total_runs) * 0.5 + 0.5
        return 0.0
    
    @property
    def is_flaky(self) -> bool:
        return self.flakiness_score > 0.1  # Threshold for flakiness
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "test_name": self.test_name,
            "suite_name": self.suite_name,
            "package_name": self.package_name,
            "pass_count": self.pass_count,
            "fail_count": self.fail_count,
            "total_runs": self.total_runs,
            "flakiness_score": round(self.flakiness_score, 3),
            "is_flaky": self.is_flaky,
            "last_failure_message": self.last_failure_message,
        }


@dataclass
class CriticalFailure:
    """Represents a critical failure that blocks the health report."""
    type: str  # "test_failure", "coverage_threshold", "execution_error", "timeout"
    message: str
    package_name: str = ""
    suite_name: str = ""
    test_name: str = ""
    details: Optional[dict] = None
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "type": self.type,
            "message": self.message,
            "package_name": self.package_name,
            "suite_name": self.suite_name,
            "test_name": self.test_name,
            "details": self.details,
        }
