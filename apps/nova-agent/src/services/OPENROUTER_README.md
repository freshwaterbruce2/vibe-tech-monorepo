# OpenRouter Service Integration

OpenRouter service for Nova Agent - LLM interactions via OpenRouter proxy.

## Overview

Wraps @vibetech/openrouter-client with Nova Agent-specific helper functions for:

- Code generation
- Code explanation
- Code refactoring
- Code debugging
- Code review
- Chat interactions
- Multi-turn conversations

**Tauri Compatible:** Uses HTTP client (axios) - works in both Tauri desktop and web contexts.

## Quick Start

```typescript
import { sendChatMessage, generateCode, checkHealth } from './openrouter';

// Check health first
const isHealthy = await checkHealth();
if (!isHealthy) {
  console.error('OpenRouter proxy not available');
}

// Simple chat
const response = await sendChatMessage('Explain async/await');

// Generate code
const code = await generateCode({
  description: 'Create a React todo component',
  language: 'typescript',
  context: 'Using React 19 with TypeScript'
});
```

## Configuration

- **Default URL:** <http://localhost:3001>
- **Override:** Set `OPENROUTER_BASE_URL` environment variable
- **Default Model:** anthropic/claude-3.5-sonnet
- **Default Temperature:** 0.7
- **Default Max Tokens:** 4096

## Available Functions

### Chat Operations

- `sendChatMessage(content, options?)` - Simple chat interactions
- `continueConversation(history, newMessage, options?)` - Multi-turn conversations
- `customChatRequest(request)` - Full control over chat requests

### Code Operations

- `generateCode(request, options?)` - Generate code from description
- `explainCode(request, options?)` - Explain code in natural language
- `refactorCode(code, instructions, language?, options?)` - Refactor with instructions
- `debugCode(code, error, language?, options?)` - Debug assistance
- `reviewCode(code, language?, options?)` - Code review

### Service Operations

- `getAvailableModels()` - List available LLM models
- `getUsageStatistics(period?)` - Get usage stats (default: 24h)
- `checkHealth()` - Health check for OpenRouter proxy

## Type Definitions

All types are exported from the service:

```typescript
import type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelInfo,
  NovaAgentChatOptions,
  CodeGenerationRequest,
  CodeExplanationRequest
} from './openrouter';
```

## Integration with Tauri

The service uses axios for HTTP requests, which is compatible with Tauri's security model. No Node.js-specific APIs are used.

**Example Tauri Command:**

```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn generate_code(description: String) -> Result<String, String> {
    // Call frontend service via IPC
    Ok("Code generated".to_string())
}
```

**Frontend Integration:**

```typescript
import { generateCode } from '@/services/openrouter';
import { invoke } from '@tauri-apps/api/core';

// Use service directly in Tauri app
const code = await generateCode({
  description: 'Create a file manager component',
  language: 'typescript'
});
```

## Error Handling

All functions throw standard JavaScript errors. Wrap in try-catch:

```typescript
try {
  const response = await sendChatMessage('Hello');
  console.log(response);
} catch (error) {
  console.error('OpenRouter error:', error.message);
}
```

## See Also

- Service implementation: `services/openrouter.ts`
- Type definitions: `types/openrouter.ts`
- Usage examples: `services/openrouter.example.ts`
- Package source: `packages/openrouter-client/`
