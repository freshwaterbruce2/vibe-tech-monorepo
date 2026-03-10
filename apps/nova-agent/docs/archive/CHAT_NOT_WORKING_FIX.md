# Nova Agent Chat Not Working - Fix Guide

## 🔴 Problem

Chat interface is not responding because **no API key is configured**.

Nova Agent requires an OpenRouter API key to communicate with AI models.

---

## ✅ Solution: Configure OpenRouter API Key

### Option 1: Via Settings UI (Recommended)

1. **Start Nova Agent:**

   ```powershell
   cd C:\dev\apps\nova-agent
   pnpm tauri dev
   ```

2. **Navigate to Settings:**
   - Click the **Settings** button in the navigation bar
   - Or go to `/settings` route

3. **Enter API Key:**
   - Find the "API Configuration" section
   - Enter your OpenRouter API key in the "OpenRouter API Key" field
   - Click "Save"

4. **Test Chat:**
   - Go back to Chat Interface
   - Send a message
   - Should now work!

---

### Option 2: Via Windows Credential Manager (Manual)

1. **Open Windows Credential Manager:**

   ```powershell
   control /name Microsoft.CredentialManager
   ```

2. **Add Generic Credential:**
   - Click "Windows Credentials"
   - Click "Add a generic credential"
   - **Internet or network address:** `nova-agent`
   - **User name:** `openrouter_api_key`
   - **Password:** Your OpenRouter API key
   - Click "OK"

3. **Restart Nova Agent**

---

### Option 3: Via Environment Variable (Fallback)

1. **Create `.env` file:**

   ```powershell
   cd C:\dev\apps\nova-agent\src-tauri
   Copy-Item .env.example .env
   ```

2. **Edit `.env` file:**

   ```env
   OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   ```

3. **Restart Nova Agent**

---

## 🔑 Get an OpenRouter API Key

### Free Tier (Recommended for Testing)

1. **Sign up:** <https://openrouter.ai/>
2. **Get API key:** <https://openrouter.ai/keys>
3. **Free credits:** $0.10 free credits on signup
4. **Free models available:**
   - `xiaomi/mimo-v2-flash:free` ✅ (Supports tools)
   - `meta-llama/llama-3.3-70b-instruct:free` ✅
   - `google/gemini-2.0-flash-exp:free` ✅

### Paid Tier (For Production)

- Add payment method at: <https://openrouter.ai/settings/billing>
- Pay-as-you-go pricing
- No monthly fees

---

## 🧪 Verify It's Working

### 1. Check API Key Status

In Nova Agent Settings page, you should see:

- ✅ **OpenRouter API Key:** Configured

### 2. Test Chat

1. Go to Chat Interface
2. Send: "Hello, what model are you using?"
3. Expected response: Should mention the active model (e.g., "xiaomi/mimo-v2-flash")

### 3. Check Logs

Look for in terminal:

```
INFO  nova_agent::modules::llm] Attempting generation with provider: OpenRouter
INFO  nova_agent::modules::llm] Provider OpenRouter succeeded
```

---

## ❌ Troubleshooting

### Error: "OpenRouter API Key is missing"

**Cause:** No API key configured  
**Fix:** Follow Option 1, 2, or 3 above

### Error: "All providers failed"

**Possible causes:**

1. **Invalid API key** - Verify at <https://openrouter.ai/keys>
2. **No credits** - Check balance at <https://openrouter.ai/activity>
3. **Rate limit** - Wait a few minutes and try again

### Error: "Tool calling not supported"

**Cause:** Using a model that doesn't support tools  
**Fix:** Switch to `xiaomi/mimo-v2-flash:free` in Settings

### Chat sends but no response

**Cause:** Rust backend not running  
**Fix:** Make sure `pnpm tauri dev` completed compilation (wait for "Finished dev" message)

---

## 📝 How Nova Agent Uses API Keys

1. **Priority Order:**
   - Windows Credential Manager (saved via UI)
   - Environment variable (`.env` file)
   - Config (loaded at startup)

2. **Secure Storage:**
   - API keys stored in Windows Credential Manager
   - Encrypted by Windows
   - Only accessible by current user

3. **Model Selection:**
   - Default: `llama-3.3-70b-versatile`
   - Can be changed in Settings
   - Free models available on OpenRouter

---

## 🚀 Quick Start (TL;DR)

```powershell
# 1. Get API key from https://openrouter.ai/keys

# 2. Start Nova Agent
cd C:\dev\apps\nova-agent
pnpm tauri dev

# 3. Go to Settings → Enter API key → Save

# 4. Go to Chat → Send message → Works!
```

---

## ✅ Next Steps After Fixing

Once chat is working:

1. Test different models in Settings
2. Try asking complex questions
3. Test tool calling (file operations, web search)
4. Explore Context Guide and Document Analysis features

