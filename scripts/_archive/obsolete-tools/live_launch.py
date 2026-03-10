#!/usr/bin/env python3
"""
Nova Live Launch Manager (Personal / Windows 11)

Goal: "Zero Human Intervention"
- Single-instance supervisor (prevents duplicates)
- Safe kill switch (targets only supervised Nova processes)
- Diagnostic loop (restart-on-exit + restart-on-hang via heartbeats)
- Enforces: code in C:\\dev, data/logs in D:\\databases
"""

from __future__ import annotations

import ctypes
import datetime as _dt
import json
import logging
import os
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


# ==============================
# Configuration (simple)
# ==============================
DEV_ROOT = Path(r"C:\dev")
SRC_ROOT = DEV_ROOT / "src"

DATA_ROOT = Path(r"D:\databases")
LOG_DIR = DATA_ROOT / "logs" / "live_launch"

SUPERVISOR_MUTEX_NAME = "Local\\NovaLiveLaunchManager"

SUPERVISED_MARKER_ARG = "--nova-supervised"
HEARTBEAT_GRACE_SEC = 30
DEFAULT_HEARTBEAT_TIMEOUT_SEC = 60
WATCHDOG_PULSE_SEC = 5
MAIN_RESTART_DELAY_SEC = 5


@dataclass(frozen=True)
class ProcSpec:
    name: str
    path: Path
    critical: bool
    heartbeat_timeout_sec: int = DEFAULT_HEARTBEAT_TIMEOUT_SEC


PROCESSES: Dict[str, ProcSpec] = {
    "manager": ProcSpec(
        name="manager",
        path=SRC_ROOT / "tiers" / "manager.py",
        critical=False,
        heartbeat_timeout_sec=DEFAULT_HEARTBEAT_TIMEOUT_SEC,
    ),
    "learning": ProcSpec(
        name="learning",
        path=SRC_ROOT / "tiers" / "learning.py",
        critical=False,
        heartbeat_timeout_sec=DEFAULT_HEARTBEAT_TIMEOUT_SEC,
    ),
    "optimization": ProcSpec(
        name="optimization",
        path=SRC_ROOT / "tiers" / "optimization.py",
        critical=False,
        heartbeat_timeout_sec=DEFAULT_HEARTBEAT_TIMEOUT_SEC,
    ),
    "main_trading": ProcSpec(
        name="main_trading",
        path=SRC_ROOT / "main.py",
        critical=True,
        heartbeat_timeout_sec=DEFAULT_HEARTBEAT_TIMEOUT_SEC,
    ),
}


# ==============================
# Logging
# ==============================
def configure_logging() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_path = LOG_DIR / f"launcher_{_dt.date.today().isoformat()}.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(log_path, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def log_info(message: str) -> None:
    logging.info(message)
    print(f"[INFO] {message}")


def log_warn(message: str) -> None:
    logging.warning(message)
    print(f"[WARNING] {message}")


def log_error(message: str) -> None:
    logging.error(message)
    print(f"[ERROR] {message}")


# ==============================
# Single-instance supervisor lock
# ==============================
def acquire_single_instance_mutex() -> None:
    kernel32 = ctypes.windll.kernel32
    CreateMutexW = kernel32.CreateMutexW
    CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_bool, ctypes.c_wchar_p]
    CreateMutexW.restype = ctypes.c_void_p

    GetLastError = kernel32.GetLastError
    GetLastError.argtypes = []
    GetLastError.restype = ctypes.c_uint32

    handle = CreateMutexW(None, False, SUPERVISOR_MUTEX_NAME)
    if not handle:
        raise RuntimeError("Failed to create supervisor mutex")

    ERROR_ALREADY_EXISTS = 183
    last_error = GetLastError()
    if last_error == ERROR_ALREADY_EXISTS:
        log_warn("Supervisor already running (mutex exists). Exiting.")
        raise SystemExit(0)


