import json
import os
import sys
from pathlib import Path

import psutil
import requests
from PySide6.QtCore import QTimer
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QVBoxLayout,
    QWidget,
)
from qfluentwidgets import (
    BodyLabel,
    CaptionLabel,
    CardWidget,
    IconWidget,
    LineEdit,
    MessageBoxBase,
    PrimaryPushButton,
    ProgressBar,
    PushButton,
    SmoothScrollArea,
    StrongBodyLabel,
    SubtitleLabel,
    TextEdit,
    TitleLabel,
)
    FluentIcon as FIF,
)


class NewCaseDialog(MessageBoxBase):
    """A custom dialog to initialize a new Vibe Justice workspace."""

    def __init__(self, parent=None):
        super().__init__(parent)

        # Title
        self.titleLabel = SubtitleLabel("Initialize New Case", self.widget)
        self.viewLayout.addWidget(self.titleLabel)

        # Container for inputs
        self.container = QWidget(self.widget)
        self.container_layout = QVBoxLayout(self.container)
        self.container_layout.setSpacing(15)
        self.container_layout.setContentsMargins(0, 0, 0, 0)

        # Case Name Input
        self.container_layout.addWidget(BodyLabel("Case Reference Name:"))
        self.name_input = LineEdit(self.container)
        self.name_input.setPlaceholderText("e.g., Freshwater_vs_Ridgeville_001")
        self.container_layout.addWidget(self.name_input)

        # Jurisdiction Input
        self.container_layout.addWidget(BodyLabel("Jurisdiction (State/Federal):"))
        self.jurisdiction_input = LineEdit(self.container)
        self.jurisdiction_input.setPlaceholderText("e.g., South Carolina")
        self.container_layout.addWidget(self.jurisdiction_input)

        # Research Goals
        self.container_layout.addWidget(BodyLabel("Core Research Questions:"))
        self.goals_input = TextEdit(self.container)
        self.goals_input.setPlaceholderText(
            "What specific legal issues should the agent analyze?"
        )
        self.goals_input.setFixedHeight(100)
        self.container_layout.addWidget(self.goals_input)

        # Add to the dialog's main layout
        self.viewLayout.addWidget(self.container)

        # Button Text
        self.yesButton.setText("Start Research")
        self.cancelButton.setText("Cancel")

        self.widget.setMinimumWidth(400)


class CaseCard(CardWidget):
    """A card representing an active legal case/research task."""

    def __init__(self, case_name, status, last_update, parent=None):
        super().__init__(parent)
        self.case_name = case_name
        self.setFixedHeight(70)
        self.layout = QHBoxLayout(self)
        self.layout.setContentsMargins(15, 0, 15, 0)

        # Case Info
        self.info_vbox = QVBoxLayout()
        self.name_label = StrongBodyLabel(case_name, self)
        self.update_label = CaptionLabel(f"Last update: {last_update}", self)
        self.info_vbox.addWidget(self.name_label)
        self.info_vbox.addWidget(self.update_label)
        self.info_vbox.setSpacing(2)

        # Status Badge (Simple colored label)
        self.status_label = BodyLabel(status, self)

        # Map statuses to Fluent colors
        status_colors = {
            "Researching": "#0078d4",  # Windows Blue
            "Completed": "#28a745",  # Success Green
            "In Progress": "#ffc107",  # Warning Yellow
            "Archived": "#6c757d",  # Neutral Gray
        }

        color = status_colors.get(status, "#f0f0f0")
        text_color = "white" if status != "In Progress" else "black"

        self.status_label.setStyleSheet(f"""
            padding: 4px 10px;
            border-radius: 12px;
            background-color: {color};
            color: {text_color};
            font-size: 11px;
            font-weight: bold;
        """)

        # Action
        self.view_btn = PushButton(FIF.FOLDER, "Open", self)
        self.view_btn.setFixedWidth(80)
        self.view_btn.clicked.connect(self.open_workspace)

        self.layout.addLayout(self.info_vbox)
        self.layout.addStretch()
        self.layout.addWidget(self.status_label)
        self.layout.addSpacing(20)
        self.layout.addWidget(self.view_btn)

    def open_workspace(self):
        """Triggers Windows Explorer to open the specific case folder."""
        # Clean path construction for Windows 11
        path = os.path.normpath(f"D:/cases/{self.case_name}")

        if os.path.exists(path):
            os.startfile(path)
            print(f"[UI] Opened workspace: {path}")
        else:
            # Fallback: Open the parent directory if the specific case doesn't exist yet
            os.startfile(r"D:\cases")
            print(f"[UI] Case folder not found, opening root: D:\\cases")


