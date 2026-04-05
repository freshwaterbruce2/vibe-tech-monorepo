#!/usr/bin/env python3
"""Compatibility wrapper for the canonical project test runner."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    project_root = Path(__file__).resolve().parents[1]
    runner = project_root / 'run_tests.py'
    command = [sys.executable, str(runner), *sys.argv[1:]]
    completed = subprocess.run(command, cwd=project_root)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
