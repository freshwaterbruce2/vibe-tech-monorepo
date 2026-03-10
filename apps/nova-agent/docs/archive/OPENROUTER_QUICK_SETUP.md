# OpenRouter Quick Setup Guide

**Date:** January 4, 2026  
**Project:** nova-agent  
**Time to complete:** 5 minutes

---

## ✅ Step-by-Step Setup

### Step 1: Get Your OpenRouter API Key (2 minutes)

1. Visit: **<https://openrouter.ai/keys>**
2. Sign up or log in
3. Click "Create Key"
4. Copy your key (starts with `sk-or-v1-...`)

**Cost:** FREE - No credit card required for free models!

---

### Step 2: Configure Environment (1 minute)

Navigate to the project directory:

```powershell
cd C:\dev\apps\nova-agent\src-tauri
```

Copy the example configuration:

```powershell
Copy-Item .env.example .env
```

Edit `.env` file and add your API key:

```bash
# Find this line:
OPENROUTER_API_KEY=sk-or-v1-YOUR-KEY-HERE

# Replace with your actual key:
OPENROUTER_API_KEY=sk-or-v1-abc123...
```

**Save the file!**

---

### Step 3: Test API Connection (1 minute)

Run the test script:

```powershell
.\test-openrouter-api.ps1
```

Expected output:

```
========================================
OpenRouter API Connectivity Test
========================================

[✓] Loading .env file...
[✓] API Key found: sk-or-v1-abc12...

Testing models...

Testing: MiMo-V2-Flash (FREE)
  [✓] Response: OK
  [✓] Model: xiaomi/mimo-v2-flash:free
  [✓] Cost: FREE (zero tokens charged)

Testing: Devstral 2 (FREE)
  [✓] Response: OK
  [✓] Model: mistralai/devstral-2512:free
  [✓] Cost: FREE (zero tokens charged)

========================================
Test Summary
========================================
Successful: 2
Failed: 0

[✓] OpenRouter API is working!
```

---

### Step 4: Start nova-agent (1 minute)

```powershell
cd C:\dev\apps\nova-agent
pnpm tauri dev
```

The app will now use **FREE OpenRouter models** automatically!

---

## 🎯 What Just Happened?

### Provider Cascade (Automatic Fallback)

nova-agent will try providers in this order:

1. **xiaomi/mimo-v2-flash:free** - Best FREE model (#1 on SWE-bench)
2. **mistralai/devstral-2512:free** - FREE agentic coding specialist
3. **kwaipilot/kat-coder-pro:free** - FREE coding expert (73.4% SWE-bench)
4. **nex-agi/deepseek-v3.1-nex-n1:free** - FREE tool use specialist
5. **meta-llama/llama-3.3-70b-instruct:free** - FREE multilingual model

If all free models fail (rare), it falls back to:

1. **anthropic/claude-sonnet-4.5** - PAID ($3/$15 per 1M tokens)
2. **deepseek/deepseek-v3.2-speciale** - PAID ($0.27/$0.41 per 1M)
3. Direct APIs (DeepSeek, Google, Groq) if configured

**Result:** Zero cost for 99% of usage! 🎉

---

## 💰 Cost Tracking

### Monitor Usage

Visit: **<https://openrouter.ai/activity>**

You'll see:

- Requests per model
- Tokens used
- Cost breakdown
- Rate limit status

### Free Model Limits

- **Requests:** ~10-20 per minute per model
- **Daily Tokens:** ~50K-100K per model
- **Strategy:** App cascades through 5 free models = 250K-500K tokens/day!

---

## 🔧 Optional: Add Premium Models

If you want access to the **best** models:

### Add Credit to OpenRouter

1. Visit: <https://openrouter.ai/credits>
2. Add $5-10 credit (lasts months!)
3. Premium models automatically available as fallback

### Best Premium Models

- **claude-sonnet-4.5** - Best overall ($3/$15 per 1M)
- **gpt-5** - Latest GPT ($5/$15 per 1M)
- **deepseek-v3.2-speciale** - Best value ($0.27/$0.41 per 1M)

---

## 📊 Verify It's Working

### In nova-agent UI

1. Start a conversation
2. Ask: "What model are you using?"
3. Should respond: "xiaomi/mimo-v2-flash" or similar

### Check Logs

Look for:

```
INFO  nova_agent::modules::llm] Attempting generation with provider: OpenRouter-MiMo-Flash (xiaomi/mimo-v2-flash:free)
INFO  nova_agent::modules::llm] Provider OpenRouter-MiMo-Flash succeeded
```

---

## ❌ Troubleshooting

### Error: "No API key"

**Fix:**

```powershell
# Check .env file exists
Test-Path C:\dev\apps\nova-agent\src-tauri\.env

# Verify API key is set
Get-Content C:\dev\apps\nova-agent\src-tauri\.env | Select-String "OPENROUTER_API_KEY"
```

### Error: "All providers failed"

**Possible causes:**

1. **Invalid API key**
   - Verify at: <https://openrouter.ai/keys>
   - Make sure you copied the full key

2. **Rate limit exceeded**
   - Check: <https://openrouter.ai/activity>
   - Solution: Wait 1 minute or cascade will try next model

3. **No internet connection**
   - Verify: `ping openrouter.ai`

### Error: "Tool calling not supported"

**Solution:** Use models with tool calling:

- ✅ xiaomi/mimo-v2-flash:free
- ✅ mistralai/devstral-2512:free
- ✅ kwaipilot/kat-coder-pro:free
- ❌ tngtech/deepseek-r1t2-chimera:free (no tools)

---

## 📚 Additional Resources

- **Model Configuration:** `OPENROUTER_MODEL_CONFIG.md`
- **Rust Implementation:** `OPENROUTER_MODELS.md`
- **Complete Setup:** `OPENROUTER_SETUP_COMPLETE.md`

---

## 🎉 You're Done

✅ **FREE models configured**  
✅ **API key working**  
✅ **nova-agent ready to use**  
✅ **Zero cost for production**

**Start coding with AI assistance now!** 🚀

---

## 🆘 Need Help?

- **OpenRouter Docs:** <https://openrouter.ai/docs>
- **Support:** <https://openrouter.ai/support>
- **Discord:** <https://discord.gg/openrouter>
- **Model List:** <https://openrouter.ai/models>

**Remember:** Start with FREE models, upgrade only if needed! 💚
