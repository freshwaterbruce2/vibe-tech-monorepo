import pystray
from PIL import Image, ImageDraw
import threading
import os
import sys

# Global reference to allow external access
_app_instance = None

class NovaTrayApp:
    def __init__(self):
        self.autonomous_mode = False
        self.sentinel_active = True
        
        # Create the icon
        self.icon = pystray.Icon(
            "Nova Agent",
            icon=self.create_image(),
            menu=pystray.Menu(
                pystray.MenuItem("Nova: Mission Control (ACTIVE)", None, enabled=False),
                pystray.Menu.Separator(),
                pystray.MenuItem("Autonomous Mode", self.toggle_autonomous, checked=lambda item: self.autonomous_mode),
                pystray.MenuItem("Sentinel Tracking", self.toggle_sentinel, checked=lambda item: self.sentinel_active),
                pystray.Menu.Separator(),
                pystray.MenuItem("Open Vibe Code Studio", self.open_vibe),
                pystray.MenuItem("Exit Nova", self.exit_action)
            )
        )
        
        global _app_instance
        _app_instance = self

    def create_image(self):
        # Generate a simple blue circle icon for the tray
        width, height = 64, 64
        image = Image.new('RGB', (width, height), (15, 23, 42)) # Slate 900
        dc = ImageDraw.Draw(image)
        dc.ellipse([8, 8, 56, 56], fill=(59, 130, 246)) # Blue 500
        return image

    def toggle_autonomous(self, icon, item):
        self.autonomous_mode = not self.autonomous_mode
        # Send IPC message to Nova Agent to enable/disable HID controls
        print(f"[Tray] Autonomous Mode: {self.autonomous_mode}")

    def toggle_sentinel(self, icon, item):
        self.sentinel_active = not self.sentinel_active
        # Signal the AutoUpdateSentinel in nova-core
        print(f"[Tray] Sentinel Active: {self.sentinel_active}")

    def open_vibe(self):
        # Using a more robust method to find the exe or fall back to dev script
        vibe_path = 'C:\\dev\\apps\\vibe-code-studio\\dist\\win-unpacked\\Vibe Code Studio.exe'
        if os.path.exists(vibe_path):
            os.startfile(vibe_path)
        else:
            print("[Tray] Vibe executable not found. Try running 'pnpm dev:vibe' manually.")

    def exit_action(self):
        self.icon.stop()
        sys.exit(0)

    def run(self):
        self.icon.run()

def get_app_instance():
    return _app_instance

if __name__ == "__main__":
    app = NovaTrayApp()
    app.run()
