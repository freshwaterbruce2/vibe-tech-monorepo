import os
from pathlib import Path

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QFont
from PySide6.QtWidgets import QVBoxLayout, QWidget
from qfluentwidgets import CaptionLabel, CardWidget, TextEdit, TitleLabel


class LogViewer(QWidget):
    def __init__(self, log_dir=r"D:\logs\vibe_justice", parent=None):
        super().__init__(parent)
        self.setObjectName("LogViewer")
        self.log_dir = Path(log_dir)
        self.current_log_file = None
        self.last_pos = 0

        self.setup_ui()
        self.setup_timer()

    def setup_ui(self):
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(40, 40, 40, 40)
        self.layout.setSpacing(10)

        # Header
        self.header_layout = QVBoxLayout()
        self.title = TitleLabel("Live System Logs", self)
        self.status_label = CaptionLabel("Initialize log tail...", self)
        self.status_label.setTextColor("#808080", "#a0a0a0")

        self.header_layout.addWidget(self.title)
        self.header_layout.addWidget(self.status_label)
        self.layout.addLayout(self.header_layout)

        # Pro Log Console
        self.console = TextEdit(self)
        self.console.setReadOnly(True)
        self.console.setFont(QFont("Consolas", 10))

        # Windows 11 Terminal-style styling
        self.console.setStyleSheet("""
            TextEdit {
                background-color: rgba(0, 0, 0, 0.3);
                color: #d1d1d1;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
            }
        """)

        self.layout.addWidget(self.console)

    def setup_timer(self):
        # Timer for reading content (fast)
        self.read_timer = QTimer(self)
        self.read_timer.timeout.connect(self.read_current_log)
        self.read_timer.start(200)  # Check content 5x per second

        # Timer for finding new files (slow)
        self.scan_timer = QTimer(self)
        self.scan_timer.timeout.connect(self.scan_log_files)
        self.scan_timer.start(2000)  # Scan directory every 2 seconds

        # Initial scan
        self.scan_log_files()

    def scan_log_files(self):
        try:
            if not self.log_dir.exists():
                self.status_label.setText(f"Waiting for log dir: {self.log_dir}")
                return

            files = list(self.log_dir.glob("*.log"))
            if not files:
                self.status_label.setText("No log files found")
                return

            # Sort by modification time
            latest = max(files, key=os.path.getmtime)

            # Switch if newer
            if self.current_log_file is None or str(latest) != str(
                self.current_log_file
            ):
                self.current_log_file = latest
                self.last_pos = 0
                self.console.clear()
                self.status_label.setText(f"Tailing: {latest.name}")
                self.console.append(f"--- Attached to {latest.name} ---\n")
        except Exception as e:
            self.status_label.setText(f"Scan error: {e}")

    def read_current_log(self):
        if not self.current_log_file:
            return

        try:
            if not self.current_log_file.exists():
                return

            with open(
                self.current_log_file, "r", encoding="utf-8", errors="replace"
            ) as f:
                f.seek(self.last_pos)
                new_content = f.read()
                if new_content:
                    self.last_pos = f.tell()
                    self.console.append(new_content.strip())
                    # Auto-scroll to bottom
                    self.console.verticalScrollBar().setValue(
                        self.console.verticalScrollBar().maximum()
                    )
        except Exception as e:
            self.status_label.setText(f"Read error: {e}")
