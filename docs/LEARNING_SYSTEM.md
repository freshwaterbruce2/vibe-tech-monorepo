# Learning System - Pointer

This document is deprecated.

Canonical learning system rules live in [AI.md](../AI.md).

---

## Database Schema

**Database:** `D:\databases\nova_shared.db`
**Format:** SQLite 3
**WAL Mode:** Enabled for concurrency
**Size:** 55 MB (59,014+ executions, 19,974 code patterns)

### Core Tables

#### 1. agent_knowledge

Stores validated knowledge and patterns.

```sql
CREATE TABLE agent_knowledge (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    knowledge_type TEXT NOT NULL,
    category TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence_score REAL,
    validation_status TEXT,
    source_data TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    tags TEXT
);
```

**Purpose:** Curated knowledge base for RAG and recommendations.

#### 2. agent_mistakes

Tracks errors and failures for prevention.

```sql
CREATE TABLE agent_mistakes (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    mistake_type TEXT NOT NULL,
    mistake_category TEXT,
    description TEXT NOT NULL,
    context_when_occurred TEXT,
    identified_at TEXT NOT NULL,
    root_cause TEXT,
    resolution TEXT,
    preventive_measures TEXT,
    recurrence_count INTEGER DEFAULT 1,
    last_occurred TEXT,
    tags TEXT
);
```

**Purpose:** Learn from failures and prevent recurrence.

#### 3. code_patterns

Successful code patterns and snippets.

```sql
CREATE TABLE code_patterns (
    id TEXT PRIMARY KEY,
    pattern_name TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    code_language TEXT,
    code_snippet TEXT NOT NULL,
    description TEXT,
    use_cases TEXT,
    success_rate REAL,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    tags TEXT
);
```

**Purpose:** Reusable code patterns with success metrics.

#### 4. task_patterns

Task execution patterns and best practices.

```sql
CREATE TABLE task_patterns (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,
    pattern_name TEXT NOT NULL,
    approach_description TEXT,
    tools_used TEXT,
    success_indicators TEXT,
    failure_indicators TEXT,
    success_rate REAL,
    avg_execution_time_ms REAL,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    tags TEXT
);
```

**Purpose:** High-level task execution strategies.

#### 5. learning_events

Audit trail of all learning activities.

```sql
CREATE TABLE learning_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_category TEXT,
    description TEXT,
    related_entity_id TEXT,
    metadata TEXT,
    timestamp TEXT NOT NULL
);
```

**Purpose:** Complete audit trail for debugging and analysis.

#### 6. task_time_tracking

Performance tracking per task.

```sql
CREATE TABLE task_time_tracking (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    task_description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_ms INTEGER,
    tools_used TEXT,
    success BOOLEAN,
    tags TEXT
);
```

**Purpose:** Performance benchmarking and optimization.

### Supporting Tables

- **clipboard_history** - Command history tracking
- **quick_notes** - Temporary notes and observations
- **schema_migrations** - Database version control
- **sync_log** - Multi-agent sync tracking
- **sync_metadata** - Sync status metadata
- **task_app_context** - Context for task routing
- **task_knowledge** - Task-specific knowledge
- **task_mistakes** - Task-specific errors
- **memories** - Long-term memory storage

---

## Hook System

### Pre-Tool-Use Hook

**File:** `C:\dev\.claude\hooks\pre-tool-use.ps1`
**Purpose:** Capture tool execution before it runs

**What It Does:**

1. Receives tool name and parameters
2. Logs to `D:\learning-system\logs\tool-usage-YYYY-MM-DD.log`
3. **Attempts** to insert into database (currently fails - see Known Issues)

**Example Log Entry:**

```
[2026-01-14 11:45:23.456] [PRE-TOOL] Tool: Read
```

### Post-Tool-Use Hook

**File:** `C:\dev\.claude\hooks\post-tool-use.ps1`
**Purpose:** Capture tool results after execution

**What It Does:**

1. Receives tool name, success status, and output
2. Logs success/failure status
3. If failure, attempts to insert into `agent_mistakes` table
4. Records to daily log file

**Example Log Entries:**

```
[2026-01-14 11:45:23.678] [POST-TOOL] Tool: Read | Status: SUCCESS
[2026-01-14 11:45:24.123] [POST-TOOL] Tool: Write | Status: FAILURE
```

### Schema Status (2026-01-15)

✅ **All Tables Operational:** Hooks write to `agent_executions` table successfully.

**Database Statistics:**

- **agent_executions**: 59,014 records (tool usage history)
- **success_patterns**: 15 patterns (confidence ≥0.8)
- **failure_patterns**: 4 patterns (identified issues)
- **code_patterns**: 19,974 patterns (TypeScript: 15,953, JavaScript: 898, Python: 516, Rust: 201)

