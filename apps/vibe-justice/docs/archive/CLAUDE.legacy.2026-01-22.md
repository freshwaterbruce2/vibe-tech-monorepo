# Vibe-Justice - Legal AI Desktop Application

**Version**: 2.0.0 (2026 Standards)
**Last Updated**: 2026-01-10
**Status**: Production Ready

## Overview

Vibe-Justice is an AI-powered legal research assistant that helps users with SC unemployment claims, Walmart/Sedgwick disputes, and general legal research using AI models via OpenRouter (January 2026).

## Tech Stack

### Frontend

- **Framework**: React 19.2 + TypeScript 5.9
- **Build Tool**: Vite 7.3
- **UI**: Tailwind CSS 3.4 + shadcn/ui (Radix primitives)
- **State**: Zustand 5.0 + TanStack Query 5.62
- **Routing**: React Router 7.1
- **Forms**: React Hook Form 7.54 + Zod 3.24
- **Desktop**: Tauri 2.x (migrating from Electron)

### Backend

- **Framework**: FastAPI (Python 3.11+)
- **AI**: OpenRouter API (multi-model support, 2026 standards)
- **Models**: DeepSeek R1 (FREE reasoning) + DeepSeek Chat (ultra-cheap)
- **Vector Store**: ChromaDB for RAG
- **Database**: SQLite (D:\databases\)

### Testing

- **Frontend**: Vitest 2.1.8 + Testing Library + MSW 2.7
- **Backend**: pytest 9.0 + pytest-asyncio
- **Coverage Target**: 80% frontend, 90% backend

## Project Structure

```
apps/vibe-justice/
├── frontend/                  # React + Vite application
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API and Tauri services
│   │   ├── __tests__/         # App-level tests
│   │   └── test/              # Test infrastructure (MSW, utils)
│   ├── src-tauri/             # Tauri desktop backend (Rust)
│   │   ├── src/               # Rust source (main.rs, lib.rs)
│   │   └── tauri.conf.json    # Tauri configuration
│   ├── vitest.config.ts       # Test configuration
│   └── eslint.config.js       # ESLint 9.x flat config
├── backend/                   # Python FastAPI backend
│   └── vibe_justice/
│       ├── api/               # API routers (chat, analysis, drafting)
│       ├── services/          # Business logic (AI, retrieval, analysis)
│       └── tests/             # pytest test files
└── project.json               # Nx project configuration
```

## Development Commands

```bash
# Frontend Development
pnpm nx dev vibe-justice              # Start Vite dev server (port 5175)
pnpm nx build vibe-justice            # Production build
pnpm nx lint vibe-justice             # ESLint check
pnpm nx typecheck vibe-justice        # TypeScript check
pnpm nx test:frontend vibe-justice    # Run Vitest tests
pnpm nx quality vibe-justice          # Combined lint + typecheck + test

# Backend Development
cd apps/vibe-justice/backend
.venv\Scripts\activate                 # Activate venv
uvicorn main:app --reload --port 8000  # Start backend
.venv\Scripts\python.exe -m pytest vibe_justice/tests/ -v  # Run tests

# Tauri Desktop App
pnpm nx tauri:dev vibe-justice        # Start Tauri development
pnpm nx tauri:build vibe-justice      # Build Windows installer

# Full Quality Pipeline
pnpm nx quality:full vibe-justice     # All checks + backend tests
```

## Test Files

### Frontend Tests (71 tests)

| File | Tests | Coverage |
|------|-------|----------|
| `ErrorBoundary.test.tsx` | 10 | Error handling UI |
| `api.test.ts` | 14 | API service calls |
| `useKeyboardShortcuts.test.ts` | 12 | Keyboard shortcuts |
| `useBrainScan.test.ts` | 12 | Brain scan hook |
| `DiagnosticsPanel.test.tsx` | 11 | System diagnostics |
| `App.test.tsx` | 12 | Main app component |

### Backend Tests (37 tests)

| File | Tests | Coverage |
|------|-------|----------|
| `test_ai_service.py` | 17 | AI/DeepSeek integration |
| `test_chat_router.py` | 12 | Chat API endpoints |
| `test_analysis_router.py` | 8 | Analysis API endpoints |

## Key Features

1. **AI Chat**: DeepSeek R1 reasoning for complex legal queries
2. **Document Analysis**: AI-powered legal document analysis
3. **RAG Support**: ChromaDB-backed retrieval augmented generation
4. **Domain Expertise**: SC unemployment, Walmart/Sedgwick specializations
5. **Desktop App**: Tauri-based Windows 11 desktop application

## Environment Variables

```bash
# Backend (.env) - Updated January 2026
# Required
VIBE_JUSTICE_API_KEY=your_secure_32char_key  # Generate with: secrets.token_urlsafe(32)
OPENROUTER_API_KEY=sk-or-your_key_here       # Get at: https://openrouter.ai/keys

# Optional (OpenRouter tracking)
OPENROUTER_SITE_URL=https://your-site.com
OPENROUTER_SITE_NAME=Vibe-Justice
OPENROUTER_API_BASE=https://openrouter.ai/api/v1

# Optional (model selection)
OPENROUTER_REASONING_MODEL=deepseek/deepseek-r1-0528:free
OPENROUTER_CHAT_MODEL=deepseek/deepseek-chat

# Database paths
DATABASE_PATH=D:\databases\vibe-justice.db
LOG_PATH=D:\logs\vibe-justice\

# Frontend (optional)
VITE_API_URL=http://localhost:8000
```

**OpenRouter Benefits (2026):**

- FREE DeepSeek R1 reasoning model
- Ultra-cheap DeepSeek Chat ($0.0003/$0.0012 per 1M tokens)
- Unified API for 150+ AI models
- Usage tracking via HTTP-Referer and X-Title headers
- No proxy needed - direct API access

## CI/CD Pipeline

GitHub Actions workflow at `.github/workflows/vibe-justice-ci.yml`:

- Triggers on push/PR to `apps/vibe-justice/**`
- Jobs: frontend-quality, frontend-tests, backend-tests, build
- Windows runner for backend (Python)
- Artifacts: coverage reports, build output

## Tauri Migration Status

- [x] Tauri CLI and plugins installed
- [x] src-tauri folder created with Rust backend
- [x] Tauri commands for backend management (start/stop/ping)
- [x] TypeScript service wrapper (tauri.ts)
- [x] Compatibility bridge for window.vibeTech
- [ ] Full Electron removal (pending testing)

## Platform Requirements

- **OS**: Windows 11 (x64 only)
- **Runtime**: Node.js 22+, Python 3.11+
- **Package Manager**: pnpm 9.15+
- **Rust**: 1.70+ (for Tauri builds)

## Related Documentation

- [Main Monorepo CLAUDE.md](../../CLAUDE.md)
- [Path Policy](../../.claude/rules/paths-policy.md)
- [Testing Strategy](../../.claude/rules/testing-strategy.md)
