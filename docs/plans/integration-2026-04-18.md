# Monorepo Self-Evolution — Integration Design

Date: 2026-04-18
Author: The Architect (system-design review for Bruce)
Scope: C:\dev monorepo + D:\databases + D:\learning-system + D:\ memory sprawl
Goal: Make the monorepo work *for itself* — writes from any app flow into memory, learning, and RAG; nightly self-analysis produces prioritized Finisher tasks without human glue.

> Superseded safety note (2026-04-25): database cleanup guidance in this plan must
> be rechecked against `D:\databases\DB_INVENTORY.md` before use. `database.db` is
> currently an active Hub DB and must not be renamed without a coordinated fan-out
> migration.

---

## 1. What's actually wired today

```
┌─────────────────────── C:\dev (code) ──────────────────────────┐
│                                                                 │
│  apps/memory-mcp (stdio + HTTP:3200)                            │
│    ├─ imports @vibetech/memory  (packages/memory)               │
│    ├─ relative-imports ../nova-agent/src/rag/*  ← tight coupling│
│    ├─ LearningBridge → reads agent_learning.db  ← sync          │
│    └─ AutoCapture → writes memory.db  (episodic/semantic/proc)  │
│                                                                 │
│  apps/mcp-rag-server (stdio)                                    │
│    ├─ OWN copy of RAG in src/rag/*  ← DUPLICATE of nova-agent   │
│    ├─ TradingConnector → D:\databases\trading.db                │
│    └─ LearningConnector → D:\databases\agent_learning.db        │
│                                                                 │
│  apps/workspace-mcp-server (stdio)                              │
│    └─ Read-only config registry (env, ports, mcp.json, dbs)     │
│                                                                 │
│  apps/mcp-skills-server (stdio) ............. DEPRECATED.md     │
│  apps/desktop-commander-v3 ......... powered by dc_*            │
│  apps/mcp-gateway (dev) ............ not wired in .mcp.json     │
│  apps/mcp-codeberg ................. git ops                    │
│  apps/vibetech-command-center ...... dashboard                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────── D:\databases (18 SQLite files) ────────────────┐
│                                                                 │
│  LIVE (touched this week):                                      │
│    memory.db        12.4 MB   ← episodic/semantic/procedural    │
│    agent_learning.db  21 MB   ← 57k+ executions, patterns       │
│    trading.db        0.01 MB  ← stub, mostly empty              │
│                                                                 │
│  WARM (4/12 maintenance cycle only):                            │
│    vibe_studio.db    56.7 MB  ← editor activity                 │
│    nova_activity.db  16.4 MB  ← activity_events, deep_work      │
│    vibe_justice.db    0.2 MB  ← legal case data                 │
│    database.db        0.6 MB  ← "unified legacy" (ambiguous)    │
│    agent_tasks.db     0.1 MB  ← Nova task registry              │
│                                                                 │
│  DEAD / STUB (≤0.1 MB, 0 useful rows):                          │
│    chatmessage.db, claude_newchatmessage.db, learning.db,       │
│    digital-content-builder.db (app deleted 2026-02-17!),        │
│    feature_flags.db, monitor.db, job_queue.db, trendmart.db,    │
│    vibe_shop.db, cleanup_automation.db                          │
│                                                                 │
│  Orphan subdirs: chromadb/, learning/, shared-memory/,          │
│    nova/, nova-agent/, nova-data/, vibe-code-studio/,           │
│    vibe-studio/, prompt-engineer/, simple_cache/,               │
│    _archive_*, n8n-*/, data-pipeline/, task-registry/           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────── D:\learning-system (Python, separate stack) ────────┐
│                                                                 │
│  learning_engine.py  session_start.ps1  session_end.ps1         │
│  data/execution_log.json   ← writes JSON, NOT the DB            │
│  data/learning_insights.json                                    │
│  data/system_improvements.json                                  │
│  sessions/ knowledge_inbox/ skill-generation/ fixers/           │
│                                                                 │
│  ↯ NOT CONNECTED to memory-mcp or agent_learning.db             │
│  ↯ Python writes JSON files; memory-mcp reads SQLite only       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────── D:\ sprawl (other data mounts) ────────────────────┐
│  nova-agent-data/    ← LanceDB + RAG cache (owned by rag)     │
│  trading_data/ trading_logs/ .trading_bot/   ← 3 trading dirs │
│  vibe-tech-data/ VibeJusticeData/ walmart-lawsuit/            │
│  self-healing/ autoresearch/                                  │
│  pnpm-store/ pnpm-store-v2/  ← TWO pnpm stores                │
│  nx-cache/ nx-workspace-data/                                 │
│  logsopenrouter-proxy/   ← typo of logs\openrouter-proxy      │
│  archive/ Archives/ _backups/   ← THREE backup roots          │
└─────────────────────────────────────────────────────────────────┘
```

