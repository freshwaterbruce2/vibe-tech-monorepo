# Agent Memory Protocol

Last Updated: 2026-03-10
Priority: MANDATORY
Status: ACTIVE
Scope: All 24 specialist agents

---

## Overview

Every agent in the VibeTech monorepo MUST integrate with the memory system. Memory is not optional - it is what separates intelligent agents from stateless tools.

This protocol defines the **mandatory memory behaviors** all agents must follow.

---

## Memory Infrastructure

### Three Memory Layers

| Layer               | Location                                             | Purpose                                                    | Access Method              |
| ------------------- | ---------------------------------------------------- | ---------------------------------------------------------- | -------------------------- |
| **Memory MCP**      | `apps/memory-mcp` → `~/.codex/memories/memory.db`    | Semantic + episodic + procedural memory with vector search | MCP tools (`memory_*`)     |
| **Learning System** | `D:\learning-system` → `D:\databases\nova_shared.db` | 59k+ execution patterns, success/failure tracking          | SQL queries via sqlite MCP |
| **Session Memory**  | `apps/memory-bank/quick-access/recent-tasks.json`    | Current session context, recent tasks                      | File read                  |

### Memory MCP Tools

| Tool                     | Purpose                                | When to Use                            |
| ------------------------ | -------------------------------------- | -------------------------------------- |
| `memory_search_semantic` | Find similar past knowledge by meaning | Before implementing any feature        |
| `memory_search_episodic` | Find recent events/actions             | When resuming work or checking history |
| `memory_get_recent`      | Get current session context            | At session start                       |
| `memory_add_semantic`    | Store learned knowledge                | After discovering reusable patterns    |
| `memory_add_episodic`    | Log significant events                 | After completing tasks, fixing bugs    |
| `memory_track_pattern`   | Record workflow patterns               | After successful multi-step workflows  |
| `memory_get_patterns`    | Retrieve proven workflows              | Before starting complex tasks          |
| `memory_consolidate`     | Merge related memories                 | During maintenance                     |
| `memory_decay_stats`     | Check memory health                    | During maintenance                     |

### Learning System Tables

| Table              | Purpose                                 | Query Before                   |
| ------------------ | --------------------------------------- | ------------------------------ |
| `success_patterns` | Proven approaches (confidence >= 0.8)   | Implementing any feature       |
| `failure_patterns` | Known mistakes to avoid                 | Making architectural decisions |
| `code_patterns`    | Reusable code snippets (19,974 entries) | Writing new code               |
| `agent_executions` | Full execution history (59k+)           | Estimating task complexity     |
| `task_patterns`    | High-level task strategies              | Planning multi-step work       |

---

## Mandatory Behaviors

### BEFORE Starting Any Task

```
1. RECALL: Query memory for relevant past work
   - memory_search_semantic("task description keywords")
   - Query success_patterns for proven approaches
   - Query failure_patterns for known pitfalls

2. CONTEXT: Load session state
   - memory_get_recent() for current session
   - Check recent-tasks.json for in-progress work
```

### AFTER Completing Any Task

```
1. STORE: Save what was learned
   - memory_add_episodic() for the event record
   - memory_add_semantic() for reusable knowledge
   - memory_track_pattern() for successful workflows

2. UPDATE: Record outcome in learning system
   - Insert/update success_patterns on success
   - Insert/update failure_patterns on failure
```

### Domain-Specific Memory Patterns

Each agent type has specific memory patterns to follow:

#### Web/Frontend Agents

- **Store**: Component patterns, build configs that worked, bundle size optimizations
- **Recall**: Previous component implementations, proven React patterns, Tailwind solutions
- **Track**: Build times, bundle sizes, lighthouse scores over time

#### Backend Agents

- **Store**: API patterns, database queries, middleware solutions, error handling approaches
- **Recall**: Previous API designs, proven middleware chains, security patterns
- **Track**: Response times, error rates, deployment outcomes

#### Desktop Agents

- **Store**: IPC patterns, native API usage, build configurations, installer fixes
- **Recall**: Previous Tauri/Electron solutions, Windows API patterns
- **Track**: Build sizes, startup times, memory usage

#### Mobile Agents

- **Store**: Capacitor plugin configs, platform-specific fixes, WebView workarounds
- **Recall**: Previous native bridge solutions, Play Store submission fixes
- **Track**: APK sizes, startup performance, platform compatibility

