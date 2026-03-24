---
name: Learning System Integration
description: Query proven patterns, avoid known mistakes, and contribute insights to the monorepo learning system at D:\databases\agent_learning.db
version: 1.0.0
---

# Learning System Integration for Monorepo Agents

Use this skill when automating monorepo tasks to leverage collective knowledge and prevent repeating mistakes.

## Core Workflow (MANDATORY Before ANY Action)

### 1. Query for Proven Patterns

Before implementing any task, check if successful approaches exist:

```sql
-- Find proven patterns for your task type
SELECT pattern_name, approach_description, success_rate, last_used
FROM task_patterns
WHERE task_type = 'your_task_type'
  AND success_rate >= 0.8
ORDER BY success_rate DESC, last_used DESC
LIMIT 5;
```

**Task types**: `quality-check`, `dependency-update`, `mobile-build`, `desktop-release`, `test-execution`, `documentation-sync`, `cache-optimization`, `dead-code-detection`

### 2. Check for Known Mistakes

Prevent repeating errors by checking mistake database:

```sql
-- Check if this action has failed before
SELECT mistake_description, prevention_strategy, times_occurred
FROM agent_mistakes
WHERE context LIKE '%your_context%'
  AND times_occurred >= 2
ORDER BY identified_at DESC
LIMIT 10;
```

**If found**: Apply prevention strategy BEFORE executing action.

### 3. Log Your Execution

Record every tool use for pattern recognition:

```sql
-- Log execution start
INSERT INTO agent_executions (
  agent_name, tool_name, context, input_params, started_at
) VALUES (
  'your-agent-name', 'bash', 'quality check', '{"cmd": "pnpm run lint"}', datetime('now')
);

-- Log execution result
UPDATE agent_executions
SET completed_at = datetime('now'),
    success = 1, -- or 0 if failed
    output_data = '{"stdout": "...", "exit_code": 0}',
    execution_time_ms = 1250,
    error_message = NULL -- or error details if failed
WHERE id = (SELECT MAX(id) FROM agent_executions WHERE agent_name = 'your-agent-name');
```

### 4. Contribute Knowledge (If Successful)

After successful execution (success_rate >= 80%), contribute to knowledge base:

```sql
-- Add proven pattern
INSERT INTO task_patterns (
  pattern_name, task_type, approach_description, success_rate, last_used
) VALUES (
  'Incremental Quality Check', 'quality-check',
  'Run lint with --fix, then typecheck, then build. Parallel where possible.',
  0.95, datetime('now')
);

-- Add code pattern
INSERT INTO code_patterns (
  pattern_name, language, code_snippet, use_case, success_rate
) VALUES (
  'Nx Affected Projects', 'bash',
  'pnpm nx affected:test --parallel=3 --max-parallel=3',
  'Test only changed projects with controlled parallelism',
  0.92
);
```

### 5. Record Mistakes (If Failed)

If execution fails, record for future prevention:

```sql
-- Record mistake
INSERT INTO agent_mistakes (
  context, mistake_description, prevention_strategy, times_occurred, identified_at
) VALUES (
  'Android build',
  'Build failed due to missing versionCode increment',
  'Always increment versionCode before Android builds to force cache clear',
  1, datetime('now')
);
```

## Database Schema Reference

### Tables

**agent_executions** - Complete tool usage history

- `agent_name` - Which agent executed
- `tool_name` - Which tool was used (Bash, Read, Write, etc.)
- `context` - What task was being performed
- `input_params` - JSON of tool parameters
- `output_data` - JSON of tool results
- `success` - 1 for success, 0 for failure
- `execution_time_ms` - Performance metric
- `error_message` - Failure details

**task_patterns** - High-level task execution strategies

- `pattern_name` - Descriptive name
- `task_type` - Category (quality-check, mobile-build, etc.)
- `approach_description` - How to execute successfully
- `success_rate` - Decimal (0.0 to 1.0), >= 0.8 is proven
- `last_used` - Timestamp of last successful use

**code_patterns** - Reusable code snippets with metrics

- `pattern_name` - Descriptive name
- `language` - bash, typescript, python, powershell
- `code_snippet` - Actual code to execute
- `use_case` - When to apply this pattern
- `success_rate` - Proven if >= 0.8

**agent_mistakes** - Error tracking and prevention

- `context` - What was being attempted
- `mistake_description` - What went wrong
- `prevention_strategy` - How to avoid in future
- `times_occurred` - Frequency counter
- `identified_at` - When first detected

**agent_knowledge** - Curated knowledge base (for RAG)

