# Learning System Database Schema

> **Schema verified against live `D:\databases\agent_learning.db` on 2026-07-07** via
> `sqlite3 D:\databases\agent_learning.db ".schema <table>"` for each table below. The
> `CREATE TABLE` statements in this document are the actual live DDL (including columns
> added later via `ALTER TABLE`, which is why some tables have a base column list plus a
> trailing group of "bolted-on" columns). If this drifts, re-run `.schema <table>` —
> `DB_INVENTORY.md` on `D:\databases\` is authoritative, not this file.
>
> **Canonical write path**: memory-mcp's `memory_learning_write_pattern` tool is the intended
> way to contribute a pattern (not currently exposed as a callable tool in Claude Code
> sessions). Until it is exposed, fall back to a direct `sqlite3` INSERT into
> `success_patterns`.

**Location**: `D:\databases\agent_learning.db`
**Type**: SQLite 3
**Mode**: WAL (Write-Ahead Logging) for concurrency

## Complete Schema

### agent_executions

Tracks every tool execution for pattern analysis. Primary key is `execution_id` (TEXT,
caller-generated) — there is no autoincrement `id`. `agent_name` was added later via
`ALTER TABLE` and defaults to `'gravity-claw'`; there are no `input_params`/`output_data`
columns — use the single `metadata` TEXT column for both request parameters and results.

```sql
CREATE TABLE agent_executions (
    execution_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    task_type TEXT,
    tools_used TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    success BOOLEAN DEFAULT TRUE,
    execution_time_ms INTEGER,
    error_message TEXT,
    metadata TEXT,
    context TEXT,
    project_name TEXT,
    agent_name TEXT NOT NULL DEFAULT 'gravity-claw',
    execution_time INTEGER NOT NULL DEFAULT 0,
    error_details TEXT,
    created_at INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER,
    selected_model TEXT
);

CREATE INDEX idx_executions_started ON agent_executions(started_at DESC);
CREATE INDEX idx_executions_agent_task ON agent_executions(agent_id, task_type);
CREATE INDEX idx_executions_success ON agent_executions(success, started_at DESC);
CREATE INDEX idx_executions_project ON agent_executions(project_name, started_at DESC);
CREATE INDEX idx_gc_executions_created ON agent_executions(created_at);
CREATE INDEX idx_agent_executions_agent ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_project ON agent_executions(project_name);
CREATE INDEX idx_agent_executions_task ON agent_executions(task_type);
CREATE INDEX idx_agent_executions_started_desc ON agent_executions(started_at DESC);
CREATE INDEX idx_agent_executions_success ON agent_executions(success);
CREATE INDEX idx_agent_executions_agent_started ON agent_executions(agent_id, started_at DESC);
CREATE INDEX idx_agent_executions_project_started ON agent_executions(project_name, started_at DESC);
```

This table is also populated automatically for Agent tool invocations by the
`PostToolUse(Agent)` hook (`.claude/hooks/record-agent-execution.ps1`) — see
`.claude/rules/memory-system.md`.

### task_patterns

Lightweight, frequency-counted task strategies. There is **no** `pattern_name`,
`approach_description`, `success_rate`, or `times_used` column — the real table only tracks
a raw `frequency` counter against `recommended_approach`.

```sql
CREATE TABLE task_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT NOT NULL,
    frequency INTEGER DEFAULT 0,
    recommended_approach TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
```

There are no indexes on `task_patterns` in the live database beyond the primary key.

### success_patterns

The canonical table for a "proven pattern with a confidence score" — this is the table to
use for the `>= 0.8` proven-pattern workflow described in `SKILL.md`. It was missing from
earlier revisions of this doc even though it is the primary contribution target.

```sql
CREATE TABLE success_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT NOT NULL,
    description TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    confidence_score REAL DEFAULT 0.5,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_used TEXT,
    metadata TEXT
);

