"""Package entry point — allows `python -m tools.self_healing`."""

from .orchestrator import main
import sys

if __name__ == "__main__":
    sys.exit(main())
