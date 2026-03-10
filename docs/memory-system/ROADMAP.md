# Project Roadmap: VibeTech Memory & Learning System

**Version**: 1.0.0
**Date**: 2026-02-12
**Related**: PRD.md, ARCHITECTURE.md
**Status**: READY FOR EXECUTION

---

## Executive Summary

This roadmap breaks down the memory system implementation into 4 phases over approximately **3-4 weeks**:

- **Phase 0**: Prerequisites & Setup (2-3 days)
- **Phase 1**: Core Memory Infrastructure (MVP) (1 week)
- **Phase 2**: Advanced Features & Learning (1 week)
- **Phase 3**: Integration & Polish (3-5 days)
- **Phase 4**: Production Hardening (ongoing)

Each phase builds on the previous, with clear deliverables and success criteria.

---

## Phase 0: Prerequisites & Setup

**Duration**: 2-3 days
**Goal**: Verify all dependencies and prepare the environment

### Tasks

#### T0.1: Verify Ollama Installation
**Priority**: HIGH
**Estimated Time**: 30 minutes

- [ ] Check if Ollama is installed: `ollama --version`
- [ ] If not installed, download from https://ollama.com
- [ ] Install ollama as Windows service
- [ ] Pull embedding model: `ollama pull nomic-embed-text`
- [ ] Test embedding: `ollama run nomic-embed-text "test"`
- [ ] Verify service runs on startup

**Success Criteria**: `curl http://localhost:11434/api/tags` returns nomic-embed-text

---

#### T0.2: Verify D:\ Structure
**Priority**: HIGH
**Estimated Time**: 1 hour

- [ ] Check current D:\ structure
- [ ] Verify write permissions to D:\databases, D:\logs
- [ ] Test SQLite write: create test.db, write record, delete
- [ ] Confirm disk space (need at least 10GB free)

**Success Criteria**: All directories writable, >10GB free

---

#### T0.3: Create D:\ Scaffold
**Priority**: MEDIUM
**Estimated Time**: 30 minutes

```powershell
# Create directory structure
New-Item -Path "D:\databases\_archive" -ItemType Directory -Force
New-Item -Path "D:\learning-system\embeddings" -ItemType Directory -Force
New-Item -Path "D:\learning-system\exports" -ItemType Directory -Force
New-Item -Path "D:\learning-system\consolidation" -ItemType Directory -Force
New-Item -Path "D:\learning-system\_archive" -ItemType Directory -Force
New-Item -Path "D:\logs\memory-system" -ItemType Directory -Force
New-Item -Path "D:\cache\embeddings" -ItemType Directory -Force
New-Item -Path "D:\health" -ItemType Directory -Force

# Archive old Python learning system
Move-Item "D:\learning-system\*.py" "D:\learning-system\_archive\" -Force -ErrorAction SilentlyContinue
Move-Item "D:\learning-system\.venv" "D:\learning-system\_archive\" -Force -ErrorAction SilentlyContinue
```

**Success Criteria**: All new directories exist

---

#### T0.4: Install Dependencies
**Priority**: HIGH
**Estimated Time**: 30 minutes

```bash
# Install packages (from C:\dev root)
pnpm add better-sqlite3 sqlite-vec --filter @vibetech/memory
pnpm add ollama --filter @vibetech/memory
pnpm add @huggingface/transformers --filter @vibetech/memory
pnpm add winston --filter @vibetech/memory
pnpm add zod --filter @vibetech/memory

pnpm add @modelcontextprotocol/sdk --filter memory-mcp
pnpm add express --filter memory-mcp
pnpm add zod --filter memory-mcp
```

**Success Criteria**: All packages install without errors

---

#### T0.5: Archive Existing Databases (Optional)
**Priority**: LOW
**Estimated Time**: 1 hour

