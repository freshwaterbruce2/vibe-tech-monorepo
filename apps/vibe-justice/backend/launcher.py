# launcher.py - Unified entrypoint for VibeJustice
# Starts backend as detached process, waits for health, then launches UI
import argparse
import multiprocessing
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

# Windows process creation flags
DETACHED_PROCESS = 0x00000008
CREATE_NEW_PROCESS_GROUP = 0x00000200

# Backend health endpoint
HEALTH_URL = "http://127.0.0.1:8000/health"
LOG_DIR = Path("D:/logs/vibe-justice")


def is_backend_up(url: str = HEALTH_URL) -> bool:
    """Check if backend is responding to health check."""
    try:
        with urllib.request.urlopen(url, timeout=1.5) as r:
            return r.status == 200
    except Exception:
        return False


def wait_for_backend(timeout_s: int = 25) -> bool:
    """Poll for backend readiness."""
    print(f"[LAUNCHER] Waiting for backend (max {timeout_s}s)...")
    start = time.time()
    while time.time() - start < timeout_s:
        if is_backend_up():
            print("[LAUNCHER] Backend is UP!")
            return True
        time.sleep(0.5)
    print("[LAUNCHER] Backend startup timeout!")
    return False


def get_bundle_root() -> Path:
    """Get the root path - handles PyInstaller frozen mode."""
    if hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).resolve().parent


def start_backend_detached() -> subprocess.Popen:
    """Start backend as a detached subprocess (won't block UI)."""
    exe_path = Path(sys.executable)

    # Ensure log directory exists
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    out = (LOG_DIR / "backend_stdout.log").open("a", encoding="utf-8")
    err = (LOG_DIR / "backend_stderr.log").open("a", encoding="utf-8")

    print(f"[LAUNCHER] Starting backend: {exe_path} --backend")
    print(f"[LAUNCHER] Logs: {LOG_DIR}")

    return subprocess.Popen(
        [str(exe_path), "--backend"],
        stdout=out,
        stderr=err,
        cwd=str(exe_path.parent),
        creationflags=CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS,
        close_fds=True,
    )


def run_backend_blocking() -> int:
    """Run backend in blocking mode (when --backend flag is passed)."""
    print("[LAUNCHER] Running backend (blocking mode)...")
    import uvicorn

    from backend.main import app

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
    return 0


def run_ui() -> int:
    """Launch the PySide6/qfluentwidgets UI."""
    print("[LAUNCHER] Starting UI...")
    from backend.launch_native import main as ui_main

    ui_main()
    return 0


def main() -> int:
    """Main entrypoint - decides what to start."""
    # PyInstaller multiprocessing fix for Windows
    multiprocessing.freeze_support()

    p = argparse.ArgumentParser(description="VibeJustice Launcher")
    p.add_argument("--backend", action="store_true", help="Run backend only (blocking)")
    p.add_argument(
        "--ui-only", action="store_true", help="Run UI only (skip backend spawn)"
    )
    args = p.parse_args()

    # Mode 1: Backend only (for subprocess calls)
    if args.backend:
        return run_backend_blocking()

    # Default mode: Start both
    bundle_root = get_bundle_root()
    print(f"[LAUNCHER] Bundle root: {bundle_root}")

    if not args.ui_only:
        # Check if backend is already running
        if is_backend_up():
            print("[LAUNCHER] Backend already running, skipping spawn.")
        else:
            # Start backend as detached process
            start_backend_detached()
            # Wait for it to become ready
            if not wait_for_backend(timeout_s=25):
                print("[LAUNCHER] WARNING: Backend may not be ready!")

    # Start UI (this blocks until UI is closed)
    return run_ui()


if __name__ == "__main__":
    raise SystemExit(main())
