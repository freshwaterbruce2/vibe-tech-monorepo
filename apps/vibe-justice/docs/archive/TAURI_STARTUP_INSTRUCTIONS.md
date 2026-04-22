# Vibe-Justice Tauri Startup Instructions

**Date**: 2026-01-14
**Status**: Ready to test with DeepSeek models

## Current Status

✅ **OpenRouter Proxy**: Running on localhost:3001
✅ **DeepSeek Models**: All 3 models tested and working
✅ **Model Configuration**: Complete with tier system
✅ **Backend Integration**: Backend now uses OpenRouter proxy (NO API KEY NEEDED!)
⚠️ **Tauri App**: Port conflict (port 5175 in use)

## ⚡ IMPORTANT: No DeepSeek API Key Needed

**GREAT NEWS**: The backend has been updated to use the OpenRouter proxy, which means:

- ❌ You DO NOT need a `DEEPSEEK_API_KEY`
- ✅ The proxy handles all authentication
- ✅ DeepSeek R1 reasoning model is FREE
- ✅ DeepSeek V3 chat model costs ~$0.001 per query (99% cheaper than Claude)

**Before you had to configure:**

```bash
DEEPSEEK_API_KEY=sk-...  # ❌ NO LONGER NEEDED
```

**Now you just need:**

```bash
# Nothing! Proxy is already running with OpenRouter API key
```

See `BACKEND_OPENROUTER_MIGRATION.md` for complete details.

---

## Issues to Resolve

### 1. Port Conflict

- **Problem**: Port 5175 is already in use
- **Solution**: Kill the process using port 5175

```powershell
# Find and kill the process
$processId = (Get-NetTCPConnection -LocalPort 5175).OwningProcess
Stop-Process -Id $processId -Force

# Or use the dev command's port-check
cd C:\dev
pnpm run dev:port-check 5175
```

### 2. Tauri Plugin Version Mismatch

- **Problem**: `tauri-plugin-dialog` v2.5.0 (Rust) vs `@tauri-apps/plugin-dialog` v2.6.0 (NPM)
- **Impact**: Warning only, doesn't prevent app from running
- **Solution** (optional): Update Rust plugin version in `src-tauri/Cargo.toml`

```toml
[dependencies]
tauri-plugin-dialog = "2.6"  # Update from 2.5
```

## How to Start Vibe-Justice

### Option 1: Via Nx (Recommended)

```bash
cd C:\dev

# Method 1: Using Nx (with Nx Cloud warning - can ignore)
pnpm nx tauri:dev vibe-justice

# Method 2: Directly from frontend folder (bypasses Nx Cloud)
cd apps/vibe-justice/frontend
pnpm run tauri:dev
```

### Option 2: Start Frontend and Backend Separately

**Terminal 1 - Frontend (Vite):**

```bash
cd C:\dev\apps\vibe-justice\frontend
pnpm run dev  # Starts on localhost:5175
```

**Terminal 2 - Backend (FastAPI):**

```bash
cd C:\dev\apps\vibe-justice\backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 3 - Tauri (Rust Desktop App):**

```bash
cd C:\dev\apps\vibe-justice\frontend
pnpm tauri dev  # Launches desktop window
```

## Testing the AI Integration

Once the app starts:

### 1. Test Chat with DeepSeek

- Open the chat interface
- Send a legal query (e.g., "What are my rights in an unemployment claim?")
- Should use **DeepSeek V3** by default (ultra-cheap)

### 2. Test Reasoning with DeepSeek R1

- Ask a complex legal question
- App should use **DeepSeek R1 (FREE)** for reasoning tasks

### 3. Verify Cost Savings

- Check the console for model usage
- Typical query should cost ~$0.001 vs ~$0.50 with Claude

### 4. Test Model Tier Switching (Optional)

```typescript
// In browser console or app code
import { setModelTier } from './services/openrouter';

// Switch to paid tier (Claude Haiku 4)
setModelTier('paid');

// Switch back to free tier
setModelTier('free');
```

## Expected Behavior

### Successful Startup

```
✓ Vite dev server running on http://localhost:5175
✓ Tauri app window opens
✓ FastAPI backend running on http://localhost:8000
✓ OpenRouter proxy responding at http://localhost:3001
✓ AI chat functional with DeepSeek models
```

### What to Watch For

- **Vite HMR**: Hot module reload should work
- **Tauri IPC**: Commands should execute without errors
- **API Calls**: Check browser console for 200 responses
- **Model Usage**: Confirm DeepSeek V3/R1 being used

## Troubleshooting

### Issue: "401: Unable to connect to Nx Cloud"

- **Impact**: Warning only, doesn't prevent build
- **Solution**: Ignore or run directly from frontend folder

### Issue: "Port 5175 is already in use"

- **Solution**: Kill the process using port 5175 (see above)

### Issue: "Failed to resolve import @tauri-apps/plugin-*"

- **Cause**: Node modules not resolved correctly
- **Solution**: Packages are installed in workspace, restart Vite

### Issue: Backend not responding

- **Check**: Is FastAPI running?
- **Command**: `cd apps/vibe-justice/backend && uvicorn main:app --reload`

### Issue: OpenRouter proxy not responding

- **Check**: Is the proxy running?
- **Command**: `cd backend/openrouter-proxy && pnpm dev`

## Next Steps After Startup

### Phase 1.3: Complete Tauri Migration

- [ ] Remove Electron dependencies
- [ ] Test Tauri build (`pnpm nx tauri:build vibe-justice`)
- [ ] Verify all Tauri commands work

### Phase 1.4: Add Model Selection UI

- [ ] Create model tier selector component
- [ ] Display current model in chat UI
- [ ] Add cost tracking display
- [ ] Show token usage per conversation

### Phase 2: Feature Completion

- [ ] Document analysis with RAG
- [ ] Legal reasoning tools
- [ ] Case law search integration
- [ ] Document drafting features

## Quick Commands Reference

```bash
# Check what's using port 5175
pnpm run dev:port-check 5175

# Test DeepSeek models
cd apps/vibe-justice
node test-deepseek-models.mjs

# Check OpenRouter proxy health
curl http://localhost:3001/health

# Start everything in parallel
cd C:\dev
pnpm nx dev:all vibe-justice  # Frontend + Backend
```

## Documentation

- **Model Integration**: `MODEL_INTEGRATION_COMPLETE.md`
- **Roadmap**: `VIBE_JUSTICE_ROADMAP.md`
- **CLAUDE.md**: Main project documentation
- **Test Scripts**: `test-deepseek-models.mjs`, `test-proxy-integration.ps1`

---

**Status**: Ready to test! Just need to clear port 5175 conflict.
**Cost**: ~99% savings vs Claude models ($0.001 vs $0.50 per query)
**Models**: DeepSeek V3 + R1 (ultra-cheap + FREE)
