"""Output formatters for Project Health Scanner."""

from datetime import datetime
from pathlib import Path

from .models import ProjectHealth, ScanResult


# ANSI color codes (Windows Terminal / PowerShell 7+ compatible)
class Colors:
    RED = "\033[91m"
    YELLOW = "\033[93m"
    GREEN = "\033[92m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


def _score_color(score: float) -> str:
    """Get color based on health score."""
    if score >= 50:
        return Colors.RED
    elif score >= 30:
        return Colors.YELLOW
    else:
        return Colors.GREEN


def _format_date(dt: datetime | None) -> str:
    """Format datetime for display."""
    if dt is None:
        return "Never"
    return dt.strftime("%Y-%m-%d")


def output_console(result: ScanResult, top_n: int | None = None) -> None:
    """Print results to console with color coding."""
    projects = result.sorted_by_score
    if top_n:
        projects = projects[:top_n]
    
    # Header
    print()
    print(f"{Colors.BOLD}PROJECT HEALTH REPORT{Colors.RESET}")
    print(f"Scanned: {result.root_path}")
    print(f"Found: {result.total_projects} projects")
    print(f"Time: {result.scan_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Column headers
    header = f"{'PROJECT':<30} {'TYPE':<8} {'SCORE':>6} {'STALE':>6} {'TODOs':>6} {'TESTS':>6} {'LINES':>8}"
    print(f"{Colors.BOLD}{header}{Colors.RESET}")
    print("-" * 80)
    
    # Project rows
    for p in projects:
        color = _score_color(p.health_score)
        tests_indicator = f"{Colors.GREEN}Yes{Colors.RESET}" if p.has_tests else f"{Colors.RED}No{Colors.RESET}"
        
        row = (
            f"{color}{p.name:<30}{Colors.RESET} "
            f"{p.project_type.value:<8} "
            f"{color}{p.health_score:>6.1f}{Colors.RESET} "
            f"{p.staleness_days:>5}d "
            f"{p.todo_count:>6} "
            f"{tests_indicator:>14} "
            f"{p.line_count:>8}"
        )
        print(row)
    
    # Footer
    print("-" * 80)
    if result.errors:
        print(f"\n{Colors.YELLOW}Warnings:{Colors.RESET}")
        for error in result.errors:
            print(f"  - {error}")
    
    print()


def output_markdown(result: ScanResult, output_path: Path | None = None) -> str:
    """Generate markdown report."""
    projects = result.sorted_by_score
    
    lines = [
        "# Project Health Report",
        "",
        f"**Scanned:** `{result.root_path}`  ",
        f"**Projects Found:** {result.total_projects}  ",
        f"**Generated:** {result.scan_time.strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "## Priority List (Highest Score = Needs Attention)",
        "",
        "| Project | Type | Score | Stale (days) | TODOs | Tests | Lines |",
        "|---------|------|------:|-------------:|------:|-------|------:|",
    ]
    
    for p in projects:
        tests_str = "✓" if p.has_tests else "✗"
        score_emoji = "🔴" if p.health_score >= 50 else "🟡" if p.health_score >= 30 else "🟢"
        lines.append(
            f"| {p.name} | {p.project_type.value} | {score_emoji} {p.health_score:.1f} | "
            f"{p.staleness_days} | {p.todo_count} | {tests_str} | {p.line_count:,} |"
        )
    
    lines.extend([
        "",
        "## Score Formula",
        "",
        "```",
        "Score = (Staleness × 0.4) + (TODOs × 0.3) + (No Tests × 0.2) + (No README × 0.1)",
        "```",
        "",
        "- Staleness: Days since last source file modification (capped at 365)",
        "- Higher score = more attention needed",
    ])
    
    if result.errors:
        lines.extend([
            "",
            "## Warnings",
            "",
        ])
        for error in result.errors:
            lines.append(f"- {error}")
    
    content = "\n".join(lines)
    
    if output_path:
        output_path.write_text(content, encoding="utf-8")
    
    return content
