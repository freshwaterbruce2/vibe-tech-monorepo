# Nova Agent - OpenRouter Setup Guide

**Last Updated:** 2026-01-26
**Status:** Configuration Complete

---

## ✅ Configuration Complete

The Nova Agent `.env` file has been updated to use OpenRouter for DeepSeek R1 access.

**Changes Made:**
- ✅ `DEEPSEEK_BASE_URL` → `https://openrouter.ai/api/v1`
- ✅ `DEEPSEEK_MODEL` → `deepseek/deepseek-r1`
- ✅ `ENABLE_THINKING_MODE` → `true`

---

## Step 1: Add Your OpenRouter API Key

Edit the file: `apps/nova-agent/src-tauri/.env`

Replace this line:
```env
DEEPSEEK_API_KEY=your_openrouter_key_here
```

With your actual OpenRouter key:
```env
DEEPSEEK_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx
```

**Where to find your key:**
1. Visit https://openrouter.ai/keys
2. Copy your API key (starts with `sk-or-v1-`)
3. Paste it into the `.env` file

---

## Step 2: Restart Nova Agent

Since the Rust backend loads environment variables on startup, you must restart:

```powershell
# In your terminal at C:\dev
pnpm nx dev nova-agent
```

**Expected output:**
```
✓ Built in XXXms
🚀 Nova Agent starting...
✅ Config loaded: DEEPSEEK_BASE_URL=https://openrouter.ai/api/v1
✅ Model: deepseek/deepseek-r1
```

---

## Step 3: Test the Configuration

### Test 1: Basic Chat
1. Open the Nova Agent window
2. Navigate to the **Chat Interface**
3. Ask: *"What is 2+2?"*

**Expected:** You should see a response streamed from DeepSeek via OpenRouter.

### Test 2: Reasoning Mode (The Key Feature)
Ask a complex logic question:

**Example:** *"How many times does the letter 'r' appear in the word 'strawberry'?"*

**Expected:**
1. The UI will show a **"Cognitive Trace"** section (expandable)
2. Click it to see the model's step-by-step reasoning
3. The final answer will appear below the thinking section

**Visual:**
```
┌─────────────────────────────────────┐
│ 🧠 Cognitive Trace :: EXPAND       │
└─────────────────────────────────────┘
  [Collapsed thinking process]

Answer: The letter 'r' appears 3 times...
```

**When expanded:**
```
┌─────────────────────────────────────┐
│ 🧠 Cognitive Trace :: COLLAPSE     │
├─────────────────────────────────────┤
│ Let me count each letter:          │
│ s-t-r-a-w-b-e-r-r-y                │
│ Position 3: r (1st occurrence)     │
│ Position 8: r (2nd occurrence)     │
│ Position 9: r (3rd occurrence)     │
│ Total: 3 occurrences               │
└─────────────────────────────────────┘

Answer: The letter 'r' appears 3 times...
```

---

## How Thinking Mode Works

### Backend (Rust)
**File:** `src-tauri/src/modules/state.rs`

The configuration reads:
- `DEEPSEEK_BASE_URL` → Points to OpenRouter
- `DEEPSEEK_MODEL` → Uses `deepseek/deepseek-r1`
- API requests are sent to OpenRouter with these settings

### Frontend (React)
**File:** `src/components/dashboard/MessageBubble.tsx` (lines 33-86)

The UI automatically:
1. **Parses** `<think>...</think>` tags from the response
2. **Extracts** the reasoning content
3. **Displays** it in a collapsible `<details>` element
4. **Renders** the final answer separately

**No additional configuration needed!**

---

## Model Options

You can switch between two DeepSeek models in your `.env` file:

### Option 1: DeepSeek R1 (Reasoning Model) - Recommended
```env
DEEPSEEK_MODEL=deepseek/deepseek-r1
ENABLE_THINKING_MODE=true
```

**Use for:**
- Complex logic problems
- Math/science questions
- Code debugging analysis
- Strategic planning

**Characteristics:**
- Slower (~30-60 seconds)
- Higher cost (~$2-3 per 1M tokens)
- Outputs `<think>` tags
- Best accuracy

### Option 2: DeepSeek V3 Chat (Fast Model)
```env
DEEPSEEK_MODEL=deepseek/deepseek-chat
ENABLE_THINKING_MODE=false
```

**Use for:**
- General conversation
- Simple code generation
- Quick questions
- High-volume tasks

**Characteristics:**
- Fast (~2-5 seconds)
- Lower cost (~$0.27 per 1M tokens)
- No thinking tags
- Good balance

---

## OpenRouter Benefits vs Direct API

| Feature | OpenRouter | Direct DeepSeek API |
|---------|------------|---------------------|
| **Unified Interface** | ✅ Access all models via one API | ❌ Separate keys per provider |
| **Rate Limits** | ✅ 1000 req/min, 1000 tokens/sec | ❌ 200 req/min (free tier) |
| **Credits System** | ✅ Pay-as-you-go with credits | ❌ Separate billing per provider |
| **Model Switching** | ✅ Change models without code changes | ❌ Requires API endpoint changes |
| **Dashboard** | ✅ Usage analytics & cost tracking | ❌ Limited visibility |

