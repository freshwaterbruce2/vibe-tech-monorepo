# OpenRouter Integration Setup

Centralized OpenRouter API for all VibeTech apps.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│ nova-agent  │────▶│             │────▶│  OpenRouter  │
├─────────────┤     │  Proxy API  │     │     API      │
│vibe-justice │────▶│             │     └──────────────┘
├─────────────┤     │ Port: 3001  │
│vibe-code-   │────▶│             │
│  studio     │     └─────────────┘
├─────────────┤
│ vibe-tutor  │────▶
└─────────────┘
```

## Prerequisites (2026)

**Recommended Environment:**

- **Node.js 24.x (Krypton LTS)** - Latest LTS version with native TypeScript support
- **Alternative:** Node.js 22.x (Jod) - Maintenance LTS, supported through April 2027
- **pnpm 9.15.0+** - Required package manager
- **TypeScript 5.9.3+** - Latest stable version

**Verify your installation:**

```powershell
node --version    # Should show v24.x.x or v22.x.x
pnpm --version    # Should show 9.15.0 or higher
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Install backend service dependencies
cd backend/openrouter-proxy
pnpm install

# Install client library dependencies
cd ../../packages/openrouter-client
pnpm install

# Return to root
cd ../..
```

### 2. Configure OpenRouter API Key

```bash
# Copy environment template
cd backend/openrouter-proxy
cp .env.example .env

# Edit .env and add your OpenRouter API key
# OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
```

**Get API Key:** <https://openrouter.ai/keys>

### 3. Start the Proxy Service

```bash
# From workspace root
pnpm nx dev openrouter-proxy

# Or from backend directory
cd backend/openrouter-proxy
pnpm run dev
```

The service will run on **<http://localhost:3001>**

### 4. Test the Integration

```bash
# Check health
curl http://localhost:3001/health

# Test chat endpoint (2026 recommended model)
curl -X POST http://localhost:3001/api/openrouter/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-sonnet-4.5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 5. Use in Your Apps

All apps now have the OpenRouter client integrated:

**nova-agent:**

```typescript
import { openRouterService } from './services/openrouter';

const response = await openRouterService.chat('Help me debug this code');
```

**vibe-justice:**

```typescript
import { useOpenRouter } from './hooks/useOpenRouter';

function MyComponent() {
  const { sendMessage, loading } = useOpenRouter();
  const handleSubmit = async () => {
    const response = await sendMessage('Analyze this case');
  };
}
```

**vibe-code-studio:**

```typescript
import { openRouterService } from './services/openrouter';

const suggestion = await openRouterService.getCodeSuggestion(code);
```

**vibe-tutor:**

```typescript
import { useOpenRouter } from './hooks/useOpenRouter';

const { messages, sendMessage } = useOpenRouter();
await sendMessage('Explain quadratic equations');
```

### 🆓 Using Free Models in Your Apps

Save costs during development by using free models:

```typescript
// In any app using the client
import { openRouterService } from './services/openrouter';

// Use best free model (comparable to Claude Sonnet 4.5!)
const response = await openRouterService.chat(
  'Help me debug this code',
  { model: 'mimo/mimo-v2-flash:free' }
);

// Or use free coding specialist
const codeResponse = await openRouterService.chat(
  'Write a React component for...',
  { model: 'mistralai/devstral-2:free' }
);
```

## Benefits

✅ **Single API Key** - One OpenRouter key for all apps
✅ **Cost Tracking** - Monitor usage across all apps
✅ **Rate Limiting** - Prevents abuse (60 req/min)
✅ **Centralized Logging** - All requests logged to D:\logs\
✅ **Easy Model Switching** - Change models in one place
✅ **Type Safety** - Full TypeScript support
✅ **Error Handling** - Automatic retries with exponential backoff

## Available Models (2026)

The proxy supports all OpenRouter models. **Recommended models for 2026:**

### Claude Models (Recommended for Coding)

- `anthropic/claude-sonnet-4.5` ⭐ **RECOMMENDED** - Optimized for coding workflows and agents
- `anthropic/claude-opus-4.5` - Frontier reasoning model with verbosity control

