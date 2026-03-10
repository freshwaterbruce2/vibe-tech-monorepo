# OpenRouter - Quick Reference Card

**Updated:** January 4, 2026

---

## 🚀 Quick Commands

```powershell
# Setup
cd C:\dev\apps\nova-agent\src-tauri
Copy-Item .env.example .env
# Edit .env - add API key

# Test
.\test-openrouter-api.ps1

# Run
cd C:\dev\apps\nova-agent
pnpm tauri dev
```

---

## 🔑 Get API Key

**URL:** <https://openrouter.ai/keys>  
**Cost:** FREE (no credit card)  
**Format:** `sk-or-v1-...`

---

## 📋 FREE Models (Zero Cost)

```
xiaomi/mimo-v2-flash:free              #1 SWE-bench, tool calling
mistralai/devstral-2512:free           Agentic coding
kwaipilot/kat-coder-pro:free           73.4% SWE-bench
nex-agi/deepseek-v3.1-nex-n1:free      Tool use
meta-llama/llama-3.3-70b-instruct:free Multilingual
```

---

## 💰 PAID Models (Optional)

```
anthropic/claude-sonnet-4.5            $3/$15 per 1M - Best
deepseek/deepseek-v3.2-speciale        $0.27/$0.41 - Value
anthropic/claude-haiku-4.5             $0.25/$1.25 - Fast
google/gemini-2.5-flash                $0.075/$0.30 - Cheap
```

---

## 🌐 Important URLs

```
Get API Key:    https://openrouter.ai/keys
Monitor Usage:  https://openrouter.ai/activity
View Models:    https://openrouter.ai/models
Add Credit:     https://openrouter.ai/credits
Support:        https://openrouter.ai/support
```

---

## 📊 Rate Limits

**Free Models:**

- 10-20 requests/minute per model
- 50K-100K tokens/day per model
- 5 models = 250K-500K tokens/day!

**Paid Models:**

- 100+ requests/minute
- Based on credit balance

---

## 🔧 Environment Variables

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Optional
HTTP_REFERER=https://nova-agent.local
X_TITLE=Nova Agent
```

---

## ✅ Verification

**Test Script:**

```powershell
.\test-openrouter-api.ps1
```

**Expected:** All 3 models respond "OK"

**In nova-agent:** Ask "What model are you using?"  
**Response:** "xiaomi/mimo-v2-flash:free"

**Logs:** Look for:

```
INFO Provider OpenRouter-MiMo-Flash succeeded
```

---

## ❌ Troubleshooting

**No API key:**
→ Add to .env file

**All providers failed:**
→ Check key: <https://openrouter.ai/keys>
→ Check limits: <https://openrouter.ai/activity>

**Tool calling not supported:**
→ Use xiaomi/mimo-v2-flash:free ✅
→ Avoid deepseek-r1t2-chimera:free ❌

**Rate limit:**
→ Automatic fallback to next model
→ No action needed

---

## 📁 Documentation Files

```
OPENROUTER_QUICK_SETUP.md         5-min setup guide
OPENROUTER_MODEL_CONFIG.md        Complete API docs
OPENROUTER_MODELS.md              Rust examples
OPENROUTER_INTEGRATION_SUMMARY.md What was changed
.env.example                      Config template
test-openrouter-api.ps1          Test script
```

---

## 🎯 Model Selection Guide

**For Coding:**
→ xiaomi/mimo-v2-flash:free (best)
→ mistralai/devstral-2512:free

**For Reasoning:**
→ deepseek/deepseek-r1-0528:free
→ nex-agi/deepseek-v3.1-nex-n1:free

**For General:**
→ meta-llama/llama-3.3-70b-instruct:free
→ google/gemma-3-27b-it:free

**For Premium:**
→ anthropic/claude-sonnet-4.5
→ deepseek/deepseek-v3.2-speciale

---

## 💡 Pro Tips

1. **Start with FREE** - Try before you buy
2. **Monitor usage** - Track at openrouter.ai/activity
3. **Use tool calling** - Choose models with ✅
4. **Cascade works** - System tries all models automatically
5. **Add credit** - $5-10 lasts months for premium access

---

## 📞 Need Help?

**Discord:** <https://discord.gg/openrouter>  
**Docs:** <https://openrouter.ai/docs>  
**Support:** <https://openrouter.ai/support>

---

**Status:** ✅ Ready to use  
**Cost:** FREE for 99% of usage  
**Quality:** #1 on SWE-bench

🚀 **Happy Coding!**