---

## Usage Guide

### For Developers

**Normal Development:**

- No action required - system captures data automatically
- Hooks run transparently on every tool use
- Logs accumulate in `D:\learning-system\logs\`

**Check Your Performance:**

```powershell
# View today's tool usage
Get-Content "D:\learning-system\logs\tool-usage-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50

# Count executions and errors
$logs = Get-Content "D:\learning-system\logs\tool-usage-$(Get-Date -Format 'yyyy-MM-dd').log"
$executions = ($logs | Select-String "PRE-TOOL").Count
$failures = ($logs | Select-String "FAILURE").Count
Write-Host "Executions: $executions | Failures: $failures"
```

**Query Database Patterns:**

```powershell
cd D:\learning-system

# View successful patterns
sqlite3 D:\databases\nova_shared.db @"
SELECT pattern_name, success_rate, usage_count
FROM task_patterns
WHERE success_rate >= 0.8
ORDER BY usage_count DESC
LIMIT 10;
"@

# Check recent mistakes
sqlite3 D:\databases\nova_shared.db @"
SELECT mistake_type, description, identified_at
FROM agent_mistakes
ORDER BY identified_at DESC
LIMIT 10;
"@
```

### For Agents (AI Context)

**Before Implementing Tasks:**

1. Query `task_patterns` for successful approaches
2. Review `agent_mistakes` to avoid repeat errors
3. Check `code_patterns` for reusable snippets
4. Review relevant `agent_knowledge` entries

**Example Agent Query:**

```sql
-- Find best approach for API integration tasks
SELECT pattern_name, approach_description, tools_used, success_rate
FROM task_patterns
WHERE task_type = 'api_integration'
  AND success_rate >= 0.8
ORDER BY success_rate DESC, usage_count DESC
LIMIT 5;
```

**After Task Completion:**

- System automatically logs via hooks
- Patterns emerge after 3+ occurrences
- Recommendations update weekly

---

## Pattern Recognition

### Automatic Pattern Detection

The system automatically identifies:

1. **Tool Sequences** - Common tool combinations
   - Example: Read → Edit → Bash (file modification pattern)
   - Success rate tracked per sequence

2. **High-Success Approaches** - 80%+ success rate
   - Flagged as "recommended" patterns
   - Stored in `task_patterns` table

3. **Common Failures** - 3+ occurrences
   - Logged in `agent_mistakes`
   - Prevention strategies generated

4. **Performance Benchmarks** - Execution time tracking
   - Stored in `task_time_tracking`
   - Used for optimization targets

### Pattern Examples

**File Modification Pattern (100% success):**

```typescript
// Proven approach from historical data
// 1. Read file to understand context
const content = await Read({ file_path: 'src/app.ts' });

// 2. Edit with precise changes (NOT Write!)
await Edit({
  file_path: 'src/app.ts',
  old_string: 'export default function App() {',
  new_string: 'export default function App(): JSX.Element {',
});

// 3. Verify with type checking
await Bash({
  command: 'pnpm tsc --noEmit',
  description: 'Verify TypeScript types',
});
```

**Database Operations Pattern (97% success):**

```typescript
// Proven SQLite best practice
import Database from 'better-sqlite3';

const db = new Database('D:\\databases\\app.db');

// 1. Enable WAL mode (CRITICAL)
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// 2. Use prepared statements
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = stmt.get(userId);

// 3. Cleanup on exit
process.on('exit', () => db.close());
```

---

## Integration Points

### Nova-Agent Integration

**Location:** `apps/nova-agent/`

**How It Works:**

- Nova-agent queries `agent_knowledge` for RAG context
- Retrieves relevant patterns based on user query
- Provides context-aware responses

**Example Integration:**

```typescript
// apps/nova-agent/src/services/knowledge-retrieval.ts
import Database from 'better-sqlite3';

const learningDb = new Database('D:\\databases\\nova_shared.db');

function getRelevantKnowledge(query: string) {
  const stmt = learningDb.prepare(`
    SELECT title, content, confidence_score
    FROM agent_knowledge
    WHERE category LIKE ?
    ORDER BY confidence_score DESC, access_count DESC
    LIMIT 5
  `);

  return stmt.all(`%${query}%`);
}
```

### Crypto-Enhanced Integration

**Location:** `apps/crypto-enhanced/`

**Trading System Learnings:**

- Successful trade patterns
- Failed strategy analysis
- Risk mitigation patterns
- API error handling

**Example Query:**

```python
# apps/crypto-enhanced/learning_integration.py
import sqlite3

conn = sqlite3.connect(r'D:\databases\nova_shared.db')
cursor = conn.cursor()

