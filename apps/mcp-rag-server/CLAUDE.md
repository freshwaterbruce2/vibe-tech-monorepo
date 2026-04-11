# mcp-rag-server — AI Context

## What this is
MCP server exposing the Nova-Agent RAG (Retrieval-Augmented Generation) pipeline — provides `memory_search` tools backed by LanceDB vector store over the monorepo codebase.

## Stack
- **Runtime**: Node.js 22
- **Framework**: MCP stdio server (`@modelcontextprotocol/sdk`); built with tsup
- **Key deps**: @lancedb/lancedb, better-sqlite3, ts-morph, zod

## Dev
```bash
pnpm --filter @vibetech/mcp-rag-server dev    # tsx src/index.ts
pnpm --filter @vibetech/mcp-rag-server build  # tsup → dist/index.js
node apps/mcp-rag-server/dist/index.js        # run as MCP server
```

## Notes
- LanceDB vector store at `D:\nova-agent-data\lance-db` (env: `LANCEDB_PATH`)
- Query cache SQLite at `D:\nova-agent-data\cache\query-cache.sqlite`
- Workspace root indexed: `C:\dev` (apps/, packages/, backend/)
- Embedding model: OpenRouter `text-embedding-3-small` (1536d) via `http://localhost:3001`
- Registered in `.mcp.json` as the `rag` server
