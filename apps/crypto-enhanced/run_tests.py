#!/usr/bin/env python3
"""Compatibility wrapper for the canonical pytest test runner."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
import os


PYTEST_ADDOPTS = (
    '--verbose '
    '--strict-markers '
    '--tb=short '
    '--ignore=tests/test_authentication_integration.py '
    '--cov=src '
    '--cov-report=term-missing '
    '--cov-report=html:htmlcov '
    '--cov-fail-under=5'
)


def main() -> int:
    project_root = Path(__file__).parent
    args = sys.argv[1:] or ['tests']
    command = [
        sys.executable,
        '-m',
        'pytest',
        '-p',
        'pytest_cov',
        '-o',
        f'addopts={PYTEST_ADDOPTS}',
        *args,
    ]
    env = os.environ.copy()
    # Avoid auto-loading broken or irrelevant third-party pytest plugins from the host machine.
    env['PYTEST_DISABLE_PLUGIN_AUTOLOAD'] = '1'
    completed = subprocess.run(command, cwd=project_root, env=env)
    return completed.returncode


if __name__ == '__main__':
    raise SystemExit(main())
