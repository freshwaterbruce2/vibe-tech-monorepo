# Specialist Agent Execution Recording — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically record every specialist agent (Agent tool) invocation to `D:\databases\agent_learning.db` via the `memory_learning_record_execution` MCP tool, so success rates and task patterns accumulate for future decision-making.

**Architecture:** A PostToolUse hook fires on the `Agent` tool's completion. It extracts `subagent_type`, `description`, `success`, and duration from the tool payload, then POSTs to the memory-mcp HTTP Bridge (port 3200), which writes through `LearningBridge.recordExecution()`. Fire-and-forget — never blocks the tool call.

**Tech Stack:** PowerShell 7, Claude Code hooks (`settings.json`), memory-mcp HTTP Bridge (Node.js), `LearningBridge` (TypeScript), SQLite (`D:\databases\agent_learning.db`).

---

## Prerequisites

Before starting, confirm the following are in place (all completed in commit `7e44503`):

- `LearningBridge.recordExecution()` exists in `packages/memory/src/integrations/LearningBridge.ts`
- MCP tool `memory_learning_record_execution` registered in `apps/memory-mcp/src/tools.ts`
- MCP handler wired in `apps/memory-mcp/src/handlers-learning.ts`
- `memory-mcp` HTTP Bridge listens on `http://localhost:3200`
- `D:\databases\agent_learning.db` has tables: `agent_executions`, `success_patterns`, `agent_mistakes`

Verify memory-mcp is running:

```bash
curl.exe -s -X POST http://localhost:3200 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_learning_health","arguments":{}}}'
```

Expected: `healthy: true` with table counts.

---

## Task 1: Create the Hook Script

**Files:**
- Create: `.claude/hooks/record-agent-execution.ps1`

**Step 1: Create the PowerShell hook**

```powershell
#!/usr/bin/env powershell
# PostToolUse hook — records specialist agent (Agent tool) invocations to the learning DB
# Fires on ANY PostToolUse; exits early if tool_name != "Agent"
# Fire-and-forget: never blocks, never fails the tool call

$ErrorActionPreference = 'SilentlyContinue'
$inputJson = [Console]::In.ReadToEnd()

# Exit silently if nothing on stdin
if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop

    # Only handle Agent tool invocations — bail on everything else
    $toolName = $hookData.tool_name
    if ($toolName -ne 'Agent') { exit 0 }

    # Extract subagent details from tool_input
    $subagentType = $hookData.tool_input.subagent_type
    if ([string]::IsNullOrWhiteSpace($subagentType)) { $subagentType = 'unknown-agent' }

    $description = $hookData.tool_input.description
    if ([string]::IsNullOrWhiteSpace($description)) { $description = 'subagent-task' }

    $prompt = $hookData.tool_input.prompt
    $contextSnippet = if ($prompt) { $prompt.Substring(0, [Math]::Min(500, $prompt.Length)) } else { '' }

    # Determine success from tool_response
    # Claude Code marks failed tool calls with is_error=true on the response
    $success = $true
    $errorMessage = $null
    if ($hookData.tool_response.is_error -eq $true) {
        $success = $false
        $errorMessage = 'Subagent returned error'
    }
    if ($hookData.error) {
        $success = $false
        $errorMessage = $hookData.error
    }

    # Duration (if provided by the hook)
    $executionTimeMs = $null
    if ($hookData.duration_ms) { $executionTimeMs = [int]$hookData.duration_ms }
    elseif ($hookData.duration) { $executionTimeMs = [int]($hookData.duration * 1000) }

    # Infer project from cwd
    $project = $null
    if ($hookData.cwd -match 'C:\\dev\\apps\\([^\\]+)') { $project = $matches[1] }
    elseif ($hookData.cwd -match 'C:\\dev\\packages\\([^\\]+)') { $project = $matches[1] }
    elseif ($hookData.cwd -match 'C:\\dev\\backend\\([^\\]+)') { $project = $matches[1] }

    # Build MCP payload
    $args = @{
        agentId = $subagentType
        taskType = $description
        success = $success
    }
    if ($project) { $args.projectName = $project }
    if ($executionTimeMs) { $args.executionTimeMs = $executionTimeMs }
    if ($errorMessage) { $args.errorMessage = $errorMessage }
    if ($contextSnippet) { $args.context = $contextSnippet }

    $payload = @{
        jsonrpc = '2.0'
        id = [Guid]::NewGuid().ToString()
        method = 'tools/call'
        params = @{
            name = 'memory_learning_record_execution'
            arguments = $args
        }
    } | ConvertTo-Json -Depth 5 -Compress

    # POST with 2s timeout — fire and forget
    try {
        Invoke-RestMethod -Uri 'http://localhost:3200' `
            -Method POST `
            -Body $payload `
            -ContentType 'application/json' `
            -TimeoutSec 2 `
            -ErrorAction SilentlyContinue | Out-Null
    } catch {
        # Silent — memory-mcp may not be running
    }

    # Debug log (optional, writes to D:\logs)
    $logDir = 'D:\logs\learning-system'
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    $logLine = "[{0}] {1} ({2}) success={3} project={4} ms={5}" -f `
        (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $subagentType, $description, $success, $project, $executionTimeMs
    Add-Content -Path "$logDir\agent-executions.log" -Value $logLine -ErrorAction SilentlyContinue

} catch {
    # Silent failure — do NOT block the tool call
}

exit 0
```

