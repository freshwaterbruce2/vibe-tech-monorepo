# OpenRouter Proxy Quick Start 🚀

Your centralized OpenRouter API server is **LIVE** and ready to use!

## ✅ Server Status

**URL:** `http://localhost:3001`
**Status:** Running ✓
**Models Available:** 348
**API Key:** Loaded from system variable ✓

---

## 🧪 Test Results

```
✓ Health Check: OK
✓ Models Endpoint: OK (348 models)
✓ Chat Endpoint: OK (Claude Sonnet 4.5 tested)
✓ Usage Tracking: OK
```

---

## 📚 Quick Integration Guide

### Option 1: Use the Client Library (Recommended)

```typescript
// Install the client
// pnpm add @vibetech/openrouter-client --filter your-app

import { OpenRouterClient } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

// Simple chat
const response = await client.chat({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(response.choices[0].message.content);
```

### Option 2: Direct API Calls

```typescript
// Any HTTP client (fetch, axios, etc.)
const response = await fetch('http://localhost:3001/api/openrouter/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4.5',
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

---

## 🎯 Project-Specific Examples

### 1. **vibe-code-studio** (Code Completion)

```typescript
// apps/vibe-code-studio/src/services/ai/CodeCompletionService.ts
import { OpenRouterClient } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

export async function getCodeCompletion(
  code: string,
  cursorPosition: number
) {
  const response = await client.chat({
    model: 'anthropic/claude-sonnet-4.5',
    messages: [
      {
        role: 'system',
        content: 'You are an expert code completion assistant. Provide only the completion, no explanations.'
      },
      {
        role: 'user',
        content: `Complete this code:\n\n${code}\n\nCursor at position: ${cursorPosition}`
      }
    ],
    temperature: 0.3,
    max_tokens: 200
  });

  return response.choices[0].message.content;
}
```

### 2. **nova-agent** (Multi-Agent Orchestration)

```typescript
// apps/nova-agent/src/services/AgentService.ts
import { OpenRouterClient } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001', {
  timeout: 60000,
  retries: 3
});

export async function callAgent(
  agentType: 'planner' | 'executor' | 'reviewer',
  prompt: string
) {
  const systemPrompts = {
    planner: 'You are a strategic planner. Break down tasks into steps.',
    executor: 'You are an executor. Implement solutions efficiently.',
    reviewer: 'You are a code reviewer. Find issues and suggest improvements.'
  };

  const response = await client.chat({
    model: 'anthropic/claude-sonnet-4.5',
    messages: [
      { role: 'system', content: systemPrompts[agentType] },
      { role: 'user', content: prompt }
    ]
  });

  return response.choices[0].message.content;
}
```

### 3. **vibe-tutor** (Homework Help)

```typescript
// apps/vibe-tutor/hooks/useHomeworkHelp.ts
import { OpenRouterClient } from '@vibetech/openrouter-client';
import { useState } from 'react';

