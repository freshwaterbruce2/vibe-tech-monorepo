# NOVA Agent - Quick Start with OpenRouter Proxy

> **TL;DR:** Complete setup in 3 commands

---

## 🚀 One-Command Setup

```powershell
cd C:\dev\apps\nova-agent
.\scripts\setup-proxy-integration.ps1
```

**What it does:**

- ✅ Configures OpenRouter proxy
- ✅ Updates NOVA Agent configuration
- ✅ Installs dependencies
- ✅ Tests connection

---

## 🎯 Manual Setup (3 Steps)

### Step 1: Start OpenRouter Proxy (2 min)

```powershell
cd C:\dev\backend\openrouter-proxy

# Create .env with your API key
@"
OPENROUTER_API_KEY=sk-or-v1-your-key-here
PORT=3001
"@ | Out-File -FilePath .env -Encoding UTF8

# Install & start
pnpm install
pnpm run dev
```

**Get API key:** <https://openrouter.ai/keys> (FREE!)

### Step 2: Configure NOVA Agent (1 min)

Edit `C:\dev\apps\nova-agent\src-tauri\.env`:

```env
OPENROUTER_BASE_URL=http://localhost:3001/api/openrouter
OPENROUTER_API_KEY=proxy-handled
DATABASE_PATH=D:\databases
```

### Step 3: Launch NOVA Agent (1 min)

```powershell
cd C:\dev\apps\nova-agent
pnpm tauri dev
```

---

## 🧪 Quick Test

```powershell
# Test proxy
curl http://localhost:3001/health

# Expected: {"status":"ok",...}
```

---

## 📦 Production Deployment

### Option 1: PM2 (Recommended)

```powershell
# Start proxy
cd C:\dev\backend\openrouter-proxy
pm2 start npm --name "openrouter-proxy" -- run dev

# Start NOVA Agent
cd C:\dev\apps\nova-agent
pm2 start ecosystem.config.cjs --env production

# Save & enable auto-start
pm2 save
pm2 startup
```

### Option 2: Auto-Start Script

Create `C:\dev\start-nova.ps1`:

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\dev\backend\openrouter-proxy; pnpm run dev"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\dev\apps\nova-agent; pnpm tauri dev"
```

Run: `.\start-nova.ps1`

---

## 🏗️ Architecture

```
NOVA Agent → Proxy (localhost:3001) → OpenRouter API
```

**Benefits:**

- One API key for all apps
- Usage tracking & cost monitoring
- Rate limiting
- Centralized logging

---

## 🔧 Common Commands

| Task | Command |
|------|---------|
| Start proxy | `cd C:\dev\backend\openrouter-proxy && pnpm run dev` |
| Start NOVA | `cd C:\dev\apps\nova-agent && pnpm tauri dev` |
| Test proxy | `curl http://localhost:3001/health` |
| View proxy logs | `cat D:\logs\openrouter-proxy\combined.log` |
| Setup everything | `.\scripts\setup-proxy-integration.ps1` |

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3001 in use | Change `PORT=3002` in proxy `.env` |
| Can't connect | Verify proxy is running: `curl http://localhost:3001/health` |
| API key error | Add key to `C:\dev\backend\openrouter-proxy\.env` |

---

## 📚 Full Documentation

- **Proxy Setup:** `OPENROUTER_PROXY_SETUP.md`
- **Integration Guide:** `PROXY_INTEGRATION_COMPLETE.md`
- **Installation:** `INSTALLATION.md`
- **Packaging:** `WINDOWS_PACKAGING_GUIDE.md`

---

**Status:** ✅ Ready to Use  
**Last Updated:** 2026-01-13

