# OpenRouter Model Configuration

**Verified: January 4, 2026**

## Environment Variables

```bash
# Required
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"

# Optional (for tracking)
HTTP_REFERER="https://nova-agent.local"  # Your app URL
X_TITLE="Nova Agent"                      # Your app name
```

## API Request Format

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://nova-agent.local',  // Optional
    'X-Title': 'Nova Agent'                       // Optional
  },
  body: JSON.stringify({
    model: 'xiaomi/mimo-v2-flash:free',  // Model ID here
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ],
    temperature: 0.7,
    max_tokens: 4096
  })
});
```

## Free Model Strategy (Recommended Cascade)

### Tier 1: FREE Agentic Models (Try First)

```
1. xiaomi/mimo-v2-flash:free          - Best overall, #1 on SWE-bench
2. mistralai/devstral-2512:free       - Agentic coding specialist
3. kwaipilot/kat-coder-pro:free       - Strong coding (73.4% SWE-bench)
```

### Tier 2: FREE Reasoning Models (Fallback)

```
4. tngtech/deepseek-r1t2-chimera:free - Fast reasoning
5. deepseek/deepseek-r1-0528:free     - Full reasoning (rivals o1)
6. nex-agi/deepseek-v3.1-nex-n1:free  - Tool use focus
```

### Tier 3: FREE General Purpose (Final Fallback)

```
7. openai/gpt-oss-120b:free           - OpenAI open-weight
8. meta-llama/llama-3.3-70b-instruct:free - Meta's latest
9. google/gemma-3-27b-it:free         - Multimodal
```

## Paid Model Strategy (If Budget Available)

### For Critical Tasks

```
1. anthropic/claude-sonnet-4.5        - Best coding/reasoning ($3/$15 per 1M)
2. openai/gpt-5                       - Latest GPT ($5/$15 per 1M)
3. deepseek/deepseek-v3.2-speciale    - Best value ($0.27/$0.41 per 1M)
```

### For Cost-Conscious

```
1. anthropic/claude-haiku-4.5         - Fast + cheap ($0.25/$1.25 per 1M)
2. google/gemini-2.5-flash            - Very cheap ($0.075/$0.30 per 1M)
3. deepseek/deepseek-v3.2             - Ultra cheap ($0.25/$0.38 per 1M)
```

## Smart Routing

### Auto Router (Let OpenRouter Choose)

```rust
model: "openrouter/auto"  // Automatically picks best available model
```

### Speed Priority

```rust
model: "openrouter/auto:nitro"  // Fastest throughput
```

### Cost Priority

```rust
model: "openrouter/auto:floor"  // Cheapest option
```

## Model Capabilities

| Model | Tool Calling | Context | Speed | Cost |
|-------|-------------|---------|-------|------|
| xiaomi/mimo-v2-flash:free | ✅ | 256K | Fast | FREE |
| mistralai/devstral-2512:free | ✅ | 256K | Fast | FREE |
| deepseek/deepseek-r1-0528:free | ❌ | 164K | Medium | FREE |
| claude-sonnet-4.5 | ✅ | 200K | Fast | $$$ |
| gpt-5 | ✅ | 128K | Fast | $$$ |
| deepseek/deepseek-v3.2 | ✅ | 131K | Fast | $ |

**Note**: ✅ = Full function/tool calling support (required for nova-agent)

## Implementation Tips

1. **Always use `:free` suffix** for free models
2. **Tool calling is essential** for nova-agent - prioritize models with ✅
3. **Start with free tier** - upgrade only if hitting rate limits
4. **MiMo-V2-Flash** - Turn OFF reasoning mode for best coding performance
5. **Context windows** - Most support 128K+ tokens (plenty for codebase analysis)

## Rate Limits (Free Models)

- **Requests**: Typically 10-20 RPM per model
- **Tokens**: Usually capped at 50K-100K per day
- **Solution**: Cascade through multiple free models to distribute load

## Next Steps

1. Get API key: <https://openrouter.ai/keys>
2. Add $5-10 credit for paid model access (optional)
3. Update `.env` file with `OPENROUTER_API_KEY`
4. Test with free models first
5. Monitor usage at: <https://openrouter.ai/activity>
