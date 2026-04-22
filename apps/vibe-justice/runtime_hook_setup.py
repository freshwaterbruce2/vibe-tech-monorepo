import os
import sys

# Set up the plugin path for PySide6 so it can find platforms/qwindows.dll
# This is critical for onefile builds to launch correctly.
try:
    if hasattr(sys, "_MEIPASS"):
        os.environ["QT_QPA_PLATFORM_PLUGIN_PATH"] = os.path.join(
            sys._MEIPASS, "PySide6", "plugins"
        )
except Exception:
    pass