- [ ] Identify dormant databases in D:\databases\
- [ ] Create backup: `Copy-Item D:\databases\*.db D:\databases\_archive\backup-2026-02-12\`
- [ ] Test database connectivity: open each with better-sqlite3
- [ ] Move dormant DBs to D:\databases\_archive\
- [ ] Document what was archived

**Dormant Candidates**: knowledge_pool.db, test_connect.db, demo.db

**Success Criteria**: Critical DBs (trading.db, database.db, nova_activity.db) remain, dormant DBs archived

---

### Phase 0 Deliverables

- [x] Ollama running with nomic-embed-text model
- [x] D:\ directory structure created
- [x] All npm dependencies installed
- [x] Database cleanup completed (optional)

---

## Phase 1: Core Memory Infrastructure (MVP)

**Duration**: 1 week (5-7 days)
**Goal**: Working memory system with basic episodic and semantic storage

### Tasks

#### T1.1: Create Package Structure
**Priority**: HIGH
**Estimated Time**: 2 hours

```bash
# Create packages/memory
pnpm nx g @nx/js:library memory \
  --directory=packages/memory \
  --buildable \
  --publishable \
  --importPath=@vibetech/memory

# Create apps/memory-mcp
pnpm nx g @nx/node:application memory-mcp \
  --directory=apps/memory-mcp \
  --framework=none
```

- [ ] Set up directory structure per ARCHITECTURE.md
- [ ] Configure tsconfig.json with strict mode
- [ ] Set up project.json with build/test/lint targets
- [ ] Add to WORKSPACE.json
- [ ] Configure package.json exports

**Success Criteria**: `pnpm nx build memory` succeeds

---

#### T1.2: Database Schema & Migrations
**Priority**: HIGH
**Estimated Time**: 4 hours

**File**: `packages/memory/src/db/schema.ts`

- [ ] Define SQL schema (see ARCHITECTURE.md §5.1)
- [ ] Create tables: episodic_memories, semantic_entities, semantic_relations, semantic_observations, procedural_memories, sessions, consolidation_log
- [ ] Create vec0 virtual tables for each memory type
- [ ] Create FTS5 tables for hybrid search
- [ ] Create triggers for FTS sync
- [ ] Write migration runner
- [ ] Test schema creation on fresh DB

**Success Criteria**: `memory.db` created with all tables, no SQL errors

---

#### T1.3: Database Connection Manager
**Priority**: HIGH
**Estimated Time**: 3 hours

**File**: `packages/memory/src/db/connection.ts`

```typescript
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

export class DatabaseConnection {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    // Load sqlite-vec
    sqliteVec.load(this.db);

    // Configure pragmas
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
  }

  query<T>(sql: string, params: any[] = []): T[] { /* ... */ }
  execute(sql: string, params: any[] = []): void { /* ... */ }
  transaction(fn: () => void): void { /* ... */ }
  close(): void { /* ... */ }
}
```

- [ ] Implement connection pooling (single connection for SQLite)
- [ ] Add prepared statement caching
- [ ] Add transaction helpers
- [ ] Add error handling with retries
- [ ] Write unit tests

**Success Criteria**: Can connect to DB, run queries, handle errors gracefully

---

#### T1.4: Embedding Service
**Priority**: HIGH
**Estimated Time**: 6 hours

**File**: `packages/memory/src/core/EmbeddingService.ts`

- [ ] Implement Ollama client wrapper
- [ ] Implement Transformers.js fallback
- [ ] Add LRU cache (max 1000 entries)
- [ ] Add dimension normalization (384d → 768d zero-padding)
- [ ] Add batch embedding support
- [ ] Implement health check (detect if Ollama is running)
- [ ] Write unit tests
- [ ] Write integration tests (requires Ollama running)

**Success Criteria**: Can generate embeddings via both providers, cache works, fallback activates when Ollama down

---

#### T1.5: Episodic Store
**Priority**: HIGH
**Estimated Time**: 6 hours

**File**: `packages/memory/src/stores/EpisodicStore.ts`

```typescript
export class EpisodicStore {
  async store(memory: EpisodicMemory): Promise<number> {
    // 1. Generate embedding
    const embedding = await this.embeddings.embed(memory.content);

    // 2. Insert into episodic_memories
    const id = this.db.execute(
      `INSERT INTO episodic_memories(...) VALUES(...)`,
      [...]
    );

    // 3. Insert embedding into vec_episodic
    this.db.execute(
      `INSERT INTO vec_episodic(memory_id, embedding) VALUES(?, ?)`,
      [id, embedding.buffer]
    );

    return id;
  }

