# mcp-rag-server — AI Context

Canonical workspace rules live in `C:\dev\AI.md`. This file is the per-app override for `mcp-rag-server` only. If anything here conflicts with the root `AI.md`, the root wins.

## What this is

Standalone MCP server that exposes the Nova-Agent RAG pipeline to Claude Desktop and Claude Code via stdio. Six tools, no web surface, no HTTP.

**Tools registered in `src\index.ts`:**

- `rag_search` — hybrid vector + FTS search over the indexed monorepo (reranked, optionally cached)
- `rag_index_status` — current index state (files, chunks, pending re-index, cache hit rate)
- `rag_index_run` — trigger incremental (default) or full re-index, synchronous
- `rag_invalidate` — mark paths for re-index on next run and drop matching cached queries
- `db_query_trading` — read-only SELECT/WITH/PRAGMA against `D:\databases\trading.db`, auto-LIMIT injected
- `db_query_learning` — read-only SELECT against `D:\databases\agent_learning.db`

Registered in `C:\dev\.mcp.json` under key `"rag"`.

## Stack

- Node.js 22, ESM only, stdio MCP transport (`@modelcontextprotocol/sdk` ^1.27)
- Build: `tsup` → `dist\index.js` (single bundled file, ~50 KB)
- TypeScript 5.9 strict, `moduleResolution: "Bundler"`, `noEmit: true` (tsup handles emit)
- Schemas: `zod` ^4
- Native deps kept external at bundle time: `@lancedb/lancedb`, `better-sqlite3`, `ts-morph`

## Architecture — path-alias hybrid

RAG code is NOT fully duplicated from `nova-agent`. The current call:

