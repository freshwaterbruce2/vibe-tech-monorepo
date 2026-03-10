"""Self-Healing Monorepo Orchestrator.

Usage:
    python -m tools.self-healing.orchestrator                    # dry-run all loops
    python -m tools.self-healing.orchestrator --loop lint         # specific loop
    python -m tools.self-healing.orchestrator --auto-apply        # auto-fix mode
    python -m tools.self-healing.orchestrator --config path.yml   # custom config
"""

import argparse
import sys
from pathlib import Path

from .config import load_config
from .safety import SafetyGate
from .loops.base_loop import LoopResult
from .loops.lint_loop import LintLoop
from .loops.typecheck_loop import TypeCheckLoop
from .loops.dependency_loop import DependencyLoop
from .loops.staleness_loop import StalenessLoop
from .reporters.reporter import HealingReporter

REPO_ROOT = Path(r"C:\dev")

LOOP_REGISTRY: dict[str, type] = {
    "lint": LintLoop,
    "typecheck": TypeCheckLoop,
    "dependencies": DependencyLoop,
    "staleness": StalenessLoop,
}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Self-Healing Monorepo Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=None,
        help="Path to self-healing-config.yml",
    )
    parser.add_argument(
        "--loop",
        choices=list(LOOP_REGISTRY.keys()),
        nargs="*",
        help="Run specific loop(s) only (default: all enabled)",
    )
    parser.add_argument(
        "--auto-apply",
        action="store_true",
        help="Override dry-run — actually apply fixes",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Suppress console, output JSON report path only",
    )
    args = parser.parse_args()

    # Load config
    config = load_config(args.config)
    dry_run = not args.auto_apply and config.dry_run

    # Safety gate
    safety = SafetyGate(config.safety, REPO_ROOT)
    if safety.is_killed():
        print("[BLOCKED] Kill switch is active. Aborting all healing loops.")
        return 1

    # Determine which loops to run
    loop_names = args.loop if args.loop else list(LOOP_REGISTRY.keys())

    # Execute loops
    results: list[LoopResult] = []
    for name in loop_names:
        loop_config = config.loops.get(name)
        if loop_config is None:
            print(f"[SKIP] No config for loop '{name}', skipping.")
            continue

        loop_cls = LOOP_REGISTRY.get(name)
        if loop_cls is None:
            print(f"[SKIP] Unknown loop '{name}', skipping.")
            continue

        loop = loop_cls(
            name=name,
            config=loop_config,
            safety=safety,
            repo_root=REPO_ROOT,
            dry_run=dry_run,
        )

        result = loop.run()
        results.append(result)

    # Report
    reporter = HealingReporter(
        log_path=config.log_path,
        report_format=config.report_format,
    )
    report_path = reporter.report(results)

    if args.json:
        print(str(report_path))
    else:
        print(f"Report: {report_path}")

    # Return non-zero if any loop failed
    if any(r.status == "failed" for r in results):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