CREATE INDEX idx_success_patterns_confidence ON success_patterns(confidence_score DESC);
CREATE INDEX idx_success_patterns_type ON success_patterns(pattern_type);
```

### code_patterns

Reusable code snippets, but anchored to a **real file** — `file_path`, `name`,
`code_snippet`, and `language` are all `NOT NULL`, and there is no `success_rate` or
`use_case` column. Only insert here when the snippet actually corresponds to a file on
disk; otherwise use `success_patterns` above.

```sql
CREATE TABLE code_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT NOT NULL,
    name TEXT NOT NULL,
    code_snippet TEXT NOT NULL,
    file_path TEXT NOT NULL,
    language TEXT NOT NULL,
    imports TEXT,
    usage_count INTEGER DEFAULT 0,
    last_used INTEGER,
    tags TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(file_path, name, pattern_type)
);

CREATE INDEX idx_code_patterns_language ON code_patterns(language);
CREATE INDEX idx_code_patterns_type ON code_patterns(pattern_type);
CREATE INDEX idx_code_patterns_name ON code_patterns(name);
CREATE INDEX idx_code_patterns_usage ON code_patterns(usage_count);
```

### agent_mistakes

Error tracking for prevention. There is **no** `context`, `mistake_description`,
`times_occurred`, or `last_occurrence`/`created_at` column — the real table has richer,
differently-named columns (`mistake_type`, `mistake_category`, `root_cause_analysis`,
`context_when_occurred`, `impact_severity`) and tracks repeat occurrences as separate rows
rather than a counter.

```sql
CREATE TABLE agent_mistakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mistake_type TEXT NOT NULL,
    mistake_category TEXT,
    description TEXT NOT NULL,
    root_cause_analysis TEXT,
    context_when_occurred TEXT,
    impact_severity TEXT NOT NULL,
    prevention_strategy TEXT,
    identified_at TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_mistakes_description ON agent_mistakes(description);
CREATE INDEX idx_mistakes_context ON agent_mistakes(context_when_occurred);
CREATE INDEX idx_mistakes_resolved ON agent_mistakes(resolved, identified_at DESC);
CREATE INDEX idx_mistakes_category ON agent_mistakes(mistake_category, resolved);
```

### agent_knowledge

Curated knowledge base (for RAG). There is **no** `knowledge_id`, `category`,
`relevance_score`, `times_accessed`, or `last_accessed` column live — the real names are
`knowledge_type`, `effectiveness_score`, `usage_count`, and `last_used`. **The
`agent_knowledge_fts` FTS5 virtual table referenced in earlier revisions of this doc does
not exist in the live database** — full-text search over `agent_knowledge` is not
currently implemented; treat any reference to it as deprecated/aspirational, not real.

```sql
CREATE TABLE agent_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    applicable_tasks TEXT,
    success_rate_improvement REAL,
    confidence_level REAL,
    tags TEXT,
    agent_id INTEGER,
    description TEXT,
    source_execution_id INTEGER,
    applicable_contexts TEXT,
    usage_count INTEGER DEFAULT 0,
    effectiveness_score REAL,
    created_at TIMESTAMP,
    last_used TIMESTAMP
);

CREATE INDEX idx_knowledge_tags ON agent_knowledge(tags);
CREATE INDEX idx_knowledge_title ON agent_knowledge(title);
CREATE INDEX idx_knowledge_type ON agent_knowledge(knowledge_type);
CREATE INDEX idx_agent_knowledge_type_title ON agent_knowledge(knowledge_type, title);
CREATE INDEX idx_agent_knowledge_agent_id ON agent_knowledge(agent_id);
```

## Database Size & Maintenance

**Expected Size**:

- Fresh: ~100 KB (empty schema)
- After 30 days: ~10-50 MB (with 10K executions)
- After 1 year: ~500 MB (with 500K executions)

**Maintenance Schedule**:

- **Weekly**: `VACUUM;` to reclaim space
- **Monthly**: review `agent_executions` older than 90 days for pruning. **There is no
  `agent_executions_archive` table in the live database** — if you want an archive step,
  create that table first (matching the real `agent_executions` column list above) before
  running any `INSERT INTO ... SELECT` against it.
- **Quarterly**: review `agent_mistakes` rows with `resolved = 1` for deletion (no
  `times_occurred` counter exists to filter on — base the review on `resolved` and
  `identified_at` age instead)

**Archival Query** (requires first creating `agent_executions_archive` with the real
`agent_executions` schema above — it does not exist yet):

```sql
-- Archive old executions (keep last 90 days)
INSERT INTO agent_executions_archive SELECT * FROM agent_executions
WHERE started_at < datetime('now', '-90 days');