### GPT Models

- `openai/gpt-5.1` - Latest GPT release
- `openai/gpt-5.2` - Cutting-edge GPT

### Google Models

- `google/gemini-3-pro-preview` - Latest Gemini Pro

### Other High-Performance Models

- `deepseek/deepseek-v3.2` - Advanced reasoning
- OpenRouter Auto Router - Automatically selects best model for your prompt

### 🆓 Free Models (Zero Cost!)

Perfect for development, testing, and cost-conscious applications:

- `mimo/mimo-v2-flash:free` ⭐ **Best Free Model** - #1 open-source on SWE-bench, comparable to Claude Sonnet 4.5
- `mistralai/devstral-2:free` - State-of-the-art agentic coding from Mistral AI
- `deepseek/deepseek-tng-r1t2-chimera:free` - 671B parameter reasoning model
- `kwaipilot/kat-coder-pro:free` - 73.4% solve rate on SWE-Bench (deprecating Jan 12, 2026)
- `nvidia/nemotron-nano-2-vl:free` - 12B multimodal model for video/document understanding

**Free Tier Notes:**

- ⚠️ Rate limiting during peak times
- ⚠️ Prompts/outputs logged by providers for model improvement
- ⚠️ Do NOT use for sensitive/personal data
- ✅ Perfect for development and testing
- ✅ Failed requests count toward daily quota

**Pro Tip:** Use `openrouter/auto` to let OpenRouter automatically select the best model for each request.

See full list: `GET http://localhost:3001/api/openrouter/models` or visit <https://openrouter.ai/models?q=free>

## Monitoring

### View Logs

```powershell
# Real-time logs (Windows PowerShell)
Get-Content D:\logs\openrouter-proxy\combined.log -Wait -Tail 50

# Error logs only
Get-Content D:\logs\openrouter-proxy\error.log -Wait -Tail 50

# Alternative: Open in default text editor
notepad D:\logs\openrouter-proxy\combined.log
```

### Check Usage

```bash
# Last 24 hours
curl http://localhost:3001/api/openrouter/usage?period=24h

# Last 7 days
curl http://localhost:3001/api/openrouter/usage?period=7d
```

### Usage Data

All usage tracked in: `D:\databases\openrouter-usage.json`

## Troubleshooting

**Proxy won't start:**

- Check if port 3001 is available
- Verify .env file has OPENROUTER_API_KEY
- Run `pnpm install` in backend/openrouter-proxy

**Apps can't connect:**

- Ensure proxy is running on <http://localhost:3001>
- Check CORS settings in backend/openrouter-proxy/src/index.ts
- Verify no firewall blocking port 3001

**Rate limit errors:**

- Adjust RATE_LIMIT_MAX_REQUESTS in .env
- Default is 60 requests per minute

**High costs:**

- Monitor usage: `GET /api/openrouter/usage`
- Review D:\databases\openrouter-usage.json
- Consider switching to cheaper models

## Production Deployment

For production:

1. Set `NODE_ENV=production` in .env
2. Use environment variable for OPENROUTER_API_KEY (don't commit .env)
3. Deploy proxy to a server
4. Update app configs to use production URL
5. Enable HTTPS
6. Add authentication if exposing publicly

## Nx Commands

```bash
# Development
pnpm nx dev openrouter-proxy

# Build
pnpm nx build openrouter-proxy
pnpm nx build openrouter-client

# Test
pnpm nx test openrouter-proxy
pnpm nx test openrouter-client

# Typecheck
pnpm nx typecheck openrouter-proxy
pnpm nx typecheck openrouter-client

# Quality check (lint + typecheck + build)
pnpm nx run-many -t quality --projects=openrouter-proxy,openrouter-client
```

## Next Steps

1. Get your OpenRouter API key from <https://openrouter.ai/keys>
2. Add it to backend/openrouter-proxy/.env
3. Start the proxy: `pnpm nx dev openrouter-proxy`
4. Test from any app!

## Support

- OpenRouter Docs: <https://openrouter.ai/docs>
- API Status: <https://status.openrouter.ai>
- Pricing: <https://openrouter.ai/docs/pricing>