# Get high-success trading patterns
cursor.execute("""
    SELECT pattern_name, approach_description, success_rate
    FROM task_patterns
    WHERE task_type = 'crypto_trading'
      AND success_rate >= 0.9
    ORDER BY success_rate DESC
""")

patterns = cursor.fetchall()
```

### Vibe-Justice Integration

**Location:** `apps/vibe-justice/`

**Legal AI Learnings:**

- Document processing patterns
- Case analysis approaches
- Legal research strategies
- Compliance checking patterns

### Project-Specific Context

Each project can maintain its own learnings in `D:\learning-system\agents\<project-name>/`

---

## Maintenance

### Daily Tasks (Automatic)

✅ **Log Rotation:**

- Daily logs: `D:\learning-system\logs\tool-usage-YYYY-MM-DD.log`
- Automatic rotation (keep 30 days)

✅ **Hook Execution:**

- Runs on every tool use
- No manual intervention required

### Weekly Tasks (Recommended)

**Review Patterns:**

```powershell
cd D:\learning-system

# Check this week's patterns
sqlite3 D:\databases\nova_shared.db @"
SELECT task_type, COUNT(*) as occurrences
FROM task_patterns
WHERE updated_at >= date('now', '-7 days')
GROUP BY task_type
ORDER BY occurrences DESC;
"@
```

**Check for Mistakes:**

```powershell
# Recent mistakes
sqlite3 D:\databases\nova_shared.db @"
SELECT mistake_type, COUNT(*) as count
FROM agent_mistakes
WHERE identified_at >= datetime('now', '-7 days')
GROUP BY mistake_type
ORDER BY count DESC;
"@
```

### Monthly Tasks

**Database Optimization:**

```powershell
# Vacuum database
sqlite3 D:\databases\nova_shared.db "VACUUM;"

# Analyze for query optimization
sqlite3 D:\databases\nova_shared.db "ANALYZE;"
```

**Log Cleanup:**

```powershell
# Remove logs older than 30 days
Get-ChildItem D:\learning-system\logs -Filter "tool-usage-*.log" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force
```

---

## Troubleshooting

### Hooks Not Logging

**Check Hook Status:**

```powershell
# Verify hooks exist
Test-Path "C:\dev\.claude\hooks\pre-tool-use.ps1"   # Should be True
Test-Path "C:\dev\.claude\hooks\post-tool-use.ps1"  # Should be True

# Check recent logs
Get-ChildItem D:\learning-system\logs -Filter "tool-usage-*.log" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 |
    Get-Content -Tail 20
```

**Verify Database:**

```powershell
# Check database exists
Test-Path "D:\databases\nova_shared.db"  # Should be True

# Check tables and row counts
sqlite3 "D:\databases\nova_shared.db" ".tables"
sqlite3 "D:\databases\nova_shared.db" "SELECT COUNT(*) FROM agent_executions;"  # Should show 59,014+
```

### Database Health Check

**Verify System Health (2026-01-15):**

```powershell
# 1. Database size
$dbSize = (Get-Item "D:\databases\nova_shared.db").Length / 1MB
Write-Host "Database Size: $dbSize MB"  # Should be ~55 MB

# 2. Execution count
$executions = sqlite3 "D:\databases\nova_shared.db" "SELECT COUNT(*) FROM agent_executions;"
Write-Host "Total Executions: $executions"  # Should be 59,014+

# 3. Recent activity (last 24 hours)
$recentActivity = sqlite3 "D:\databases\nova_shared.db" "SELECT COUNT(*) FROM agent_executions WHERE executed_at > datetime('now', '-1 day');"
Write-Host "Recent Activity: $recentActivity"

# 4. Success rate
sqlite3 "D:\databases\nova_shared.db" @"
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM agent_executions
WHERE executed_at > datetime('now', '-7 days');
"@
```

### Performance Issues

**Database Size Check:**

```powershell
# Check database size
(Get-Item "D:\databases\nova_shared.db").Length / 1MB
# Current: ~55 MB (normal for 59k+ executions)
```

**Optimize:**

```powershell
# Vacuum to reclaim space
sqlite3 "D:\databases\nova_shared.db" "VACUUM;"

# Update statistics
sqlite3 "D:\databases\nova_shared.db" "ANALYZE;"
```

**Archive Old Data (if needed):**

```powershell
# Archive data older than 6 months
sqlite3 "D:\databases\nova_shared.db" @"
DELETE FROM learning_events
WHERE timestamp < date('now', '-180 days');

