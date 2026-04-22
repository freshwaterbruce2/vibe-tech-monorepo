# -*- mode: python ; coding: utf-8 -*-
import sys
sys.setrecursionlimit(5000)
"""
PyInstaller spec for Vibe-Justice backend as Tauri sidecar
Outputs: backend.exe for Windows production builds
"""

from pathlib import Path

# Paths
backend_dir = Path(SPECPATH).resolve()
output_dir = backend_dir.parent / "frontend" / "src-tauri" / "binaries"

a = Analysis(
    [str(backend_dir / 'start_backend.py')],
    pathex=[str(backend_dir)],
    binaries=[],
    datas=[],
    hiddenimports=[
        # FastAPI + Uvicorn
        'uvicorn.logging',
        'uvicorn.config',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',

        # SocketIO
        'engineio',
        'engineio.async_drivers.asio',
        'socketio',

        # Database & Vector Store
        'chromadb',
        'chromadb.telemetry.product.posthog',
        'chromadb.api.rust',
        'chromadb.segment.impl.metadata.sqlite',
        'chromadb.execution.executor.local',
        'chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2',
        'tzdata',

        # Vibe-Justice modules
        'vibe_justice.api.chat',
        'vibe_justice.api.analysis',
        'vibe_justice.api.drafting',
        'vibe_justice.api.evidence',
        'vibe_justice.api.forms',
        'vibe_justice.api.cases',
        'vibe_justice.loops.monitoring_loop',
        'vibe_justice.services.notification_service',
        'vibe_justice.services.ai_service',
        'vibe_justice.services.analysis_service',
        'vibe_justice.services.desktop_service',
        'vibe_justice.services.drafting_service',
        'vibe_justice.services.evidence_service',
        'vibe_justice.services.forms_service',
        'vibe_justice.services.retrieval_service',
        'vibe_justice.ai.deepseek_client',
        'vibe_justice.ai.token_budget',
        'vibe_justice.utils.process_guard',

        # Dependencies
        'httpx',
        'pydantic',
        'dotenv',
        'sqlalchemy',
        'sqlmodel',
        'alembic',
        'psutil',
        'requests',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude unused heavy packages
        'matplotlib',
        'tkinter',
        'pytest',
        'numpy',
        'pandas',
    ],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Keep console for debugging
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
