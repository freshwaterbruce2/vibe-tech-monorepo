# PRD: VibeTech Unified Memory & Learning System

**Version**: 1.0.0
**Date**: 2026-02-12
**Status**: DRAFT - Awaiting Approval
**Author**: Claude Code (Opus 4.6)
**Stakeholder**: Bruce (solo developer)

---

## 1. Executive Summary

Build a unified memory and learning system for the VibeTech monorepo that provides:

1. **Multi-tier memory** (working, episodic, semantic, procedural) stored on D:\ drive
2. **Vector search** via sqlite-vec for semantic retrieval across all memory types
3. **Active learning** from coding sessions via Claude Code hooks
4. **MCP server** exposing memory tools to all AI assistants (Claude, Gemini, etc.)
5. **D:\ infrastructure rebuild** with proper directory scaffolding and health monitoring

The system replaces the defunct Python-based learning system on D:\learning-system with a TypeScript-native solution integrated into the Nx monorepo.

---

## 2. Problem Statement

### What Exists (Broken/Dormant)

| Component | Location | Status |
|---|---|---|
| Python learning system | D:\learning-system\ | Dormant - .venv broken, no active services |
| agent_learning.db | D:\databases\agent_learning.db | 22MB, last written 2026-02-09 by scheduled task |
| knowledge_pool.db | D:\databases\knowledge_pool.db | 12KB, barely used |
| ChromaDB directory | D:\databases\chromadb\ | Old vector store, unused |
| Memory bank app | C:\dev\apps\memory-bank\ | Deleted from git (shows as `D` in status) |
| MCP server memory | C:\dev\apps\mcp-server\ | Has MCP_ENABLE_MEMORY_BANK env but disabled |
| Hook system | .claude/hooks/ | PowerShell hooks exist but learning capture is broken |
| Skills server | C:\dev\apps\mcp-skills-server\ | Active, keyword-only search (no vector) |
| Serena memories | C:\dev\.serena\memories\ | Active, markdown-based, no programmatic access |
| 30+ SQLite databases | D:\databases\ | Scattered, many dormant/duplicate |

### Pain Points

1. **No active memory between sessions** - Each AI session starts from scratch
2. **No learning from patterns** - Repeated mistakes, no accumulated wisdom
3. **Scattered databases** - 30+ .db files with no unified access layer
4. **No vector search** - Skills server uses keyword matching only
5. **Dead Python code** - D:\learning-system is a graveyard of broken venvs
6. **No consolidation** - Episodic events never become semantic knowledge

---

## 3. Goals & Non-Goals

### Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Unified memory database on D:\ with vector search | Single memory.db with sqlite-vec, <50ms retrieval |
| G2 | Four memory types working (working, episodic, semantic, procedural) | Each type has store/retrieve/search operations |
| G3 | Active learning from Claude Code sessions via hooks | Hooks capture tool usage, patterns, outcomes |
| G4 | MCP server exposing memory to all AI assistants | 10+ tools available, <200ms response time |
| G5 | Shared TypeScript package importable by any monorepo app | `@vibetech/memory-system` usable in any project |
| G6 | D:\ infrastructure rebuilt with health monitoring | All directories exist, health check script, scheduled maintenance |
| G7 | Existing databases consolidated/indexed | At minimum, existing agent_learning.db data migrated |

### Non-Goals

- **NOT** replacing Serena's memory system (complementary, not competing)
- **NOT** building a cloud-hosted service (100% local, privacy-first)
- **NOT** fine-tuning or training models (we use pre-trained embeddings)
- **NOT** replacing the existing MCP server (extending it or building alongside)
- **NOT** a general-purpose knowledge base (focused on development workflow memory)

---

## 4. User Stories

### US-1: Session Continuity
> As a developer using Claude Code, I want my AI assistant to remember what we worked on in previous sessions so I don't have to re-explain context every time.

### US-2: Pattern Recognition
> As a developer, I want the system to learn from my coding patterns (preferred libraries, naming conventions, common fixes) and proactively apply that knowledge.

### US-3: Semantic Code Search
> As a developer, I want to search my codebase and memories by meaning (not just keywords) so I can find relevant code even when I don't remember exact names.

### US-4: Cross-Tool Memory
> As a developer using multiple AI tools (Claude Code, Gemini CLI, Claude Desktop), I want all of them to access the same memory via MCP so knowledge isn't siloed.

### US-5: Safe Experimentation
> As a developer, I want the memory system to NOT break existing functionality. It should be additive and opt-in, with zero impact on current workflows if disabled.

---

## 5. Technical Requirements