DELETE FROM task_time_tracking
WHERE start_time < date('now', '-180 days');
"@
```

---

## Related Documentation

### Primary References

- **Quick Start:** `D:\learning-system\QUICK_START_2026.md`
- **Technical Details:** `D:\learning-system\HOW_LEARNING_WORKS.md`
- **Complete Guide:** `D:\learning-system\COMPLETE_GUIDE.md`
- **User Guide:** `D:\learning-system\HOW_TO_USE.md`

### Monorepo Documentation

- **Main Guide:** `C:\dev\CLAUDE.md`
- **Database Backup:** `C:\dev\docs\DATABASE_BACKUP_GUIDE.md`
- **Paths Policy:** `C:\dev\docs\PATHS_POLICY.md`
- **Git Workflow:** `C:\dev\MONOREPO_WORKFLOW.md`

### Project-Specific

- **Nova-Agent:** `apps\nova-agent\docs\LEARNING_INTEGRATION.md`
- **Crypto-Enhanced:** `apps\crypto-enhanced\LEARNING_INTEGRATION_GUIDE.md`
- **Vibe-Justice:** `apps\vibe-justice\docs\AI_KNOWLEDGE_BASE.md`

---

## API Reference

### Python API

```python
# D:\learning-system\learning_engine.py
from learning_engine import LearningEngine

engine = LearningEngine(db_path=r'D:\databases\nova_shared.db')

# Add knowledge
engine.add_knowledge(
    agent_id='claude-code',
    knowledge_type='pattern',
    category='file_operations',
    title='Safe File Modification Pattern',
    content='Read → Edit → Verify',
    confidence_score=0.95
)

# Query patterns
patterns = engine.get_patterns(
    task_type='api_integration',
    min_success_rate=0.8,
    limit=10
)

# Log mistake
engine.log_mistake(
    agent_id='claude-code',
    mistake_type='connection_failure',
    description='Database connection not verified before use',
    root_cause='Missing health check',
    preventive_measures='Always verify connection with ensureConnection()'
)
```

### PowerShell API

```powershell
# Query helpers
function Get-LearningPatterns {
    param([string]$TaskType, [double]$MinSuccessRate = 0.8)

    sqlite3 "D:\databases\nova_shared.db" @"
    SELECT pattern_name, approach_description, success_rate
    FROM task_patterns
    WHERE task_type = '$TaskType'
      AND success_rate >= $MinSuccessRate
    ORDER BY success_rate DESC
    LIMIT 10;
"@
}

# Usage
Get-LearningPatterns -TaskType 'file_operations' -MinSuccessRate 0.9
```

---

## Quick Reference

**Key Locations:**

- Database: `D:\databases\nova_shared.db` (55 MB, 59,014+ executions)
- Logs: `D:\learning-system\logs\tool-usage-*.log`
- Hooks: `C:\dev\.claude\hooks\{pre,post}-tool-use.ps1`
- Documentation: `D:\learning-system\*.md`
- Agent Definitions: `C:\dev\.claude\agents\*.md` (12 specialized agents)

**Common Commands:**

```powershell
# Check today's activity
Get-Content "D:\learning-system\logs\tool-usage-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50

# Query patterns
sqlite3 "D:\databases\nova_shared.db" "SELECT * FROM task_patterns LIMIT 10;"

# Check mistakes
sqlite3 "D:\databases\nova_shared.db" "SELECT * FROM agent_mistakes ORDER BY identified_at DESC LIMIT 10;"

# View database statistics
sqlite3 "D:\databases\nova_shared.db" "SELECT COUNT(*) FROM agent_executions;"  # 59,014+
sqlite3 "D:\databases\nova_shared.db" "SELECT COUNT(*) FROM code_patterns;"    # 19,974

# Optimize database
sqlite3 "D:\databases\nova_shared.db" "VACUUM; ANALYZE;"

# Run automated monitoring
.\scripts\monitor-learning-db.ps1
.\scripts\refresh-context.ps1
```

**Health Check:**

```powershell
# Verify system
Test-Path "D:\databases\nova_shared.db"  # Database exists (should be ~55 MB)
Test-Path "C:\dev\.claude\hooks\pre-tool-use.ps1"  # Pre-hook exists
Test-Path "C:\dev\.claude\hooks\post-tool-use.ps1"  # Post-hook exists
Test-Path "D:\learning-system\logs"  # Logs directory exists
Test-Path "C:\dev\.claude\agents"  # Agent definitions directory exists

# Check execution count
sqlite3 "D:\databases\nova_shared.db" "SELECT COUNT(*) FROM agent_executions;"  # Should show 59,014+
```

---

**Last Updated:** 2026-01-15
**Status:** Active Production (59,014+ executions tracked)
**Database:** nova_shared.db (hooks fully operational)
**Maintainer:** VibeTech Development Team
**Next Review:** 2026-02-15 (monthly review)