**Step 2: Verify file was created**

Run: `Test-Path C:\dev\.claude\hooks\record-agent-execution.ps1`
Expected: `True`

**Step 3: Verify syntax**

Run: `powershell -NoProfile -Command "[System.Management.Automation.Language.Parser]::ParseFile('C:\dev\.claude\hooks\record-agent-execution.ps1', [ref]$null, [ref]$null) | Out-Null; echo 'OK'"`
Expected: `OK`

**Step 4: Commit**

```bash
cd C:/dev
git add .claude/hooks/record-agent-execution.ps1
git commit -m "feat(hooks): add PostToolUse hook for agent execution recording"
```

---

## Task 2: Register the Hook in settings.json

**Files:**
- Modify: `C:\dev\.claude\settings.json:101`

**Step 1: Update the empty `"hooks": {}` block**

Replace:

```json
"hooks": {},
```

With:

```json
"hooks": {
  "PostToolUse": [
    {
      "matcher": "Agent",
      "hooks": [
        {
          "type": "command",
          "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/record-agent-execution.ps1"
        }
      ]
    }
  ]
},
```

**Step 2: Validate JSON**

Run: `powershell -NoProfile -Command "Get-Content C:\dev\.claude\settings.json | ConvertFrom-Json | Out-Null; echo 'Valid JSON'"`
Expected: `Valid JSON`

**Step 3: Commit**

```bash
cd C:/dev
git add .claude/settings.json
git commit -m "feat(hooks): wire record-agent-execution hook to PostToolUse(Agent)"
```

**Note:** The user must restart Claude Code (or reload hooks) for this to take effect. Document this in the commit message.

---

## Task 3: Write a Dry-Run Test Script

**Files:**
- Create: `tools/hook-tests/test-record-agent-execution.ps1`

**Step 1: Write the test script**

