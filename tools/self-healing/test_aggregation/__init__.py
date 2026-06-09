"""Test result aggregation module for parallel test workers.

Collects, parses, and aggregates test results from multiple sources including:
- Vitest JSON outputs
- Coverage reports (v8, lcov, json)
- Pytest results
- Playwright test outputs
- Exit codes from test processes

Provides unified metrics for health reports including:
- Total tests run, pass rate
- Coverage percentage per package and overall
- Test duration per suite
- Flaky test detection
- Critical failure identification
"""

from .aggregator import TestResultAggregator, AggregatedTestResults
from .parsers import (
    VitestJsonParser,
    CoverageJsonParser,
    PytestJsonParser,
    PlaywrightJsonParser,
)
from .models import (
    TestSuite,
    TestCase,
    CoverageMetrics,
    PackageMetrics,
    FlakyTest,
    CriticalFailure,
)

__all__ = [
    "TestResultAggregator",
    "AggregatedTestResults",
    "VitestJsonParser",
    "CoverageJsonParser",
    "PytestJsonParser",
    "PlaywrightJsonParser",
    "TestSuite",
    "TestCase",
    "CoverageMetrics",
    "PackageMetrics",
    "FlakyTest",
    "CriticalFailure",
]
