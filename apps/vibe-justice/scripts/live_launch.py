import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import psutil

# PROJECT PATHS
# Dynamic resolution to ensure it works within the repo
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BASE_DIR = REPO_ROOT
LOG_DIR = r"D:\logs\vibe_justice"
NOTIFY_LOG = os.path.join(LOG_DIR, "notifications.log")
MAIN_SCRIPT = BASE_DIR / "backend" / "start_backend.py"
PYTHON_EXE = sys.executable

# Try to use venv python if available for correct dependencies
VENV_PYTHON = BASE_DIR / "backend" / ".venv" / "Scripts" / "python.exe"
if VENV_PYTHON.exists():
    PYTHON_EXE = str(VENV_PYTHON)


def setup_environment():
    """Initializes logging directory and ensures path integrity."""
    if not os.path.exists(LOG_DIR):
        try:
            os.makedirs(LOG_DIR, exist_ok=True)
        except Exception as e:
            print(f"[ERROR] Failed to create log dir {LOG_DIR}: {e}")


def log_notification(message, level="INFO"):
    """Writes to the shared notification log for UI visibility."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [{level}] {message}\n"
    try:
        with open(NOTIFY_LOG, "a", encoding="utf-8") as f:
            f.write(formatted)
    except Exception:
        pass  # Fail silently if we can't write, don't crash the supervisor


def kill_conflicting_processes():
    """Ensures a clean slate by killing any existing Vibe Justice instances."""
    print("[VIBE JUSTICE] Validating environment...")
    current_pid = os.getpid()

    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmdline = proc.info.get("cmdline") or []
            # Specifically target the Vibe Justice main script path or start_backend.py
            if any(str(MAIN_SCRIPT.name) in arg for arg in cmdline):
                if proc.info["pid"] != current_pid:
                    print(
                        f"[CLEANUP] Terminating active instance (PID: {proc.info['pid']})"
                    )
                    proc.terminate()
                    proc.wait(timeout=5)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired):
            try:
                proc.kill()  # Force kill if stubborn
            except:
                continue


def launch_vibe_justice():
    """Launches the Vibe Justice core logic as a single-run process."""
    setup_environment()
    kill_conflicting_processes()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(LOG_DIR, f"justice_session_{timestamp}.log")

    print(f"[START] Initializing Vibe Justice at {datetime.now()}")
    print(f"[LOG] Writing to: {log_file}")
    print(f"[EXEC] Script: {MAIN_SCRIPT}")

    # -u ensures Python doesn't buffer output
    # FORCE UTF-8 for Windows PowerShell headers/emojis
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONLEGACYWINDOWSSTDIO"] = "1"

    MAX_RESTARTS = 5
    restart_count = 0

    while True:
        try:
            # Check if running in a PyInstaller bundle
            is_frozen = getattr(sys, "frozen", False)

            if is_frozen:
                # WE ARE FROZEN: The executable is sys.executable
                # We want to spawn: VibeJustice.exe --backend
                cmd = [sys.executable, "--backend"]
                cwd = str(BASE_DIR)  # Root dir where exe likely sits, or _MEI...
                # actually for backend imports to work, we might need CWD to be proper.
                # In one-file mode, _MEIxxxx is temp.
                # Let's rely on entry_point handling imports.
            else:
                # WE ARE DEV: Use python env + script
                cmd = [PYTHON_EXE, "-u", str(MAIN_SCRIPT)]

            print(f"[STATUS] Spawning backend process (Attempt {restart_count + 1})...")
            print(f"[DEBUG] Command: {cmd}")

            process = subprocess.Popen(
                cmd,
                stdout=log_output,
                stderr=subprocess.STDOUT,
                cwd=str(BASE_DIR / "backend"),
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                env=env,
            )

            print(f"[STATUS] Process Running (PID: {process.pid})")

            import time
            import urllib.request

            HEALTH_URL = "http://localhost:8000/health"
            consecutive_failures = 0
            MAX_FAILURES = 10  # 10 * 3s = 30s grace period

            # Wait for startup (give it 10s grace before checking)
            time.sleep(10)

            while True:
                # 1. Check if process is still running
                return_code = process.poll()
                if return_code is not None:
                    # Process exited
                    if return_code == 0:
                        print("[FINISH] Vibe Justice task completed successfully.")
                        # Exit logic handles break below
                    else:
                        print(f"[WARN] Process crashed with exit code {return_code}")
                        log_notification(
                            f"Backend crashed (Exit Code: {return_code}). Initiating recovery.",
                            level="CRITICAL",
                        )
                        restart_count += 1
                    break

                # 2. Heartbeat Check (if process is running)
                try:
                    with urllib.request.urlopen(HEALTH_URL, timeout=2) as response:
                        if response.status == 200:
                            consecutive_failures = 0
                        else:
                            consecutive_failures += 1
                            print(f"[WARN] Health check returned {response.status}")
                except Exception:
                    consecutive_failures += 1
                    # Don't spam logs, but track it

                if consecutive_failures > MAX_FAILURES:
                    print(
                        f"[FATAL] Backend unresponsive for {MAX_FAILURES * 3}s. Killing..."
                    )
                    log_notification(
                        "Backend unresponsive (Heartbeat Fail). Killing process.",
                        level="CRITICAL",
                    )
                    process.kill()
                    restart_count += 1
                    break

                # 3. Sleep before next check
                time.sleep(3)

            if return_code == 0:
                break

            if restart_count > MAX_RESTARTS:
                print("[FATAL] Maximum restart attempts reached. Giving up.")
                break

            print(f"[RECOVERY] Restarting in 3 seconds... (Self-Healing Active)")
            log_notification(
                f"Self-Healing Active: Restarting backend (Attempt {restart_count}/{MAX_RESTARTS})",
                level="WARNING",
            )
            time.sleep(3)

        except KeyboardInterrupt:
            print("\n[INTERRUPT] Manual stop detected. Cleaning up...")
            if "process" in locals() and process.poll() is None:
                process.terminate()
            break
        except Exception as e:
            print(f"[FATAL] Supervisor loop failed: {e}")
            break


if __name__ == "__main__":
    launch_vibe_justice()
