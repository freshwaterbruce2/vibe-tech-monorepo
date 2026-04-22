import os
import sys
import webbrowser
from pathlib import Path

import psutil
import requests
from PySide6.QtCore import QTimer
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import (
    QApplication,
    QFrame,
    QHBoxLayout,
    QVBoxLayout,
    QWidget,
)
from qfluentwidgets import (
    BodyLabel,
    CardWidget,
    FluentWindow,
    NavigationItemPosition,
    PrimaryPushButton,
    ProgressBar,
    PushButton,
    SubtitleLabel,
)
    FluentIcon as FIF,
)

from .components.dashboard import ProDashboard
from .components.log_viewer import LogViewer


class VibeJusticeWindow(FluentWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Vibe Justice")
        self.setWindowIcon(QIcon("resources/icon.png"))

        # Enable Mica effect (Win11)
        self.setMicaEffectEnabled(True)

        # Set window size
        self.resize(1100, 750)

        # Center on screen
        desktop = QApplication.primaryScreen().availableGeometry()
        w, h = desktop.width(), desktop.height()
        self.move(w // 2 - 550, h // 2 - 375)

        # Create sub-interfaces
        self.dashboard_interface = ProDashboard(self)
        self.logs_interface = LogViewer(parent=self)

        # Navigation
        self.init_navigation()

        # Startup housekeeping
        self.kill_conflicting_processes()

    def init_navigation(self):
        self.addSubInterface(
            self.dashboard_interface, FIF.HOME, "Dashboard", NavigationItemPosition.TOP
        )
        self.addSubInterface(
            self.logs_interface,
            FIF.COMMAND_PROMPT,
            "Live Logs",
            NavigationItemPosition.TOP,
        )

        # Set default
        self.navigationInterface.setCurrentItem(self.dashboard_interface.objectName())

    def kill_conflicting_processes(self):
        """Surgical strike on ghost instances during startup."""
        print("[VIBE JUSTICE] Checking for ghost processes...")
        current_pid = os.getpid()

        # Target both the launcher script and the server runner
        targets = ["start_backend.py", "uvicorn"]

        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                if proc.info["pid"] == current_pid:
                    continue

                cmdline = proc.info.get("cmdline") or []
                cmd_str = " ".join(cmdline).lower()

                # Check for our targets in the command line
                is_target = any(t in cmd_str for t in targets)

                # Special check for uvicorn on port 8000
                if "uvicorn" in cmd_str and "8000" in cmd_str:
                    is_target = True

                if is_target:
                    print(f"[KILL] Terminating ghost PID {proc.info['pid']}...")
                    proc.terminate()
                    # Wait briefly for it to die
                    try:
                        proc.wait(timeout=1)
                    except psutil.TimeoutExpired:
                        proc.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