  async search(query: string, options: SearchOptions): Promise<EpisodicMemory[]> {
    // Vector search
  }

  async getRecent(options: RecentOptions): Promise<EpisodicMemory[]> {
    // Temporal retrieval
  }
}
```

- [ ] Implement store() method with transaction
- [ ] Implement search() with vector similarity
- [ ] Implement getRecent() with temporal filters
- [ ] Add keyword extraction (simple: split + filter stop words)
- [ ] Add importance scoring heuristic
- [ ] Write comprehensive tests

**Success Criteria**: Can store episodes with embeddings, retrieve by similarity and recency

---

#### T1.6: Semantic Store
**Priority**: HIGH
**Estimated Time**: 8 hours

**File**: `packages/memory/src/stores/SemanticStore.ts`

- [ ] Implement createEntity()
- [ ] Implement addObservation()
- [ ] Implement createRelation()
- [ ] Implement queryKnowledge() (graph traversal)
- [ ] Implement searchEntities() (vector search on entities)
- [ ] Add entity merging logic (handle duplicates)
- [ ] Add confidence scoring
- [ ] Write tests

**Success Criteria**: Can create entities with observations, link them, query the graph

---

#### T1.7: Memory Manager (Core API)
**Priority**: HIGH
**Estimated Time**: 6 hours

**File**: `packages/memory/src/core/MemoryManager.ts`

```typescript
export class MemoryManager {
  private episodic: EpisodicStore;
  private semantic: SemanticStore;
  private embeddings: EmbeddingService;
  private db: DatabaseConnection;

  constructor(config: MemoryConfig) { /* ... */ }

  async initialize(): Promise<void> {
    // Initialize DB, run migrations, health check
  }

  // Episodic API
  async storeEpisode(memory: EpisodicMemory): Promise<number> {
    return this.episodic.store(memory);
  }

  async searchEpisodes(query: string, options?: SearchOptions): Promise<EpisodicMemory[]> {
    return this.episodic.search(query, options);
  }

  // Semantic API
  async storeFact(fact: SemanticFact): Promise<number> {
    return this.semantic.createEntity(fact);
  }

  async queryKnowledge(query: KnowledgeQuery): Promise<SemanticEntity[]> {
    return this.semantic.queryKnowledge(query);
  }

  // Unified search
  async search(query: string, options: UnifiedSearchOptions): Promise<SearchResult[]> {
    // Search across all enabled memory types, merge results
  }