# ==============================
# Environment & helpers
# ==============================
def build_child_env(launch_id: str) -> Dict[str, str]:
    env = os.environ.copy()
    env["DEV_ROOT"] = str(DEV_ROOT)
    env["WORKSPACE_ROOT"] = str(DEV_ROOT)
    env["DATA_ROOT"] = str(DATA_ROOT)
    env["DATABASE_PATH"] = str(DATA_ROOT)
    env["LOG_DIR"] = str(LOG_DIR)
    env["NOVA_LAUNCH_ID"] = launch_id
    env.setdefault("PYTHONUTF8", "1")
    return env


def get_creation_flags() -> int:
    # Default: run hidden (no extra console windows).
    # Set NOVA_SHOW_CONSOLE=1 for debugging.
    show_console = os.environ.get("NOVA_SHOW_CONSOLE", "").strip() == "1"
    if show_console:
        return subprocess.CREATE_NEW_CONSOLE
    CREATE_NO_WINDOW = 0x08000000
    return CREATE_NO_WINDOW


def heartbeat_path(component: str) -> Path:
    return LOG_DIR / f"{component}.heartbeat.json"


def read_heartbeat(component: str) -> Optional[Dict[str, Any]]:
    path = heartbeat_path(component)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


# ==============================
# Process enumeration (no WMIC)
# ==============================
def _powershell_json(command: str) -> Any:
    proc = subprocess.run(
        ["powershell", "-NoProfile", "-Command", command],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "PowerShell command failed")
    output = (proc.stdout or "").strip()
    if not output:
        return None
    return json.loads(output)


def list_python_processes() -> List[Dict[str, Any]]:
    # Win32_Process gives us CommandLine, which Get-Process often does not.
    data = _powershell_json(
        "Get-CimInstance Win32_Process | "
        "Where-Object { $_.Name -in @('python.exe','pythonw.exe') } | "
        "Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress"
    )
    if data is None:
        return []
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return data
    return []


def kill_process_tree(pid: int) -> None:
    subprocess.run(
        ["taskkill", "/PID", str(pid), "/T", "/F"],
        capture_output=True,
        text=True,
        check=False,
    )


def should_kill_process(command_line: str, target_paths: List[Path]) -> bool:
    cmd = command_line.lower()
    if SUPERVISED_MARKER_ARG.lower() not in cmd:
        return False
    for path in target_paths:
        if str(path).lower() in cmd:
            return True
    return False


def kill_stale_instances() -> None:
    log_info("--- KILL SWITCH ACTIVATED ---")
    target_paths = [spec.path for spec in PROCESSES.values()]

    current_pid = os.getpid()
    for proc in list_python_processes():
        pid = proc.get("ProcessId")
        if not isinstance(pid, int):
            continue
        if pid == current_pid:
            continue
        cmdline = str(proc.get("CommandLine") or "")
        if not cmdline:
            continue
        if "live_launch.py" in cmdline.lower():
            continue
        if should_kill_process(cmdline, target_paths):
            log_warn(f"Killing stale supervised process pid={pid} cmd={cmdline}")
            kill_process_tree(pid)


# ==============================
# Child lifecycle
# ==============================
def start_component(spec: ProcSpec, env: Dict[str, str], launch_id: str) -> subprocess.Popen:
    if not spec.path.exists():
        raise FileNotFoundError(f"Entry point missing: {spec.path}")

    args = [
        sys.executable,
        str(spec.path),
        SUPERVISED_MARKER_ARG,
        "--nova-launch-id",
        launch_id,
        "--nova-component",
        spec.name,
    ]
    log_info(f"Launching {spec.name}: {' '.join(args)}")
    return subprocess.Popen(
        args,
        env=env,
        cwd=str(DEV_ROOT),
        creationflags=get_creation_flags(),
    )


def stop_component(proc: subprocess.Popen, name: str) -> None:
    if proc.poll() is not None:
        return
    log_warn(f"Stopping {name} (pid={proc.pid})")
    proc.terminate()
    try:
        proc.wait(timeout=10)
        return
    except subprocess.TimeoutExpired:
        pass
    log_warn(f"Force killing {name} (pid={proc.pid})")
    kill_process_tree(proc.pid)