## 2. The seven frictions

1. **Two RAG implementations.** `apps/mcp-rag-server/src/rag/*` duplicates `apps/nova-agent/src/rag/*`. memory-mcp's `rag-bridge.ts` imports across app boundaries with relative paths — fragile tsup build, reindex race if both run.
2. **D:\learning-system is an island.** Python engine writes JSON; LearningBridge reads SQLite. The 57k execution history documented in HOW_LEARNING_WORKS.md lives in `database.db` but that DB is 0.6MB — the history is actually in `agent_learning.db`. Docs are stale.
3. **18 SQLite files, ≥10 are dead.** No CDC, no unified schema registry. `database.db` is ambiguously named. `learning.db` was replaced by `agent_learning.db` months ago but still sits there.
4. **No write-side event bus.** Any app that writes (vtde activity, nova actions, trading, git commits) is a silo. Memory only captures what flows through `memory-mcp` itself — vtde writing `nova_activity.db` directly bypasses it.
5. **Embedding endpoint is implicit.** Three consumers (memory-mcp, rag-bridge, mcp-rag-server) all hit `http://localhost:3001` assuming the OpenRouter proxy exposes OpenAI-compatible `/v1/embeddings`. No shared interface, no health check, no fallback wiring.
6. **Self-healing / autoresearch / learning-system are three separate maintenance brains.** All do "detect pattern → suggest fix" but none write back into the same place. Nothing consolidates their outputs into a priority queue.
7. **WORKSPACE.json is hand-edited.** `recentActivity` is appended manually. The system knows more about itself (git log, agent_learning.db, memory.db patterns) than that file captures, but doesn't write it down.

## 3. Target architecture — one brain, one bus

```
                    ┌─────────────────────────────────┐
                    │   @vibetech/embeddings-service  │
                    │   OpenAI-compatible /v1/embed   │
                    │   port 3001 (OpenRouter proxy)  │
                    │   or local fallback             │
                    └─────────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
    ┌─────────▼─────────┐   ┌─────────▼─────────┐   ┌────────▼────────┐
    │  packages/memory  │   │   packages/rag    │   │  packages/     │
    │  (episodic,       │   │  (LanceDB, FTS,   │   │  learning      │
    │  semantic,        │   │  indexer shared   │   │  (executions,  │
    │  procedural)      │   │  by nova + mcp)   │   │  patterns,     │
    │                   │   │                   │   │  knowledge)    │
    └─────────┬─────────┘   └─────────┬─────────┘   └────────┬───────┘
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      │
                        ┌─────────────▼──────────────┐
                        │   @vibetech/event-bus      │
                        │  SQLite-backed append log  │
                        │  D:\databases\events.db    │
                        │  topic + ts + payload JSON │
                        │  fan-out via LISTEN/poll   │
                        └─────────────┬──────────────┘
                                      │
       ┌──────────────────┬───────────┼───────────┬──────────────────┐
       │                  │           │           │                  │
   ┌───▼───┐        ┌────▼───┐  ┌────▼────┐ ┌───▼───┐         ┌────▼────┐
   │ vtde  │        │ nova-  │  │ trading │ │ git   │         │ self-   │
   │ app   │        │ agent  │  │ bot     │ │ hooks │         │ healing │
   └───────┘        └────────┘  └─────────┘ └───────┘         └─────────┘
                        any write → one event → all three brains observe
```

**Principle:** every durable write becomes an event on the bus. Memory, RAG, and Learning are pure consumers. The three existing maintenance brains (self-healing, autoresearch, learning-system) converge into one scheduler that reads all three brains and emits priorities.