  async getHealth(): Promise<HealthStatus> {
    // Return health metrics
  }
}
```

- [ ] Implement all public methods
- [ ] Add session management (getCurrentSession, startSession, endSession)
- [ ] Add unified search with RRF
- [ ] Add health monitoring
- [ ] Write integration tests

**Success Criteria**: Full API works end-to-end, can store and retrieve from both memory types

---

#### T1.8: Basic MCP Server
**Priority**: HIGH
**Estimated Time**: 6 hours

**File**: `apps/memory-mcp/src/index.ts`

- [ ] Set up MCP SDK server
- [ ] Register 4 core tools:
  - `memory_store_episode`
  - `memory_search`
  - `memory_store_fact`
  - `memory_query_knowledge`
- [ ] Add input validation (Zod schemas)
- [ ] Add error handling
- [ ] Add logging (winston)
- [ ] Test via `node dist/index.js` and manual MCP calls

**Success Criteria**: MCP server starts, tools respond correctly to test inputs

---

#### T1.9: MCP Integration Testing
**Priority**: MEDIUM
**Estimated Time**: 2 hours

- [ ] Add memory-system to `.mcp.json`
- [ ] Restart Claude Code
- [ ] Verify tools appear in tool list
- [ ] Test `memory_store_episode` with real data
- [ ] Test `memory_search` query
- [ ] Test `memory_store_fact`
- [ ] Verify data persists in D:\databases\memory.db

**Success Criteria**: Can use memory tools from Claude Code successfully

---

### Phase 1 Deliverables

- [x] `@vibetech/memory` package builds and passes tests
- [x] `apps/memory-mcp` MCP server runs and responds to tools
- [x] Can store and retrieve episodic memories
- [x] Can store and query semantic knowledge graph
- [x] Vector search works for both memory types
- [x] MCP integration confirmed in Claude Code

**Milestone**: MVP functional memory system ✅

---

## Phase 2: Advanced Features & Learning

**Duration**: 1 week (5-7 days)
**Goal**: Add procedural memory, consolidation, and hook-based learning

### Tasks

#### T2.1: Procedural Store
**Priority**: MEDIUM
**Estimated Time**: 4 hours

**File**: `packages/memory/src/stores/ProceduralStore.ts`

- [ ] Implement storeProcedure()
- [ ] Implement getProcedure() with trigger pattern matching
- [ ] Add success/failure tracking
- [ ] Add last-used timestamp updates
- [ ] Write tests

**Success Criteria**: Can store and retrieve procedures, track success rates

---

#### T2.2: Consolidation Service
**Priority**: HIGH
**Estimated Time**: 8 hours

**File**: `packages/memory/src/core/ConsolidationService.ts`

**Algorithm**:
1. Query recent episodic memories (last session or last N hours)
2. Group by similarity (vector clustering)
3. Extract patterns (frequent n-grams, common entities)
4. Propose semantic entities or procedural memories
5. Store with source attribution
6. Log to consolidation_log table

- [ ] Implement pattern extraction (frequency analysis)
- [ ] Implement entity extraction (NER via simple heuristics or LLM call)
- [ ] Implement procedural pattern detection (repeated sequences)
- [ ] Add confidence scoring
- [ ] Add manual approval mode (optional)
- [ ] Write tests

**Success Criteria**: Can consolidate 100 episodes into 5-10 semantic facts, logged correctly

---

#### T2.3: Search Engine Enhancements
**Priority**: MEDIUM
**Estimated Time**: 6 hours

**File**: `packages/memory/src/core/SearchEngine.ts`

- [ ] Implement Reciprocal Rank Fusion (RRF)
- [ ] Add temporal decay scoring
- [ ] Add importance weighting
- [ ] Add re-ranking by relevance
- [ ] Add result deduplication
- [ ] Write tests

**Success Criteria**: Hybrid search outperforms vector-only on test queries

---

#### T2.4: Hook Integration - HTTP API
**Priority**: HIGH
**Estimated Time**: 4 hours

**File**: `apps/memory-mcp/src/api/httpServer.ts`

```typescript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/memory/episode', async (req, res) => {
  // Non-blocking episodic storage
  setImmediate(() => storeEpisodeAsync(req.body));
  res.status(202).json({ status: 'accepted' });
});