#### Crypto/Trading Agents

- **Store**: Trading strategy outcomes, API integration patterns, safety mechanisms
- **Recall**: Previous market analysis approaches, proven circuit breaker configs
- **Track**: Trade outcomes, strategy performance, error recovery patterns

#### Testing/QA Agents

- **Store**: Test patterns that caught real bugs, coverage strategies, flaky test fixes
- **Recall**: Previous test architectures, proven mocking strategies
- **Track**: Coverage trends, test execution times, flaky test rates

#### Data/Infrastructure Agents

- **Store**: ETL pipeline configs, embedding strategies, RAG retrieval patterns
- **Recall**: Previous data pipeline designs, proven chunking strategies
- **Track**: Query performance, embedding quality, pipeline throughput

#### Skill Agents

- **Store**: Skill generation outcomes, pattern analysis results, quality gate decisions
- **Recall**: Previous skill architectures, proven generation templates
- **Track**: Skill quality scores, generation success rates

---

## Memory Query Templates

### Before Implementing a Feature

```sql
-- Check for proven approaches
SELECT approach, tools_used, success_count, confidence_score
FROM success_patterns
WHERE task_type = :task_type
  AND confidence_score >= 0.8
ORDER BY success_count DESC
LIMIT 5;

-- Check for known failures
SELECT mistake_type, prevention_strategy, occurrence_count
FROM failure_patterns
WHERE mistake_type LIKE :task_type || '%'
ORDER BY occurrence_count DESC
LIMIT 5;

-- Find reusable code
SELECT name, code_snippet, usage_count
FROM code_patterns
WHERE language = :language
  AND pattern_type = :pattern_type
ORDER BY usage_count DESC
LIMIT 10;
```

### After Completing a Task

```sql
-- Record success
INSERT INTO success_patterns (
    pattern_hash, task_type, project_name,
    tools_used, approach, success_count, confidence_score
) VALUES (?, ?, ?, ?, ?, 1, 0.5)
ON CONFLICT(pattern_hash) DO UPDATE SET
    success_count = success_count + 1,
    confidence_score = MIN(1.0, confidence_score + 0.05),
    last_used = CURRENT_TIMESTAMP;
```

---

## Memory Section Template for Agent Files

Every agent `.md` file MUST include this section (customized per domain):

```markdown
## Memory Integration

**Protocol**: `.claude/AGENT_MEMORY_PROTOCOL.md`

### Before Starting Work

1. `memory_search_semantic("<domain-specific keywords>")` - Find relevant past work
2. Query `success_patterns` WHERE task_type IN ('<domain-task-types>')
3. Query `failure_patterns` for known pitfalls in this domain

### After Completing Work

1. `memory_add_episodic()` - Log what was done, outcome, and project
2. `memory_add_semantic()` - Store reusable knowledge discovered
3. `memory_track_pattern()` - Record successful multi-step workflows

### Domain Memory Focus

- **Store**: <what this agent type should remember>
- **Recall**: <what this agent type should look up before acting>
- **Track**: <metrics this agent type should monitor over time>
```

---

## Anti-Patterns

### DO NOT

- Skip memory queries to "save time" - recall is faster than re-discovery
- Store every trivial action - only store reusable knowledge and significant events
- Ignore failure patterns - past mistakes are the most valuable memories
- Store sensitive data (API keys, passwords) in memory
- Duplicate memories - search before storing

### DO

- Always check memory before implementing
- Store patterns that could help future sessions
- Record failures with root cause analysis
- Consolidate related memories periodically
- Use semantic search with varied keywords (synonyms catch more)

---

## Metrics

| Metric                 | Target         | How to Measure                      |
| ---------------------- | -------------- | ----------------------------------- |
| Recall before action   | 100%           | Every task starts with memory query |
| Store after completion | 90%+           | Significant tasks logged            |
| Pattern reuse rate     | 50%+           | Tasks using recalled patterns       |
| Mistake prevention     | 50%+ reduction | Repeated errors decreasing          |

---

## Related Documentation

- **Memory MCP**: `apps/memory-mcp/`
- **Memory Package**: `packages/memory/` (`@vibetech/memory`)
- **Learning System**: `D:\learning-system/`
- **Agent Rules**: `.claude/AGENT_RULES.md`
- **Agent Definitions**: `.claude/agents.json`