**Local copies (live in `C:\dev\apps\mcp-rag-server\src\rag\`):**

- `types.ts`, `cache.ts`, `embedder.ts`, `reranker.ts`
- Custom barrel `index.ts` that re-exports the local files plus the aliased modules

**Aliased from nova-agent (resolved via tsconfig `paths` + tsup `noExternal`, inlined into `dist` at build time):**

- `@nova-rag/indexer` → `C:\dev\apps\nova-agent\src\rag\indexer.ts`
- `@nova-rag/retriever` → `C:\dev\apps\nova-agent\src\rag\retriever.ts`
- `@nova-rag/connectors/sqlite-trading` → `...\nova-agent\src\rag\connectors\sqlite-trading.ts`
- `@nova-rag/connectors/sqlite-learning` → `...\nova-agent\src\rag\connectors\sqlite-learning.ts`
- `chunker.ts` comes along transitively via `indexer.ts`

**No `src\db\` directory exists.** DB connectors are aliased, not copied.

**Why this shape:** small utilities are cheap to duplicate and let the server partially stand on its own; the heavy pipeline (chunker, indexer, retriever, connectors) stays single-sourced in `nova-agent` to prevent drift. `tsup` bundles the aliased source into `dist\index.js` at build time so the shipped artifact has no cross-app filesystem dependency at runtime.

**Endgame — intentionally deferred:** extract `packages\rag-core\` so both `nova-agent` and `mcp-rag-server` become consumers. Removes the cross-app tsconfig coupling. Do this only after the current server is green and shipped. Not this sprint.

## Build & Dev

All commands from repo root (`C:\dev`), PowerShell 7:

```powershell
# Type-check only (no emit) — fast green-light check
pnpm --filter @vibetech/mcp-rag-server typecheck

# Build to dist\index.js
pnpm --filter @vibetech/mcp-rag-server build

# Watch mode for iterative development
pnpm --filter @vibetech/mcp-rag-server build:watch

# Run from source via tsx (dev loop)
pnpm --filter @vibetech/mcp-rag-server dev

# Run the shipped artifact
node C:\dev\apps\mcp-rag-server\dist\index.js
```

## Runtime config

- LanceDB vector store: `D:\nova-agent-data\lance-db\` (env `LANCEDB_PATH` overrides)
- Query cache SQLite: `D:\nova-agent-data\cache\query-cache.sqlite`
- Workspace root indexed: `C:\dev` (`apps\`, `packages\`, `backend\`)
- Embeddings: `text-embedding-3-small` (1536d) via OpenRouter proxy at `http://localhost:3001`
- Trading DB: `D:\databases\trading.db`
- Learning DB: `D:\databases\agent_learning.db`
- Init is lazy: `ensureInitialized()` runs on first tool call and once at server startup (non-fatal on failure — logs to stderr, server still connects)

## Ship status — verified 2026-04-20

- [x] Typecheck green across the full aliased graph (`pnpm --filter @vibetech/mcp-rag-server typecheck`, zero errors)
- [x] Bundle builds clean: `dist\index.js` emits at 50.53 KB in ~22 ms, native deps stayed external
- [x] Runtime smoke: cold `node dist\index.js` reaches `MCP server running on stdio` in ~6-7 s
- [x] LanceDB opens at `D:\nova-agent-data\lance-db\`, RAGIndexer logs `Indexer initialized`
- [x] Both sqlite connectors open clean — `D:\databases\trading.db` (12 KB) and `D:\databases\agent_learning.db` (21 MB) — no exceptions at `trading.connect()` / `learning.connect()`
- [ ] **Last step, owner: Bruce.** Restart Claude Desktop so it re-reads `C:\dev\.mcp.json` and exposes the six tools under the `"rag"` server in the tool list

**Index state flag (not a blocker):** on cold startup, indexer reports `0 files, 0 chunks` even though `D:\nova-agent-data\lance-db\` has existing tables from mid-March (`codebase`, `codebase.lance`, `conversations`, `docs`). First `rag_index_run` call will resolve it: if chunk count jumps to thousands instantly, the state counter was stale and the existing LanceDB data is still live; if it rebuilds from zero, the old tables are orphaned and can be cleared with `Remove-Item -Recurse D:\nova-agent-data\lance-db\<stale-table>`.

### Re-verify after changes

If anything in the graph shifts (nova-agent RAG edits, dependency bumps, tsconfig moves), rerun from `C:\dev`:

```powershell
pnpm --filter '@vibetech/mcp-rag-server' typecheck; pnpm --filter '@vibetech/mcp-rag-server' build; node C:\dev\apps\mcp-rag-server\dist\index.js  # Ctrl+C after "running on stdio"
```

## Known quirks and landmines

- `@lancedb/lancedb` was installed with `npm install` (not pnpm) because Windows Defender threw `EPERM` during pnpm's strict-linking install. Note the `package-lock.json` co-existing with the workspace's `pnpm-workspace.yaml` — **scoped to this one native package, do not delete it** and do not re-run `pnpm install` on this app without testing.
- `tsconfig.json` `include` deliberately lists `../nova-agent/src/rag/**/*` so `tsc` sees the aliased source for type-check. Moving the path alias target without updating `include` will break typecheck even if the build still passes.
- `tsup.config.ts` `noExternal: [/^@nova-rag\//, /^\.\.?\//]` is load-bearing — it's what inlines the aliased files into `dist`. The `external:` list must keep native deps out (`@lancedb/lancedb`, `better-sqlite3`, `ts-morph`); bundling those will break at runtime.
- The custom `src\rag\index.ts` barrel is NOT a copy of nova-agent's barrel — it was written fresh to mix local and aliased exports. Don't overwrite it when resyncing RAG code from nova-agent.

## File size policy

500 lines max per `.ts/.tsx`, 600 hard ceiling. `src\index.ts` is the largest file and holds all six tool registrations inline; if adding a seventh tool, extract to `src\tools\<tool-name>.ts` first.

## Pointers

- Root canonical rules: `C:\dev\AI.md`
- MCP registration: `C:\dev\.mcp.json` (key `"rag"`)
- Source of truth for RAG pipeline: `C:\dev\apps\nova-agent\src\rag\`
- Backups of this file: `C:\dev\apps\mcp-rag-server\_backups\`
