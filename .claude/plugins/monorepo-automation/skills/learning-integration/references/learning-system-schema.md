# Learning System Database Schema

**Location**: `D:\databases\agent_learning.db`
**Type**: SQLite 3
**Mode**: WAL (Write-Ahead Logging) for concurrency

## Complete Schema

### agent_executions

Tracks every tool execution for pattern analysis.

```sql
CREATE TABLE agent_executions (
  execution_id TEXT PRIMARY KEY,      -- Unique execution identifier
  agent_id TEXT NOT NULL,             -- e.g., 'pre-commit-quality-gate'
  task_type TEXT NOT NULL,            -- e.g., 'quality-check', 'documentation-sync'
  tools_used TEXT,                    -- JSON array of tools used
  started_at DATETIME NOT NULL,       -- ISO 8601 timestamp
  completed_at DATETIME,              -- ISO 8601 timestamp
  success INTEGER NOT NULL DEFAULT 0, -- 1 = success, 0 = failure
  execution_time_ms INTEGER,          -- Performance metric
  error_message TEXT,                 -- Failure details if success = 0
  metadata TEXT,                      -- JSON of tool results and other details
  context TEXT,                       -- JSON task context
  project_name TEXT                   -- Project or workspace name
);

CREATE INDEX idx_agent_executions_agent ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_task_type ON agent_executions(task_type);
CREATE INDEX idx_agent_executions_started ON agent_executions(started_at);
CREATE INDEX idx_agent_executions_success ON agent_executions(success);
CREATE INDEX idx_agent_executions_project ON agent_executions(project_name);
```

### task_patterns

High-level strategies proven to work (success_rate >= 0.8).

```sql
CREATE TABLE task_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_name TEXT NOT NULL UNIQUE,  -- e.g., 'Incremental Quality Check'
  task_type TEXT NOT NULL,            -- e.g., 'quality-check', 'mobile-build'
  approach_description TEXT NOT NULL, -- How to execute successfully
  success_rate REAL NOT NULL,         -- 0.0 to 1.0, proven if >= 0.8
  times_used INTEGER DEFAULT 1,       -- Frequency counter
  last_used DATETIME NOT NULL,        -- ISO 8601 timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_patterns_type ON task_patterns(task_type);
CREATE INDEX idx_task_patterns_success_rate ON task_patterns(success_rate);
CREATE INDEX idx_task_patterns_last_used ON task_patterns(last_used);
```

### code_patterns

Reusable code snippets with success metrics.

```sql
CREATE TABLE code_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_name TEXT NOT NULL UNIQUE,  -- e.g., 'Nx Affected Projects'
  language TEXT NOT NULL,             -- bash, typescript, python, powershell
  code_snippet TEXT NOT NULL,         -- Actual code to execute
  use_case TEXT NOT NULL,             -- When to apply this pattern
  success_rate REAL NOT NULL,         -- 0.0 to 1.0, proven if >= 0.8
  times_used INTEGER DEFAULT 1,       -- Frequency counter
  last_used DATETIME NOT NULL,        -- ISO 8601 timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_code_patterns_language ON code_patterns(language);
CREATE INDEX idx_code_patterns_success_rate ON code_patterns(success_rate);
CREATE INDEX idx_code_patterns_use_case ON code_patterns(use_case);
```

### agent_mistakes

Error tracking for prevention (times_occurred >= 2 triggers warnings).

```sql
CREATE TABLE agent_mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  context TEXT NOT NULL,              -- e.g., 'Android build', 'quality check'
  mistake_description TEXT NOT NULL,  -- What went wrong
  prevention_strategy TEXT NOT NULL,  -- How to avoid in future
  times_occurred INTEGER DEFAULT 1,   -- Frequency counter
  identified_at DATETIME NOT NULL,    -- ISO 8601 timestamp
  last_occurrence DATETIME,           -- When it last happened
  resolved INTEGER DEFAULT 0,         -- 1 if no longer occurring
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_mistakes_context ON agent_mistakes(context);
CREATE INDEX idx_agent_mistakes_times_occurred ON agent_mistakes(times_occurred);
CREATE INDEX idx_agent_mistakes_resolved ON agent_mistakes(resolved);
```