```powershell
#!/usr/bin/env powershell
# Simulates a PostToolUse hook payload for the Agent tool
# Pipes it into record-agent-execution.ps1 and verifies the DB row was written

$ErrorActionPreference = 'Stop'

$hookPayload = @{
    tool_name = 'Agent'
    tool_input = @{
        subagent_type = 'test-harness-agent'
        description = 'Dry-run test of recording hook'
        prompt = 'This is a synthetic prompt used only for hook testing.'
    }
    tool_response = @{
        is_error = $false
    }
    cwd = 'C:\dev\apps\memory-mcp'
    duration_ms = 1234
} | ConvertTo-Json -Depth 5 -Compress

Write-Host "Sending synthetic Agent PostToolUse payload to hook..."
$hookPayload | & powershell -NoProfile -ExecutionPolicy Bypass -File C:\dev\.claude\hooks\record-agent-execution.ps1

Write-Host "Waiting 1s for HTTP write to complete..."
Start-Sleep -Seconds 1

Write-Host "Checking D:\databases\agent_learning.db for synthetic row..."
$result = sqlite3 D:\databases\agent_learning.db "SELECT agent_id, task_type, success, execution_time_ms, project_name FROM agent_executions WHERE agent_id = 'test-harness-agent' ORDER BY started_at DESC LIMIT 1;"

if ($result) {
    Write-Host "PASS: Row written: $result" -ForegroundColor Green
} else {
    Write-Host "FAIL: No row found for agent_id='test-harness-agent'" -ForegroundColor Red
    Write-Host "Check D:\logs\learning-system\agent-executions.log for hook output"
    exit 1
}

Write-Host "Cleaning up synthetic row..."
sqlite3 D:\databases\agent_learning.db "DELETE FROM agent_executions WHERE agent_id = 'test-harness-agent';"

Write-Host "PASS" -ForegroundColor Green
exit 0
```

**Step 2: Run the test**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File C:\dev\tools\hook-tests\test-record-agent-execution.ps1`
Expected: `PASS` in green, with row details printed

**Step 3: If test fails, debug**

Check in order:
1. Is memory-mcp running? `curl.exe -s -X POST http://localhost:3200 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_learning_health","arguments":{}}}'` — expect `healthy: true`
2. Read the debug log: `Get-Content D:\logs\learning-system\agent-executions.log -Tail 5`
3. Run hook manually with `-Verbose` flag appended to PowerShell invocation

**Step 4: Commit**

```bash
cd C:/dev
git add tools/hook-tests/test-record-agent-execution.ps1
git commit -m "test(hooks): add dry-run test for agent execution recording"
```

---

## Task 4: Retarget Legacy post-tool-use-stdin.ps1 (Cleanup)

**Context:** The existing `.claude/hooks/post-tool-use-stdin.ps1:96-108` writes to `D:\learning-system\agent_learning.db` via Python `SimpleLearningEngine`. That DB path was archived during the learning system consolidation (commit `7e44503`). The Python calls now silently fail.

**Decision options:**
- **(A) Retarget**: Update `learning_engine.py` to write to `D:\databases\agent_learning.db` with the new schema
- **(B) Remove**: Delete the Python-call block from `post-tool-use-stdin.ps1` since the new hook supersedes it

**Recommended: Option B.** The new Agent-specific hook captures the useful signal (specialist agent executions). Per-tool-call logging of every Bash/Read/Edit is high-volume noise. Keep only the log-file output.

**Files:**
- Modify: `C:\dev\.claude\hooks\post-tool-use-stdin.ps1:91-127`

**Step 1: Remove the Python block**

Delete lines 91-127 (the entire `# Write to learning database via Python` block through the `Start-Job` cleanup). Keep lines 86-89 (file logging) and lines 129-140 (error handling + cleanup).

**Step 2: Verify the hook still parses**

Run: `powershell -NoProfile -Command "[System.Management.Automation.Language.Parser]::ParseFile('C:\dev\.claude\hooks\post-tool-use-stdin.ps1', [ref]$null, [ref]$null) | Out-Null; echo 'OK'"`
Expected: `OK`

**Step 3: Commit**

```bash
cd C:/dev
git add .claude/hooks/post-tool-use-stdin.ps1
git commit -m "refactor(hooks): remove dead Python learning call from post-tool-use hook"
```

---

## Task 5: End-to-End Verification with Real Subagent

**Step 1: Restart Claude Code to load the hook**

User action: Restart Claude Code (Ctrl+C and relaunch, or reload via UI).

**Step 2: Check baseline count**