**Cost Example:**
- DeepSeek R1 via OpenRouter: $2.19 per 1M input tokens
- DeepSeek R1 Direct: $2.19 per 1M input tokens (same price)

**Recommendation:** Use OpenRouter for flexibility and unified billing.

---

## Troubleshooting

### Issue 1: "API Key Invalid" Error

**Symptoms:**
- Chat fails immediately
- Error: "Invalid authentication"

**Solutions:**
1. Verify your API key starts with `sk-or-v1-`
2. Check for trailing spaces in `.env`
3. Confirm you added credits to your OpenRouter account
4. Restart Nova Agent after changing `.env`

**Check credits:**
```powershell
# Visit OpenRouter dashboard
Start-Process "https://openrouter.ai/activity"
```

---

### Issue 2: No Thinking Section Appears

**Symptoms:**
- Response appears normal
- No "Cognitive Trace" collapsible

**Possible causes:**
1. **Wrong model selected**
   - Check: `DEEPSEEK_MODEL=deepseek/deepseek-r1` (not `deepseek-chat`)
   - Solution: Update `.env` and restart

2. **Thinking mode disabled**
   - Check: `ENABLE_THINKING_MODE=true`
   - Solution: Set to `true` in `.env`

3. **Model didn't output thinking**
   - Some simple questions don't trigger reasoning
   - Solution: Try a harder question (see Test 2 above)

---

### Issue 3: Slow Responses

**Symptoms:**
- Takes 30-60 seconds to respond
- Long delay before seeing output

**This is normal for R1!**

DeepSeek R1 is a reasoning model that:
- Takes time to "think" before answering
- Outputs thinking process first (`<think>` tags)
- Then outputs final answer

**Mitigation:**
- Use `deepseek/deepseek-chat` for faster responses
- R1 is best for complex tasks that justify the wait
- Consider implementing streaming UI indicators

---

### Issue 4: Rate Limit Errors

**Symptoms:**
- Error: "Rate limit exceeded"
- Requests fail after many attempts

**Solutions:**
1. **Check OpenRouter limits:**
   - Free tier: 200 req/min, 200 tokens/sec
   - Pay-as-you-go: 1000 req/min, 1000 tokens/sec

2. **Add credits to your account:**
   - Visit https://openrouter.ai/credits
   - Add at least $5 to unlock higher limits

3. **Implement retry logic** (if not already present)

---

## Environment Variable Reference

Complete `.env` configuration:

```env
# Database
DATABASE_PATH=D:\\databases

# DeepSeek via OpenRouter
DEEPSEEK_BASE_URL=https://openrouter.ai/api/v1
DEEPSEEK_API_KEY=sk-or-v1-YOUR_KEY_HERE
DEEPSEEK_MODEL=deepseek/deepseek-r1

# Capabilities
ENABLE_THINKING_MODE=true
MAX_CONTEXT_LENGTH=128000
NOVA_ENABLE_CODE_EXEC=true

# Groq (alternative model provider)
GROQ_API_KEY=gsk_YOUR_GROQ_KEY_HERE
GROQ_BASE_URL=https://api.groq.com/openai/v1

# OpenRouter Proxy (not used when DEEPSEEK_BASE_URL points to OpenRouter)
OPENROUTER_BASE_URL=http://localhost:3001/api/openrouter
OPENROUTER_API_KEY=proxy-handled
```

---

## Advanced Configuration

### Custom System Prompt

To customize the system prompt for the R1 model:

**File:** `src-tauri/src/handlers/ai_handler.rs` (or equivalent)

Add to your API request:
```rust
let system_message = json!({
    "role": "system",
    "content": "You are Nova Agent, a helpful AI assistant. When solving complex problems, show your reasoning step by step."
});
```

### Streaming Indicators

The thinking process can take 10-30 seconds. Consider adding a loading indicator:

**File:** `src/components/dashboard/MessageBubble.tsx`

Add a pulsing brain icon while waiting for the first response chunk:
```tsx
{isThinking && (
  <BrainCircuit className="animate-pulse text-green-400" size={16} />
)}
```

---

## Next Steps

1. **✅ Add your OpenRouter API key** (Step 1)
2. **✅ Restart Nova Agent** (Step 2)
3. **✅ Test with a reasoning question** (Step 3)
4. **Explore advanced features:**
   - Multi-turn conversations with memory
   - Code execution integration
   - RAG (Retrieval-Augmented Generation)

---

## Support Resources

**OpenRouter:**
- Dashboard: https://openrouter.ai/
- Docs: https://openrouter.ai/docs
- Models: https://openrouter.ai/models

**DeepSeek R1:**
- Model card: https://openrouter.ai/models/deepseek/deepseek-r1
- Pricing: $2.19 per 1M input tokens, $8.82 per 1M output tokens

**Nova Agent:**
- Main docs: `apps/nova-agent/AI.md`
- Workspace rules: `docs/ai/WORKSPACE.md`

---

**Status:** Ready for use! Just add your API key and restart.