app.listen(3333, 'localhost');
```

- [ ] Set up Express server
- [ ] Add /api/memory/episode endpoint
- [ ] Add /api/health endpoint
- [ ] Add request logging
- [ ] Add rate limiting (max 1000 req/min)
- [ ] Test with curl

**Success Criteria**: HTTP API accepts episode POSTs, returns 202 immediately

---

#### T2.5: PowerShell Hooks
**Priority**: HIGH
**Estimated Time**: 6 hours

**Files**:
- `.claude/hooks/post-tool-use.ps1`
- `.claude/hooks/session-start.ps1`
- `.claude/hooks/session-end.ps1`

**post-tool-use.ps1**:
- [ ] Extract tool name, success/failure, duration
- [ ] Detect current project from `pwd`
- [ ] POST to http://localhost:3333/api/memory/episode
- [ ] Add timeout (1 second max)
- [ ] Silent failure (log to D:\logs\hooks\ if needed)
- [ ] Test with real tool executions

**session-start.ps1**:
- [ ] Call MCP `memory_search` to load recent project context
- [ ] Format as markdown summary
- [ ] Return as hook output (displayed to user)
- [ ] Test with Claude Code restart

**session-end.ps1**:
- [ ] Trigger consolidation via MCP `memory_consolidate`
- [ ] Log session summary
- [ ] Test at session end

**Success Criteria**: Hooks execute in <30ms, don't block Claude Code, data appears in DB

---

#### T2.6: Decay & Archival
**Priority**: LOW
**Estimated Time**: 3 hours

**File**: `packages/memory/src/utils/decay.ts`

- [ ] Implement time-based decay function (exponential decay)
- [ ] Implement access-based boost (recently accessed = higher importance)
- [ ] Add scheduled task to apply decay daily
- [ ] Add archival logic (move decayed episodes to episodic_archive after 90 days)
- [ ] Write tests

**Success Criteria**: Old, unaccessed memories have lower importance scores

---

#### T2.7: Remaining MCP Tools
**Priority**: MEDIUM
**Estimated Time**: 4 hours

Add remaining tools to MCP server:
- [ ] `memory_store_procedure`
- [ ] `memory_get_procedure`
- [ ] `memory_consolidate`
- [ ] `memory_health`
- [ ] `memory_forget`
- [ ] `memory_recall_recent`

**Success Criteria**: All 10 MCP tools registered and functional

---

### Phase 2 Deliverables

- [x] Procedural memory store working
- [x] Consolidation service extracts patterns from episodes
- [x] Hooks capture tool usage and store to memory
- [x] Session start/end hooks provide context and consolidate
- [x] All 10 MCP tools available
- [x] Decay and archival logic implemented

**Milestone**: Active learning system operational ✅

---

## Phase 3: Integration & Polish

**Duration**: 3-5 days
**Goal**: Production-ready system with monitoring, documentation, and optimizations

### Tasks

#### T3.1: Logging & Monitoring
**Priority**: HIGH
**Estimated Time**: 4 hours

- [ ] Set up Winston logger with rotation (daily logs, keep 30 days)
- [ ] Add structured logging (JSON format)
- [ ] Add performance metrics (latency tracking per operation)
- [ ] Add error tracking with context
- [ ] Create log analysis script (top errors, slow queries)

**Files**: D:\logs\memory-system\operations.log, errors.log

**Success Criteria**: All operations logged, can diagnose issues from logs

---

#### T3.2: Health Check Script
**Priority**: MEDIUM
**Estimated Time**: 3 hours

**File**: `C:\dev\scripts\memory-health-check.ps1`

- [ ] Check DB accessibility
- [ ] Check WAL size, checkpoint if >100MB
- [ ] Check disk space on D:\
- [ ] Check Ollama availability
- [ ] Check HTTP API responsiveness
- [ ] Generate health report (D:\health\memory-system.json)
- [ ] Schedule as Windows Task (daily 3:00 AM)

**Success Criteria**: Script runs successfully, identifies issues

---

#### T3.3: Performance Optimization
**Priority**: MEDIUM
**Estimated Time**: 6 hours

- [ ] Add query optimization (EXPLAIN QUERY PLAN analysis)
- [ ] Add indexes on frequently queried columns
- [ ] Optimize embedding cache (LRU with size limit)
- [ ] Add batch insertion for episodes (insert 10 at once vs 10 separate)
- [ ] Profile slow operations (use console.time)
- [ ] Document performance characteristics

**Target**: All operations <200ms (except consolidation)

**Success Criteria**: 95th percentile latency meets targets from ARCHITECTURE.md

---

#### T3.4: Error Recovery
**Priority**: HIGH
**Estimated Time**: 4 hours

- [ ] Add automatic DB repair (PRAGMA integrity_check, rebuild if corrupt)
- [ ] Add embedding service fallback retry logic
- [ ] Add WAL checkpoint on startup
- [ ] Add graceful degradation (continue if vector search fails, use keyword only)
- [ ] Test failure scenarios (Ollama down, DB locked, disk full)

**Success Criteria**: System continues operating (degraded mode) during failures

---

#### T3.5: Documentation
**Priority**: MEDIUM
**Estimated Time**: 6 hours

Create these files:
- [ ] `packages/memory/README.md` - API documentation, usage examples
- [ ] `apps/memory-mcp/README.md` - MCP tool reference, setup guide
- [ ] `docs/memory-system/USER_GUIDE.md` - End-user guide for Claude Code users
- [ ] `docs/memory-system/DEVELOPER_GUIDE.md` - Guide for extending the system
- [ ] `docs/memory-system/TROUBLESHOOTING.md` - Common issues and solutions

**Success Criteria**: New developers can understand and use the system from docs alone

---

#### T3.6: Testing
**Priority**: HIGH
**Estimated Time**: 8 hours

- [ ] Unit test coverage >80% for core modules
- [ ] Integration tests for full workflows (store → search → retrieve)
- [ ] Load testing (1000 episodes, search performance)
- [ ] Hook latency testing (<30ms requirement)
- [ ] MCP tool testing (all 10 tools with various inputs)
- [ ] Error case testing (malformed input, network failures)
- [ ] Add to CI/CD (Nx affected tests)

**Success Criteria**: All tests pass, coverage targets met

---

#### T3.7: Migration from agent_learning.db (Optional)
**Priority**: LOW
**Estimated Time**: 4 hours

- [ ] Read agent_learning.db schema
- [ ] Extract relevant records
- [ ] Map to episodic_memories schema
- [ ] Bulk insert with embeddings (may be slow - run overnight)
- [ ] Verify migration success
- [ ] Archive old database

**Success Criteria**: Historical data accessible in new system

---

### Phase 3 Deliverables

- [x] Production-grade logging and monitoring
- [x] Health checks running on schedule
- [x] Performance optimized (meets latency targets)
- [x] Error recovery and graceful degradation
- [x] Complete documentation
- [x] Comprehensive test coverage
- [x] (Optional) Historical data migrated

**Milestone**: Production-ready system ✅

---

## Phase 4: Production Hardening (Ongoing)

**Duration**: Ongoing maintenance
**Goal**: Maintain system health, iterate based on usage

### Tasks

#### T4.1: Usage Monitoring (Week 1-2)
**Priority**: MEDIUM
**Ongoing**

- [ ] Monitor logs daily
- [ ] Track most common queries
- [ ] Identify slow operations
- [ ] Measure hook latency in real usage
- [ ] Collect user feedback

---

#### T4.2: Optimization Iteration (Week 3-4)
**Priority**: MEDIUM
**Ongoing**

- [ ] Optimize identified slow queries
- [ ] Tune embedding cache size based on hit rate
- [ ] Adjust consolidation frequency based on episode volume
- [ ] Improve search result quality (tune RRF weights)

---

#### T4.3: Feature Requests (Ongoing)
**Priority**: LOW
**Ongoing**

Potential future enhancements:
- [ ] Multi-session replay ("show me what I did on this project last week")
- [ ] Export/import memories (share knowledge between machines)
- [ ] Memory visualization (graph visualization of knowledge graph)
- [ ] LLM-powered consolidation (use Claude API for smarter pattern extraction)
- [ ] Cross-project insights ("find similar patterns across all projects")

---

## Timeline Overview

```
Week 1: Phase 0 + Start Phase 1
├─ Mon-Tue: Prerequisites (T0.1-T0.5)
├─ Wed: Package structure + DB schema (T1.1-T1.2)
├─ Thu: DB connection + Embeddings (T1.3-T1.4)
└─ Fri: Episodic store start (T1.5)