Run: `sqlite3 D:\databases\agent_learning.db "SELECT COUNT(*) FROM agent_executions;"`
Record the number (e.g., `24`).

**Step 3: Invoke a real subagent**

In Claude Code, trigger any Explore agent invocation. E.g., ask: "Use the Explore agent to find all package.json files in packages/"

**Step 4: Verify a new row was written**

Run: `sqlite3 D:\databases\agent_learning.db "SELECT agent_id, task_type, success, started_at FROM agent_executions ORDER BY started_at DESC LIMIT 3;"`
Expected: The most recent row has `agent_id='Explore'` (or similar) and `success=1`.

**Step 5: Verify the count incremented**

Run: `sqlite3 D:\databases\agent_learning.db "SELECT COUNT(*) FROM agent_executions;"`
Expected: baseline + 1.

**Step 6: Check the debug log**

Run: `Get-Content D:\logs\learning-system\agent-executions.log -Tail 3`
Expected: A recent line with the agent name and success=True.

**Step 7: If verification fails, debug path**

1. Is the hook even firing? Check log file exists and grows with subagent calls.
2. If log shows the hook ran but DB has no new row: check memory-mcp is running on port 3200.
3. If nothing in log: hook is not wired. Re-check `settings.json:hooks` block.

---

## Task 6: Documentation Update

**Files:**
- Modify: `C:\dev\.claude\rules\memory-system.md`

**Step 1: Add section about agent execution recording**

Append to `memory-system.md`:

```markdown
## Automated Agent Execution Recording

Specialist agent invocations (Agent tool) are automatically recorded to
`D:\databases\agent_learning.db` via the `PostToolUse(Agent)` hook:
`.claude/hooks/record-agent-execution.ps1`.

Each invocation writes: `agent_id` (subagent_type), `task_type` (description),
`success`, `execution_time_ms`, `project_name`, and `context` (truncated prompt).

View recent executions:
`sqlite3 D:\databases\agent_learning.db "SELECT agent_id, task_type, success, started_at FROM agent_executions ORDER BY started_at DESC LIMIT 10;"`

Disable: set `"hooks": {}` in `.claude/settings.json` and restart Claude Code.
```

**Step 2: Commit**

```bash
cd C:/dev
git add .claude/rules/memory-system.md
git commit -m "docs: explain automated agent execution recording"
```

---

## Success Criteria

- [ ] `.claude/hooks/record-agent-execution.ps1` exists and parses cleanly
- [ ] `.claude/settings.json` has PostToolUse hook registered for matcher `Agent`
- [ ] `tools/hook-tests/test-record-agent-execution.ps1` dry-run passes (Task 3)
- [ ] After real subagent invocation, a new row appears in `agent_executions` with the correct `agent_id`
- [ ] `D:\logs\learning-system\agent-executions.log` grows on each Agent invocation
- [ ] memory-mcp unavailable → hook fails silently, no tool call is blocked
- [ ] Over time, `SELECT agent_id, COUNT(*), AVG(success) FROM agent_executions GROUP BY agent_id;` shows per-agent success rates

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Hook adds latency to every Agent tool call | 2s HTTP timeout, fire-and-forget, no blocking awaits |
| memory-mcp restart kills HTTP bridge | Hook catches connection errors silently; user sees no impact |
| Hook payload format changes in future Claude Code versions | Debug log captures raw events; test script (Task 3) detects regressions |
| Volume of executions swamps the DB | After 100k rows, apply a retention job (SELECT DELETE WHERE started_at < now() - 90 days) |
| Subagent prompts contain sensitive data (API keys in context) | 500-char truncation limits exposure; still, prompt=secret would leak to DB |

---

## Out of Scope

- Capturing tool sequences used *inside* the subagent (would require MCP-level instrumentation)
- Recording which MCP tools the subagent called (available via per-tool PostToolUse, but high volume)
- Auto-suggesting agents based on task description (future feature using `success_patterns`)
- Closing the learning loop back to Claude's decision-making during task execution
