"""Self-Healing Orchestrator CLI runner.

Handles the hyphenated directory name by using importlib.
Usage: python tools/self-healing/run.py [args]
"""

import sys
from pathlib import Path

# Ensure repo root is on sys.path so 'tools' package is importable
repo_root = str(Path(__file__).resolve().parent.parent.parent)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from importlib import import_module

mod = import_module("tools.self-healing.orchestrator")
sys.exit(mod.main())
