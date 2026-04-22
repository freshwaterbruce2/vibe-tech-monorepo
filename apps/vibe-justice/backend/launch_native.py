import os
import sys
from pathlib import Path

# Add backend to path to allow imports
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from fluent_ui.main_window import VibeJusticeWindow
from PySide6.QtWidgets import QApplication


def main():
    # Enable High DPI scaling
    # Enable High DPI scaling
    # Qt6 handles this automatically.

    app = QApplication(sys.argv)

    # Create Main Window
    print("[DEBUG] Creating VibeJusticeWindow...")
    window = VibeJusticeWindow()
    print("[DEBUG] Window created. Calling show()...")
    window.show()

    print("[DEBUG] Entering app.exec()...")
    ret = app.exec()
    print(f"[DEBUG] App exited with code: {ret}")
    sys.exit(ret)


if __name__ == "__main__":
    from PySide6.QtCore import Qt  # Import here to avoid global namespace pollution

    main()
