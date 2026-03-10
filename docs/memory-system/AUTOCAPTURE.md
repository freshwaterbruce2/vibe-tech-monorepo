# AutoCapture - Automatic Context Tracking

Last Updated: 2026-02-15
Status: Phase 1.5 Complete

## Overview

AutoCapture automatically tracks your Claude Code sessions without manual tool calls. It captures:

- ✅ Session start/end events
- ✅ Tool usage patterns (automatic)
- ✅ File edits (when integrated)
- ✅ Git commits (when integrated)
- ✅ Command success rates

## Features

### 1. Automatic Session Tracking

Every MCP server session is tracked automatically:

```json
{
  "query": "Session started: claude-code-mcp-1739584920123-abc123",
  "response": "New Claude Code session initialized",
  "metadata": {
    "event": "session_start",
    "mcp_version": "1.0.0",
    "node_version": "v22.x.x",
    "platform": "win32"
  }
}
```

### 2. Tool Usage Tracking

Every MCP tool call is automatically tracked:

```json
{
  "pattern": "memory_add_semantic",
  "context": "Using memory_add_semantic tool",
  "frequency": 15,
  "successRate": 0.93,
  "metadata": {
    "avgDuration": 234,
    "avgResultSize": 156
  }
}
```

### 3. Session Replay

New MCP tools for reviewing past sessions:

#### `memory_get_session`

Replay all events from a specific session:

```javascript
Use memory_get_session tool with:
  sessionId: "claude-code-mcp-1739584920123-abc123"

// Returns chronological list of all queries/responses
```

#### `memory_search_timerange`

Find what you worked on during a time period:

```javascript
Use memory_search_timerange tool with:
  startTime: 1739577600000  // Unix milliseconds
  endTime: 1739664000000
  query: "database"  // Optional filter

// Returns all memories in that time range
```

## Configuration

Environment variables in `.mcp.json`:

```json
{
  "memory": {
    "env": {
      "MEMORY_AUTO_CAPTURE": "true",  // Enable/disable (default: true)
      "MEMORY_DB_PATH": "D:/databases/memory.db",
      "MEMORY_EMBEDDING_MODEL": "nomic-embed-text",
      "MEMORY_EMBEDDING_DIM": "768"
    }
  }
}
```

## AutoCapture Class API

Located at `packages/memory/src/hooks/AutoCapture.ts`

### Constructor

```typescript
import { AutoCapture } from '@vibetech/memory';

const capture = new AutoCapture(memoryManager, {
  sourceId: 'claude-code-mcp',
  captureSessionEvents: true,
  captureFileEdits: false,
  captureGitCommits: false,
  minImportance: 5,
});
```

### Methods

```typescript
// Capture session lifecycle
await capture.captureSessionStart(metadata);
await capture.captureSessionEnd(summary);

// Capture interactions
await capture.captureInteraction(query, response, metadata);

// Capture file operations
await capture.captureFileEdit(filePath, 'create' | 'edit' | 'delete', summary);

// Capture git activity
await capture.captureGitCommit(message, files, branch);

// Capture tool usage
await capture.captureToolUse(toolName, args, 'success' | 'failure', metadata);

// Get session info
const sessionId = capture.getSessionId();
const durationMs = capture.getSessionDuration();
```

## Examples

### Example 1: Review Yesterday's Work

```javascript
// Get Unix timestamp for yesterday 9 AM
const yesterday9am = Date.now() - (24 * 60 * 60 * 1000);
const yesterday5pm = yesterday9am + (8 * 60 * 60 * 1000);

Use memory_search_timerange tool with:
  startTime: yesterday9am
  endTime: yesterday5pm

// Shows all queries/responses from yesterday's workday
```

### Example 2: Replay Specific Session

```javascript
// First, get recent sessions
Use memory_get_recent tool with:
  limit: 5

// Find the session ID you want to replay
Use memory_get_session tool with:
  sessionId: "claude-code-mcp-1739584920123-abc123"

// See everything that happened in that session chronologically
```

### Example 3: Find Successful Patterns

```javascript
Use memory_get_patterns tool with:
  sortBy: "success"
  limit: 10

// Shows top 10 most successful command patterns
// Use these to understand what workflows work best
```

## Integration with Dashboard

The memory dashboard (`scripts/memory-dashboard.ps1`) shows auto-captured data:

```powershell
.\scripts\memory-dashboard.ps1

# Output includes:
# - Recent Activity (auto-captured sessions)
# - Top Command Patterns (auto-captured tool usage)
# - Session durations
# - Success rates
```

## Performance

- **Capture overhead**: ~5-10ms per tool call
- **Database impact**: Minimal (episodic inserts are fast)
- **Storage**: ~1KB per captured event
- **Recommended retention**: 90 days (configurable)

## Troubleshooting

### Issue: AutoCapture not working

**Check**: Verify `MEMORY_AUTO_CAPTURE` is not set to `false`

**Test**:
```powershell
$env:MEMORY_AUTO_CAPTURE
# Should be empty or "true"
```

### Issue: Too many events captured

**Solution**: Increase `minImportance` threshold:

```typescript
const capture = new AutoCapture(memoryManager, {
  minImportance: 7,  // Only capture important events (7+)
});
```

### Issue: Session IDs not showing

**Check**: Ensure MCP server initialized AutoCapture:

```bash
# Look for this in MCP server logs:
[memory-mcp] Auto-capture enabled (session: claude-code-mcp-...)
```

## Next Steps

### Phase 2 Enhancements

- **File edit tracking**: Capture every file modification automatically
- **Git commit tracking**: Link commits to session context
- **Smart summarization**: AI-generated session summaries
- **Pattern suggestions**: Proactive workflow recommendations

### Integration Opportunities

- **Crypto trading**: Track successful trade patterns
- **Vibe-tutor**: Record student interaction patterns
- **Nova-agent**: Project-level context persistence

## Related Documentation

- [Quick Start Guide](QUICK_START.md) - Basic memory system usage
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
- [Phase 1 Complete](../MEMORY_SYSTEM_PHASE1_COMPLETE.md) - Full feature list

---

**AutoCapture Status**: ✅ Active and working
**MCP Integration**: ✅ Complete
**Dashboard Support**: ✅ Implemented
**Session Replay**: ✅ Available
