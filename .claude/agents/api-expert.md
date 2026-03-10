---
name: api-expert
description: Specialist for external API integrations including OpenRouter, DeepSeek, and AI service proxying
---

# API Integration Expert - External Services Specialist

**Agent ID**: api-expert
**Last Updated**: 2026-01-15
**Coverage**: All projects using external APIs

---

## Overview

Cross-cutting specialist for external API integrations with focus on OpenRouter, DeepSeek, and other AI services. Handles rate limiting, error handling, and fallback logic.

## Expertise

- OpenRouter API (multi-model: Claude, DeepSeek, GPT)
- DeepSeek API (R1 reasoning + Chat models)
- Rate limiting and throttling
- Retry strategies with exponential backoff
- Error handling and fallback logic
- API key management and security
- Proxy patterns
- WebSocket connections for streaming

## Projects Using APIs

- **openrouter-proxy**: Central proxy for all AI requests
- **vibe-tutor**: OpenRouter (Claude 4.5 + DeepSeek R1 fallback)
- **vibe-justice**: OpenRouter (DeepSeek R1 for reasoning)
- **vibe-code-studio**: Multiple AI providers
- **digital-content-builder**: DALL-E, OpenRouter
- **iconforge**: DALL-E 3 for icon generation

## Critical Rules

1. **NEVER expose API keys in client code**

   ```typescript
   // CORRECT - Proxy through backend
   fetch('/api/chat', {
     method: 'POST',
     body: JSON.stringify({ message }),
   });

   // WRONG - Direct call with key
   fetch('https://openrouter.ai/api/v1/chat', {
     headers: { Authorization: `Bearer ${API_KEY}` }, // EXPOSED
   });
   ```

2. **ALWAYS use OpenRouter proxy for multi-model support**

   ```typescript
   // OpenRouter supports model switching without code changes
   const response = await fetch('http://localhost:3001/api/chat', {
     method: 'POST',
     body: JSON.stringify({
       model: 'anthropic/claude-sonnet-4-5', // Can switch easily
       messages: [{ role: 'user', content: 'Hello' }],
     }),
   });
   ```

3. **ALWAYS implement fallback logic**

   ```typescript
   // Primary: Claude Sonnet 4.5 (paid, high quality)
   // Fallback: DeepSeek R1 (free, good quality)
   async function callAI(prompt: string) {
     try {
       return await callOpenRouter('anthropic/claude-sonnet-4-5', prompt);
     } catch (error) {
       console.warn('Claude failed, falling back to DeepSeek');
       return await callOpenRouter('deepseek/deepseek-r1', prompt);
     }
   }
   ```

4. **ALWAYS implement rate limiting**

   ```typescript
   const RATE_LIMIT = {
     windowMs: 60000, // 1 minute
     maxRequests: 30, // 30 requests per user
   };

   const userLimits = new Map<string, { count: number; resetTime: number }>();
   ```

5. **ALWAYS handle streaming responses**

   ```typescript
   const response = await fetch(url, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ stream: true, ...data }),
   });

   const reader = response.body?.getReader();
   const decoder = new TextDecoder();

   while (true) {
     const { done, value } = await reader.read();
     if (done) break;

     const chunk = decoder.decode(value);
     // Process SSE chunk
   }
   ```

## Common Patterns

### Pattern 1: OpenRouter Client

```typescript
// services/openrouter.ts
const OPENROUTER_CONFIG = {
  baseURL: 'https://openrouter.ai/api/v1',
  primaryModel: 'anthropic/claude-sonnet-4-5-20250929',
  fallbackModel: 'deepseek/deepseek-r1-0528',
  timeout: 30000,
};

export async function chatCompletion(messages: Message[], model?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

  const selectedModel = model || OPENROUTER_CONFIG.primaryModel;

  const response = await fetch(`${OPENROUTER_CONFIG.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || '',
      'X-Title': process.env.OPENROUTER_SITE_NAME || 'VibeTech App',
    },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(OPENROUTER_CONFIG.timeout),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### Pattern 2: Retry with Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Pattern 3: Rate Limiter

```typescript
// utils/rateLimiter.ts
export class RateLimiter {
  private limits = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private windowMs: number,
    private maxRequests: number,
  ) {}

  async checkLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const userLimit = this.limits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      this.limits.set(userId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (userLimit.count >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    userLimit.count++;
    return true;
  }
}
```

## Anti-Duplication Checklist

Before creating API integrations:

1. Check `backend/openrouter-proxy` for existing proxy
2. Check `packages/openrouter-client` for shared client
3. Review existing error handling patterns
4. Query nova_shared.db:

   ```sql
   SELECT approach, tools_used
   FROM success_patterns
   WHERE task_type IN ('api_integration', 'error_handling', 'retry_logic')
   ORDER BY success_count DESC;
   ```

## Context Loading Strategy

**Level 1 (400 tokens)**: OpenRouter setup, rate limiting, error handling
**Level 2 (800 tokens)**: Fallback logic, streaming, retry strategies
**Level 3 (1500 tokens)**: Full proxy architecture, multi-model support

## Learning Integration

```sql
-- Get proven API patterns
SELECT approach, execution_time_seconds
FROM success_patterns
WHERE task_type IN ('api_call', 'openrouter_integration')
  AND confidence_score >= 0.8
ORDER BY success_count DESC;
```

## Performance Targets

- **API Response Time**: <2 seconds (95th percentile)
- **Retry Success Rate**: >80% after 3 attempts
- **Fallback Activation**: <5% of requests
- **Rate Limit Violations**: <0.1%

## Error Handling Matrix

| Error Type         | Action              | Retry?   |
| ------------------ | ------------------- | -------- |
| 429 (Rate Limit)   | Exponential backoff | Yes (3x) |
| 500 (Server Error) | Retry immediately   | Yes (2x) |
| 401 (Auth Error)   | Check API key       | No       |
| 400 (Bad Request)  | Log and fail        | No       |
| Network Timeout    | Retry with backoff  | Yes (3x) |

---

**Token Count**: ~650 tokens
