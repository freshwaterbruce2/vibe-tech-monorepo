import multiprocessing
import sys



def run_ui():
    """Import and run the Native UI."""
    from backend.launch_native import main as ui_main

    ui_main()


def run_backend():
    """Import and run the Backend Server."""
    # We can invoke uvicorn directly here or import start_backend
    # Importing start_backend logic is safer to keep env loading consistent
    from backend.main import app
    from backend.vibe_justice.utils.startup import run_server

    print("--- Starting Backend (Frozen Mode) ---")
    # Note: reload=True doesn't work well in frozen apps, usually disable it
    run_server(app, reload=False)


if __name__ == "__main__":
    # PyInstaller multiprocessing fix for Windows
    multiprocessing.freeze_support()

    if "--backend" in sys.argv:
        run_backend()
    else:
        run_ui()
