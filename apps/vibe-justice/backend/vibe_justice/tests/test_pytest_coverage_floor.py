"""Ensure coverage floor doesn't regress."""

import re
from pathlib import Path


def test_coverage_floor_at_least_60():
    """Guard against accidental regression of pytest --cov-fail-under."""
    cfg = (Path(__file__).resolve().parents[2] / "pytest.ini").read_text()
    m = re.search(r"--cov-fail-under=(\d+)", cfg)
    assert m and int(m.group(1)) >= 60, (
        f"coverage floor regressed to {m.group(1) if m else 'missing'}"
    )
