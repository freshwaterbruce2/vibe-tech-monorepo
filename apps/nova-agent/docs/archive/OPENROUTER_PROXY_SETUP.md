# NOVA Agent - OpenRouter Proxy Integration

> **Important:** NOVA Agent uses a local OpenRouter proxy for AI functionality.  
> **Architecture:** NOVA Agent → Proxy (localhost:3001) → OpenRouter API

---

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   NOVA Agent    │────────▶│ OpenRouter Proxy │────────▶│  OpenRouter API │
│  (Desktop App)  │         │  (localhost:3001)│         │  (openrouter.ai)│
└─────────────────┘         └──────────────────┘         └─────────────────┘
     No API key              Real API key stored          External service
     required here           securely here only
```

**Benefits:**

- ✅ **Centralized API Key Management** - One key for all apps
- ✅ **Usage Tracking** - Monitor costs and token usage
- ✅ **Rate Limiting** - Prevents API quota exhaustion
- ✅ **Security** - API key never exposed in NOVA Agent
- ✅ **Logging** - Centralized request/response logging

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Start the OpenRouter Proxy

```powershell
# Navigate to proxy directory
cd C:\dev\backend\openrouter-proxy

# Install dependencies (first time only)
pnpm install

# Create .env file with your API key
@"
OPENROUTER_API_KEY=sk-or-v1-your-key-here
PORT=3001
NODE_ENV=development
"@ | Out-File -FilePath .env -Encoding UTF8

# Start the proxy
pnpm run dev
```

**Expected output:**

```
[INFO] OpenRouter Proxy running on http://localhost:3001
[INFO] Environment: development
[INFO] Rate limit: 60 requests per 60000ms
```

### Step 2: Verify Proxy is Running

```powershell
# Test health endpoint
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"2026-01-13T...","uptime":...}
```

### Step 3: Configure NOVA Agent

NOVA Agent is already configured to use the proxy!

**File:** `C:\dev\apps\nova-agent\src-tauri\.env`

```env
# OpenRouter Proxy Configuration
OPENROUTER_BASE_URL=http://localhost:3001/api/openrouter
OPENROUTER_API_KEY=proxy-handled

# Database paths
DATABASE_PATH=D:\databases

# Optional fallback providers
GROQ_API_KEY=
DEEPSEEK_API_KEY=
```

### Step 4: Launch NOVA Agent

```powershell
cd C:\dev\apps\nova-agent
pnpm tauri dev
```

NOVA Agent will automatically connect to the proxy at `http://localhost:3001/api/openrouter`

---

## 🔑 Getting Your OpenRouter API Key

1. Visit: **<https://openrouter.ai/keys>**
2. Sign up or log in (free account available)
3. Click **"Create Key"**
4. Copy your key (starts with `sk-or-v1-...`)
5. Add to `C:\dev\backend\openrouter-proxy\.env`

**Cost:** FREE tier available with generous limits!

---

## 📊 Proxy Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/openrouter/chat` | POST | Chat completions |
| `/api/openrouter/models` | GET | List available models |
| `/api/openrouter/usage` | GET | Usage statistics |

---

## 🔧 Production Deployment

### Option 1: PM2 (Recommended)

```powershell
# Install PM2 globally
npm install -g pm2

# Start proxy with PM2
cd C:\dev\backend\openrouter-proxy
pm2 start npm --name "openrouter-proxy" -- run dev

# Save PM2 configuration
pm2 save

# Enable auto-start on boot
pm2 startup
```

### Option 2: Windows Service

Use `nssm` (Non-Sucking Service Manager) to run as a Windows service:

```powershell
# Install nssm
winget install nssm

# Create service
nssm install OpenRouterProxy "C:\Program Files\nodejs\node.exe"
nssm set OpenRouterProxy AppDirectory "C:\dev\backend\openrouter-proxy"
nssm set OpenRouterProxy AppParameters "node_modules\.bin\tsx src\index.ts"
nssm set OpenRouterProxy Start SERVICE_AUTO_START

# Start service
nssm start OpenRouterProxy
```

---

## 🧪 Testing the Integration

### Test 1: Proxy Health Check

```powershell
curl http://localhost:3001/health
```

### Test 2: Chat Completion

```powershell
$body = @{
    model = "openai/gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Hello, world!"
        }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/openrouter/chat" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Test 3: NOVA Agent Connection

1. Start the proxy: `cd C:\dev\backend\openrouter-proxy && pnpm run dev`
2. Start NOVA Agent: `cd C:\dev\apps\nova-agent && pnpm tauri dev`
3. Send a chat message in NOVA Agent
4. Check proxy logs for the request

---

## 🔍 Troubleshooting

### Proxy won't start

**Problem:** Port 3001 already in use  
**Solution:** Change port in `.env` file:

```env
PORT=3002
```

Then update NOVA Agent's `OPENROUTER_BASE_URL` to match.

### NOVA Agent can't connect to proxy

**Problem:** Connection refused  
**Solution:** 

1. Verify proxy is running: `curl http://localhost:3001/health`
2. Check firewall settings
3. Verify `OPENROUTER_BASE_URL` in NOVA Agent `.env`

### API key errors

**Problem:** "OPENROUTER_API_KEY not configured"  
**Solution:** Add your API key to `C:\dev\backend\openrouter-proxy\.env`

---

## 📁 File Locations

| Component | Configuration File |
|-----------|-------------------|
| **OpenRouter Proxy** | `C:\dev\backend\openrouter-proxy\.env` |
| **NOVA Agent** | `C:\dev\apps\nova-agent\src-tauri\.env` |
| **Proxy Logs** | `D:\logs\openrouter-proxy\` |
| **NOVA Logs** | `D:\logs\nova-agent\` |

---

## 🚀 Auto-Start Both Services

Create a startup script: `C:\dev\start-nova-stack.ps1`

```powershell
# Start OpenRouter Proxy
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\dev\backend\openrouter-proxy; pnpm run dev"

# Wait for proxy to start
Start-Sleep -Seconds 3

# Start NOVA Agent
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\dev\apps\nova-agent; pnpm tauri dev"
```

---

**Last Updated:** 2026-01-13  
**Status:** Production Ready ✅