def is_hung(component: str, spec: ProcSpec, started_at: float) -> bool:
    age_sec = time.time() - started_at
    hb = read_heartbeat(component)
    if hb is None:
        return age_sec > HEARTBEAT_GRACE_SEC
    ts = hb.get("timestamp_utc")
    if not isinstance(ts, int):
        return age_sec > HEARTBEAT_GRACE_SEC
    return (time.time() - ts) > spec.heartbeat_timeout_sec


# ==============================
# Main loop
# ==============================
def main() -> int:
    configure_logging()
    acquire_single_instance_mutex()

    if not str(DATA_ROOT).lower().startswith("d:\\"):
        log_error(f"DATA_ROOT must be on D:\\ (got {DATA_ROOT})")
        return 2

    launch_id = uuid.uuid4().hex
    env = build_child_env(launch_id)

    log_info("=== INFINITE AUTONOMOUS LOOP LAUNCHER STARTING ===")
    log_info(f"launch_id={launch_id}")

    # 1) Kill switch: only kills supervised processes for these exact entrypoints.
    try:
        kill_stale_instances()
    except Exception as exc:
        log_error(f"Kill switch error (continuing): {exc}")

    running: Dict[str, subprocess.Popen] = {}
    started_at: Dict[str, float] = {}

    # 2) Launch support tiers first (non-critical).
    for key in ["manager", "learning", "optimization"]:
        spec = PROCESSES[key]
        try:
            running[key] = start_component(spec, env, launch_id)
            started_at[key] = time.time()
            time.sleep(2)
        except Exception as exc:
            log_error(f"Failed to launch {key}: {exc}")

    # 3) Diagnostic loop for main trading + tier monitoring.
    while True:
        try:
            # Ensure main is running (critical component).
            main_key = "main_trading"
            main_spec = PROCESSES[main_key]
            main_proc = running.get(main_key)
            if main_proc is None or main_proc.poll() is not None:
                if main_proc is not None:
                    log_error(f"Main exited with code {main_proc.poll()}; restarting in {MAIN_RESTART_DELAY_SEC}s")
                    time.sleep(MAIN_RESTART_DELAY_SEC)
                running[main_key] = start_component(main_spec, env, launch_id)
                started_at[main_key] = time.time()

            # Restart support tiers if they exit or hang.
            for key in ["manager", "learning", "optimization"]:
                spec = PROCESSES[key]
                proc = running.get(key)
                if proc is None or proc.poll() is not None:
                    if proc is not None:
                        log_warn(f"Support tier '{key}' exited with code {proc.poll()}; restarting")
                    running[key] = start_component(spec, env, launch_id)
                    started_at[key] = time.time()
                    continue

                if is_hung(key, spec, started_at.get(key, time.time())):
                    log_warn(f"Support tier '{key}' heartbeat stale; restarting")
                    stop_component(proc, key)
                    running[key] = start_component(spec, env, launch_id)
                    started_at[key] = time.time()

            # Restart main if it hangs (treated like critical failure).
            main_proc = running.get(main_key)
            if main_proc is not None and is_hung(main_key, main_spec, started_at.get(main_key, time.time())):
                log_error("Main heartbeat stale; restarting main process")
                stop_component(main_proc, main_key)
                time.sleep(MAIN_RESTART_DELAY_SEC)
                running[main_key] = start_component(main_spec, env, launch_id)
                started_at[main_key] = time.time()

            time.sleep(WATCHDOG_PULSE_SEC)

        except KeyboardInterrupt:
            log_info("Manual stop received. Shutting down all processes...")
            for key, proc in list(running.items()):
                stop_component(proc, key)
            return 0
        except Exception as exc:
            log_error(f"CRITICAL LAUNCHER ERROR: {exc}")
            time.sleep(10)


if __name__ == "__main__":
    raise SystemExit(main())

