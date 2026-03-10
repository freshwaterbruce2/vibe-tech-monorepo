# Backend Services - Complete Reference

**Last Updated**: 2026-01-15
**Status**: Production
**Scope**: All backend services in VibeTech monorepo

---

## Overview

The VibeTech monorepo contains multiple backend services:

1. **Root-Level Services** (`C:\dev\backend\`) - Shared infrastructure
2. **App-Specific Backends** - Embedded within applications

All backends follow the **D:\ storage pattern** for databases, logs, and data files.

---

## Root-Level Backend Services

### 1. OpenRouter Proxy (`backend/openrouter-proxy/`)

**Purpose**: Centralized AI API proxy for routing requests to OpenRouter (Claude, DeepSeek, etc.)

**Tech Stack**: TypeScript + Express + Winston logging

**Configuration**:

```json
{
  "name": "openrouter-proxy",
  "version": "1.0.0",
  "main": "dist/index.js",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

**Commands**:

```bash
# Development
cd backend/openrouter-proxy
pnpm dev                    # tsx watch src/index.ts

# Production
pnpm build                  # Compile TypeScript
pnpm start                  # Node dist/index.js

# PM2 Deployment
pm2 start ecosystem.config.cjs
pm2 logs openrouter-proxy
pm2 restart openrouter-proxy
```

**Endpoints**:

- `POST /api/chat` - OpenRouter chat completion proxy
- `GET /health` - Health check endpoint

**Environment Variables**:

```bash
OPENROUTER_API_KEY=sk-or-your_key_here
PORT=3001
NODE_ENV=production
LOG_PATH=D:\logs\openrouter-proxy\
```

**PM2 Configuration** (`ecosystem.config.cjs`):

```javascript
{
  name: 'openrouter-proxy',
  script: 'node_modules/.bin/tsx',
  args: 'watch src/index.ts',
  instances: 1,
  autorestart: true,
  max_memory_restart: '500M',
  error_file: 'D:\\logs\\openrouter-proxy\\error.log',
  out_file: 'D:\\logs\\openrouter-proxy\\out.log',
  log_file: 'D:\\logs\\openrouter-proxy\\combined.log'
}
```

**Used By**:

- Vibe-Tutor (mobile app)
- Nova-Agent (desktop assistant)
- Vibe-Justice (legal AI)
- Digital-Content-Builder

---

### 2. Vibe-Tech Backend (`backend/`)

**Purpose**: Root-level Node.js API server with SQLite database

**Tech Stack**: Express + SQLite3 + Winston

**Configuration**:

```json
{
  "name": "vibe-tech-backend",
  "version": "1.0.0",
  "main": "server.js"
}
```

**Commands**:

```bash
# Development
pnpm nx dev vibe-tech-backend        # nodemon server.js
pnpm --filter vibe-tech-backend dev

# Production
pnpm nx start vibe-tech-backend      # node server-production.js

# Health Check
pnpm nx health vibe-tech-backend     # curl http://localhost:3000/health
```

**Endpoints**:

- `GET /health` - Health check
- `GET /api/*` - REST API endpoints

**Environment Variables**:

```bash
PORT=3000
NODE_ENV=production
DATABASE_PATH=D:\databases\vibe-tech.db
LOG_PATH=D:\logs\vibe-tech\
```

---

### 3. Other Root Services

The `backend/` directory also contains:

- **config/** - Configuration management
- **dap-proxy/** - Debug Adapter Protocol proxy
- **data/** - Data processing services
- **docs/** - Backend documentation
- **ipc-bridge/** - Inter-process communication
- **llm-finetuning/** - AI model fine-tuning tools
- **lsp-proxy/** - Language Server Protocol proxy
- **middleware/** - Express middleware
- **nova-sqlite-mcp/** - MCP server for SQLite
- **prompt-engineer/** - AI prompt engineering tools
- **search-service/** - Search indexing
- **symptom-tracker-api/** - Medical symptom tracking API
- **workflow-engine/** - Task automation engine

---

## App-Specific Backends

### 1. Vibe-Tutor Backend (`apps/vibe-tutor/render-backend/`)

**Path**: `C:\dev\apps\vibe-tutor\render-backend\` ✅ VERIFIED

**Purpose**: Express proxy for OpenRouter with Claude 4.5 + DeepSeek R1 fallback

**Tech Stack**: Express + OpenRouter SDK

**Main File**: `server.mjs`

**Configuration**:

```javascript
const OPENROUTER_CONFIG = {
  baseURL: 'https://openrouter.ai/api/v1',
  primaryModel: 'anthropic/claude-sonnet-4-5-20250929',  // Best paid model
  fallbackModel: 'deepseek/deepseek-r1-0528',            // Free backup
  timeout: 30000,
};
```

**Commands**:

```bash
cd apps/vibe-tutor/render-backend
node server.mjs                  # Start server (port 3001)

# Or via Nx
pnpm nx backend:start vibe-tutor
```

**Features**:

- Session token management
- Content filtering for child safety
- Rate limiting (30 req/min per user)
- Dual-model fallback (Claude → DeepSeek)

**Environment Variables**:

```bash
OPENROUTER_API_KEY=sk-or-your_key_here
PORT=3001
```

**Related Documentation**: `apps/vibe-tutor/CLAUDE.md`

---

### 2. Vibe-Justice Backend (`apps/vibe-justice/backend/`)

**Path**: `C:\dev\apps\vibe-justice\backend\` ✅ VERIFIED

**Purpose**: FastAPI application for SC legal research assistant with DeepSeek R1

**Tech Stack**: Python 3.11+ + FastAPI + ChromaDB + OpenRouter

**Main File**: `main.py`

**Configuration**:

```python
app = FastAPI(
    title="Vibe-Justice Backend",
    description="SC Legal Research Assistant with DeepSeek R1",
    version="2.0.0"
)
```

**Commands**:

```bash
# Activate venv
cd apps/vibe-justice/backend
.venv\Scripts\activate

# Development
uvicorn main:app --reload --port 8000

# Testing
.venv\Scripts\python.exe -m pytest vibe_justice/tests/ -v

# Or via Nx
pnpm nx backend:start vibe-justice
pnpm nx backend:test vibe-justice
```

**API Routers**:

- `analysis` - Legal document analysis
- `cases` - Case management
- `chat` - AI chat interface
- `drafting` - Document drafting
- `forms` - Form generation
- `knowledge` - Knowledge base queries
- `search` - Legal document search

**Environment Variables**:

```bash
# Required
VIBE_JUSTICE_API_KEY=your_secure_32char_key
OPENROUTER_API_KEY=sk-or-your_key_here

# Optional
OPENROUTER_REASONING_MODEL=deepseek/deepseek-r1-0528:free
OPENROUTER_CHAT_MODEL=deepseek/deepseek-chat
DATABASE_PATH=D:\databases\vibe-justice.db
LOG_PATH=D:\logs\vibe-justice\
```

**Related Documentation**: `apps/vibe-justice/CLAUDE.md`

---

### 3. IconForge Server (`apps/iconforge/server/`)

**Path**: `C:\dev\apps\iconforge\server\` ✅ VERIFIED (NOT `backend/`)

**Purpose**: Fastify server for AI icon creation with DALL-E 3

**Tech Stack**: Fastify + Socket.io + DALL-E 3 + SQLite

**Status**: 🚧 In Development

**Commands**:

```bash
# Development
pnpm nx dev iconforge-backend

# Production
pnpm nx start iconforge-backend
```

**Features**:

- Real-time collaboration (Socket.io + Yjs)
- DALL-E 3 AI generation
- Fabric.js canvas editor integration
- Unified database (`D:\databases\database.db`)

**Environment Variables**:

```bash
OPENAI_API_KEY=sk-your_key_here
DATABASE_PATH=D:\databases\database.db
PORT=3002
```

**Related Documentation**: `apps/iconforge/PRD_SUMMARY.md`

---

### 4. Memory Bank (`apps/memory-bank/`)

**Path**: `C:\dev\apps\memory-bank\` ✅ VERIFIED

**Purpose**: Memory management system for Claude Code with task persistence

**Tech Stack**: TypeScript + SQLite

**Storage**:

- **Tasks**: `apps/memory-bank/quick-access/recent-tasks.json`
- **Config**: `.claude/agents.json`
- **Agents**: `.claude/agents/*.md`

**Features**:

- Stores recent tasks across sessions
- Project-aware context tracking
- 90-day memory retention
- Specialist agent system

**Integration**:

- Hooks into Claude Code session start
- Tracks user prompts automatically
- Provides context for specialist agents

**Environment Variables**:

```bash
DATABASE_PATH=D:\databases\memory-bank.db
LOG_PATH=D:\logs\memory-bank\
```

---

## Common Backend Patterns

### 1. Database Configuration

**All backends MUST use D:\ drive for data storage**:

```typescript
// TypeScript example
const DB_PATH = process.env.DATABASE_PATH || 'D:\\databases\\app.db';

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
```

```python
# Python example
import os
from pathlib import Path

DB_PATH = Path(os.getenv('DATABASE_PATH', r'D:\databases\app.db'))

# Ensure directory exists
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
```

**See**: `.claude/rules/database-storage.md`

---

### 2. Environment Variables

Standard `.env` structure for all backends:

```bash
# API Keys
OPENROUTER_API_KEY=sk-or-v1-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...

# Database
DATABASE_PATH=D:\databases\app.db

# Logs
LOG_PATH=D:\logs\app\

# Server
PORT=3001
NODE_ENV=production

# Optional
OPENROUTER_SITE_URL=https://your-site.com
OPENROUTER_SITE_NAME=App-Name
```

---

### 3. CORS Configuration

Standard CORS setup for all Express backends:

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'tauri://localhost',      // Tauri apps
    'https://localhost:1420'  // Tauri secure context
  ],
  credentials: true
}));
```

---

### 4. Logging Configuration

All backends should log to `D:\logs\`:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: 'D:\\logs\\app\\error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'D:\\logs\\app\\combined.log'
    })
  ]
});
```

---

## Service Discovery

### Check All Running Services

```powershell
# Find all Node.js processes
Get-Process | Where-Object { $_.Name -like "*node*" }

# Check specific ports
netstat -ano | findstr :3001
netstat -ano | findstr :8000

# Using custom command
pnpm run dev:port-check 3001
```

### Health Checks

```bash
# OpenRouter Proxy
curl http://localhost:3001/health

# Vibe-Tech Backend
pnpm nx health vibe-tech-backend
curl http://localhost:3000/health

# Vibe-Justice Backend
curl http://localhost:8000/health
```

---

## Development Workflows

### Start All Services in Parallel

```bash
# Using custom command
/dev:parallel-dev both  # Starts web + backend

# Using Nx
pnpm nx run-many -t dev --projects=tag:backend --parallel=3

# Manual parallel start (PowerShell)
Start-Job { pnpm nx dev vibe-tech-backend }
Start-Job { pnpm nx dev vibe-justice }
Start-Job { cd backend/openrouter-proxy; pnpm dev }
```

### Monitor Logs

```bash
# PM2 services
pm2 logs openrouter-proxy

# Direct log files
Get-Content D:\logs\openrouter-proxy\combined.log -Wait -Tail 50
Get-Content D:\logs\vibe-justice\vibe_justice_$(Get-Date -Format 'yyyyMMdd').log -Wait
```

### Stop All Services

```bash
# PM2 services
pm2 stop all
pm2 delete all

# Kill by port (PowerShell)
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
Get-NetTCPConnection -LocalPort 8000 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

---

## Testing

### Backend Tests

```bash
# Vibe-Justice (Python)
cd apps/vibe-justice/backend
.venv\Scripts\activate
pytest vibe_justice/tests/ -v --cov=vibe_justice

# OpenRouter Proxy (TypeScript)
cd backend/openrouter-proxy
pnpm test
pnpm typecheck

# Via Nx (all backends)
pnpm nx run-many -t test --projects=tag:backend
```

---

## Deployment

### PM2 Deployment (Production)

```bash
# OpenRouter Proxy
cd backend/openrouter-proxy
pm2 start ecosystem.config.cjs

# Verify
pm2 status
pm2 logs openrouter-proxy

# Auto-start on boot
pm2 startup
pm2 save
```

### Docker Deployment (Future)

Not yet implemented. All backends currently run directly on Windows 11.

---

## Related Documentation

### Workspace Rules

- **Commands Reference**: `.claude/rules/commands-reference.md`
- **Database Storage**: `.claude/rules/database-storage.md`
- **Path Policy**: `.claude/rules/paths-policy.md`
- **Testing Strategy**: `.claude/rules/testing-strategy.md`

### Application Guides

- **Vibe-Tutor**: `apps/vibe-tutor/CLAUDE.md`
- **Vibe-Justice**: `apps/vibe-justice/CLAUDE.md`
- **IconForge**: `apps/iconforge/PRD_SUMMARY.md`

### Setup Guides

- **OpenRouter Setup**: `docs/guides/OPENROUTER_SETUP.md`
- **OpenRouter Running**: `docs/guides/OPENROUTER_RUNNING.md`
- **OpenRouter Model Guide**: `docs/guides/OPENROUTER_MODEL_GUIDE_2026.md`

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Issue: Backend Not Starting

1. Check environment variables: `cat .env`
2. Check logs: `Get-Content D:\logs\app\error.log -Tail 50`
3. Verify database path: `Test-Path D:\databases\app.db`
4. Check Node/Python version: `node --version`, `python --version`

### Issue: Database Connection Failed

1. Verify D:\ drive accessible: `Test-Path D:\`
2. Create directory: `New-Item -Path D:\databases -ItemType Directory -Force`
3. Check permissions: `icacls D:\databases`
4. Verify `.env` has correct `DATABASE_PATH`

### Issue: API Keys Not Working

1. Check `.env` file exists: `Test-Path backend/.env`
2. Verify key format: `echo $env:OPENROUTER_API_KEY` (should start with `sk-or-`)
3. Test API key: `curl -H "Authorization: Bearer $KEY" https://openrouter.ai/api/v1/models`

---

## Path Summary (Quick Reference)

| Service | Path | Main File | Port | Status |
|---------|------|-----------|------|--------|
| **OpenRouter Proxy** | `backend/openrouter-proxy/` | `src/index.ts` | 3001 | ✅ Production |
| **Vibe-Tech Backend** | `backend/` | `server.js` | 3000 | ✅ Production |
| **Vibe-Tutor Backend** | `apps/vibe-tutor/render-backend/` | `server.mjs` | 3001 | ✅ Production |
| **Vibe-Justice Backend** | `apps/vibe-justice/backend/` | `main.py` | 8000 | ✅ Production |
| **IconForge Server** | `apps/iconforge/server/` | N/A | 3002 | 🚧 Development |
| **Memory Bank** | `apps/memory-bank/` | N/A | N/A | ✅ Production |

**All paths verified**: 2026-01-15

---

**Last Verified**: 2026-01-15
**Maintained By**: Development Team
**Update Frequency**: On backend changes
