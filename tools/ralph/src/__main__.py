"""Entry point for: python -m src"""

import argparse
import sys
from pathlib import Path

from .scanner import ProjectScanner
from .scorer import score_all_projects
from .output import output_console, output_markdown


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        prog="health_scanner",
        description="Scan monorepo for project health metrics",
    )
    parser.add_argument(
        "--path",
        type=Path,
        default=Path(r"C:\dev"),
        help="Root path to scan (default: C:\\dev)",
    )
    parser.add_argument(
        "--output",
        choices=["console", "markdown", "both"],
        default="console",
        help="Output format (default: console)",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=None,
        help="Show only top N projects (default: all)",
    )
    parser.add_argument(
        "--markdown-path",
        type=Path,
        default=None,
        help="Path for markdown output (default: ROOT\\PROJECT_HEALTH.md)",
    )
    return parser.parse_args()


def main() -> int:
    """Main entry point."""
    args = parse_args()
    
    # Validate path exists
    if not args.path.exists():
        print(f"Error: Path does not exist: {args.path}")
        return 1
    
    # Scan
    print(f"Scanning {args.path}...")
    scanner = ProjectScanner(args.path)
    result = scanner.scan()
    
    if result.total_projects == 0:
        print("No projects found.")
        return 0
    
    # Score
    result = score_all_projects(result)
    
    # Output
    if args.output in ("console", "both"):
        output_console(result, top_n=args.top)
    
    if args.output in ("markdown", "both"):
        md_path = args.markdown_path or (args.path / "PROJECT_HEALTH.md")
        output_markdown(result, output_path=md_path)
        print(f"Markdown report saved to: {md_path}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