## 4. Concrete consolidation plan

### 4.1 Database cleanup (Week 1 — 2 hours, zero risk)

Backup first, then delete the zero-value DBs. These aren't referenced by any app in `.mcp.json` and the owning apps are gone or stubs.

```powershell
# Backup
Compress-Archive `
  -Path D:\databases\*.db,D:\databases\*.db-shm,D:\databases\*.db-wal `
  -DestinationPath "D:\_backups\databases_pre-cleanup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip" `
  -CompressionLevel Optimal

# Grep for each candidate first — only delete if zero hits
$victims = @(
  'chatmessage','claude_newchatmessage','learning',
  'digital-content-builder','feature_flags','monitor',
  'job_queue','trendmart','vibe_shop','cleanup_automation'
)
foreach ($v in $victims) {
  $hits = Get-ChildItem C:\dev -Recurse -Include *.ts,*.tsx,*.py,*.json `
    -ErrorAction SilentlyContinue |
    Select-String -Pattern "$v\.db" -SimpleMatch
  if (-not $hits) {
    Remove-Item "D:\databases\$v.db*" -Force
    Write-Host "Removed $v.db*"
  } else {
    Write-Host "KEEP $v.db — referenced by $($hits.Count) files"
  }
}

# Do not rename D:\databases\database.db unless DB_INVENTORY.md and all
# consumers have been updated in the same coordinated migration.
```

Also collapse the three backup roots (`D:\_backups`, `D:\archive`, `D:\Archives`) into one, and delete `D:\pnpm-store` (keep `pnpm-store-v2`).

### 4.2 Single RAG package (Week 1 — 6 hours)

Move `apps/nova-agent/src/rag/*` into a new `packages/rag` (or reuse/rename `packages/memory/src/search`). Both `memory-mcp` and `mcp-rag-server` import from the package. Delete `apps/mcp-rag-server/src/rag/*` duplicate and `apps/memory-mcp/src/rag-bridge.ts` becomes a thin adapter that imports `@vibetech/rag`.

```
packages/rag/
  src/
    indexer.ts   ← moved from apps/nova-agent/src/rag
    retriever.ts
    reranker.ts
    cache.ts
    connectors/
      trading.ts   ← moved from apps/mcp-rag-server/src/rag
      learning.ts
    types.ts
  package.json  { "name": "@vibetech/rag" }
```

Trade-off: adding a package bloats `pnpm-lock.yaml` slightly, but removes a ~1200-line duplicate and a cross-app relative import that breaks if nova-agent moves.

### 4.3 Embeddings service package (Week 1 — 3 hours)

```
packages/embeddings-service/
  src/
    client.ts     ← OpenAI-compatible client (retry, cache, health)
    types.ts
    memory-cache.ts
    fallback.ts   ← @xenova/transformers fallback
  package.json  { "name": "@vibetech/embeddings" }
```

Replace three inline `http://localhost:3001` callers with `createEmbeddingClient({ endpoint, model, dim })`. One health check. One timeout. One cache.

### 4.4 Event bus package (Week 2 — 8 hours)

```
packages/event-bus/
  src/
    bus.ts           ← SQLite WAL-mode append log
    subscriber.ts    ← polling (100ms) + cursor
    topics.ts        ← Zod schemas per topic
  package.json  { "name": "@vibetech/bus" }
```

SQLite schema (`D:\databases\events.db`):

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  topic TEXT NOT NULL,
  source TEXT NOT NULL,       -- 'vtde','nova-agent','trading','git','user'
  payload_json TEXT NOT NULL,
  processed_by TEXT DEFAULT ''  -- CSV of consumer IDs that processed
);
CREATE INDEX idx_events_topic_ts ON events(topic, ts);
CREATE INDEX idx_events_unprocessed ON events(id) WHERE processed_by = '';
```

Topics (Zod schemas in shared package):
- `activity.file_edit` | `activity.file_read` | `activity.command_run`
- `nova.task_created` | `nova.task_completed`
- `git.commit` | `git.branch_merged`
- `trade.decision` | `trade.outcome`
- `agent.execution_started` | `agent.execution_finished` | `agent.mistake`
- `memory.captured` | `rag.indexed` | `learning.pattern_found`

### 4.5 Promote workspace-mcp to schema registry (Week 2 — 4 hours)

Add three tools to `workspace-mcp-server`:

```typescript
ws_list_schemas()              // enumerate Zod schemas across packages
ws_get_schema(table: string)   // return JSON Schema for one table
ws_register_table(owner, file, tables[])  // declare DB ownership
```

Backed by a new `D:\databases\workspace.db` (single source of truth replacing the hand-maintained `DB_INVENTORY.md`). `ws_workspace_summary` reads from it instead of hardcoded constants.

### 4.6 Unify learning-system with agent_learning.db (Week 3 — 6 hours)

The Python `learning_engine.py` currently writes JSON. Swap it to write directly into `D:\databases\agent_learning.db` via the same schema memory-mcp's LearningBridge reads. The Python side becomes just another producer on the bus:

```python
# D:\learning-system\learning_engine.py
from event_bus import publish  # new thin Python client

