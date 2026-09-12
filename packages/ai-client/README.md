# @vibetech/ai-client

Universal lightweight TypeScript client for the centralized Vibe AI Gateway.

## Features

- **Drop-in simplicity**: Single class `VibeAIClient` with zero heavy dependencies (uses native `fetch`).
- **Resilient by default**: Gateway automatically routes through `deepseek/deepseek-chat` (cheapest: $0.14/M) with automatic fallback to `google/gemini-3.7-flash` if upstream stalls >10s.
- **Privacy-first**: All completions enforce Zero Data Retention (ZDR) and deny third-party data collection.

## Quick Start

```typescript
import { VibeAIClient } from '@vibetech/ai-client';

const ai = new VibeAIClient({
  apiKey: process.env.VIBE_GATEWAY_API_KEY || 'vibe_sk_invoiceflow_live_123',
  baseURL: process.env.VIBE_GATEWAY_URL, // Optional, defaults to Cloud Run production URL
});

// 1. One-line prompt:
const responseText = await ai.generateText('Extract line items from this invoice text...');

// 2. Full chat with history & options:
const completion = await ai.createChatCompletion(
  [
    { role: 'system', content: 'You are an accounting assistant.' },
    { role: 'user', content: 'Calculate net total after 7% tax.' },
  ],
  {
    model: 'auto', // or 'fast', 'reasoning', 'creative'
    temperature: 0.2,
  },
);

console.log(completion.choices[0].message.content);
console.log('Model used:', completion.vibe_gateway?.resolved_model);
console.log('Fallback used:', completion.vibe_gateway?.fallback_used);
```
