import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from vibe_justice.utils.paths import get_log_directory

load_dotenv()


class NotificationService:
    def __init__(self, log_path=None):
        self.log_path = (
            Path(log_path) if log_path else (get_log_directory() / "notifications.log")
        )

        # Placeholder for external services
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")

        # Ensure log directory exists
        if not self.log_path.parent.exists():
            self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def send_notification(self, message: str, level: str = "INFO"):
        """
        Sends a notification via configured channels.
        Currently defaults to logging for the 'Pro' local experience.
        """
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        formatted_message = f"[{timestamp}] [{level}] {message}"

        # 1. Local Log (Primary channel for Vibe Justice Native)
        self._log_locally(formatted_message)

        # 2. Console (Picked up by LogViewer if standard out is captured)
        print(f"[NOTIFY] {message}")

        # 3. Future External Channels (Skeleton)
        if self.twilio_sid and self.twilio_token:
            self._send_sms(message)

        if self.telegram_token:
            self._send_telegram(message)

    def _log_locally(self, message: str):
        try:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(message + "\n")
        except Exception as e:
            print(f"Failed to write to notification log: {e}")

    def _send_sms(self, message: str):
        # Implementation for Twilio would go here
        pass

    def _send_telegram(self, message: str):
        # Implementation for Telegram would go here
        pass
