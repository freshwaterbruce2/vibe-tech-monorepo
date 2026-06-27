# @vibetech/openrouter-client

TypeScript client library for the VibeTech OpenRouter Proxy. Supports buffered
chat completions, streamed (SSE) completions, OpenAI-compatible tool/function
calling, and a fallback model stack.

## Installation

```bash
pnpm add @vibetech/openrouter-client
```

## Usage

### Basic Chat

```typescript
import { OpenRouterClient } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

const response = await client.chat({
  model: 'anthropic/claude-sonnet-4.6',
  messages: [{ role: 'user', content: 'What is TypeScript?' }],
  temperature: 0.7,
  max_tokens: 1000
});

console.log(response.choices[0].message.content);
```

### Fallback Model Stack

Supply `models` (an ordered fallback stack) instead of a single `model`; the
proxy tries each in turn. A `model` field is still populated automatically from
the first entry for proxy compatibility.

```typescript
import { OpenRouterClient, DEFAULT_FALLBACK_STACK } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

const response = await client.chat({
  models: DEFAULT_FALLBACK_STACK, // cohere free → deepseek-v4-flash → claude-sonnet-4.6
  messages: [{ role: 'user', content: 'Summarize this changelog.' }]
});
```

### Streaming (SSE)

`chatStream` is an async generator that yields one `ChatCompletionStreamChunk`
per SSE `data:` line until the terminal `[DONE]` marker. It uses `fetch` so the
body streams incrementally in Node 18+ and browsers.

```typescript
const client = new OpenRouterClient('http://localhost:3001');

const controller = new AbortController();
for await (const chunk of client.chatStream(
  {
    model: 'anthropic/claude-sonnet-4.6',
    messages: [{ role: 'user', content: 'Write a haiku about TypeScript.' }]
  },
  controller.signal
)) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
}
```

### Tool / Function Calling

Pass OpenAI-compatible `tools` and an optional `tool_choice`. Tool invocations
come back on `choices[0].message.tool_calls`.

```typescript
import { OpenRouterClient, type Tool } from '@vibetech/openrouter-client';

const tools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get the current weather for a city',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city']
      }
    }
  }
];

const response = await client.chat({
  model: 'anthropic/claude-sonnet-4.6',
  messages: [{ role: 'user', content: "What's the weather in Paris?" }],
  tools,
  tool_choice: 'auto'
});

const calls = response.choices[0].message.tool_calls;
if (calls) {
  for (const call of calls) {
    console.log(call.function.name, JSON.parse(call.function.arguments));
  }
}
```

### Error Handling

```typescript
import { OpenRouterClient, OpenRouterError } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

try {
  const response = await client.chat({
    model: 'anthropic/claude-sonnet-4.6',
    messages: [{ role: 'user', content: 'Hello!' }]
  });
} catch (error) {
  if (error instanceof OpenRouterError) {
    console.error('OpenRouter error:', error.message);
    console.error('Status:', error.status);   // number | undefined
    console.error('Details:', error.details); // Record<string, unknown> | undefined
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Advanced Configuration

```typescript
const client = new OpenRouterClient('http://localhost:3001', {
  timeout: 60000,   // 60 second timeout
  retries: 5,       // retry 5 times on failure (default: 0, i.e. disabled)
  retryDelay: 2000  // 2 second base delay between retries
});

// Check service health
const isHealthy = await client.healthCheck();

// Get available models
const models = await client.getModels();
console.log('Available models:', models.map((m) => m.id));

// Get usage statistics
const usage = await client.getUsage('7d'); // default: '24h'
console.log('Total requests:', usage.total_requests);
console.log('Total tokens:', usage.total_tokens);
```

## API Reference

### `OpenRouterClient`

#### Constructor

```typescript
new OpenRouterClient(baseURL?: string, options?: OpenRouterClientOptions)
```

- `baseURL` — Proxy server URL (default: `http://localhost:3001`)
- `options.timeout` — Request timeout in ms (default: `30000`)
- `options.retries` — Number of retry attempts (default: `0`)
- `options.retryDelay` — Base retry delay in ms (default: `1000`)

#### Methods

- `chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>`
- `chatStream(request: ChatCompletionRequest, signal?: AbortSignal): AsyncGenerator<ChatCompletionStreamChunk>`
- `getModels(): Promise<ModelInfo[]>`
- `getUsage(period?: string): Promise<UsageStats>` — `period` default `'24h'`
- `healthCheck(): Promise<boolean>`

> Note: `chat` and `chatStream` post to `/api/openrouter/chat`. The retry
> interceptor applies to axios-based calls (`chat`, `getModels`, `getUsage`,
> `healthCheck`); `chatStream` uses `fetch` and is not retried.

### Standalone Helpers

Re-exported from the package root:

- `MODEL_PRICING: Record<string, ModelPricing>` — per-token input/output pricing
- `DEFAULT_FALLBACK_STACK: string[]` — default fallback model ids
- `calcCost(model: string, usage: { prompt_tokens?: number; completion_tokens?: number }): number`
- `MODEL_ALIASES: Record<string, string>` — alias → canonical `author/slug` map
- `resolveModelId(model: string): string` — resolve an alias/slug to a canonical id
- `createOpenRouterClient(baseURL?: string): OpenRouterClient` — convenience factory
- `openRouter` — a default `OpenRouterClient` instance

### Types

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Tool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

type ToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'function'; function: { name: string } };

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface ChatCompletionRequest {
  model?: string;        // optional when `models` is supplied
  models?: string[];     // ordered fallback stack
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  tools?: Tool[];
  tool_choice?: ToolChoice;
  stream?: boolean;      // set automatically by chatStream
}

interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage & { tool_calls?: ToolCall[] };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  by_model: Record<string, number>;
  period?: string;
  timestamp?: string;
}
```

Type aliases `Message` (= `ChatMessage`) and `ChatResponse`
(= `ChatCompletionResponse`) are exported for compatibility.

## Integration Example

### React Hook

```typescript
import { useState } from 'react';
import { OpenRouterClient, type Message } from '@vibetech/openrouter-client';

export function useChat(client: OpenRouterClient) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (content: string) => {
    setLoading(true);
    try {
      const next: Message[] = [...messages, { role: 'user', content }];
      const response = await client.chat({
        model: 'anthropic/claude-sonnet-4.6',
        messages: next
      });
      setMessages([...next, response.choices[0].message]);
      return response;
    } finally {
      setLoading(false);
    }
  };

  return { messages, sendMessage, loading };
}
```

## License

MIT
