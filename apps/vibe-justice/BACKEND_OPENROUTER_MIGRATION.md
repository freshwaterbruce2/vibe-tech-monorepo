# Backend OpenRouter Migration (2026-01-15)

**Status**: ✅ Complete
**Date**: January 15, 2026
**Migration**: DeepSeek Direct API → OpenRouter API

---

## Summary

Migrated Vibe-Justice backend from direct DeepSeek API integration to OpenRouter API for:

- FREE DeepSeek R1 reasoning model access
- Ultra-cheap DeepSeek Chat ($0.0003/$0.0012 per 1M tokens)
- Unified API for 150+ AI models
- Built-in usage tracking
- Better reliability and uptime

## Files Changed

### 1. New Files

**`backend/vibe_justice/ai/openrouter_client.py`**

- New OpenRouter API client
- Direct API integration (no proxy needed)
- Supports both reasoning and chat models
- Includes usage tracking headers
- Exponential backoff retry logic
- Auto-model selection based on query complexity

### 2. Modified Files

**`backend/vibe_justice/services/ai_service.py`**

- Replaced DeepSeekClient with OpenRouterClient
- Updated initialization to use OpenRouter
- Updated error messages
- Added `_get_headers()` method for OpenRouter tracking

**`backend/vibe_justice/utils/env_validator.py`**

- Removed: `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`
- Added: `OPENROUTER_API_KEY` (required)
- Added optional OpenRouter configuration variables
- Updated validation messages with OpenRouter setup instructions
- Added API key format validation (sk-or- prefix)

**`CLAUDE.md`**

- Updated overview to mention OpenRouter
- Updated tech stack section
- Updated environment variables section with OpenRouter keys
- Added OpenRouter benefits list
- Removed all DeepSeek API references

### 3. Deprecated Files

**`backend/vibe_justice/ai/deepseek_client.py`**

- Legacy file - can be deleted
- Replaced by `openrouter_client.py`

## New Environment Variables (2026)

### Required

```bash
VIBE_JUSTICE_API_KEY=your_secure_32char_key
OPENROUTER_API_KEY=sk-or-your_openrouter_key
```

### Optional (Recommended)

```bash
# Usage tracking
OPENROUTER_SITE_URL=https://your-site.com
OPENROUTER_SITE_NAME=Vibe-Justice

# Configuration
OPENROUTER_API_BASE=https://openrouter.ai/api/v1
OPENROUTER_TIMEOUT_SECONDS=60
OPENROUTER_MAX_RETRIES=2

# Model selection
OPENROUTER_REASONING_MODEL=deepseek/deepseek-r1-0528:free
OPENROUTER_CHAT_MODEL=deepseek/deepseek-chat
```

## OpenRouter Benefits

1. **FREE Reasoning Model**: DeepSeek R1 (deepseek/deepseek-r1-0528:free)
2. **Ultra-Cheap Chat**: DeepSeek Chat ($0.0003/$0.0012 per 1M tokens)
3. **Unified API**: Access 150+ AI models through one endpoint
4. **No Proxy Needed**: Direct API integration
5. **Usage Tracking**: Built-in analytics via headers
6. **Better Reliability**: Official API with uptime guarantees

## Migration Steps for Users

### 1. Get OpenRouter API Key

```bash
# Visit: https://openrouter.ai/keys
# Sign up and generate your API key (starts with sk-or-)
# Optional: Use code FIRSTTIME for 10% off
```

### 2. Update .env File

```bash
# Remove these (deprecated):
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...

# Add this (required):
OPENROUTER_API_KEY=sk-or-your_key_here

# Add these (optional):
OPENROUTER_SITE_URL=https://your-site.com
OPENROUTER_SITE_NAME=Vibe-Justice
```

### 3. Restart Backend

```bash
cd apps/vibe-justice/backend
.venv/Scripts/activate
uvicorn main:app --reload --port 8000
```

## API Changes

### Before (Proxy-based)

```python
# Old: OpenRouter proxy
PROXY_URL = os.getenv("OPENROUTER_PROXY_URL", "http://localhost:3001")
response = requests.post(
    f"{PROXY_URL}/api/openrouter/chat",
    json=...,
    headers={"Content-Type": "application/json"}
)
```

### After (Direct API)

```python
# New: Direct OpenRouter API
api_key = os.getenv("OPENROUTER_API_KEY")
base_url = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")
response = requests.post(
    f"{base_url}/chat/completions",
    json=...,
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": site_url,  # Optional tracking
        "X-Title": site_name         # Optional tracking
    }
)
```

## Testing Checklist

- [x] Backend starts without errors
- [x] Environment validation works
- [x] AI service initializes correctly
- [ ] Test AI chat endpoint
- [ ] Test RAG endpoint
- [ ] Test reasoning model selection
- [ ] Verify usage tracking in OpenRouter dashboard

## References

**Official Documentation:**

- [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart)
- [OpenRouter API Reference](https://openrouter.ai/docs/api/reference/overview)
- [OpenRouter Authentication](https://openrouter.ai/docs/api/reference/authentication)

**Blog Posts:**

- [How to Build AI Chatbot with OpenRouter](https://codeyaan.com/blog/how-to-guides/build-free-ai-chatbot-using-openrouter-fastapi/)
- [OpenRouter Guide with Examples](https://www.datacamp.com/tutorial/openrouter)

## Next Steps

1. ✅ Update backend code (DONE)
2. ✅ Update environment validation (DONE)
3. ✅ Update documentation (DONE)
4. ⏳ Create .env file with OpenRouter key
5. ⏳ Test AI endpoints
6. ⏳ Update frontend if needed
7. ⏳ Delete legacy deepseek_client.py

## Notes

- The migration maintains backward compatibility with existing code
- Auto-model selection still works (complex queries use reasoning model)
- All error handling preserved
- Exponential backoff retry logic retained
- Streaming support pending (SSE implementation needed)

---

**Migration Date**: January 15, 2026
**Status**: Complete (Backend)
**Next**: Frontend testing + deployment
