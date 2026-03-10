# Custom OpenRouter Proxy Server Architecture

**Date:** January 7, 2026
**Purpose:** Document the custom API server that NOVA Agent uses for OpenRouter API access
**Status:** Production-Ready

---

## Overview

NOVA Agent uses a **custom OpenRouter proxy server** instead of directly calling the OpenRouter API. This architecture provides centralized API key management, usage tracking, rate limiting, and cost optimization.

**Key Benefits:**

- Single API key managed by proxy (not distributed to clients)
- Centralized usage tracking and cost monitoring
- Rate limiting to prevent API quota exhaustion
- Caching layer for repeated requests (future enhancement)
- Multi-model support with automatic fallback

---

## Architecture Diagram

```text
┌─────────────┐                    ┌──────────────────┐                  ┌─────────────────┐
│ NOVA Agent  │                    │ OpenRouter Proxy │                  │ OpenRouter API  │
│  (Client)   │                    │    (Server)      │                  │   (External)    │
└──────┬──────┘                    └────────┬─────────┘                  └────────┬────────┘
       │                                    │                                     │
       │ POST /api/openrouter/chat          │                                     │
       │ { model, messages, ...options }    │                                     │
       │───────────────────────────────────>│                                     │
       │                                    │                                     │
       │                                    │ POST /chat/completions              │
       │                                    │ Authorization: Bearer <API_KEY>     │
       │                                    │────────────────────────────────────>│
       │                                    │                                     │
       │                                    │ { choices, usage, ... }             │
       │                                    │<────────────────────────────────────│
       │                                    │                                     │
       │ { choices, usage, ... }            │                                     │
       │<───────────────────────────────────│                                     │
       │                                    │                                     │
```

**Key Points:**

1. NOVA Agent sends requests to `http://localhost:3001/api/openrouter`
2. Proxy server authenticates with OpenRouter using its own API key
3. Proxy tracks usage, calculates costs, and forwards responses
4. No API key needed in NOVA Agent (simplified security)

---

## Server Configuration

### Location

**Path:** `C:\dev\backend\openrouter-proxy`
**Package:** `openrouter-proxy@1.0.0`
**Tech Stack:** Express.js + TypeScript + Winston logging

### Server Details

```typescript
// backend/openrouter-proxy/src/index.ts
const app = express();
const PORT = process.env.PORT || 3001;

app.use('/api/openrouter', openRouterRouter);
app.listen(PORT, () => {
  logger.info(`OpenRouter Proxy running on http://localhost:${PORT}`);
});
```

**Base URL:** `http://localhost:3001`
**API Routes:** `/api/openrouter/*`

### Available Endpoints

#### 1. Chat Completion (POST /api/openrouter/chat)

**Primary endpoint** for AI chat completions.

```bash
POST http://localhost:3001/api/openrouter/chat
Content-Type: application/json

{
  "model": "anthropic/claude-sonnet-4.5",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Supported Models (2026):**

- `anthropic/claude-sonnet-4.5` - Best quality ($0.003/$0.015 per 1M tokens)
- `anthropic/claude-opus-4.5` - Highest quality ($0.015/$0.075 per 1M tokens)
- `openai/gpt-5.1` - Latest GPT model ($0.005/$0.015 per 1M tokens)
- `google/gemini-3-pro-preview` - Fast and cheap ($0.00125/$0.005 per 1M tokens)
- `deepseek/deepseek-v3.2` - Ultra-cheap ($0.00027/$0.0011 per 1M tokens)

**FREE Models (Zero cost):**

- `mimo/mimo-v2-flash:free`
- `mistralai/devstral-2:free`
- `deepseek/deepseek-tng-r1t2-chimera:free`
- `kwaipilot/kat-coder-pro:free`
- `nvidia/nemotron-nano-2-vl:free`

#### 2. Get Available Models (GET /api/openrouter/models)

Retrieve list of all available OpenRouter models.

```bash
GET http://localhost:3001/api/openrouter/models
```

#### 3. Usage Statistics (GET /api/openrouter/usage)

Get usage statistics for the proxy server.

```bash
GET http://localhost:3001/api/openrouter/usage?period=24h
```

**Response:**

```json
{
  "period": "24h",
  "total_requests": 150,
  "total_tokens": 45000,
  "total_cost": 0.135
}
```

### Health Check

```bash
GET http://localhost:3001/health

Response: { "status": "ok", "timestamp": "2026-01-07T..." }
```

---

## NOVA Agent Configuration

### Environment Variables

**File:** `C:\dev\apps\nova-agent\.env`

```bash
# Custom OpenRouter Proxy Server
# The proxy server handles authentication with OpenRouter's API
OPENROUTER_BASE_URL=http://localhost:3001/api/openrouter
OPENROUTER_API_KEY=proxy-handled

