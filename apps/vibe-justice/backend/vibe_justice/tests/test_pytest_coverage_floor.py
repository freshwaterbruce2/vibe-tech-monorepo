"""Ensure the coverage floor never regresses below its current baseline."""

import re
from pathlib import Path

# Current measured coverage is ~33.78%. Floor is pinned at 33 so CI fails
# on any real regression but passes on the current suite. Raise this value
# in lock-step with new tests that actually cover untested modules.
COVERAGE_FLOOR_MIN = 55


def test_coverage_floor_does_not_regress():
    """Guard against accidental regression of pytest --cov-fail-under."""
    cfg = (Path(__file__).resolve().parents[2] / "pytest.ini").read_text()
    m = re.search(r"--cov-fail-under=(\d+)", cfg)
    assert m and int(m.group(1)) >= COVERAGE_FLOOR_MIN, (
        f"coverage floor regressed to {m.group(1) if m else 'missing'}; "
        f"must be >= {COVERAGE_FLOOR_MIN}"
    )