publish(topic='learning.pattern_found', source='learning-engine', payload={
    'pattern': 'connection_fix_failure',
    'frequency': 15,
    'severity': 3.5,
    'confidence': 0.80,
    'recommendations': [...]
})
```

Delete `D:\learning-system\data\*.json` writes. `HOW_LEARNING_WORKS.md` gets rewritten against reality.

### 4.7 Nightly self-analysis (Week 3 — 4 hours)

One PowerShell task that runs at 4 AM (replaces `ralph` + manual consolidation + manual WORKSPACE.json edits):

```
C:\dev\scripts\nightly\Run-MonorepoEvolution.ps1

  Step 1: memory_consolidate (threshold 0.9, dryRun false)
  Step 2: memory_decay_stats + archive
  Step 3: memory_summarize_session (useLlm true)
  Step 4: rag_index_run (incremental)
  Step 5: memory_learning_sync (pulls new patterns)
  Step 6: Generate priority queue:
            SELECT task_type, COUNT(*) fails, MAX(started_at) last
            FROM agent_executions
            WHERE success = 0 AND started_at > now()-7d
            GROUP BY task_type ORDER BY fails DESC LIMIT 10
  Step 7: Append to WORKSPACE.json recentActivity:
            { date, project: 'monorepo', action: '<auto-summary from step 3+6>' }
  Step 8: Emit Windows Toast + update D:\logs\evolution\<date>.md
```

Registered via Task Scheduler:

```powershell
Register-ScheduledTask -TaskName "MonorepoEvolution" `
  -Action (New-ScheduledTaskAction -Execute 'pwsh.exe' `
    -Argument '-File C:\dev\scripts\nightly\Run-MonorepoEvolution.ps1') `
  -Trigger (New-ScheduledTaskTrigger -Daily -At 4am) `
  -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun)
