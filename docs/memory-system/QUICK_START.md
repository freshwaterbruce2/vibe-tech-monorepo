# Memory System - Quick Start Guide

Last Updated: 2026-02-14
Status: Phase 1 Complete

## Overview

The Memory System provides persistent memory across Claude Code sessions using three storage types:

- **Episodic:** Time-stamped events and experiences
- **Semantic:** Knowledge and facts (with vector similarity search)
- **Procedural:** Command patterns and workflows

## Prerequisites

- ✅ Ollama running with nomic-embed-text model (768 dimensions)
- ✅ Database at `D:\databases\memory.db`
- ✅ MCP server registered in `.mcp.json`
- ✅ Claude Code restarted to load MCP server

## Testing the Integration

Run the integration test script:

```powershell
C:\dev\scripts\test-memory-system.ps1
```

Expected output: All tests passing (✓)

## Available MCP Tools

Once Claude Code restarts, you'll have these tools available:

### 1. Health Check

```
Tool: memory_health
Description: Check database and embedding provider status
Parameters: None
```

**Example:**
```
Use memory_health tool to check if the system is operational
```

**Expected Output:**
```json
{
  "database": "healthy",
  "embeddingProvider": "ollama",
  "episodicCount": 10,
  "semanticCount": 25,
  "proceduralCount": 5
}
```

---

### 2. Add Semantic Memory (Knowledge)

```
Tool: memory_add_semantic
Description: Store facts, concepts, or knowledge
Parameters:
  - content (string, required): The knowledge to store
  - metadata (object, optional): Additional context
```

**Example:**
```
Use memory_add_semantic tool with:
  content: "The crypto trading system uses Kraken API with nonce-based authentication. Nonces are stored in D:\databases\trading.db to prevent replay attacks."
  metadata: { "project": "crypto-enhanced", "category": "architecture" }
```

**Use Cases:**
- Document architectural decisions
- Store learned patterns
- Save troubleshooting solutions
- Record API quirks and gotchas

---

### 3. Search Semantic Memory

```
Tool: memory_search_semantic
Description: Find relevant knowledge using vector similarity
Parameters:
  - query (string, required): What to search for
  - limit (number, optional): Max results (default: 5)
  - minSimilarity (number, optional): Min score 0-1 (default: 0.7)
```

**Example:**
```
Use memory_search_semantic tool with:
  query: "How does the trading system handle authentication?"
  limit: 3
  minSimilarity: 0.75
```

**Expected Output:**
```json
[
  {
    "id": 42,
    "content": "The crypto trading system uses Kraken API...",
    "similarity": 0.89,
    "created_at": "2026-02-14T10:30:00Z",
    "metadata": { "project": "crypto-enhanced" }
  }
]
```

---

### 4. Add Episodic Memory (Events)

```
Tool: memory_add_episodic
Description: Record time-stamped events
Parameters:
  - event (string, required): Description of what happened
  - metadata (object, optional): Additional context
```

**Example:**
```
Use memory_add_episodic tool with:
  event: "Completed Memory System Phase 1 - integrated Ollama embeddings, built MCP server, added triple-store architecture"
  metadata: { "phase": "1", "duration_hours": 4 }
```

**Use Cases:**
- Track project milestones
- Record debugging sessions
- Log important decisions
- Chronicle feature implementations

---

### 5. Search Episodic Memory

```
Tool: memory_search_episodic
Description: Find past events by content or time range
Parameters:
  - query (string, optional): Search text
  - startTime (string, optional): ISO timestamp
  - endTime (string, optional): ISO timestamp
  - limit (number, optional): Max results (default: 10)
```

**Example:**
```
Use memory_search_episodic tool with:
  query: "Phase 1"
  limit: 5
```

---

### 6. Get Recent Memories

```
Tool: memory_get_recent
Description: Retrieve recent events (last 24h by default)
Parameters:
  - hours (number, optional): Lookback window (default: 24)
  - limit (number, optional): Max results (default: 10)
```

**Example:**
```
Use memory_get_recent tool with:
  hours: 48
  limit: 20
```

**Use Cases:**
- Session context recovery
- Daily standup summaries
- Recent work review

---

### 7. Track Procedural Memory (Commands)

```
Tool: memory_track_pattern
Description: Record command/workflow patterns
Parameters:
  - command (string, required): Command name
  - context (object, required): Execution context (args, flags, etc.)
  - success (boolean, required): Whether it succeeded
```

**Example:**
```
Use memory_track_pattern tool with:
  command: "pnpm nx build crypto-enhanced"
  context: { "args": ["build", "crypto-enhanced"], "exitCode": 0 }
  success: true
```

**Use Cases:**
- Learn successful command patterns
- Track build/test workflows
- Record deployment procedures

