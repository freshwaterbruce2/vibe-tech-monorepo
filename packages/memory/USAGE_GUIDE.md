# Memory System Usage Guide

Complete guide to using the VibeTech Memory System via MCP tools.

**Version:** 2.0.0 (Phase 2 Complete)
**Date:** 2026-02-14
**Database:** `D:\databases\memory.db`

---

## Table of Contents

1. [Core Features](#core-features)
2. [Advanced Features](#advanced-features)
3. [Crypto Trading Integration](#crypto-trading-integration)
4. [Git Workflow Integration](#git-workflow-integration)
5. [Nova-Agent Context Integration](#nova-agent-context-integration)
6. [Configuration](#configuration)
7. [Best Practices](#best-practices)

---

## Core Features

### 1. Semantic Search (`memory_search_semantic`)

**Purpose:** Find relevant knowledge by semantic similarity

**Parameters:**
```json
{
  "query": "string (required) - Search query",
  "limit": "number (optional) - Max results (default: 5)",
  "category": "string (optional) - Filter by category"
}
```

**Example:**
```json
{
  "query": "how to deploy to production",
  "limit": 10,
  "category": "devops"
}
```

**Response:**
```json
{
  "results": [
    {
      "id": 42,
      "text": "Production deployment uses docker-compose...",
      "similarity": 0.89,
      "category": "devops",
      "importance": 8,
      "created": 1707926400000,
      "accessCount": 15
    }
  ]
}
```

---

### 2. Episodic Search (`memory_search_episodic`)

**Purpose:** Search recent events and conversations

**Parameters:**
```json
{
  "query": "string (optional) - Text search",
  "session": "string (optional) - Session ID filter",
  "limit": "number (optional) - Max results (default: 10)"
}
```

**Example:**
```json
{
  "query": "fixed bug in crypto trading",
  "limit": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "id": 123,
      "text": "Fixed nonce synchronization bug in crypto-enhanced",
      "timestamp": 1707926400000,
      "session": "session-abc123",
      "context": {"file": "apps/crypto-enhanced/src/database.py"}
    }
  ]
}
```

---

### 3. Recent Memories (`memory_get_recent`)

**Purpose:** Get recent episodic memories

**Parameters:**
```json
{
  "limit": "number (optional) - Max results (default: 10)",
  "session": "string (optional) - Session ID filter"
}
```

**Example:**
```json
{
  "limit": 20
}
```

**Response:**
```json
{
  "memories": [
    {
      "id": 456,
      "text": "Implemented memory consolidation feature",
      "timestamp": 1707926400000,
      "session": "session-xyz789"
    }
  ]
}
```

---

### 4. Add Semantic Memory (`memory_add_semantic`)

**Purpose:** Store long-term knowledge

**Parameters:**
```json
{
  "text": "string (required) - Knowledge to store",
  "category": "string (optional) - Category tag",
  "importance": "number (optional) - 1-10 (default: 5)",
  "metadata": "object (optional) - Additional context"
}
```

**Example:**
```json
{
  "text": "Always use pnpm --filter for isolated project operations to avoid full monorepo installs",
  "category": "development",
  "importance": 9,
  "metadata": {
    "source": "pnpm-2026-best-practices.md",
    "tags": ["pnpm", "monorepo", "performance"]
  }
}
```

**Response:**
```json
{
  "id": 789,
  "message": "Semantic memory stored successfully"
}
```

---

### 5. Add Episodic Memory (`memory_add_episodic`)

**Purpose:** Record recent events

**Parameters:**
```json
{
  "text": "string (required) - Event description",
  "session": "string (optional) - Session ID",
  "context": "object (optional) - Event context"
}
```

**Example:**
```json
{
  "text": "User reported performance issue in vibe-tutor after upgrade to React 19",
  "session": "debug-session-001",
  "context": {
    "app": "vibe-tutor",
    "version": "2.0.0",
    "platform": "Android"
  }
}
```

**Response:**
```json
{
  "id": 234,
  "message": "Episodic memory recorded"
}
```

---

### 6. Health Check (`memory_health`)

**Purpose:** Verify system health

**Parameters:** None

**Example:**
```json
{}
```

**Response:**
```json
{
  "healthy": true,
  "message": "All systems operational",
  "stats": {
    "episodicCount": 156,
    "semanticCount": 89,
    "proceduralCount": 23,
    "dbSize": 4096,
    "lastAccess": 1707926400000
  }
}
```

---

## Advanced Features

### 7. Smart Suggestions (`memory_suggest`)

**Purpose:** Get AI-powered next action suggestions

**Parameters:**
```json
{
  "limit": "number (optional) - Max suggestions (default: 5)"
}
```

**Example:**
```json
{
  "limit": 3
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "workflow",
      "title": "Common workflow detected",
      "description": "After 'pnpm install', you usually run 'pnpm build'",
      "confidence": 0.85,
      "evidence": [
        "Pattern detected 15 times in last 30 days",
        "Success rate: 93%"
      ],
      "actionable": true
    },
    {
      "type": "failure",
      "title": "Repeated error pattern",
      "description": "Build fails when TypeScript strict mode is disabled",
      "confidence": 0.78,
      "evidence": [
        "Failed 3 times in last week",
        "Always resolved by enabling strict mode"
      ],
      "actionable": true
    }
  ]
}
```

---

### 8. Export to Markdown (`memory_export`)

**Purpose:** Generate markdown reports

**Parameters:**
```json
{
  "format": "string (required) - 'full' | 'session' | 'knowledge'",
  "session": "string (optional) - Session ID for 'session' format",
  "category": "string (optional) - Category filter for 'knowledge' format",
  "includeEpisodic": "boolean (optional) - Include episodic memories",
  "includeSemantic": "boolean (optional) - Include semantic memories",
  "includeProcedural": "boolean (optional) - Include procedural memories",
  "includeSuggestions": "boolean (optional) - Include smart suggestions"
}
```

**Example (Full Report):**
```json
{
  "format": "full",
  "includeEpisodic": true,
  "includeSemantic": true,
  "includeProcedural": true,
  "includeSuggestions": true
}
```

**Example (Session Summary):**
```json
{
  "format": "session",
  "session": "session-abc123"
}
```

**Example (Knowledge Base):**
```json
{
  "format": "knowledge",
  "category": "crypto-trading"
}
```

**Response:**
```json
{
  "markdown": "# Memory System Report\n\n## Statistics\n...",
  "format": "full",
  "generatedAt": 1707926400000
}
```

---

### 9. Analyze Pattern (`memory_analyze_pattern`)

**Purpose:** Deep dive into specific pattern

**Parameters:**
```json
{
  "pattern": "string (required) - Pattern to analyze"
}
```

**Example:**
```json
{
  "pattern": "pnpm build failure"
}
```

**Response:**
```json
{
  "pattern": "pnpm build failure",
  "frequency": 12,
  "lastOccurrence": 1707926400000,
  "contexts": [
    "Missing dependencies in package.json",
    "TypeScript strict mode disabled",
    "Outdated node_modules cache"
  ],
  "relatedPatterns": [
    "pnpm install --filter",
    "nx reset"
  ],
  "recommendations": [
    "Always use pnpm --filter for isolated operations",
    "Enable TypeScript strict mode in tsconfig.json"
  ]
}
```

---

### 10. Consolidate Duplicates (`memory_consolidate`)

**Purpose:** Merge semantically similar memories

**Parameters:**
```json
{
  "threshold": "number (optional) - Similarity 0-1 (default: 0.9)",
  "dryRun": "boolean (optional) - Preview only (default: false)",
  "category": "string (optional) - Category filter",
  "preserveImportance": "boolean (optional) - Keep highest importance (default: true)"
}
```

**Example:**
```json
{
  "threshold": 0.85,
  "dryRun": false,
  "category": "development"
}
```

**Response:**
```json
{
  "merged": 5,
  "preserved": 84,
  "deletions": [
    {
      "deletedId": 123,
      "mergedIntoId": 89,
      "similarity": 0.92,
      "reason": "92.0% similar, merged into higher importance memory"
    }
  ]
}
```

---

### 11. Consolidation Preview (`memory_consolidate_preview`)

**Purpose:** Preview consolidation without applying

**Parameters:** Same as `memory_consolidate`

**Example:**
```json
{
  "threshold": 0.9
}
```

**Response:** Same format as `memory_consolidate` but nothing is actually merged

---

## Crypto Trading Integration

### 12. Track Trade (`memory_track_trade`)

**Purpose:** Record trading decision with P&L

**Parameters:**
```json
{
  "pair": "string (required) - Trading pair (e.g., 'BTC/USD')",
  "action": "string (required) - 'buy' | 'sell' | 'hold'",
  "price": "number (required) - Entry/exit price",
  "amount": "number (required) - Position size",
  "reason": "string (required) - Decision rationale",
  "confidence": "number (optional) - 0-1 (default: 0.5)",
  "timestamp": "number (optional) - Unix timestamp",
  "outcome": "string (optional) - 'profit' | 'loss' | 'pending'",
  "pnl": "number (optional) - Profit/loss amount"
}
```

**Example:**
```json
{
  "pair": "BTC/USD",
  "action": "buy",
  "price": 45000,
  "amount": 0.1,
  "reason": "Bullish trend reversal on 4h chart, RSI oversold",
  "confidence": 0.85,
  "timestamp": 1707926400000,
  "outcome": "profit",
  "pnl": 250
}
```

**Response:**
```json
{
  "tradeId": 567,
  "message": "Trade tracked successfully"
}
```

---

### 13. Get Trading Patterns (`memory_get_trading_patterns`)

**Purpose:** Retrieve successful trading strategies

**Parameters:**
```json
{
  "minWinRate": "number (optional) - Minimum win rate 0-1 (default: 0.6)"
}
```

**Example:**
```json
{
  "minWinRate": 0.7
}
```

**Response:**
```json
{
  "patterns": [
    {
      "pattern": "Bullish trend reversal on 4h chart",
      "frequency": 15,
      "winRate": 0.8,
      "avgPnL": 180,
      "pairs": ["BTC/USD", "ETH/USD"],
      "lastUsed": 1707926400000
    },
    {
      "pattern": "RSI oversold + volume spike",
      "frequency": 8,
      "winRate": 0.75,
      "avgPnL": 120,
      "pairs": ["BTC/USD"],
      "lastUsed": 1707840000000
    }
  ]
}
```

---

### 14. Trading Suggestions (`memory_trading_suggestions`)

**Purpose:** Get AI-powered trading recommendations

**Parameters:**
```json
{
  "pair": "string (optional) - Trading pair filter"
}
```

**Example:**
```json
{
  "pair": "BTC/USD"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "pattern": "Bullish trend reversal on 4h chart",
      "action": "buy",
      "confidence": 0.85,
      "historicalWinRate": 0.8,
      "avgPnL": 180,
      "recommendation": "Strong buy signal based on 80% historical win rate",
      "risk": "moderate"
    }
  ]
}
```

---

## Git Workflow Integration

### 15. Track Commit (`memory_track_commit`)

**Purpose:** Record git commit with metadata

**Parameters:**
```json
{
  "hash": "string (required) - Commit hash",
  "message": "string (required) - Commit message",
  "author": "string (required) - Author name",
  "branch": "string (required) - Branch name",
  "filesChanged": "number (required) - File count",
  "additions": "number (required) - Lines added",
  "deletions": "number (required) - Lines deleted",
  "timestamp": "number (optional) - Unix timestamp"
}
```

**Example:**
```json
{
  "hash": "36ca1a76",
  "message": "feat(memory): Phase 2 - Advanced Features & System Integrations",
  "author": "Bruce",
  "branch": "feature/backend-health-endpoint",
  "filesChanged": 32,
  "additions": 5344,
  "deletions": 0,
  "timestamp": 1707926400000
}
```

**Response:**
```json
{
  "commitId": 890,
  "message": "Commit tracked successfully",
  "type": "feat"
}
```

---

### 16. Suggest Git Command (`memory_suggest_git_command`)

**Purpose:** Get next git command suggestion

**Parameters:**
```json
{
  "currentCommand": "string (optional) - Last command run"
}
```

**Example:**
```json
{
  "currentCommand": "git add ."
}
```

**Response:**
```json
{
  "command": "git commit",
  "confidence": 0.85,
  "reason": "You run 'git commit' after 'git add' 95% of the time",
  "alternatives": [
    {
      "command": "git status",
      "confidence": 0.6,
      "reason": "Sometimes you check status after staging"
    }
  ]
}
```

---

### 17. Commit Statistics (`memory_commit_stats`)

**Purpose:** Analyze commit history

**Parameters:** None

**Example:**
```json
{}
```

**Response:**
```json
{
  "totalCommits": 234,
  "byType": {
    "feat": 89,
    "fix": 56,
    "refactor": 34,
    "docs": 23,
    "chore": 32
  },
  "byBranch": {
    "main": 156,
    "feature/backend-health-endpoint": 78
  },
  "byDayOfWeek": {
    "Monday": 45,
    "Tuesday": 38,
    "Wednesday": 42,
    "Thursday": 39,
    "Friday": 35,
    "Saturday": 20,
    "Sunday": 15
  },
  "avgFilesChanged": 8.5,
  "avgAdditions": 145,
  "avgDeletions": 32
}
```

---

## Nova-Agent Context Integration

### 18. Set Context (`memory_set_context`)

**Purpose:** Save current project context

**Parameters:**
```json
{
  "name": "string (required) - Project name",
  "path": "string (required) - Project path",
  "currentFile": "string (optional) - Active file",
  "currentTask": "string (optional) - Current task",
  "recentFiles": "array (optional) - Recently accessed files",
  "recentTasks": "array (optional) - Recent task IDs",
  "lastActive": "number (optional) - Unix timestamp"
}
```

**Example:**
```json
{
  "name": "VibeTech Monorepo",
  "path": "C:/dev",
  "currentFile": "packages/memory/src/integrations/NovaMemory.ts",
  "currentTask": "Implement context persistence",
  "recentFiles": [
    "packages/memory/src/index.ts",
    "apps/memory-mcp/src/handlers.ts",
    "packages/memory/test-memory.mjs"
  ],
  "recentTasks": ["phase-2a", "phase-2b"],
  "lastActive": 1707926400000
}
```

**Response:**
```json
{
  "message": "Project context saved successfully"
}
```

---

### 19. Get Context (`memory_get_context`)

**Purpose:** Restore last project context

**Parameters:** None

**Example:**
```json
{}
```

**Response:**
```json
{
  "name": "VibeTech Monorepo",
  "path": "C:/dev",
  "currentFile": "packages/memory/src/integrations/NovaMemory.ts",
  "currentTask": "Implement context persistence",
  "recentFiles": [
    "packages/memory/src/index.ts",
    "apps/memory-mcp/src/handlers.ts",
    "packages/memory/test-memory.mjs"
  ],
  "recentTasks": ["phase-2a", "phase-2b"],
  "lastActive": 1707926400000
}
```

---

### 20. Suggest Next Task (`memory_suggest_task`)

**Purpose:** Get AI-powered task suggestions

**Parameters:** None

**Example:**
```json
{}
```

**Response:**
```json
{
  "task": {
    "id": "task-456",
    "title": "Implement AI Session Summaries",
    "description": "Complete Phase 2A feature #4 - deferred",
    "priority": 8,
    "estimatedEffort": "medium",
    "dependencies": [],
    "reasoning": "Highest priority incomplete Phase 2 feature"
  },
  "alternatives": [
    {
      "id": "task-457",
      "title": "Write integration tests for crypto trading",
      "priority": 7,
      "reasoning": "Ensure trading system reliability"
    }
  ]
}
```

---

## Configuration

### Environment Variables

Set in `.mcp.json`:

```json
{
  "memory": {
    "command": "node",
    "args": ["C:/dev/apps/memory-mcp/dist/index.js"],
    "env": {
      "MEMORY_DB_PATH": "D:/databases/memory.db",
      "MEMORY_EMBEDDING_MODEL": "nomic-embed-text",
      "MEMORY_EMBEDDING_DIM": "768",
      "MEMORY_FALLBACK_TRANSFORMERS": "true"
    }
  }
}
```

### Database Location

**Production:** `D:\databases\memory.db`
**Development:** Set `MEMORY_DB_PATH` to custom location

### Embedding Configuration

**Primary:** Ollama with `nomic-embed-text` model (768 dimensions)
**Fallback:** Transformers.js (if Ollama unavailable)

To use Ollama:
```bash
ollama pull nomic-embed-text
```

---

## Best Practices

### 1. Semantic Memory

**Use for:**
- Long-term knowledge (best practices, architecture decisions)
- Important patterns (coding standards, workflows)
- Configuration knowledge (deployment procedures)

**Categories:**
- `development` - Coding standards, patterns
- `devops` - Deployment, infrastructure
- `crypto-trading` - Trading strategies
- `debugging` - Known issues, solutions

**Importance Scale:**
- 1-3: Low (nice to know)
- 4-6: Medium (useful reference)
- 7-9: High (critical knowledge)
- 10: Critical (must remember)

### 2. Episodic Memory

**Use for:**
- Recent events (bugs fixed, features added)
- Conversations (user requests, decisions made)
- Debugging sessions (error traces, solutions)

**Context:**
- Always include relevant file paths
- Add error messages if applicable
- Reference related tasks/tickets

### 3. Consolidation

**Run consolidation:**
- Monthly (remove duplicates)
- After major refactoring (clean up old knowledge)
- When database >100 MB (optimize storage)

**Threshold Guide:**
- 0.95+ - Nearly identical (safe to merge)
- 0.85-0.95 - Very similar (review first)
- <0.85 - Different enough (keep separate)

### 4. Trading Integration

**Track trades:**
- Immediately after execution
- Include detailed reasoning
- Record actual P&L when closed

**Review patterns:**
- Weekly (identify successful strategies)
- Before major trades (check historical performance)
- After losses (learn from mistakes)

### 5. Git Integration

**Track commits:**
- Automatically via git hooks (recommended)
- Manually for major milestones

**Use suggestions:**
- During workflow automation
- When learning new git patterns

### 6. Context Persistence

**Save context:**
- End of each session
- Before switching projects
- After major milestones

**Restore context:**
- Start of new session
- After system restart

---

## Examples in Practice

### Example 1: Debugging Workflow

```javascript
// 1. Search for similar issues
await memory_search_semantic({
  query: "nonce synchronization error",
  category: "debugging"
});

// 2. Record the fix
await memory_add_episodic({
  text: "Fixed nonce synchronization by implementing file lock",
  context: {
    file: "apps/crypto-enhanced/src/database.py",
    error: "InvalidNonce",
    solution: "Added fcntl file locking"
  }
});

// 3. Store knowledge for future
await memory_add_semantic({
  text: "Nonce synchronization requires file locks when multiple processes access database",
  category: "debugging",
  importance: 8
});
```

### Example 2: Trading Decision

```javascript
// 1. Get successful patterns
const patterns = await memory_get_trading_patterns({
  minWinRate: 0.7
});

// 2. Get AI suggestions
const suggestions = await memory_trading_suggestions({
  pair: "BTC/USD"
});

// 3. Record trade decision
await memory_track_trade({
  pair: "BTC/USD",
  action: "buy",
  price: 45000,
  amount: 0.1,
  reason: patterns[0].pattern, // Use successful pattern
  confidence: 0.85,
  timestamp: Date.now(),
  outcome: "pending"
});

// 4. Update with outcome later
await memory_track_trade({
  pair: "BTC/USD",
  action: "sell",
  price: 45500,
  amount: 0.1,
  reason: "Take profit at resistance level",
  confidence: 0.8,
  timestamp: Date.now(),
  outcome: "profit",
  pnl: 50
});
```

### Example 3: Project Context

```javascript
// 1. Restore last session
const context = await memory_get_context();
console.log(`Resuming: ${context.currentTask}`);
console.log(`Last file: ${context.currentFile}`);

// 2. Get suggested next task
const taskSuggestion = await memory_suggest_task();
console.log(`Recommended: ${taskSuggestion.task.title}`);

// 3. Work on task...

// 4. Save updated context
await memory_set_context({
  name: context.name,
  path: context.path,
  currentFile: "packages/memory/USAGE_GUIDE.md",
  currentTask: "Document MCP tools",
  recentFiles: [
    ...context.recentFiles,
    "packages/memory/USAGE_GUIDE.md"
  ],
  recentTasks: [
    ...context.recentTasks,
    "phase-2-docs"
  ],
  lastActive: Date.now()
});
```

---

## Troubleshooting

### Issue: "Database not found"

**Solution:**
```bash
# Verify database exists
Test-Path D:\databases\memory.db

# Create if missing
New-Item -Path D:\databases -ItemType Directory -Force
node C:\dev\apps\memory-mcp\dist\index.js  # Auto-creates DB
```

### Issue: "Ollama connection failed"

**Solution:**
```bash
# Check Ollama is running
ollama list

# Pull embedding model
ollama pull nomic-embed-text

# Test embedding generation
ollama embed nomic-embed-text "test query"
```

**Fallback:** System automatically uses Transformers.js if Ollama unavailable

### Issue: "Low quality search results"

**Solution:**
1. Increase importance of critical knowledge (7-10)
2. Add more context to semantic memories
3. Use specific categories
4. Run consolidation to merge duplicates

### Issue: "Too many duplicate memories"

**Solution:**
```javascript
// Preview consolidation
await memory_consolidate_preview({ threshold: 0.9 });

// Apply consolidation
await memory_consolidate({
  threshold: 0.9,
  dryRun: false,
  preserveImportance: true
});
```

---

## API Reference

See TypeScript type definitions:
- `packages/memory/src/types/index.ts` - Core types
- `packages/memory/src/integrations/*.ts` - Integration types

Build documentation:
```bash
pnpm --filter @vibetech/memory build:docs
```

---

**Last Updated:** 2026-02-14
**Version:** 2.0.0 (Phase 2 Complete)
**Support:** See `PHASE_2_COMPLETE.md` for feature details
