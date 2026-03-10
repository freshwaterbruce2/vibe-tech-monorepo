import os
import sys
import uvicorn

# Add the current directory to sys.path to ensure module resolution works
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the app object from your API definition
# Adjust 'vibe_justice.api' if your main file is named differently
from main import app 

if __name__ == "__main__":
    # Freeze support is often needed for multiprocessing on Windows
    # though uvicorn usually runs single-process in this context.
    from multiprocessing import freeze_support
    freeze_support()
    
    print("🚀 Starting Vibe-Justice Backend System...")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