export function useHomeworkHelp() {
  const [loading, setLoading] = useState(false);
  const client = new OpenRouterClient('http://localhost:3001');

  const askQuestion = async (
    subject: string,
    question: string
  ) => {
    setLoading(true);
    try {
      const response = await client.chat({
        model: 'anthropic/claude-sonnet-4.5',
        messages: [
          {
            role: 'system',
            content: `You are a helpful ${subject} tutor. Explain concepts clearly and encourage learning.`
          },
          { role: 'user', content: question }
        ],
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } finally {
      setLoading(false);
    }
  };

  return { askQuestion, loading };
}
```

### 4. **vibe-justice** (Legal Analysis)

```typescript
// apps/vibe-justice/frontend/src/services/LegalAnalysisService.ts
import { OpenRouterClient } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

export async function analyzeLegalDocument(
  documentText: string,
  analysisType: 'summary' | 'risks' | 'recommendations'
) {
  const prompts = {
    summary: 'Summarize the key legal points in this document.',
    risks: 'Identify potential legal risks and liabilities.',
    recommendations: 'Provide actionable legal recommendations.'
  };

  const response = await client.chat({
    model: 'anthropic/claude-opus-4.5', // Use Opus for complex legal work
    messages: [
      {
        role: 'system',
        content: 'You are an expert legal analyst. Be precise and cite relevant laws when possible.'
      },
      {
        role: 'user',
        content: `${prompts[analysisType]}\n\nDocument:\n${documentText}`
      }
    ],
    temperature: 0.2, // Low temp for factual analysis
    max_tokens: 4096
  });

  return response.choices[0].message.content;
}
```

### 5. **vibe-shop** (Product Recommendations)

```typescript
// apps/vibe-shop/src/services/AIRecommendations.ts
import { OpenRouterClient } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

export async function getProductRecommendations(
  userId: string,
  currentProduct: any,
  userHistory: any[]
) {
  const response = await client.chat({
    model: 'anthropic/claude-sonnet-4.5',
    messages: [
      {
        role: 'system',
        content: 'You are a product recommendation expert. Suggest relevant products based on user behavior.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          current_product: currentProduct,
          user_history: userHistory.slice(-10), // Last 10 items
          task: 'Suggest 5 products the user might like. Return JSON array of product IDs.'
        })
      }
    ],
    temperature: 0.8 // Higher temp for variety in recommendations
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### 6. **business-booking-platform** (NLP Search)

```typescript
// apps/business-booking-platform/src/services/NaturalLanguageSearch.ts
import { OpenRouterClient } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

export async function parseSearchQuery(query: string) {
  const response = await client.chat({
    model: 'anthropic/claude-sonnet-4.5',
    messages: [
      {
        role: 'system',
        content: `Extract hotel search criteria from natural language queries.
        Return JSON with: location, check_in, check_out, guests, room_type, price_range, amenities.`
      },
      {
        role: 'user',
        content: query
      }
    ],
    temperature: 0.1 // Very low for structured extraction
  });

  return JSON.parse(response.choices[0].message.content);
}

// Example usage:
// "2 nights in Paris next week with pool"
// → { location: "Paris", nights: 2, amenities: ["pool"], ... }
```

---

## 🌊 Streaming Support (2026)

For real-time token delivery (better UX for long responses):

```typescript
const response = await client.chat({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true // Enable streaming
});

// Handle streaming events
const eventSource = new EventSource(
  'http://localhost:3001/api/openrouter/chat',
  { /* POST config */ }
);

eventSource.onmessage = (event) => {
  if (event.data === '[DONE]') {
    eventSource.close();
    return;
  }

  const chunk = JSON.parse(event.data);
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    console.log(content); // Process token by token
  }
};
```

---

## 💰 Model Selection Guide (2026)

| Use Case | Recommended Model | Cost per 1M tokens |
|----------|-------------------|-------------------|
| **Code Completion** | `anthropic/claude-sonnet-4.5` | $0.003 (input) |
| **Legal Analysis** | `anthropic/claude-opus-4.5` | $0.015 (input) |
| **Chat/Support** | `anthropic/claude-sonnet-4.5` | $0.003 (input) |
| **Product Descriptions** | `google/gemini-3-pro-preview` | $0.00125 (input) |
| **Budget Option** | `deepseek/deepseek-v3.2` | $0.00027 (input) |

---

## 📊 Monitoring & Usage

### Check Usage Stats

```bash
# Last 24 hours
curl http://localhost:3001/api/openrouter/usage?period=24

# Last 7 days
curl http://localhost:3001/api/openrouter/usage?period=168
```

### View Available Models

```bash
curl http://localhost:3001/api/openrouter/models
```

### Health Check

```bash
curl http://localhost:3001/health
```

---

## 🛠️ Testing

Run the automated test suite:

```bash
cd backend/openrouter-proxy
pwsh test-api.ps1
```

**Expected output:**

```
✓ Health Check: OK
✓ Models Endpoint: OK (348 models)
✓ Chat Endpoint: OK
✓ Usage Endpoint: OK
```

---

## 🔒 Security Notes

- ✅ API key stored in system environment variable (secure)
- ✅ Not exposed to frontend applications
- ✅ Rate limiting: 60 requests/minute
- ✅ Request logging for debugging
- ✅ Usage tracking in `D:\databases\openrouter-usage.json`

---

## 📝 Common Commands

```bash
# Start server
cd backend/openrouter-proxy
pnpm run dev

# Run tests
pwsh test-api.ps1

# Check logs
cat D:\logs\openrouter-proxy\app.log

# View usage data
cat D:\databases\openrouter-usage.json
```

---

## 🚨 Troubleshooting

### Issue: "Connection refused"

```bash
# Check if server is running
netstat -ano | findstr :3001

# Restart server
cd backend/openrouter-proxy
pnpm run dev
```

### Issue: "OPENROUTER_API_KEY not configured"

```bash
# Verify system variable
echo $env:OPENROUTER_API_KEY

# Or add to .env file
echo "OPENROUTER_API_KEY=sk-or-v1-xxx" > .env
```

### Issue: Rate limit errors (429)

- Wait 60 seconds
- Check your OpenRouter account balance
- Reduce request frequency

---

## 📚 Next Steps

1. ✅ Server is running
2. ✅ API key is configured
3. ✅ All endpoints tested

**Choose a project to integrate:**

- [ ] vibe-code-studio - Code completion
- [ ] nova-agent - Multi-agent orchestration
- [ ] vibe-tutor - Homework help
- [ ] vibe-justice - Legal analysis
- [ ] vibe-shop - Product recommendations
- [ ] business-booking - NLP search

Copy the integration code above into your project and start using AI!

---

**Server running at:** `http://localhost:3001`
**Status:** ✅ Production Ready
**Last Updated:** January 8, 2026
