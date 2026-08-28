import hashlib
import json
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from vibe_justice.services.ai_service import get_ai_service
from vibe_justice.services.notification_service import NotificationService
from vibe_justice.utils.file_lock import FileLock
from vibe_justice.utils.paths import get_cases_directory, get_log_directory


class MonitoringLoop:
    def __init__(
        self,
        cases_dir: Optional[str] = None,
        log_path: Optional[str] = None,
    ):
        self.cases_dir = Path(cases_dir) if cases_dir else get_cases_directory()
        log_dir = get_log_directory()
        self.log_path = (
            Path(log_path) if log_path else (log_dir / "system_activity.log")
        )
        self.is_running = True

        # Ensure log directory exists
        if not self.log_path.parent.exists():
            self.log_path.parent.mkdir(parents=True, exist_ok=True)

        self.notifier = NotificationService()
        self.ai_service = get_ai_service()

    def log_event(self, message):
        """Shared log that the UI's LogViewer tails."""
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(f"[{timestamp}] [MONITOR] {message}\n")
        except Exception as e:
            print(f"Logging failed: {e}")

    def run(self):
        self.log_event("Monitoring Loop started. Watching for active.signal...")

        while self.is_running:
            try:
                if self.cases_dir.exists():
                    # Scan for signal files
                    for signal_file in self.cases_dir.glob("*/active.signal"):
                        case_folder = signal_file.parent

                        # Use a lock file per case to prevent multi-process races
                        lock_file = case_folder / ".processing.lock"
                        with FileLock(lock_file, timeout=2):
                            # Inside the lock, check if signal still exists
                            if signal_file.exists():
                                self.process_new_case(case_folder)

                                # Consume the signal immediately after processing
                                try:
                                    signal_file.unlink()
                                except Exception as e:
                                    self.log_event(f"Failed to delete signal file: {e}")

                time.sleep(5)  # Poll every 5 seconds
            except TimeoutError:
                # Lock held by another process, skip for now
                continue
            except Exception as e:
                self.log_event(f"Error in Monitoring Loop: {e}")
                time.sleep(10)

    def process_new_case(self, case_folder):
        """Process case. Caller must ensure mutual exclusion."""

        metadata_path = case_folder / "metadata.json"
        if not metadata_path.exists():
            return

        # Use case_id + creation time as a stable signal ID
        case_creation_time = case_folder.stat().st_ctime
        signal_id = hashlib.md5(
            f"{case_folder.name}_{case_creation_time}".encode()
        ).hexdigest()

        try:
            # Load metadata
            with open(metadata_path, "r") as f:
                data = json.load(f)

            case_name = data.get("case_id", case_folder.name)
            jurisdiction = data.get("jurisdiction", "South Carolina")
            goals = data.get("research_goals") or data.get("goals", "")

            self.log_event(f"Processing case '{case_name}' (ID: {signal_id[:8]})")

            # AI Processing Prompt
            prompt = f"""
ROLE: Senior Legal Research Assistant.
JURISDICTION: {jurisdiction}
TASK: Conduct an initial legal analysis for the following goals:
{goals}

REQUIREMENTS:
1. Identify key statutes or codes relevant to this jurisdiction.
2. Outline potential legal hurdles or procedural requirements.
3. Suggest a 3-step action plan for the next phase of research.
4. Format the output in clean Markdown.
""".strip()

            # Run the Research via DeepSeek R1
            analysis_markdown = self.ai_service.generate_response(
                prompt, domain="legal", use_reasoning=True
            )

            # Save results
            research_folder = case_folder / "research"
            research_folder.mkdir(parents=True, exist_ok=True)

            research_file = research_folder / f"analysis_{signal_id[:8]}.md"
            with open(research_file, "w", encoding="utf-8") as f:
                f.write(analysis_markdown)

            self.log_event(f"[SUCCESS] Analysis complete for '{case_name}'")
            self.notifier.send_notification(
                f"Research complete for case '{case_name}'", level="SUCCESS"
            )

        except Exception as e:
            self.log_event(f"Failed to process case {case_folder.name}: {e}")
            raise

    def start_in_background(self):
        """Helper to start the loop in a separate thread."""
        thread = threading.Thread(target=self.run, daemon=True)
        thread.start()