- `knowledge_id` - Unique identifier
- `title` - Knowledge entry title
- `content` - Detailed explanation
- `category` - Categorization (monorepo, nx, quality, etc.)
- `created_at` - Timestamp

## Integration with Agents

All agents MUST follow this workflow:

```
1. Query task_patterns (proven approaches)
2. Query agent_mistakes (prevention strategies)
3. Apply prevention strategies if mistakes found
4. Execute task with proven pattern if available
5. Log execution to agent_executions
6. If success: Contribute to task_patterns/code_patterns
7. If failure: Record to agent_mistakes
8. Update success_rate metrics
```

## Example: Pre-commit Quality Gate Agent

```typescript
// 1. Query for proven quality check pattern
const proven = await queryDB(`
  SELECT approach_description FROM task_patterns
  WHERE task_type = 'quality-check' AND success_rate >= 0.8
  ORDER BY success_rate DESC LIMIT 1
`);

// 2. Check for known mistakes
const mistakes = await queryDB(`
  SELECT prevention_strategy FROM agent_mistakes
  WHERE context LIKE '%quality%' AND times_occurred >= 2
`);

// 3. Apply prevention strategies
if (mistakes.includes('Always run lint --fix first')) {
  await runLintFix();
}

// 4. Execute with proven pattern
const result = await executeQualityCheck(proven.approach_description);

// 5. Log execution
await logExecution({
  agent_name: 'pre-commit-quality-gate',
  tool_name: 'bash',
  context: 'quality check before commit',
  success: result.exitCode === 0,
  execution_time_ms: result.duration,
});

// 6. Contribute knowledge if successful
if (result.exitCode === 0) {
  await updateSuccessRate('quality-check', 0.95);
}

// 7. Record mistake if failed
if (result.exitCode !== 0) {
  await recordMistake({
    context: 'quality check',
    mistake: result.error,
    prevention: 'Run tests with --runInBand to avoid race conditions',
  });
}
```

## Performance Considerations

- **Query first, act second** - Always check learning database before executing
- **Log asynchronously** - Don't block on logging (use background writes)
- **Cache frequent queries** - Cache task_patterns for 5 minutes
- **Update metrics incrementally** - Don't recalculate success rates on every execution
- **Archive old mistakes** - After 90 days, archive `agent_mistakes` with times_occurred < 2

## Database Connection

```typescript
// TypeScript example
import Database from 'better-sqlite3';
const learningDB = new Database('D:\\databases\\agent_learning.db');

// Enable WAL mode for concurrency
learningDB.pragma('journal_mode = WAL');
learningDB.pragma('busy_timeout = 5000');

// Close on exit
process.on('exit', () => learningDB.close());
```

```python
# Python example
import sqlite3
from pathlib import Path

DB_PATH = Path('D:/databases/agent_learning.db')
conn = sqlite3.connect(str(DB_PATH))
conn.execute('PRAGMA journal_mode=WAL')
conn.execute('PRAGMA busy_timeout=5000')

# Use context manager
with conn:
    cursor = conn.execute('SELECT * FROM task_patterns WHERE success_rate >= 0.8')
    patterns = cursor.fetchall()
```

## Success Metrics

Track agent performance with these queries:

```sql
-- Agent success rate by task type
SELECT
  agent_name,
  COUNT(*) as total_executions,
  SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
  ROUND(AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END), 2) as success_rate
FROM agent_executions
WHERE started_at >= datetime('now', '-30 days')
GROUP BY agent_name
ORDER BY success_rate DESC;

-- Most valuable patterns (high success, frequently used)
SELECT pattern_name, task_type, success_rate,
       COUNT(*) as times_used
FROM task_patterns
WHERE last_used >= datetime('now', '-30 days')
GROUP BY pattern_name
ORDER BY success_rate DESC, times_used DESC
LIMIT 10;

-- Mistakes to prioritize fixing
SELECT context, mistake_description, prevention_strategy, times_occurred
FROM agent_mistakes
WHERE times_occurred >= 3
ORDER BY times_occurred DESC
LIMIT 10;
```

## Related Files

- **Database**: `D:\databases\agent_learning.db` (SQLite with WAL mode)
- **Logs**: `D:\learning-system\logs\tool-usage-YYYY-MM-DD.log` (daily rotation)
- **Hooks**:
  - `C:\dev\.claude\hooks\pre-tool-use.ps1` (automatic capture)
  - `C:\dev\.claude\hooks\post-tool-use.ps1` (results logging)

## References

See `references/learning-system-schema.md` for complete database schema.
See `references/pattern-examples.md` for real-world proven patterns.
See `examples/agent-integration.ts` for TypeScript integration example.
See `examples/agent-integration.py` for Python integration example.