---

### 8. Get Procedural Patterns

```
Tool: memory_get_patterns
Description: Retrieve learned command patterns
Parameters:
  - command (string, optional): Filter by command name
  - minFrequency (number, optional): Min usage count (default: 2)
```

**Example:**
```
Use memory_get_patterns tool with:
  command: "pnpm nx"
  minFrequency: 3
```

**Expected Output:**
```json
[
  {
    "command": "pnpm nx build crypto-enhanced",
    "frequency": 15,
    "successRate": 0.93,
    "avgContext": { "duration": "45s" }
  }
]
```

---

## Common Workflows

### 1. Learning from a Debugging Session

```
# Record the problem
Use memory_add_episodic:
  event: "Debugging nonce synchronization error in crypto trading system"

# Record the solution
Use memory_add_semantic:
  content: "Nonce errors occur when multiple processes access trading.db simultaneously. Solution: Use WAL mode and busy_timeout pragma."
  metadata: { "project": "crypto-enhanced", "issue": "nonce-sync" }

# Track successful fix command
Use memory_track_pattern:
  command: "pnpm nx test crypto-enhanced"
  context: { "args": ["test", "crypto-enhanced"], "passed": true }
  success: true
```

### 2. Recovering Context After Break

```
# Check recent work
Use memory_get_recent:
  hours: 24
  limit: 10

# Search for specific topic
Use memory_search_semantic:
  query: "What did I learn about the trading system?"
  limit: 5
```

### 3. Building Project Knowledge Base

```
# Add architectural knowledge
Use memory_add_semantic:
  content: "VibeTech monorepo uses Nx 21.6.3 with intelligent caching. Projects are in apps/, packages/, backend/."
  metadata: { "category": "architecture", "project": "monorepo" }

# Add path policies
Use memory_add_semantic:
  content: "CRITICAL: Databases go to D:\databases\, logs to D:\logs\, code stays in C:\dev\"
  metadata: { "category": "policy", "priority": "critical" }
```

---

## Configuration

### Embedding Provider

Default: Ollama (nomic-embed-text, 768 dimensions)
Fallback: Transformers.js (local, no network required)

**Check current provider:**
```
Use memory_health tool
```

### Database Location

Path: `D:\databases\memory.db`
Mode: WAL (Write-Ahead Logging)
Schema: 3 tables (episodic_memories, semantic_memories, procedural_memories)

---

## Troubleshooting

### Issue: "Embedding provider not available"

**Check Ollama:**
```powershell
curl http://localhost:11434/api/tags
```

**Expected:** List of models including `nomic-embed-text`

**Solution if missing:**
```powershell
ollama pull nomic-embed-text
```

---

### Issue: "Database locked"

**Cause:** Multiple processes accessing database

**Solution:** WAL mode is enabled, but check for orphaned connections:
```powershell
node -e "const db = require('better-sqlite3')('D:/databases/memory.db'); db.pragma('wal_checkpoint(TRUNCATE)'); db.close();"
```

---

### Issue: MCP tools not appearing

**Verify MCP server is registered:**
```powershell
node -e "console.log(JSON.parse(require('fs').readFileSync('C:/dev/.mcp.json','utf8')).mcpServers['memory-bank'])"
```

**Restart Claude Code:**
```
Close and reopen Claude Code completely
```

---

## Performance Notes

### Semantic Search Speed

- **With Ollama:** ~200-500ms per query (depends on context size)
- **With Transformers.js:** ~1-2s per query (slower, but local)

### Database Size

- **Typical:** ~100 KB per 100 memories
- **With vectors:** +768 floats per semantic memory (~3 KB each)

### Recommended Limits

- **Episodic:** Keep last 90 days (auto-pruning planned for Phase 2)
- **Semantic:** Up to 10,000 entries (search remains fast)
- **Procedural:** No limit (aggregated by command name)

---

## Next Steps (Phase 2)

1. **Context-Aware Retrieval:** Auto-detect current project and filter results
2. **Automatic Memory Formation:** Record events without explicit tool calls
3. **Agent Integration:** Specialist agents use relevant memories
4. **Memory Consolidation:** Merge similar memories, prune old entries

---

## API Reference

For programmatic usage, see:
- **Library:** `packages/memory/README.md`
- **MCP Server:** `apps/memory-mcp/README.md`
- **Types:** `packages/memory/src/types.ts`

---

## Support

- **Integration Test:** `C:\dev\scripts\test-memory-system.ps1`
- **Health Check:** Use `memory_health` tool
- **Database Inspection:** Use SQLite CLI or DB Browser for SQLite

---

**Status:** ✅ Phase 1 Complete - Ready for Use
**Last Updated:** 2026-02-14
