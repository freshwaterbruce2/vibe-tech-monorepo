# memory-mcp

MCP server exposing the VibeTech memory system to Claude Code and other MCP clients.

## Features

Provides MCP tools for:
- **Episodic retrieval**: Recent context, session history
- **Semantic search**: Knowledge retrieval with embeddings
- **Procedural tracking**: Workflow patterns, command usage

## Configuration

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "memory": {
      "type": "stdio",
      "command": "node",
      "args": ["apps/memory-mcp/dist/index.js"]
    }
  }
}
```

## Tools

### `memory_search`
Search semantic knowledge base
- **Input**: `{ query: string, limit?: number }`
- **Output**: Relevant knowledge chunks with similarity scores

### `memory_recent`
Get recent episodic events
- **Input**: `{ sourceId?: string, limit?: number }`
- **Output**: Recent queries/responses

### `memory_add`
Store new knowledge
- **Input**: `{ text: string, type: 'semantic' | 'episodic', metadata?: object }`

## Development

```bash
pnpm --filter memory-mcp dev    # Watch mode
pnpm --filter memory-mcp build  # Production build
pnpm --filter memory-mcp start  # Run server
```

## Testing

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node apps/memory-mcp/dist/index.js
```

## License

MIT