DELETE FROM agent_executions
WHERE started_at < datetime('now', '-90 days');

VACUUM;
```

## Concurrency Configuration

Always enable WAL mode for concurrent reads/writes:

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;  -- 5 seconds wait for lock
PRAGMA synchronous = NORMAL;  -- Faster writes, safe with WAL
```

## Query Performance Tips

1. **Use indexes** - All common queries have indexes
2. **Limit results** - Always use `LIMIT` for large tables
3. **Filter by dates** - Use `started_at >= datetime('now', '-30 days')` for recent data
4. **Cache patterns** - Cache `success_patterns` and `task_patterns` queries (5 min TTL)
5. **Batch inserts** - Use transactions for multiple inserts

## Backup Strategy

**Automated Backups**:

- **Location**: `D:\databases\backups\agent_learning_YYYY-MM-DD.db`
- **Frequency**: Daily at 11:59 PM (via Task Scheduler)
- **Retention**: 30 days
- **Compression**: 7-Zip with 97% compression ratio

**Manual Backup**:

```bash
# PowerShell
Copy-Item "D:\databases\agent_learning.db" "D:\databases\backups\agent_learning_$(Get-Date -Format 'yyyy-MM-dd').db"

# Bash
cp "D:/databases/agent_learning.db" "D:/databases/backups/agent_learning_$(date +%Y-%m-%d).db"
```

## Connection Pooling (TypeScript)

```typescript
import Database from 'better-sqlite3';

let dbInstance: Database.Database | null = null;

export function getLearningDB(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database('D:\\databases\\agent_learning.db');
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('busy_timeout = 5000');

    // Close on process exit
    process.on('exit', () => {
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
    });
  }
  return dbInstance;
}
```

## Sample Seed Data

**Proven Patterns** (rewritten against the real live columns):

```sql
INSERT INTO success_patterns (pattern_type, description, confidence_score, last_used) VALUES
('quality-check', 'Run lint --fix first, then typecheck, then build. Use parallel where safe.', 0.95, datetime('now')),
('test-execution', 'pnpm nx affected:test --parallel=3 --max-parallel=3 to avoid race conditions', 0.92, datetime('now')),
('mobile-build', 'Increment versionCode before build to force cache clear', 0.98, datetime('now')),
('dependency-update', 'Update one package at a time, run full test suite after each', 0.88, datetime('now'));

-- code_patterns requires a real file_path — only use it for snippets tied to an actual file
INSERT INTO code_patterns (pattern_type, name, code_snippet, file_path, language, tags, created_at) VALUES
('command', 'Nx Affected Projects', 'pnpm nx affected:test --parallel=3 --max-parallel=3', 'scripts/quality-affected.ps1', 'bash', 'nx,testing', strftime('%s', 'now')),
('command', 'ESLint Auto-Fix', 'pnpm nx affected:lint --fix', 'scripts/quality-affected.ps1', 'bash', 'eslint,lint', strftime('%s', 'now')),
('config', 'Android Version Increment', 'versionCode ${VERSION_CODE}\nversionName "${VERSION_NAME}"', 'apps/vibe-tutor/android/app/build.gradle', 'gradle', 'android,versioning', strftime('%s', 'now'));

INSERT INTO agent_mistakes (mistake_type, mistake_category, description, context_when_occurred, impact_severity, prevention_strategy, identified_at, resolved) VALUES
('cache-staleness', 'mobile-build', 'Build succeeded but app showed old code due to cache', 'Android build', 'medium', 'Always increment versionCode before Android builds to force cache clear', datetime('now'), 0),
('race-condition', 'quality-check', 'Tests failed with race conditions when run in parallel', 'Quality check', 'medium', 'Use --runInBand flag for tests or limit parallelism to 3 with --max-parallel=3', datetime('now'), 0),
('dependency-conflict', 'dependency-update', 'Updated multiple packages simultaneously, breaking build with unclear cause', 'Dependency update', 'high', 'Update one package at a time with full test suite between updates', datetime('now'), 0);
```
