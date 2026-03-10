# NOVA Agent Quick Setup Guide (2026)

Last Updated: January 7, 2026

## API Key Storage

### Real OpenRouter API Key → Proxy Server

Location: `C:\dev\backend\openrouter-proxy\.env`

### Placeholder → NOVA Agent

Location: `C:\dev\apps\nova-agent\.env`
Value: `OPENROUTER_API_KEY=proxy-handled`

## Quick Start

### 1. Configure Proxy Server

```bash
cd C:\dev\backend\openrouter-proxy
# Create .env with your real OpenRouter API key
echo "OPENROUTER_API_KEY=sk-or-v1-your-key" > .env
echo "PORT=3001" >> .env
pnpm install
pnpm run dev
```

### 2. Configure NOVA Agent

```bash
cd C:\dev\apps\nova-agent
# Create .env with placeholder
echo "OPENROUTER_BASE_URL=http://localhost:3001/api/openrouter" > .env
echo "OPENROUTER_API_KEY=proxy-handled" >> .env
echo "DATABASE_PATH=D:\databases\agent_tasks.db" >> .env
pnpm install
pnpm run build
```

### 3. Verify

```bash
# Check proxy server
curl http://localhost:3001/health

# Run NOVA Agent
pnpm run dev
```

## Documentation

- Security Improvements: `docs/SECURITY_IMPROVEMENTS_2026.md`
- API Server Architecture: `docs/CUSTOM_API_SERVER_ARCHITECTURE.md`
- Credential Migration: `docs/CREDENTIAL_MIGRATION_GUIDE.md`

Status: Production-Ready ✅