```

### 4.8 Finisher priority endpoint (Week 4 — 2 hours)

Add one tool to memory-mcp: `memory_finisher_priorities(limit=5)` that joins:
- recent agent_executions failures (from agent_learning.db)
- git log entries with "WIP" / "TODO" / "fixme" (captured via git events)
- stale projects (WORKSPACE.json age vs. file mtimes under that app)
- open error patterns from learning-system

Returns a ranked list. This is what you ask for at the start of every session to answer "what should I ship today" without guessing.

## 5. Trade-offs — made explicit

| Decision | Pros | Cons | Revisit when |
|---|---|---|---|
| SQLite event bus (not Kafka/NATS) | Zero ops, WAL already used, matches pnpm-only philosophy | Not horizontally scalable, single-writer contention at >500 events/sec | Any single app exceeds 100 writes/sec sustained |
| Polling subscribers at 100ms | Dead simple, no lock contention | ~2W idle power cost per subscriber, 100ms latency floor | Event volume justifies LISTEN/NOTIFY or FIFO IPC |
| Consolidate RAG into one package | Kills 1200 lines of duplication, single index location | Nova-agent loses the "owns its RAG" narrative | Nova-agent ever gets extracted to its own repo |
| Delete 10 dead DBs | ~400 KB disk + mental overhead saved | Gone forever if grep missed a reference | Next time someone imports a deleted db name |
| Python writes directly to agent_learning.db | One source of truth, eliminates JSON island | Python + Node both writing to same SQLite needs WAL + busy_timeout discipline | If lock contention appears — measure first |
| Auto-append WORKSPACE.json from nightly | Self-documenting, always current | Loses the human editorial voice ("Herd trim — deleted 8 stale apps") | If the auto entries become noise — filter by importance score |
| Single embeddings service | One cache, one health check | Single point of failure when OpenRouter proxy is down | Add local `@xenova/transformers` fallback from day one |

## 6. What I'd revisit as this grows

- **Event bus → external broker** once >3 non-monorepo producers exist (e.g., if you ever add a second machine or a cloud worker).
- **`D:\` data locality** becomes a bottleneck if any app needs to run off-host. Cloudflare D1 binding already exists — some topics (learning.pattern_found, git.commit) could dual-write for eventual cloud access.
- **Memory DB sharding** if `memory.db` exceeds ~500MB. Today it's 12.4MB with real embeddings. At current growth rate (not measured yet — instrument in Step 4.7), that's 2+ years.
- **Schema migration story** — workspace-mcp registry needs a simple `migrations/` table to track which app has applied which schema rev. Defer to Week 5 if 4.5 stays minimal.

## 7. Week-by-week execution (Finisher Mode, ship-only)

| Week | Deliverable | Backup command first | Validates |
|---|---|---|---|
| 1 | Dead-DB cleanup + pnpm-store dedup + backup dir collapse | `Compress-Archive -Path D:\databases\*.db* -DestinationPath D:\_backups\db_$(Get-Date -Format 'yyyyMMdd').zip` | `ws_list_databases` shows 8 files, not 18 |
| 1 | `packages/rag` + `packages/embeddings` extracted | `Compress-Archive -Path C:\dev\apps\mcp-rag-server,C:\dev\apps\nova-agent\src\rag,C:\dev\apps\memory-mcp\src\rag-bridge.ts -DestinationPath C:\dev\_backups\pre-rag-consolidation_$(Get-Date -Format 'yyyyMMdd').zip` | `pnpm nx build memory-mcp mcp-rag-server nova-agent` green |
| 2 | `packages/event-bus` + 3 producer wirings (vtde, nova-agent, git-hook) | `Compress-Archive -Path D:\databases\events.db* -DestinationPath D:\_backups\events_$(Get-Date -Format 'yyyyMMdd').zip` if exists | `SELECT count(*) FROM events` grows during a dev session |
| 2 | workspace-mcp schema registry + `ws_list_schemas` tool | — | `ws_workspace_summary` returns live DB list not hardcoded |
| 3 | Python learning-engine → agent_learning.db direct writes; delete JSON paths | `Compress-Archive -Path D:\learning-system -DestinationPath D:\_backups\learning-system_$(Get-Date -Format 'yyyyMMdd').zip` | `memory_learning_sync` returns nonzero patternsIngested |
| 3 | Nightly `Run-MonorepoEvolution.ps1` registered | — | First scheduled run appends to `WORKSPACE.json` |
| 4 | `memory_finisher_priorities` tool + daily Craft note integration | — | Opening session auto-shows "3 things to ship today" |

---

## 8. Decision points for you before we start

1. **Keep or drop self-healing and autoresearch as separate apps?** They duplicate what the nightly run will do. I recommend archiving them — but they may have working features I haven't enumerated. Say "keep/drop self-healing" and "keep/drop autoresearch".
2. **Delete `apps/mcp-rag-server` after extraction?** If memory-mcp exposes `memory_rag_*` and the package is reusable, the standalone server is redundant. Only keep if an external tool (Claude Desktop directly, not Claude Code) needs just-RAG without memory.
3. **Event bus on SQLite vs. a Cloudflare D1 dual-write?** I'd start SQLite-only; you already have the Cloudflare MCP registered if we want to extend later.
4. **Lock in `legacy_unified.db` rename, or migrate its 0.6 MB into the right homes first?** Renaming is safe; migration is 30 more minutes of work.

No feature creep. No new apps. This is consolidation + a small number of shared packages + one nightly cron.