Week 2: Finish Phase 1
├─ Mon: Episodic + Semantic stores (T1.5-T1.6)
├─ Tue: Memory Manager API (T1.7)
├─ Wed-Thu: MCP Server (T1.8)
└─ Fri: Integration testing (T1.9)

Week 3: Phase 2
├─ Mon: Procedural store (T2.1)
├─ Tue: Consolidation service (T2.2)
├─ Wed: Search enhancements (T2.3)
├─ Thu: Hooks (T2.4-T2.5)
└─ Fri: Remaining MCP tools (T2.6-T2.7)

Week 4: Phase 3
├─ Mon: Logging + Health checks (T3.1-T3.2)
├─ Tue: Performance + Error recovery (T3.3-T3.4)
├─ Wed: Documentation (T3.5)
├─ Thu-Fri: Testing (T3.6)

Week 5+: Phase 4 (Ongoing)
├─ Monitor usage
├─ Iterate on performance
└─ Consider feature requests
```

**Total Estimated Time**: 3-4 weeks for Phases 0-3

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ollama not working | HIGH | Transformers.js fallback, clear installation guide |
| sqlite-vec Windows issues | MEDIUM | Well-tested on Windows, fallback to FTS5-only |
| Hook latency too high | MEDIUM | Fire-and-forget HTTP, 1s timeout, silent fail |
| DB corruption | LOW | WAL mode, daily health checks, D:\ snapshots |
| Embedding quality poor | MEDIUM | Tune models, add re-ranking, hybrid search |

---

## Success Metrics (30-Day Post-Launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | >99% | MCP server restarts / total time |
| Search recall (relevant results in top 10) | >80% | Manual evaluation on 50 test queries |
| Hook latency (p95) | <50ms | Log analysis |
| Episodes stored | >1000 | DB count |
| Semantic entities created | >100 | DB count |
| Consolidation success rate | >70% | Manual review of consolidated facts |
| User satisfaction | Positive feedback | Informal survey |

---

## Next Steps

1. **Get approval** on PRD + ARCHITECTURE + ROADMAP from stakeholder (Bruce)
2. **Create CONTEXT.md** tracking file for live updates during implementation
3. **Start Phase 0** - Verify prerequisites
4. **Begin implementation** following task order in roadmap
5. **Update CONTEXT.md** after each task completion with:
   - [x] Task completion status
   - Actual time taken vs estimate
   - Any deviations or issues
   - Decisions made
   - Blockers encountered

---

## Appendix: Task Dependencies

```
Phase 0 (all tasks can run in parallel)
  ├─ T0.1 → T1.4 (Embedding service needs Ollama)
  ├─ T0.2 → T1.2 (DB schema needs writable D:\)
  ├─ T0.3 → (no blockers)
  ├─ T0.4 → T1.1 (Package creation needs deps)
  └─ T0.5 → (optional, no blockers)

Phase 1
  ├─ T1.1 → T1.2, T1.3, T1.4 (schema/connection/embeddings need package structure)
  ├─ T1.2 → T1.3 (connection needs schema)
  ├─ T1.3 + T1.4 → T1.5, T1.6 (stores need DB and embeddings)
  ├─ T1.5 + T1.6 → T1.7 (MemoryManager needs stores)
  ├─ T1.7 → T1.8 (MCP server needs MemoryManager API)
  └─ T1.8 → T1.9 (integration testing needs MCP server)

Phase 2
  ├─ T1.7 → T2.1 (ProceduralStore follows same pattern as Episodic/Semantic)
  ├─ T1.5 + T1.6 → T2.2 (Consolidation needs existing stores)
  ├─ T1.7 → T2.3 (Search engine enhancement uses MemoryManager)
  ├─ T1.8 → T2.4 (HTTP API extends MCP server)
  ├─ T2.4 → T2.5 (Hooks need HTTP API)
  └─ T2.1, T2.2, T2.3 → T2.7 (Remaining tools use new features)

Phase 3 (minimal dependencies)
  └─ All Phase 2 complete → Phase 3 tasks
```

---

**End of Roadmap Document**

**Ready for:** Stakeholder approval and Phase 0 kickoff

