# @vibetech/openrouter-client

TypeScript client library for VibeTech OpenRouter Proxy.

## Installation

```bash
pnpm add @vibetech/openrouter-client
```

## Usage

### Basic Chat

```typescript
import { OpenRouterClient } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

// Simple message
const response = await client.sendMessage('Hello!');
console.log(response);

// Full chat request
const chatResponse = await client.chat({
  model: 'anthropic/claude-3.5-sonnet',
  messages: [
    { role: 'user', content: 'What is TypeScript?' }
  ],
  temperature: 0.7,
  max_tokens: 1000
});

console.log(chatResponse.choices[0].message.content);
```

### Conversation Context

```typescript
const messages = [
  { role: 'user', content: 'My name is Alice' },
  { role: 'assistant', content: 'Hello Alice! Nice to meet you.' }
];

const response = await client.continueConversation(
  messages,
  'What is my name?'
);

console.log(response.choices[0].message.content); // "Your name is Alice"
```

### Error Handling

```typescript
import { OpenRouterClient, OpenRouterError } from '@vibetech/openrouter-client';

const client = new OpenRouterClient('http://localhost:3001');

try {
  const response = await client.chat({
    messages: [{ role: 'user', content: 'Hello!' }]
  });
} catch (error) {
  if (error instanceof OpenRouterError) {
    console.error('OpenRouter error:', error.message);
    console.error('Status:', error.status);
    console.error('Details:', error.details);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Advanced Configuration

```typescript
const client = new OpenRouterClient('http://localhost:3001', {
  timeout: 60000,      // 60 second timeout
  retries: 5,          // Retry 5 times on failure
  retryDelay: 2000     // 2 second base delay (exponential backoff)
});

// Check service health
const isHealthy = await client.healthCheck();
if (!isHealthy) {
  console.error('OpenRouter proxy is down!');
}

// Get available models
const models = await client.getModels();
console.log('Available models:', models.map(m => m.id));

// Get usage statistics
const usage = await client.getUsage('7d'); // Last 7 days
console.log('Total requests:', usage.totalRequests);
console.log('Total tokens:', usage.totalTokens);
```

## API Reference

### `OpenRouterClient`

#### Constructor

```typescript
new OpenRouterClient(baseURL?: string, options?: OpenRouterClientOptions)
```

**Options:**

- `baseURL` - Proxy server URL (default: `http://localhost:3001`)
- `timeout` - Request timeout in ms (default: `30000`)
- `retries` - Number of retry attempts (default: `3`)
- `retryDelay` - Base retry delay in ms (default: `1000`)

#### Methods

- `chat(request: ChatRequest): Promise<ChatResponse>`
- `sendMessage(content: string, model?: string): Promise<string>`
- `continueConversation(messages: Message[], newMessage: string, model?: string): Promise<ChatResponse>`
- `getModels(): Promise<Model[]>`
- `getUsage(period?: string): Promise<UsageStats>`
- `healthCheck(): Promise<boolean>`

### Types

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  model?: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: Message;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}
```

## Integration Examples

### React Hook

```typescript
import { useState } from 'react';
import { OpenRouterClient, Message } from '@vibetech/openrouter-client';

export function useChat(client: OpenRouterClient) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (content: string) => {
    setLoading(true);
    try {
      const response = await client.continueConversation(messages, content);
      const newMessages = [
        ...messages,
        { role: 'user', content },
        response.choices[0].message
      ];
      setMessages(newMessages as Message[]);
      return response;
    } finally {
      setLoading(false);
    }
  };

  return { messages, sendMessage, loading };
}
```

### Tauri Command

```typescript
// src-tauri/src/main.rs integration
import { OpenRouterClient } from '@vibetech/openrouter-client';

const client = new OpenRouterClient(process.env.OPENROUTER_PROXY_URL);

export async function askAI(prompt: string): Promise<string> {
  const response = await client.sendMessage(prompt);
  return response;
}
```

## License

MIT
