# OpenRouter Proxy

Centralized OpenRouter API proxy for VibeTech apps.

## Features

- **Centralized API Management** - One API key for all apps
- **Rate Limiting** - Prevents abuse (60 req/min)
- **Usage Tracking** - Monitor costs and token usage
- **Error Handling** - Standardized error responses
- **Logging** - Winston logging to D:\logs\
- **Security** - Helmet, CORS, request validation

## Setup

1. Install dependencies:

```bash
pnpm install
```

1. Create `.env` file:

```bash
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

1. Start development server:

```bash
pnpm run dev
```

## API Endpoints

### POST /api/openrouter/chat

Chat completion endpoint

**Request (2026 recommended model):**

```json
{
  "model": "anthropic/claude-sonnet-4.5",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "temperature": 1,
  "max_tokens": 2000
}
```

**Response:**

```json
{
  "id": "gen-xxx",
  "model": "anthropic/claude-sonnet-4.5",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you?"
    }
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18
  }
}
```

### GET /api/openrouter/models

List available models

### GET /api/openrouter/usage

Get usage statistics

## Integration

Use the `@vibetech/openrouter-client` package in your apps:

```typescript
import { OpenRouterClient } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

const response = await client.chat({
  model: 'anthropic/claude-sonnet-4.5',  // 2026 recommended
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### 🌊 Streaming Support (2026 NEW)

Enable real-time token delivery for better UX:

```typescript
const response = await client.chat({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true  // Enable streaming
});
```

### 📊 Supported Projects

| Project | Status | AI Features |
|---------|--------|-------------|
| **vibe-code-studio** | ✅ Ready | Code completion, refactoring, auto-fix |
| **nova-agent** | ✅ Ready | Multi-agent orchestration, automation |
| **vibe-tutor** | ✅ Ready | Homework help, study assistant |
| **vibe-justice** | ✅ Ready | Legal analysis, case research |
| **vibe-shop** | 🚧 Needs integration | Product recommendations, chatbot |
| **business-booking** | 🚧 Needs integration | NLP search, itinerary planning |
| **prompt-engineer** | ✅ Ready | Multi-model testing, optimization |

## Free Models (2026)

Save costs during development with FREE models:

```typescript
// Use the best free model (comparable to Claude Sonnet 4.5!)
const response = await client.chat({
  model: 'mimo/mimo-v2-flash:free',
  messages: [{ role: 'user', content: 'Explain async/await in JavaScript' }]
});

// Or use free coding specialist
const codeHelp = await client.chat({
  model: 'mistralai/devstral-2:free',
  messages: [{ role: 'user', content: 'Write a binary search in TypeScript' }]
});
```

**Available Free Models:**

- `mimo/mimo-v2-flash:free` - #1 on SWE-bench (best free option)
- `mistralai/devstral-2:free` - Agentic coding specialist
- `deepseek/deepseek-tng-r1t2-chimera:free` - Advanced reasoning
- `kwaipilot/kat-coder-pro:free` - High performance (deprecating Jan 12)
- `nvidia/nemotron-nano-2-vl:free` - Multimodal (video/docs)

⚠️ **Free Tier Limitations:**

- Rate limiting during peak times
- Prompts/outputs logged by providers
- Not for production sensitive data
- Perfect for dev/test environments

## Nx Commands

```bash
# Development
pnpm nx dev openrouter-proxy

# Build
pnpm nx build openrouter-proxy

# Test
pnpm nx test openrouter-proxy

# Typecheck
pnpm nx typecheck openrouter-proxy
```
