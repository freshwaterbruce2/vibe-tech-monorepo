import argparse
import ctypes
import logging
import os
import subprocess
import sys
import time
from ctypes import wintypes
from typing import List, Optional

CREATE_NEW_PROCESS_GROUP = 0x00000200
ERROR_ALREADY_EXISTS = 183

def ps_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"

def run_powershell(command: str, timeout: int = 30) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", command],
        capture_output=True,
        text=True,
        timeout=timeout,
    )

def create_mutex(name: str):
    kernel32 = ctypes.windll.kernel32
    kernel32.CreateMutexW.argtypes = [wintypes.LPVOID, wintypes.BOOL, wintypes.LPCWSTR]
    kernel32.CreateMutexW.restype = wintypes.HANDLE
    handle = kernel32.CreateMutexW(None, False, name)
    last_error = kernel32.GetLastError()
    return handle, last_error

def close_handle(handle) -> None:
    if handle:
        ctypes.windll.kernel32.CloseHandle(handle)

def is_on_d_drive(path: str) -> bool:
    return os.path.abspath(path).upper().startswith("D:\\")

def resolve_executable(explicit_path: Optional[str]) -> Optional[str]:
    candidates = []
    if explicit_path:
        candidates.append(explicit_path)
    env_path = os.environ.get("NOVA_EXECUTABLE")
    if env_path:
        candidates.append(env_path)
    candidates.extend(
        [
            r"C:\dev\apps\nova-agent\src-tauri\target\release\nova-agent.exe",
            r"C:\dev\apps\nova-agent\src-tauri\target\debug\nova-agent.exe",
        ]
    )

    for path in candidates:
        if path and os.path.exists(path):
            return path
    return None

def kill_by_commandline(match_text: str, current_pid: int) -> None:
    ps = (
        "$currentPid = "
        + str(current_pid)
        + "; "
        + "Get-CimInstance Win32_Process "
        + "| Where-Object { $_.CommandLine -like "
        + ps_quote(f"*{match_text}*")
        + " -and $_.ProcessId -ne $currentPid } "
        + "| ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
    )
    run_powershell(ps)

def kill_by_exe_path(exe_path: str) -> None:
    ps = (
        "$p = "
        + ps_quote(os.path.abspath(exe_path))
        + "; "
        + "Get-CimInstance Win32_Process "
        + "| Where-Object { $_.ExecutablePath -eq $p } "
        + "| ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
    )
    run_powershell(ps)

def start_child(exe_path: str, args: List[str], log_dir: str) -> subprocess.Popen:
    child_log_path = os.path.join(log_dir, "nova-agent-child.log")
    child_log = open(child_log_path, "a", encoding="utf-8", errors="replace")
    proc = subprocess.Popen(
        [exe_path] + args,
        stdout=child_log,
        stderr=child_log,
        creationflags=CREATE_NEW_PROCESS_GROUP,
    )
    child_log.close()
    return proc

def main() -> int:
    parser = argparse.ArgumentParser(description="Nova Agent supervisor")
    parser.add_argument("--exe", help="Path to nova-agent.exe")
    parser.add_argument("--log-dir", default=r"D:\logs\nova-agent")
    parser.add_argument("--poll-secs", type=int, default=5)
    parser.add_argument("--sleep-gap-secs", type=int, default=120)
    parser.add_argument("--restart-backoff-secs", type=int, default=2)
    parser.add_argument("--max-backoff-secs", type=int, default=60)
    parser.add_argument("--kill-dupes", action="store_true")
    parser.add_argument("--mutex-name", default="Global\\NovaAgentSupervisor")
    parser.add_argument(
        "child_args",
        nargs=argparse.REMAINDER,
        help="Arguments passed to nova-agent.exe (use -- to separate).",
    )
    args = parser.parse_args()

    os.makedirs(args.log_dir, exist_ok=True)
    if not is_on_d_drive(args.log_dir):
        print(f"Warning: log dir is not on D: drive: {args.log_dir}")

    logging.basicConfig(
        filename=os.path.join(args.log_dir, "nova-supervisor.log"),
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
    logging.getLogger().addHandler(logging.StreamHandler(sys.stdout))

    mutex_handle, last_error = create_mutex(args.mutex_name)
    if last_error == ERROR_ALREADY_EXISTS:
        logging.info("Supervisor already running, exiting")
        close_handle(mutex_handle)
        return 0

    exe_path = resolve_executable(args.exe)
    if not exe_path:
        logging.error("Could not resolve nova-agent executable")
        close_handle(mutex_handle)
        return 1

    child_args = args.child_args or []
    current_pid = os.getpid()

    if args.kill_dupes:
        logging.info("Killing duplicate supervisor and agent instances")
        try:
            kill_by_commandline("live_launch.py", current_pid)
            kill_by_exe_path(exe_path)
        except Exception as exc:
            logging.warning("Failed to kill duplicates: %s", exc)

    backoff = args.restart_backoff_secs
    last_tick = time.monotonic()
    proc = None

    while True:
        if proc is None or proc.poll() is not None:
            if proc is not None:
                logging.warning("Agent exited with code %s", proc.returncode)
                logging.info("Restarting after %s seconds", backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, args.max_backoff_secs)

            try:
                proc = start_child(exe_path, child_args, args.log_dir)
                logging.info("Started nova-agent (pid=%s)", proc.pid)
                backoff = args.restart_backoff_secs
            except Exception as exc:
                logging.error("Failed to start nova-agent: %s", exc)
                time.sleep(backoff)
                backoff = min(backoff * 2, args.max_backoff_secs)
                continue

        time.sleep(args.poll_secs)
        now = time.monotonic()
        gap = now - last_tick
        last_tick = now

        if gap > args.sleep_gap_secs:
            logging.warning("Detected sleep/resume gap: %.1f seconds", gap)
            if proc and proc.poll() is None:
                try:
                    proc.terminate()
                    proc.wait(timeout=10)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                proc = None

    close_handle(mutex_handle)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