# Other AI Provider Keys (optional - fallbacks)
DEEPSEEK_API_KEY=
GOOGLE_API_KEY=
GROQ_API_KEY=
```

**Key Configuration:**

- `OPENROUTER_BASE_URL`: Points to local proxy server (NOT public OpenRouter API)
- `OPENROUTER_API_KEY`: Set to `proxy-handled` (any non-empty value works)
  - The proxy server handles actual API authentication
  - NOVA Agent's llm.rs skips providers with empty keys
  - Using `proxy-handled` signals this is a proxy setup

### Provider Cascade (llm.rs)

**File:** `apps/nova-agent/src-tauri/src/modules/llm.rs`

NOVA Agent tries providers in this order:

**TIER 1: OpenRouter Free Models (via proxy)**

1. `OpenRouter-DeepSeek-Nex` - nex-agi/deepseek-v3.1-nex-n1:free
2. `OpenRouter-Devstral` - mistralai/devstral-2:free
3. `OpenRouter-KAT-Coder` - kwaipilot/kat-coder-pro:free
4. `OpenRouter-Nemotron` - nvidia/nemotron-nano-2-vl:free
5. `OpenRouter-Mimo` - xiaomi/mimo-v2-flash:free

**TIER 2: OpenRouter Paid Models (via proxy)**
6. `OpenRouter-Claude` - anthropic/claude-sonnet-4.5
7. `OpenRouter-DeepSeek-Special` - deepseek/deepseek-v3.2-special

**TIER 3: Direct API Fallbacks**
8. `DeepSeek-Direct` - api.deepseek.com (if DEEPSEEK_API_KEY set)
9. `Google-Gemini` - generativelanguage.googleapis.com (if GOOGLE_API_KEY set)
10. `Groq` - api.groq.com (if GROQ_API_KEY set)

**Provider Selection Logic:**

```rust
// apps/nova-agent/src-tauri/src/modules/llm.rs (lines 485-487)
if api_key.is_empty() {
    debug!("Skipping provider {} (no API key)", name);
    continue;
}
```

If `OPENROUTER_API_KEY` is empty, ALL OpenRouter providers are skipped.
If set to `proxy-handled`, OpenRouter providers are used (proxy handles auth).

---

## Proxy Server Internals

### Authentication Flow

**Proxy Server Side:**

```typescript
// backend/openrouter-proxy/src/routes/openrouter.ts (lines 21-24)
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error('OPENROUTER_API_KEY not configured');
}