### 5.1 Embedding Model

**Primary**: Ollama + nomic-embed-text (768 dimensions)
- Local, free, unlimited, private
- 8192 token context window
- Runs as Windows service on localhost:11434
- TypeScript SDK: `ollama` npm package

**Fallback**: @huggingface/transformers + all-MiniLM-L6-v2 (384 dimensions)
- In-process, no server needed
- Slower first load (~30s model download), fast after
- Lower quality but always available

**Storage**: All embeddings stored as binary BLOBs in SQLite via sqlite-vec on D:\databases\memory.db

### 5.2 Vector Database

**Engine**: sqlite-vec v0.1.6+ loaded into better-sqlite3
- Pure C, no dependencies, runs on Windows
- SIMD-accelerated KNN search
- vec0 virtual tables for vector indexing
- Float32 arrays stored as BLOBs

**Database location**: `D:\databases\memory.db`

### 5.3 Memory Types Schema

```sql
-- Working Memory (hot, in-process)
-- Not persisted to disk - lives in Node.js memory during session

-- Episodic Memory (warm, timestamped experiences)
CREATE TABLE episodic_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  event_type TEXT NOT NULL,        -- 'tool_use', 'conversation', 'error', 'decision', 'outcome'
  content TEXT NOT NULL,           -- Raw event content
  context TEXT,                    -- JSON: project, file, branch, etc.
  keywords TEXT,                   -- Comma-separated extracted keywords
  importance REAL DEFAULT 0.5,     -- 0.0-1.0 importance score
  decay_factor REAL DEFAULT 1.0,   -- Decays over time
  created_at TEXT DEFAULT (datetime('now')),
  accessed_at TEXT DEFAULT (datetime('now')),
  access_count INTEGER DEFAULT 0
);

-- Semantic Memory (warm, facts and knowledge)
CREATE TABLE semantic_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,       -- 'project', 'library', 'pattern', 'preference', 'fact'
  description TEXT,
  metadata TEXT,                   -- JSON blob
  confidence REAL DEFAULT 0.8,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE semantic_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER REFERENCES semantic_entities(id) ON DELETE CASCADE,
  target_id INTEGER REFERENCES semantic_entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,     -- 'uses', 'depends_on', 'related_to', 'replaced_by', etc.
  weight REAL DEFAULT 1.0,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE semantic_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER REFERENCES semantic_entities(id) ON DELETE CASCADE,
  content TEXT NOT NULL,           -- Atomic observation
  source TEXT,                     -- Where this was learned
  created_at TEXT DEFAULT (datetime('now'))
);

-- Procedural Memory (cold, learned workflows)
CREATE TABLE procedural_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_pattern TEXT,            -- When to activate this procedure
  steps TEXT NOT NULL,             -- JSON array of steps
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_used TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Vector index tables (sqlite-vec)
CREATE VIRTUAL TABLE vec_episodic USING vec0(
  memory_id INTEGER PRIMARY KEY,
  embedding float[768]
);

CREATE VIRTUAL TABLE vec_semantic USING vec0(
  entity_id INTEGER PRIMARY KEY,
  embedding float[768]
);

CREATE VIRTUAL TABLE vec_procedural USING vec0(
  memory_id INTEGER PRIMARY KEY,
  embedding float[768]
);

-- Consolidation log (episodic -> semantic)
CREATE TABLE consolidation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,       -- 'episodic'
  source_ids TEXT NOT NULL,        -- JSON array of episodic memory IDs
  target_type TEXT NOT NULL,       -- 'semantic' or 'procedural'
  target_id INTEGER,
  action TEXT NOT NULL,            -- 'created', 'updated', 'merged'
  summary TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Session tracking
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  project TEXT,
  branch TEXT,
  summary TEXT,
  event_count INTEGER DEFAULT 0
);
```

### 5.4 MCP Server Tools

The memory MCP server exposes these tools:

| Tool | Description | Memory Type |
|------|-------------|-------------|
| `memory_store_episode` | Store a new episodic memory | Episodic |
| `memory_search` | Semantic search across all memory types | All |
| `memory_recall_recent` | Get recent episodes for a project/session | Episodic |
| `memory_store_fact` | Store a semantic entity + observations | Semantic |
| `memory_query_knowledge` | Query the knowledge graph | Semantic |
| `memory_store_procedure` | Store a learned workflow | Procedural |
| `memory_get_procedure` | Retrieve a procedure by trigger pattern | Procedural |
| `memory_consolidate` | Trigger episodic-to-semantic consolidation | All |
| `memory_health` | System health and statistics | System |
| `memory_forget` | Remove/decay specific memories | All |

