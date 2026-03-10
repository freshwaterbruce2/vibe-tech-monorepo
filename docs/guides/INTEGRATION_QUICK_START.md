# Integration Quick Start Guide

**For:** Nova Agent + Vibe Code Studio Integration  
**Date:** 2026-01-12  
**Time to Complete:** 1-2 hours for basic integration testing

---

## Prerequisites

### Required Software

- ✅ Node.js 18+ and pnpm installed
- ✅ Rust toolchain (for Nova Agent)
- ✅ Windows 11 (both apps target Windows)
- ✅ Git (for version control)

### Environment Setup

1. **Clone Repository**

   ```bash
   cd C:\dev
   git pull origin main
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Create Environment Files**

   ```bash
   # Nova Agent
   cd apps/nova-agent/src-tauri
   cp .env.example .env
   # Add your API keys to .env

   # Vibe Code Studio
   cd ../../vibe-code-studio
   cp .env.example .env
   # Add your API keys to .env

   # Shared OpenRouter Proxy
   cd ../../backend/openrouter-proxy
   cp .env.example .env
   # Add OPENROUTER_API_KEY
   ```

---

## Quick Integration Test (30 minutes)

### Step 1: Start Shared OpenRouter Proxy (5 min)

```bash
cd C:\dev\backend\openrouter-proxy
pnpm install
pnpm dev
```

**Expected Output:**

```
[OpenRouter Proxy] Running on http://localhost:3001
[OpenRouter Proxy] Ready to accept requests
```

**Verify:**

```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

### Step 2: Start Vibe Code Studio (5 min)

```bash
cd C:\dev\apps\vibe-code-studio
pnpm install
pnpm dev
```

**Expected Output:**

```
[Electron] Main process started
[Electron] Shared learning database connected
[IPC Bridge] WebSocket server listening on ws://127.0.0.1:5004
[Vite] Dev server running at http://localhost:5173
```

**Verify:**

- App window opens
- No console errors
- Settings modal opens (click gear icon)

### Step 3: Start Nova Agent (5 min)

```bash
cd C:\dev\apps\nova-agent
pnpm install
pnpm tauri dev
```

**Expected Output:**

```
[Tauri] Running in development mode
[Nova] Connected to agent_learning.db with WAL mode
[Nova] WebSocket client connecting to ws://127.0.0.1:5004
[Nova] Connected to DeepCode IPC Bridge
```

**Verify:**

- App window opens
- No Rust compilation errors
- Frontend loads successfully

### Step 4: Test IPC Bridge (10 min)

**In Nova Agent:**

1. Open DevTools (F12)
2. Run in console:

   ```javascript
   // Send test message to Vibe
   window.__TAURI__.invoke('send_ipc_message', {
     type: 'file:open',
     payload: { path: 'C:\\dev\\test.txt', line: 10 }
   })
   ```

**In Vibe Code Studio:**

1. Open DevTools (F12)
2. Check console for:

   ```
   [IPC Bridge] Received message: file:open
   [IPC Bridge] Opening file: C:\dev\test.txt at line 10
   ```

**Success Criteria:**

- ✅ Message sent from Nova
- ✅ Message received in Vibe
- ✅ No connection errors
- ✅ WebSocket stays connected

### Step 5: Test OpenRouter Integration (5 min)

**In Nova Agent:**

1. Open chat interface
2. Send message: "Hello, what model are you using?"
3. Verify response mentions model name

**In Vibe Code Studio:**

1. Open Agent Mode (Ctrl+Shift+A)
2. Send message: "Write a hello world function"
3. Verify code generation works

**Check Proxy Logs:**

```bash
# In backend/openrouter-proxy terminal
# Should see:
[OpenRouter Proxy] Chat request from Nova Agent
[OpenRouter Proxy] Chat request from Vibe Code Studio
```

**Success Criteria:**

- ✅ Both apps can send requests
- ✅ Proxy forwards to OpenRouter
- ✅ Responses returned successfully
- ✅ No API key errors

---

## Troubleshooting

### Issue: Port 5004 Already in Use

**Error:** `EADDRINUSE: address already in use :::5004`

**Solution:**

```powershell
# Find process using port 5004
netstat -ano | findstr :5004

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change port in .env
# Vibe: IPC_WS_PORT=5005
# Nova: DEEPCODE_WS_URL=ws://localhost:5005
```

### Issue: Database Locked

**Error:** `database is locked`

**Solution:**

```bash
# Ensure WAL mode is enabled
sqlite3 D:\databases\agent_learning.db "PRAGMA journal_mode=WAL;"

# Or delete WAL files (if safe)
rm D:\databases\agent_learning.db-wal
rm D:\databases\agent_learning.db-shm
```

### Issue: OpenRouter API Key Invalid

**Error:** `401 Unauthorized`

**Solution:**

1. Get new API key: <https://openrouter.ai/keys>
2. Update `backend/openrouter-proxy/.env`:

   ```
   OPENROUTER_API_KEY=sk-or-v1-YOUR-NEW-KEY
   ```

3. Restart proxy: `pnpm dev`

### Issue: Rust Compilation Fails

**Error:** `error: could not compile...`

**Solution:**

```bash
# Update Rust toolchain
rustup update stable

# Clean build
cd apps/nova-agent/src-tauri
cargo clean
cargo build

# If still fails, check build_log.txt
```

---

## Next Steps

After successful integration test:

1. **Read Full Plan:** See `INTEGRATION_COMPLETION_PLAN.md`
2. **Fix Remaining Issues:** Follow Week 1 roadmap
3. **Run Full Test Suite:**

   ```bash
   # Nova Agent
   cd apps/nova-agent
   npm test
   npm run test:e2e

   # Vibe Code Studio
   cd apps/vibe-code-studio
   pnpm test
   pnpm test:e2e
   ```

4. **Performance Testing:**

   ```bash
   # Vibe Code Studio
   pnpm run hook:memory
   pnpm run hook:performance
   ```

---

## Success Checklist

- [ ] All three services running (Proxy, Nova, Vibe)
- [ ] IPC bridge connected (check logs)
- [ ] Database accessible (D:\databases\agent_learning.db)
- [ ] OpenRouter requests working (both apps)
- [ ] No console errors
- [ ] WebSocket reconnects after restart
- [ ] Both apps can run simultaneously

**If all checked:** ✅ Integration successful! Proceed to full roadmap.

---

**Quick Reference:**

- Full Plan: `INTEGRATION_COMPLETION_PLAN.md`
- Nova Docs: `apps/nova-agent/PRODUCTION_READINESS_REPORT.md`
- Vibe Docs: `apps/vibe-code-studio/PRODUCTION_BUILD_CHECKLIST.md`
- IPC Schema: `packages/vibetech-shared/src/ipc-protocol.ts`

