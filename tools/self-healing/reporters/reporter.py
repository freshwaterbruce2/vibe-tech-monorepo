"""JSON + console reporter for healing loop results."""

import json
from datetime import datetime
from pathlib import Path

from ..loops.base_loop import LoopResult


class HealingReporter:
    """Aggregates loop results and produces JSON + console reports."""

    def __init__(self, log_path: Path, report_format: str = "json"):
        self.log_path = log_path
        self.report_format = report_format
        self.log_path.mkdir(parents=True, exist_ok=True)

    def report(self, results: list[LoopResult]) -> Path:
        """Generate report from loop results. Returns path to report file."""
        run_data = {
            "timestamp": datetime.now().isoformat(),
            "summary": self._summarize(results),
            "loops": [r.to_dict() for r in results],
        }

        # Console output
        self._print_console(run_data)

        # Write JSON report
        report_file = self.log_path / f"report_{datetime.now():%Y%m%d_%H%M%S}.json"
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(run_data, f, indent=2, default=str)

        return report_file

    @staticmethod
    def _summarize(results: list[LoopResult]) -> dict:
        """Compute aggregate stats across all loops."""
        total_issues = sum(r.issues_found for r in results)
        total_fixed = sum(r.issues_fixed for r in results)
        total_blocked = sum(r.issues_blocked for r in results)
        total_duration = sum(r.duration_seconds for r in results)
        statuses = [r.status for r in results]

        if all(s in ("success", "skipped") for s in statuses):
            overall = "healthy"
        elif any(s == "failed" for s in statuses):
            overall = "degraded"
        else:
            overall = "monitoring"

        return {
            "overall_status": overall,
            "total_issues_found": total_issues,
            "total_issues_fixed": total_fixed,
            "total_issues_blocked": total_blocked,
            "total_duration_seconds": round(total_duration, 2),
            "loops_run": len(results),
        }

    @staticmethod
    def _print_console(data: dict) -> None:
        """Print human-readable summary to console."""
        summary = data["summary"]
        status_icon = {
            "healthy": "[OK]",
            "degraded": "[FAIL]",
            "monitoring": "[WATCH]",
        }.get(summary["overall_status"], "[?]")

        print(f"\n{'='*60}")
        print(f"  Self-Healing Report  {status_icon}  {summary['overall_status'].upper()}")
        print(f"{'='*60}")
        print(f"  Issues found:   {summary['total_issues_found']}")
        print(f"  Issues fixed:   {summary['total_issues_fixed']}")
        print(f"  Issues blocked: {summary['total_issues_blocked']}")
        print(f"  Duration:       {summary['total_duration_seconds']:.1f}s")
        print(f"{'='*60}")

        for loop in data["loops"]:
            icon = {"success": "[OK]", "dry_run": "[DRY]", "skipped": "[SKIP]", "failed": "[FAIL]", "partial": "[PART]"}.get(loop["status"], "[?]")
            print(f"  {icon:8s} {loop['loop_name']:15s} | {loop['status']:10s} | "
                  f"found: {loop['issues_found']}, fixed: {loop['issues_fixed']}, "
                  f"blocked: {loop['issues_blocked']}")

        if any(loop["errors"] for loop in data["loops"]):
            print(f"\n  Errors:")
            for loop in data["loops"]:
                for err in loop["errors"]:
                    print(f"    ! [{loop['loop_name']}] {err}")

        print()