### agent_knowledge

Curated knowledge base for RAG (Retrieval-Augmented Generation).

```sql
CREATE TABLE agent_knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_id TEXT NOT NULL UNIQUE,  -- e.g., 'nx-affected-usage'
  title TEXT NOT NULL,                -- e.g., 'Nx Affected Projects Usage'
  content TEXT NOT NULL,              -- Detailed explanation (markdown)
  category TEXT NOT NULL,             -- e.g., 'nx', 'quality', 'mobile', 'desktop'
  tags TEXT,                          -- Comma-separated tags
  relevance_score REAL DEFAULT 1.0,   -- 0.0 to 1.0, for ranking
  times_accessed INTEGER DEFAULT 0,   -- Usage counter
  last_accessed DATETIME,             -- ISO 8601 timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_knowledge_category ON agent_knowledge(category);
CREATE INDEX idx_agent_knowledge_relevance ON agent_knowledge(relevance_score);
CREATE INDEX idx_agent_knowledge_accessed ON agent_knowledge(times_accessed);
CREATE VIRTUAL TABLE agent_knowledge_fts USING fts5(
  knowledge_id, title, content, tags,
  content=agent_knowledge, content_rowid=id
);
```

## Database Size & Maintenance

**Expected Size**:

- Fresh: ~100 KB (empty schema)
- After 30 days: ~10-50 MB (with 10K executions)
- After 1 year: ~500 MB (with 500K executions)

**Maintenance Schedule**:

- **Weekly**: `VACUUM;` to reclaim space
- **Monthly**: Archive `agent_executions` older than 90 days to `agent_executions_archive`
- **Quarterly**: Remove `agent_mistakes` with times_occurred = 1 and resolved = 1

**Archival Query**:

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
4. **Cache patterns** - Cache `task_patterns` and `code_patterns` queries (5 min TTL)
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

**Proven Patterns** (from real monorepo usage):

```sql
INSERT INTO task_patterns (pattern_name, task_type, approach_description, success_rate, last_used) VALUES
('Incremental Quality Check', 'quality-check', 'Run lint --fix first, then typecheck, then build. Use parallel where safe.', 0.95, datetime('now')),
('Controlled Parallel Testing', 'test-execution', 'pnpm nx affected:test --parallel=3 --max-parallel=3 to avoid race conditions', 0.92, datetime('now')),
('Android Build with Cache Clear', 'mobile-build', 'Increment versionCode before build to force cache clear', 0.98, datetime('now')),
('Safe Dependency Update', 'dependency-update', 'Update one package at a time, run full test suite after each', 0.88, datetime('now'));

INSERT INTO code_patterns (pattern_name, language, code_snippet, use_case, success_rate, last_used) VALUES
('Nx Affected Projects', 'bash', 'pnpm nx affected:test --parallel=3 --max-parallel=3', 'Test only changed projects with controlled parallelism', 0.92, datetime('now')),
('ESLint Auto-Fix', 'bash', 'pnpm nx affected:lint --fix', 'Fix linting issues before commit', 0.94, datetime('now')),
('Android Version Increment', 'gradle', 'versionCode ${VERSION_CODE}\nversionName "${VERSION_NAME}"', 'Update Android version for builds', 0.98, datetime('now'));

INSERT INTO agent_mistakes (context, mistake_description, prevention_strategy, times_occurred, identified_at) VALUES
('Android build', 'Build succeeded but app showed old code due to cache', 'Always increment versionCode before Android builds to force cache clear', 3, datetime('now')),
('Quality check', 'Tests failed with race conditions when run in parallel', 'Use --runInBand flag for tests or limit parallelism to 3 with --max-parallel=3', 2, datetime('now')),
('Dependency update', 'Updated multiple packages simultaneously, breaking build with unclear cause', 'Update one package at a time with full test suite between updates', 4, datetime('now'));
```
