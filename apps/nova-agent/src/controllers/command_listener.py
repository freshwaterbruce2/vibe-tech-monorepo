import pyautogui
import win32gui
import win32con
from vibe_shared.ipc.schemas import IPCMessageType
# Import the tray app to check flags
# Note: In a real running application, we would inject this dependency
# For now, we attempt to import the global instance if available
try:
    from src.ui.tray_icon import get_app_instance
except ImportError:
    get_app_instance = lambda: None

class WindowsCommandListener:
    def __init__(self):
        # Fail-safe: move mouse to corner to abort
        pyautogui.FAILSAFE = True 

    def execute(self, message):
        # SAFETY CHECK: Only execute if the user flipped the switch in the tray
        tray_app = get_app_instance()
        if tray_app and not tray_app.autonomous_mode:
            print("[Security] Blocked OS Command: Autonomous Mode is OFF")
            return

        cmd_type = message.type
        payload = message.payload
        
        # 1. Focus the Target Window (usually Vibe Code Studio)
        if payload.targetWindow:
            self._focus_window(payload.targetWindow)

        # 2. Execute Action
        if cmd_type == IPCMessageType.OS_TYPE:
            if payload.text:
                pyautogui.write(payload.text, interval=0.01)
            
        elif cmd_type == IPCMessageType.OS_HOTKEY:
            if payload.keys:
                pyautogui.hotkey(*payload.keys)
            
        elif cmd_type == IPCMessageType.OS_CLICK:
            if payload.x is not None and payload.y is not None:
                pyautogui.click(x=payload.x, y=payload.y)
        
        elif cmd_type == IPCMessageType.OS_MINIMIZE:
             # Basic minimize current window implementation
             hwnd = win32gui.GetForegroundWindow()
             if hwnd:
                 win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)

    def _focus_window(self, title):
        def callback(hwnd, windows):
            if win32gui.IsWindowVisible(hwnd):
                window_title = win32gui.GetWindowText(hwnd)
                if title.lower() in window_title.lower():
                    windows.append(hwnd)
            return True

        windows = []
        win32gui.EnumWindows(callback, windows)
        
        if windows:
            # Pick the first match
            hwnd = windows[0]
            # Use a robust restore sequence
            try:
                if win32gui.IsIconic(hwnd):
                    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                
                win32gui.SetForegroundWindow(hwnd)
            except Exception as e:
                print(f"Error focusing window: {e}")
        else:
            print(f"Window not found: {title}")