### 5.5 Hook Integration

**Pre-tool-use hook** (captures intent):
```
Event: tool_about_to_run
Data: tool_name, parameters_summary, project_context
Storage: Working memory (in-session buffer)
```

**Post-tool-use hook** (captures outcome):
```
Event: tool_completed
Data: tool_name, result_summary, success/failure, duration
Storage: Episodic memory (persisted to D:\databases\memory.db)
```

**Session-start hook** (loads context):
```
Event: session_started
Action: Load relevant memories for current project/branch
Display: Recent work summary, relevant knowledge
```

**Session-end hook** (consolidates):
```
Event: session_ended
Action: Summarize session, store as episodic memory
Trigger: Consolidation pass (extract patterns from recent episodes)
```

### 5.6 Performance Requirements

| Operation | Target | Max |
|-----------|--------|-----|
| Store memory | <50ms | 200ms |
| Vector search (top 10) | <100ms | 500ms |
| Knowledge graph query | <50ms | 200ms |
| Hook capture (pre/post) | <30ms | 100ms |
| Session context load | <500ms | 2000ms |
| Embedding generation (Ollama) | <200ms | 1000ms |
| Embedding generation (Transformers.js) | <500ms | 3000ms |

---

## 6. Architecture Overview

See `ARCHITECTURE.md` for the detailed architecture document.

**High-level**:
```
                    +-----------------------+
                    |   AI Assistants       |
                    | (Claude, Gemini, etc) |
                    +-----------+-----------+
                                |
                         MCP Protocol
                                |
                    +-----------v-----------+
                    |  memory-mcp-server    |
                    |  (apps/memory-mcp)    |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |  @vibetech/memory     |
                    |  (packages/memory)    |
                    +---+------+------+----+
                        |      |      |
              +---------+  +---+---+  +--------+
              | Episodic|  |Semantic|  |Procedural|
              | Store   |  | Graph  |  | Store    |
              +----+----+  +---+---+  +----+----+
                   |           |           |
              +----v-----------v-----------v----+
              |        SQLite + sqlite-vec       |
              |      D:\databases\memory.db      |
              +---------------------------------+
                                |
              +-----------------v-----------------+
              |    Ollama (nomic-embed-text)      |
              |    localhost:11434                 |
              +----------------------------------+
```

---

## 7. D:\ Infrastructure Rebuild Plan

### 7.1 Directory Structure (Target State)

```
D:\
├── databases\
│   ├── memory.db              # NEW: Unified memory system
│   ├── agent_learning.db      # EXISTING: Migrate data to memory.db
│   ├── database.db            # EXISTING: General purpose
│   ├── trading.db             # EXISTING: Crypto trading
│   ├── nova_activity.db       # EXISTING: Nova agent
│   ├── vibe_justice.db        # EXISTING: Legal AI
│   ├── vibe-tutor.db          # EXISTING: Education app
│   ├── vibe_shop.db           # EXISTING: E-commerce
│   └── _archive\              # NEW: Move dormant DBs here
│       ├── knowledge_pool.db
│       ├── test_connect.db
│       └── ...
├── learning-system\
│   ├── embeddings\            # NEW: Cached embedding models
│   ├── exports\               # NEW: Memory exports/backups
│   ├── consolidation\         # NEW: Consolidation artifacts
│   └── _archive\              # OLD: Previous Python system
│       └── (existing content moved here)
├── logs\
│   ├── memory-system\         # NEW: Memory system logs
│   │   ├── operations.log
│   │   ├── consolidation.log
│   │   └── errors.log
│   ├── nova-agent\            # EXISTING
│   ├── self-healing\          # EXISTING
│   └── ...
├── cache\                     # NEW: Centralized cache
│   ├── nx\                    # Redirect .nx cache here
│   ├── vite\                  # Redirect Vite cache here
│   └── embeddings\            # Embedding model cache
└── health\                    # NEW: Health check data
    ├── last-check.json
    └── disk-usage.json
```

### 7.2 Database Consolidation

**Phase 1 (Safe)**: Create new memory.db alongside existing DBs
**Phase 2 (Optional)**: Migrate agent_learning.db data into memory.db
**Phase 3 (Optional)**: Archive dormant databases to D:\databases\_archive\

### 7.3 Health Monitoring

A scheduled PowerShell script runs daily at 3:00 AM:
- Check D:\ disk space (warn at 80%, critical at 90%)
- Verify all critical databases are accessible
- Check WAL file sizes (compact if >100MB)
- Rotate logs older than 30 days
- Report to D:\health\last-check.json

