# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path
from PyInstaller.utils.hooks import (
    collect_submodules,
    collect_data_files,
    collect_dynamic_libs,
)

# SPECPATH is provided by PyInstaller (directory containing this spec file)
ROOT = Path(SPECPATH).resolve()
BACKEND = ROOT / "backend"

datas = []
binaries = []
hiddenimports = []

# --- App + FastAPI stack ---
hiddenimports += [
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.config",
    "fastapi",
    "pydantic",
    "dotenv",
    "engineio",
    "engineio.async_drivers.asio",
    "socketio",  # IMPORTANT: import name is socketio, not python-socketio
    "tzdata",
    "chromadb",
    "chromadb.telemetry.product.posthog",
    "chromadb.api.rust",
    "chromadb.segment.impl.metadata.sqlite",
    "chromadb.execution.executor.local",
    "chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2",
]

# --- Your Vibe Justice modules (keep explicit; good practice) ---
hiddenimports += [
    "vibe_justice.api.chat",
    "vibe_justice.api.analysis",
    "vibe_justice.api.drafting",
    "vibe_justice.api.evidence",
    "vibe_justice.api.forms",
    "vibe_justice.api.cases",
    "vibe_justice.loops.monitoring_loop",
    "vibe_justice.services.notification_service",
    "vibe_justice.services.ai_service",
    "vibe_justice.services.analysis_service",
    "vibe_justice.services.desktop_service",
    "vibe_justice.services.drafting_service",
    "vibe_justice.services.evidence_service",
    "vibe_justice.services.forms_service",
    "vibe_justice.services.retrieval_service",
    "vibe_justice.ai.deepseek_client",
    "vibe_justice.ai.token_budget",
    "vibe_justice.utils.process_guard",
    "psutil",
    "requests",
]

# --- Qt / Fluent ---
# DO NOT collect_all('PySide6') – let PyInstaller hooks handle it.
hiddenimports += [
    "PySide6.QtCore",
    "PySide6.QtWidgets",
    "PySide6.QtGui",
    "PySide6.QtNetwork",
    "qfluentwidgets",
    "qfluentwidgets.multimedia",
]

# Collect qfluentwidgets assets (icons, styles, etc.)
datas += collect_data_files("qfluentwidgets", include_py_files=False)
hiddenimports += collect_submodules("qfluentwidgets")

# Optional: include qfluentwidgets dynamic libs if any (usually minimal)
binaries += collect_dynamic_libs("qfluentwidgets")

# --- If you REALLY need transformers/torch at runtime, keep them.
# Otherwise, exclude them for a huge size/time win. ---
USE_TORCH_STACK = False

if USE_TORCH_STACK:
    hiddenimports += collect_submodules("transformers")
    datas += collect_data_files("transformers", include_py_files=False)
    hiddenimports += collect_submodules("safetensors")
    datas += collect_data_files("safetensors", include_py_files=False)
    # torch is special; PyInstaller has hooks, but it's huge and slow.
    hiddenimports += collect_submodules("torch")
else:
    # If not used, exclude them to shrink build dramatically.
    pass

a = Analysis(
    ["backend/launcher.py"],
    pathex=[str(ROOT), str(BACKEND)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[str(ROOT / "runtime_hook_setup.py")],
    excludes=[
        "matplotlib", "tkinter", "pytest", "sphinx", "PIL",
        "jupyter", "ipython", "pandas",

        # If not used in runtime:
        *([] if USE_TORCH_STACK else ["torch", "transformers", "safetensors"]),

        # Exclude large unused Qt modules
        "PySide6.Qt3DAnimation", "PySide6.Qt3DCore", "PySide6.Qt3DExtras",
        "PySide6.Qt3DInput", "PySide6.Qt3DLogic", "PySide6.Qt3DRender",
    "PySide6.QtWebEngine", "PySide6.QtWebEngineCore", "PySide6.QtWebEngineWidgets",
    "PySide6.QtWebEngineQuick", "PySide6.QtQuick3D", "PySide6.QtQml",
    "PySide6.QtQuick", "PySide6.QtQuickWidgets", "PySide6.QtQuickControls2",
    "PySide6.QtDataVisualization", "PySide6.QtCharts", "PySide6.QtGraphs",
    "PySide6.QtDesigner", "PySide6.QtHelp", "PySide6.QtLocation",
    "PySide6.QtMultimedia", "PySide6.QtMultimediaWidgets",
    "PySide6.QtBluetooth", "PySide6.QtNfc", "PySide6.QtSensors",
    "PySide6.QtSerialBus", "PySide6.QtSerialPort", "PySide6.QtPositioning",
    "PySide6.QtRemoteObjects", "PySide6.QtSpatialAudio", "PySide6.QtPdf",
    "PySide6.QtPdfWidgets", "PySide6.QtScxml", "PySide6.QtStateMachine",
    "PySide6.QtTextToSpeech", "PySide6.QtWebSockets", "PySide6.QtWebChannel",
    # Optimization: Exclude heavy scientific libs not needed for paralegal logic
    "numpy.f2py", "scipy", "scipy.libs",
],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="VibeJustice",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    console=False,
)
