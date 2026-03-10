# @vibetech/memory

Core memory system library with episodic, semantic, and procedural stores.

## Architecture

- **Episodic Store**: Timestamped events (source context, user queries, agent responses)
- **Semantic Store**: Long-term knowledge with vector search (RAG-ready)
- **Procedural Store**: Command patterns, workflows, skill tracking

## Features

- SQLite with `sqlite-vec` for vector similarity search
- Ollama integration (nomic-embed-text) with Transformers.js fallback
- Structured logging with Winston
- Full TypeScript types

## Installation

```bash
pnpm add @vibetech/memory
```

## Usage

```typescript
import { MemoryManager } from '@vibetech/memory';

const memory = new MemoryManager({
  dbPath: 'D:\\databases\\memory.db',
  embeddingModel: 'nomic-embed-text',
});

await memory.init();

// Store episodic memory
await memory.episodic.add({
  sourceId: 'claude-code',
  query: 'How do I implement feature X?',
  response: 'Here is how...',
  metadata: { sessionId: 'abc123' },
});

// Semantic search
const results = await memory.semantic.search('implement feature X', { limit: 5 });
```

## Development

```bash
pnpm dev        # Watch mode
pnpm build      # Production build
pnpm test       # Run tests
pnpm typecheck  # Type checking
```

## License

MIT