---

## 8. Integration Points

### 8.1 Existing MCP Servers

The new memory-mcp-server registers alongside existing servers in `.mcp.json`:

```json
{
  "memory-system": {
    "type": "stdio",
    "command": "node",
    "args": ["C:\\dev\\apps\\memory-mcp\\dist\\index.js"],
    "env": {
      "MEMORY_DB_PATH": "D:\\databases\\memory.db",
      "OLLAMA_BASE_URL": "http://localhost:11434",
      "EMBEDDING_MODEL": "nomic-embed-text",
      "EMBEDDING_DIMENSIONS": "768",
      "LOG_PATH": "D:\\logs\\memory-system"
    }
  }
}
```

### 8.2 Claude Code Hooks

Update `.claude/hooks/` to integrate with memory:
- `session-start.ps1` - Load relevant memories on startup
- `user-prompt-submit.ps1` - Capture user intent
- `pre-tool-use.ps1` - Log tool invocations (lightweight)
- `post-tool-use.ps1` - Log tool outcomes (lightweight)

### 8.3 Nx Integration

Both new packages register as Nx projects:
- `packages/memory` - Shared library with `build`, `test`, `lint` targets
- `apps/memory-mcp` - MCP server with `build`, `serve`, `test` targets
- Tagged: `scope:memory`, `type:library` / `type:app`

---

## 9. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Ollama not installed/running | No embeddings | Medium | Transformers.js fallback, graceful degradation |
| sqlite-vec Windows compatibility | Vector search broken | Low | Pure C, well-tested on Windows. Fallback to FTS5 |
| Hook latency slows Claude Code | Bad developer experience | Medium | Async hooks, <30ms budget, fire-and-forget |
| Memory.db corruption | Data loss | Low | WAL mode, daily backups, D:\ snapshots |
| Embedding model drift | Inconsistent search | Low | Lock model version, store model metadata with embeddings |
| Disk space on D:\ | System slowdown | Low | Health monitoring, auto-archive old data |

---

## 10. Success Criteria

### MVP (Phase 1)
- [ ] `packages/memory` builds and passes tests
- [ ] `apps/memory-mcp` starts and responds to MCP tool calls
- [ ] Can store and retrieve episodic memories with vector search
- [ ] D:\databases\memory.db created with correct schema
- [ ] Basic session-start hook loads recent work context

### Full System (Phase 2)
- [ ] All four memory types operational
- [ ] Hooks capture tool usage patterns
- [ ] Consolidation loop extracts semantic knowledge from episodes
- [ ] Knowledge graph has 100+ entities about the monorepo
- [ ] Vector search returns relevant results in <100ms

### Mature System (Phase 3)
- [ ] Cross-session continuity works seamlessly
- [ ] Procedural memories suggest workflows proactively
- [ ] Health monitoring runs on schedule
- [ ] All AI assistants access the same memory via MCP
- [ ] Memory system has been running for 30+ days without issues

---

## 11. Open Questions

1. **Ollama installation**: Is Ollama already installed? If not, should we include installation in Phase 0?
2. **Embedding dimension**: 768 (nomic-embed-text) vs 384 (all-MiniLM-L6-v2)? Using both requires separate vec tables or dimension normalization.
3. **Memory retention**: How long should episodic memories be kept before decay/archival? Default: 90 days.
4. **Consolidation frequency**: How often should episodic-to-semantic consolidation run? Default: End of each session + daily.

---

## Appendix A: Research Sources

- [sqlite-vec](https://github.com/asg017/sqlite-vec) - Vector search SQLite extension
- [A-Mem: Agentic Memory](https://arxiv.org/abs/2502.12110) - NeurIPS 2025, Zettelkasten-inspired
- [Letta/MemGPT](https://www.letta.com/blog/agent-memory) - OS-inspired memory architecture
- [Ollama Embeddings](https://docs.ollama.com/capabilities/embeddings) - Local embedding generation
- [MCP Memory Server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) - Official knowledge graph MCP
- [Transformers.js v4](https://huggingface.co/blog/transformersjs-v4) - In-process embeddings for Node.js
- [nomic-embed-text](https://ollama.com/library/nomic-embed-text) - Embedding model
- [LanceDB](https://docs.lancedb.com) - Embedded vector database (evaluated, not selected)
- [SimpleMem](https://github.com/aiming-lab/SimpleMem) - Efficient lifelong memory (Feb 2026)
- [ICLR 2026 MemAgents Workshop](https://openreview.net/pdf?id=U51WxL382H) - Academic memory research
