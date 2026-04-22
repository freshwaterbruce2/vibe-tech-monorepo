import os
import shutil
from pathlib import Path

import PyInstaller.__main__

# Setup paths
backend_dir = Path(__file__).parent.absolute()
frontend_dir = backend_dir.parent / "frontend"
dist_dir = backend_dir / "dist"
work_dir = backend_dir / "build"

# Clean previous builds
if dist_dir.exists():
    shutil.rmtree(dist_dir)
if work_dir.exists():
    shutil.rmtree(work_dir)

# PyInstaller arguments
args = [
    str(backend_dir / "start_backend.py"),  # Entry point
    "--name=backend",  # Output executable name
    "--onefile",  # Single executable
    "--clean",  # Clean cache
    "--noconfirm",  # Overwrite existing
    # Hidden imports that uvicorn/fastapi might miss
    "--hidden-import=uvicorn.logging",
    "--hidden-import=uvicorn.loops",
    "--hidden-import=uvicorn.loops.auto",
    "--hidden-import=uvicorn.protocols",
    "--hidden-import=uvicorn.protocols.http",
    "--hidden-import=uvicorn.protocols.http.auto",
    "--hidden-import=uvicorn.lifespan",
    "--hidden-import=uvicorn.lifespan.on",
    "--hidden-import=engineio.async_drivers.asgi",
    "--hidden-import=scipy.special.cython_special",
    "--hidden-import=sklearn.metrics._pairwise_distances_reduction._datasets_pair",
    "--hidden-import=sklearn.metrics._pairwise_distances_reduction._middle_term_computer",
    # Paths
    f"--workpath={work_dir}",
    f"--distpath={dist_dir}",
    f"--paths={backend_dir}",
    # Add data needed (like .env or templates if any, though .env is usually manual)
    # "--add-data=templates;templates",
]

print("Running PyInstaller...")
PyInstaller.__main__.run(args)

# Move to frontend resources
# Electron Builder expects resources in specific places or we configure it to pick it up
# Simpler to copy to a known location
target_exec = dist_dir / "backend.exe"
dest_resources = frontend_dir / "resources"
dest_resources.mkdir(parents=True, exist_ok=True)
dest_exec = dest_resources / "backend.exe"

if target_exec.exists():
    print(f"Moving {target_exec} to {dest_exec}")
    shutil.copy2(target_exec, dest_exec)
    print("Backend build successful!")
else:
    print("Error: backend.exe not found after build.")
    exit(1)