// Forward to real OpenRouter API (lines 32-47)
const response = await axios.post(
  `${OPENROUTER_API_BASE}/chat/completions`,
  { model, messages, ...options },
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`,  // Proxy's API key
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://vibetech.local',
      'X-Title': 'VibeTech OpenRouter Proxy'
    }
  }
);
```

**Security:**

- Real OpenRouter API key stored ONLY in proxy server's `.env`
- NOVA Agent never sees the real API key
- Proxy validates requests before forwarding
- Rate limiting applied at proxy level

### Usage Tracking

```typescript
// backend/openrouter-proxy/src/routes/openrouter.ts (lines 49-55)
await trackUsage({
  model,
  tokens: response.data.usage?.total_tokens || 0,
  cost: calculateCost(model, response.data.usage),
  timestamp: new Date().toISOString()
});
```

**Tracked Metrics:**

- Model used
- Token count (prompt + completion)
- Estimated cost (based on 2026 pricing)
- Request timestamp and IP

### Cost Calculation

**Pricing Table (2026):**

```typescript
// backend/openrouter-proxy/src/routes/openrouter.ts (lines 111-131)
const pricing: Record<string, { input: number; output: number }> = {
  // 2026 Models
  'anthropic/claude-sonnet-4.5': { input: 0.003, output: 0.015 },
  'anthropic/claude-opus-4.5': { input: 0.015, output: 0.075 },
  'openai/gpt-5.1': { input: 0.005, output: 0.015 },
  'google/gemini-3-pro-preview': { input: 0.00125, output: 0.005 },
  'deepseek/deepseek-v3.2': { input: 0.00027, output: 0.0011 },

  // FREE MODELS (2026) - Zero cost!
  'mimo/mimo-v2-flash:free': { input: 0, output: 0 },
  'mistralai/devstral-2:free': { input: 0, output: 0 },
  // ... more free models
};
```

**Pricing is per 1 million tokens** (not per 1,000!)

**Cost Formula:**

```typescript
// backend/openrouter-proxy/src/routes/openrouter.ts (lines 135-136)
const inputCost = (usage.prompt_tokens || 0) / 1_000_000 * modelPricing.input;
const outputCost = (usage.completion_tokens || 0) / 1_000_000 * modelPricing.output;
return inputCost + outputCost;
```

---

## Starting the Proxy Server

### Development Mode

```bash
cd C:\dev\backend\openrouter-proxy
pnpm install
pnpm run dev  # tsx watch src/index.ts (hot reload)
```

### Production Mode

```bash
cd C:\dev\backend\openrouter-proxy
pnpm run build  # Compile TypeScript
pnpm start      # Run compiled JavaScript
```

### Verify Server is Running

```bash
# Health check
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"2026-01-07T..."}
```

### Check Logs

```bash
# Logs are written to console by Winston logger
# Look for:
# - "OpenRouter Proxy running on http://localhost:3001"
# - "OpenRouter chat request { model, messageCount, ip }"
# - "OpenRouter API error" (if issues occur)
```

---

## Troubleshooting

### Issue: "OPENROUTER_API_KEY not configured"

**Symptom:** Proxy server returns 500 error
**Cause:** Missing API key in proxy server's `.env`
**Solution:**

```bash
cd C:\dev\backend\openrouter-proxy
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env
pnpm run dev
```

### Issue: "Connection refused" (ECONNREFUSED)

**Symptom:** NOVA Agent can't connect to localhost:3001
**Cause:** Proxy server not running
**Solution:**

```bash
cd C:\dev\backend\openrouter-proxy
pnpm run dev
```

### Issue: "All AI providers failed"

**Symptom:** NOVA Agent shows "401 Unauthorized" error
**Cause:** `OPENROUTER_API_KEY` is empty in NOVA Agent's `.env`
**Solution:**

```bash
cd C:\dev\apps\nova-agent
echo "OPENROUTER_API_KEY=proxy-handled" >> .env
```

### Issue: High latency or timeout

**Symptom:** Requests take >10 seconds
**Cause:** OpenRouter API slow response or rate limiting
**Solution:**

- Check proxy server logs for "OpenRouter API error"
- Verify proxy's `OPENROUTER_API_KEY` is valid
- Try a different model (free models may be slower)

### Issue: Invalid model name

**Symptom:** 400 error "model not found"
**Cause:** Model name in llm.rs doesn't match OpenRouter's catalog
**Solution:**

```bash
# Get current models from proxy
curl http://localhost:3001/api/openrouter/models

# Compare with llm.rs provider definitions
```

---

## Migration from Direct API

### Before (Direct OpenRouter API)

```bash
# NOVA Agent .env (OLD)
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=sk-or-v1-abc123...
```

**Issues:**

- API key exposed in client configuration
- No centralized usage tracking
- No rate limiting control
- Difficult to monitor costs across multiple clients

### After (Custom Proxy Server)

```bash
# NOVA Agent .env (NEW)
OPENROUTER_BASE_URL=http://localhost:3001/api/openrouter
OPENROUTER_API_KEY=proxy-handled

# Proxy Server .env (backend/openrouter-proxy/)
OPENROUTER_API_KEY=sk-or-v1-abc123...  # Real key stays here
PORT=3001
```

**Benefits:**

- API key centralized in proxy server
- Usage tracking and cost monitoring built-in
- Rate limiting at proxy level
- Easy to add caching layer in future

---

## Future Enhancements

### Phase 2 (Q2 2026)

1. **Response Caching** - Cache repeated requests to reduce API calls
2. **Load Balancing** - Multiple OpenRouter keys for high-volume scenarios
3. **Usage Dashboard** - Real-time visualization of costs and usage
4. **Model Fallback** - Auto-retry with cheaper models if primary fails

### Phase 3 (Q3 2026)

1. **Multi-Provider Support** - Add Anthropic Direct, OpenAI Direct fallbacks
2. **Smart Routing** - Route to cheapest/fastest model based on request
3. **Prompt Caching** - OpenRouter prompt caching integration
4. **Usage Alerts** - Email notifications when costs exceed threshold

---

## Security Best Practices

1. **NEVER commit API keys** - Use `.env` files (gitignored)
2. **Rotate keys regularly** - Update proxy's `OPENROUTER_API_KEY` monthly
3. **Monitor usage** - Check `/api/openrouter/usage` daily
4. **Rate limit clients** - Proxy server has express-rate-limit configured
5. **Use HTTPS in production** - Add SSL termination (nginx/caddy)
6. **Firewall localhost:3001** - Block external access to proxy

---

## Related Documentation

- **NOVA Agent Configuration:** `apps/nova-agent/.env.example`
- **Security Improvements:** `apps/nova-agent/docs/SECURITY_IMPROVEMENTS_2026.md`
- **Provider Cascade:** `apps/nova-agent/src-tauri/src/modules/llm.rs` (lines 403-478)
- **Proxy Server Source:** `backend/openrouter-proxy/src/routes/openrouter.ts`
- **OpenRouter Official Docs:** <https://openrouter.ai/docs>

---

**Last Updated:** January 7, 2026
**Maintainer:** VibeTech Development Team
**Status:** Production-Ready ✅