class MetricCard(CardWidget):
    """A card that displays a metric with a progress bar and icon."""

    def __init__(self, title, icon, parent=None):
        super().__init__(parent)
        self.layout = QVBoxLayout(self)

        self.header_layout = QHBoxLayout()
        self.icon_widget = IconWidget(icon, self)
        self.icon_widget.setFixedSize(32, 32)

        self.title_label = BodyLabel(title, self)
        self.title_label.setStyleSheet("font-weight: bold; font-size: 14px;")

        self.value_label = BodyLabel("0%", self)
        self.value_label.setStyleSheet("font-size: 14px;")

        self.header_layout.addWidget(self.icon_widget)
        self.header_layout.addWidget(self.title_label)
        self.header_layout.addStretch()
        self.header_layout.addWidget(self.value_label)

        self.progress_bar = ProgressBar(self)
        self.progress_bar.setValue(0)

        self.layout.addLayout(self.header_layout)
        self.layout.addSpacing(10)
        self.layout.addWidget(self.progress_bar)
        self.setFixedSize(280, 110)

    def update_value(self, value):
        self.progress_bar.setValue(int(value))
        self.value_label.setText(f"{value}%")


class StatusCard(CardWidget):
    """Card to display backend health status."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.layout = QHBoxLayout(self)

        self.icon_widget = IconWidget(FIF.HEART, self)
        self.icon_widget.setFixedSize(32, 32)

        self.info_layout = QVBoxLayout()
        self.title_label = BodyLabel("Backend Health", self)
        self.title_label.setStyleSheet("font-weight: bold;")
        self.status_label = BodyLabel("Checking...", self)
        self.info_layout.addWidget(self.title_label)
        self.info_layout.addWidget(self.status_label)

        self.status_indicator = QFrame(self)
        self.status_indicator.setFixedSize(16, 16)
        self.status_indicator.setStyleSheet(
            "background-color: gray; border-radius: 8px;"
        )

        self.layout.addWidget(self.icon_widget)
        self.layout.addSpacing(10)
        self.layout.addLayout(self.info_layout)
        self.layout.addStretch()
        self.layout.addWidget(self.status_indicator)

        self.setFixedSize(280, 80)

    def set_status(self, healthy: bool, code: int = 200):
        if healthy:
            self.status_indicator.setStyleSheet(
                "background-color: #28a745; border-radius: 8px;"
            )
            self.status_label.setText("Online (Healthy)")
            self.icon_widget.setIcon(FIF.HEART)
        else:
            self.status_indicator.setStyleSheet(
                "background-color: #dc3545; border-radius: 8px;"
            )
            self.status_label.setText(f"Offline / Error ({code})")


class ProDashboard(QWidget):
    """High-Fidelity Dashboard for Vibe Justice."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("dashboardInterface")
        self.setup_ui()

        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update_metrics)
        self.timer.start(2000)
        self.update_metrics()

    def setup_ui(self):
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(40, 40, 40, 40)
        self.layout.setSpacing(24)

        # 1. Hero Section
        self.hero_layout = QVBoxLayout()
        self.title = TitleLabel("Vibe Justice", self)
        self.subtitle = SubtitleLabel("Autonomous Legal Research Assistant", self)
        self.subtitle.setTextColor("#666666", "#aaaaaa")  # Light/Dark mode gray

        self.hero_layout.addWidget(self.title)
        self.hero_layout.addWidget(self.subtitle)
        self.layout.addLayout(self.hero_layout)

        self.layout.addSpacing(20)

        # 2. Key Metrics Grid
        self.metrics_label = BodyLabel("System Status", self)
        self.metrics_label.setStyleSheet("font-weight: bold; font-size: 16px;")
        self.layout.addWidget(self.metrics_label)

        self.grid_layout = QHBoxLayout()
        self.grid_layout.setSpacing(20)

        self.cpu_card = MetricCard("CPU Load", FIF.SPEED_HIGH, self)
        self.ram_card = MetricCard("Memory Usage", FIF.IOT, self)
        self.status_card = StatusCard(self)

        self.grid_layout.addWidget(self.status_card)
        self.grid_layout.addWidget(self.cpu_card)
        self.grid_layout.addWidget(self.ram_card)
        self.grid_layout.addStretch()

        self.layout.addLayout(self.grid_layout)

        self.layout.addSpacing(20)

        # 3. Case Overview
        self.cases_label = BodyLabel("Active Cases", self)
        self.cases_label.setStyleSheet("font-weight: bold; font-size: 16px;")
        self.layout.addWidget(self.cases_label)

        # Scroll Area for Cases
        self.scroll_area = SmoothScrollArea(self)
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setFixedHeight(250)  # Keep dashboard height predictable
        self.scroll_area.setStyleSheet("background: transparent; border: none;")

        self.scroll_widget = QWidget()
        self.cases_container = QVBoxLayout(self.scroll_widget)
        self.cases_container.setContentsMargins(0, 0, 10, 0)  # Space for scrollbar
        self.cases_container.setSpacing(10)

        # Example Static Data
        cases = [
            ("Freshwater vs. Ridgeville DC", "Researching", "2 mins ago"),
            ("Tenant Rights Analysis - SC", "Completed", "1 hour ago"),
            ("ADA Accommodation Request Draft", "In Progress", "10 mins ago"),
            ("Child Visitation Protocol - SC", "Archived", "1 day ago"),
            ("Estate Planning - Miller Trust", "Researching", "3 hours ago"),
            ("Contract Review - TechCorp", "In Progress", "5 mins ago"),
            ("Bankruptcy Filing - Chapter 7", "Completed", "Yesterday"),
        ]

        for name, status, updated in cases:
            card = CaseCard(name, status, updated, self)
            self.cases_container.addWidget(card)

        self.cases_container.addStretch()  # Keeps cards at the top
        self.scroll_area.setWidget(self.scroll_widget)
        self.layout.addWidget(self.scroll_area)

        self.layout.addSpacing(20)

        # 4. Quick Actions
        self.actions_label = BodyLabel("Control Panel", self)
        self.actions_label.setStyleSheet("font-weight: bold; font-size: 16px;")
        self.layout.addWidget(self.actions_label)

        self.actions_layout = QHBoxLayout()
        self.actions_layout.setSpacing(15)

        self.new_case_btn = PrimaryPushButton(FIF.ADD, "New Research Case", self)
        self.new_case_btn.setFixedSize(200, 60)
        self.new_case_btn.clicked.connect(self.show_new_case_dialog)

        self.web_btn = PrimaryPushButton(FIF.GLOBE, "Launch Web UI", self)
        self.web_btn.setFixedSize(200, 60)
        self.web_btn.clicked.connect(self.open_web_ui)
        self.web_btn.setToolTip("Open localhost:5175 in default browser")

        self.restart_btn = PushButton(FIF.SYNC, "Restart Backend", self)
        self.restart_btn.setFixedSize(200, 60)
        self.restart_btn.clicked.connect(self.restart_backend)

        self.actions_layout.addWidget(self.new_case_btn)
        self.actions_layout.addWidget(self.web_btn)
        self.actions_layout.addWidget(self.restart_btn)

        # Emergency Stop (Kill Switch)
        self.kill_btn = PushButton(FIF.POWER_BUTTON, "EMERGENCY STOP", self)
        self.kill_btn.setFixedSize(200, 60)
        self.kill_btn.clicked.connect(self.emergency_kill)
        self.kill_btn.setStyleSheet(
            "QPushButton { color: red; font-weight: bold; border: 2px solid red; }"
        )
        self.actions_layout.addWidget(self.kill_btn)

        self.actions_layout.addStretch()

        self.layout.addLayout(self.actions_layout)

        self.layout.addStretch()

    def update_metrics(self):
        # Update CPU/RAM
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory().percent
        self.cpu_card.update_value(cpu)
        self.ram_card.update_value(ram)

        # Check Backend Status
        try:
            response = requests.get("http://localhost:8000/health", timeout=1)
            if response.status_code == 200:
                self.status_card.set_status(True)
            else:
                self.status_card.set_status(False, response.status_code)
        except Exception:
            self.status_card.set_status(False, 503)

    def open_web_ui(self):
        import webbrowser

        webbrowser.open("http://localhost:5175")

    def restart_backend(self):
        print("[DASHBOARD] Restarting backend...")
        current_file = Path(__file__).resolve()
        repo_root = current_file.parent.parent.parent.parent
        launcher_script = repo_root / "scripts" / "live_launch.py"

        if not launcher_script.exists():
            print(f"[ERROR] Launcher not found at {launcher_script}")
            repo_root_alt = current_file.parent.parent.parent
            launcher_script_alt = repo_root_alt / "scripts" / "live_launch.py"
            if launcher_script_alt.exists():
                launcher_script = launcher_script_alt
                repo_root = repo_root_alt

        if not launcher_script.exists():
            print(f"[FATAL] Could not locate live_launch.py")
            return

        import subprocess

        try:
            subprocess.Popen(
                [sys.executable, str(launcher_script)],
                cwd=str(repo_root),
                creationflags=subprocess.CREATE_NEW_CONSOLE
                | subprocess.CREATE_NEW_PROCESS_GROUP,
            )
            print("[DASHBOARD] Restart process spawned.")
        except Exception as e:
            print(f"[ERROR] Failed to restart: {e}")

    def show_new_case_dialog(self):
        w = NewCaseDialog(self.window())  # Use main window as parent for proper dimming
        if w.exec():
            case_data = {
                "name": w.name_input.text(),
                "jurisdiction": w.jurisdiction_input.text(),
                "goals": w.goals_input.toPlainText(),
            }
            self.initiate_case_creation(case_data)

    def initiate_case_creation(self, data):
        """The trigger for the Autonomous Loop."""
        backend_url = "http://localhost:8000/cases/create"

        if not data["name"]:
            return

        # 1. Local Workspace Prep
        case_path = Path(f"D:/cases/{data['name']}")
        try:
            case_path.mkdir(parents=True, exist_ok=True)
            # Create a metadata file that the autonomous loop will detect
            with open(case_path / "metadata.json", "w") as f:
                json.dump(data, f, indent=4)
            print(f"[VIBE JUSTICE] Workspace created at {case_path}")
        except Exception as e:
            print(f"[ERROR] Could not create workspace: {e}")
            return

        # 2. Notify Backend
        try:
            # We send the data to the FastAPI backend
            response = requests.post(backend_url, json=data, timeout=5)

            if response.status_code == 200:
                print(f"[SUCCESS] Backend acknowledged new case: {data['name']}")
                # Refresh logs tab or show a success toast
                self.status_card.set_status(True)
            else:
                print(f"[API ERROR] Backend returned {response.status_code}")

        except Exception as e:
            print(f"[CONNECTION ERROR] Could not reach backend: {e}")
            # Even if API fails, the folder exists, so the loop might catch it later

        self.update_case_list_ui(data["name"])

    def update_case_list_ui(self, name):
        # Add the new case to the top of the list visually
        new_card = CaseCard(name, "Initializing", "Just now", self)
        # We need to insert at 0-index.
        # QVBoxLayout.insertWidget is 0-indexed.
        self.cases_container.insertWidget(0, new_card)

    def emergency_kill(self):
        """NUCLEAR OPTION: Kills all related processes."""

        print("[DASHBOARD] INITIATING EMERGENCY STOP")

        commands = [
            "taskkill /f /im node.exe",
            "taskkill /f /im python.exe",
            "taskkill /f /im VibeJustice.exe",
        ]

        for cmd in commands:
            try:
                subprocess.run(cmd, shell=True, timeout=2)
            except Exception as e:
                print(f"[ERROR] Kill failed for {cmd}: {e}")

        # Commit seppuku
        sys.exit(0)
