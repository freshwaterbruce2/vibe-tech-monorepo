#!/usr/bin/env python
"""
Simple startup script for Vibe-Justice backend
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(backend_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import and run the app
from main import app

if __name__ == "__main__":
    # Detect if running as bundled executable (PyInstaller)
    is_bundled = getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')

    print("\n" + "="*50)
    print("Starting Vibe-Justice Backend Server")
    if is_bundled:
        print("Mode: Production (Bundled)")
    else:
        print("Mode: Development")
    print("="*50)
    print("Server: http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("Model: DeepSeek R1 (deepseek-reasoner)")
    print("Frontend: http://localhost:5175")
    print("="*50 + "\n")

    # Disable reload in production (bundled mode)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=not is_bundled)