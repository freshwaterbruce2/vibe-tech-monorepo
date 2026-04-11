# vibe-justice — AI Context

## What this is
AI-powered legal case analysis desktop app — Python FastAPI backend with AI document analysis, contradiction detection, and legal drafting, wrapped in a Tauri v2 frontend.

## Stack
- **Runtime**: Python 3.13 (backend) + Node.js 22 + Rust (Tauri frontend)
- **Framework**: Python backend (FastAPI implied) + Tauri v2 + Vite + React 19 (frontend)
- **Key deps**: openrouter_client (AI), alembic (DB migrations), evidence/ocr/drafting services; backend compiled to `.exe` via PyInstaller

## Dev
```bash
# Backend (Python)
cd apps/vibe-justice/backend && python -m vibe_justice  # run Python backend

# Frontend (Tauri)
pnpm --filter vibe-justice-frontend dev    # Vite dev server
pnpm --filter vibe-justice-frontend build  # tsc + vite build → dist/
# tauri dev / tauri build run from frontend dir
```

## Notes
- Monorepo structure: `backend/` (Python) + `frontend/` (Tauri + React)
- Backend compiled to `frontend/src-tauri/binaries/backend.exe` via PyInstaller for distribution
- Python source is in `backend/vibe_justice/` (api/, services/, ai/, utils/) — source .py files may be compiled-only
- Services: ai_service, analysis, drafting, evidence, ocr, violation_detector, web_search, retrieval
- Build artifacts: `build_v6/`, `build_final/`, `dist_v6/` — do not edit these
