# memory-mcp — AI Context

## What this is
MCP server exposing the VibeTech long-term memory system — provides semantic search, episodic memory, and learning-pattern tools to Claude Code and other LLMs.

## Stack
- **Runtime**: Node.js 22
- **Framework**: MCP stdio server (`@modelcontextprotocol/sdk`); built with tsup
- **Key deps**: @lancedb/lancedb, better-sqlite3, @vibetech/memory (workspace), ts-morph, zod

## Dev
```bash
pnpm --filter memory-mcp dev     # tsup --watch
pnpm --filter memory-mcp build   # tsup → dist/index.js
node apps/memory-mcp/dist/index.js  # run as MCP server
```

## Notes
- Canonical learning DB: `D:\databases\agent_learning.db` (not nova_shared.db — was migrated 2026-04-05)
- LanceDB vector store at `D:\nova-agent-data\lance-db`
- Exposes tools: `memory_search_unified`, `memory_health`, `memory_learning_write_pattern`, `memory_learning_record_execution`
- Depends on `packages/memory` workspace package for core logic
- Registered in `.mcp.json` as the `memory` server
