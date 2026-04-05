#!/usr/bin/env python3
"""Compatibility wrapper for the canonical live trading launcher."""

from __future__ import annotations

import runpy
from pathlib import Path


if __name__ == '__main__':
    script_path = Path(__file__).parent / 'scripts' / 'start_live_trading.py'
    runpy.run_path(str(script_path), run_name='__main__')
