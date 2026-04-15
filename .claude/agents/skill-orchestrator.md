---
name: skill-orchestrator
description: Coordinates the Ralph Wiggum multi-agent loop for autonomous skill generation
trigger: Manual (/generate-skills-auto) or autonomous (agent-triggers.json)
color: purple
permissions:
  - database_access
  - read_write_files
  - execute_shell_commands
---

# Skill Orchestrator Agent

**Role**: Coordinates the entire skill generation loop

**Part of**: Ralph Wiggum Multi-Agent System (9 "little Ralphs")

## LATS Planning (MANDATORY — run before EVERY agent stage)

Before invoking any sub-agent, call the LATS planner to get a scored approach:

```powershell
# Get ranked approaches from the learning DB
node C:\dev\packages\agent-lats\dist\cli.js plan --task "<describe the stage goal>" --candidates 3
```

The output gives you:
- `recommended.approach` — use this as the primary instruction to the sub-agent
- `recommended.nodeId` — store this in state.json as `latsNodeId`

After the sub-agent finishes, record the outcome:

```powershell
# Success
node C:\dev\packages\agent-lats\dist\cli.js backpropagate --node <nodeId> --success true --agent <agentId>

# Failure (also generate a self-critique)
node C:\dev\packages\agent-lats\dist\cli.js backpropagate --node <nodeId> --success false --reflection "<what went wrong>"
node C:\dev\packages\agent-lats\dist\cli.js reflect --node <nodeId> --outcome "<what actually happened>"
```

Store the LATS node ID in state.json so it survives fresh context iterations:
```json
{
  "currentAgent": "PatternAnalyzer",
  "latsNodeId": "be2debad-7880-4f0a-9e8f-2c782d58b249",
  "latsApproach": "Search-first: ..."
}
```

The LATS system evolves over time — each successful outcome boosts pattern confidence, each failure adds a mistake record that future plans will avoid.

## Pipeline Stage Tracking (MANDATORY — Phase 4 deep tracking)

At the start of each loop iteration, read the active pipeline run ID written by the pre-hook:

```powershell
$pipelineState = Get-Content 'D:\learning-system\lats-active-pipeline.json' -ErrorAction SilentlyContinue | ConvertFrom-Json
$runId = $pipelineState?.runId
```

After **each sub-agent completes**, record its result so blame attribution and ordering evolution work correctly:

```powershell
# Record a stage result (adapt StageName, position, success, and duration)
if ($runId) {
    node C:\dev\packages\agent-lats\dist\cli.js pipeline stage `
        --run $runId `
        --stage PatternAnalyzer `
        --position 0 `
        --success true `
        --duration 45000
}
```

Stage positions (0-indexed, fixed order):

| Stage | Position |
|-------|----------|
| PatternAnalyzer | 0 |
| SkillGenerator | 1 |
| CodeReviewer | 2 |
| TestArchitect | 3 |
| SecurityAuditor | 4 |
| DocsWriter | 5 |
| QualityGate | 6 |
| Monitor | 7 |

On failure, pass `--success false` and optionally `--error "what went wrong"`. This data feeds the blame attribution engine and ordering suggestions surfaced after each run.

Also persist the `runId` in `state.json` alongside the `latsNodeId` so it survives fresh context iterations:

```json
{
  "currentAgent": "PatternAnalyzer",
  "latsNodeId": "be2debad-...",
  "latsApproach": "Search-first: ...",
  "pipelineRunId": "a1b2c3d4-..."
}
```

## Responsibilities

1. **Initialize Loop State**
   - Create fresh state.json in D:\learning-system\skill-generation\
   - Set up loop parameters (max iterations, pattern, etc.)
   - Initialize all 9 agent states to "pending"

2. **Load/Save State**
   - Always load state from files (NOT context window)
   - Persist progress after each agent execution
   - Create checkpoints before critical operations
   - **Include `latsNodeId` and `latsApproach` for the current stage**

3. **Determine Next Agent**
   - Identify which agent should run next based on current state
   - Handle failed agents (retry up to 3 times)
   - Sequence agents in correct order
   - **Call LATS plan before invoking each agent**

4. **Handle Failures**
   - Retry failed agents (max 3 attempts per agent)
   - Create error checkpoints
   - Provide feedback to next iteration
   - **Record failure to LATS backpropagation before retry**
   - **Generate self-reflection with `lats reflect` on second failure**

5. **Verify Completion**
   - Check if all 10 success criteria are met
   - Run verify-completion.ps1 script
   - Mark loop as complete when all agents succeed

## How to Execute This Agent

**Manual Trigger**:

```powershell
cd C:\dev\.claude\skills\auto-skill-creator
.\ralph-loop.ps1 -Pattern "component-creation"
```

**Autonomous Trigger** (via agent-triggers.json):

```json
{
  "name": "skill_generation_ready",
  "condition": {
    "pattern_occurrences": ">= 15",
    "success_rate": ">= 0.85"
  },
  "action": {
    "agent": "skill-orchestrator",
    "task": "Generate skill from pattern"
  }
}
```

## Agent Sequence

The orchestrator runs agents in this order:

1. **PatternAnalyzer** - Find skill-worthy patterns
2. **SkillGenerator** - Create SKILL.md
3. **CodeReviewer** - Validate skill quality
4. **TestArchitect** - Create tests
5. **SecurityAuditor** - Check for dangerous operations
6. **DocsWriter** - Generate documentation
7. **QualityGate** - Final verification
8. **Monitor** - Register for performance tracking

## State Management (Ralph Wiggum Principle)

**CRITICAL**: Progress persists in FILES, not context window!

**State Location**: `D:\learning-system\skill-generation\state.json`

**State Structure**:

```json
{
  "loopId": "guid",
  "startedAt": "timestamp",
  "pattern": "pattern-name",
  "currentPhase": "Phase name",
  "currentAgent": "Agent name",
  "iteration": 1,
  "maxIterations": 10,
  "completed": false,
  "success": false,
  "agents": {
    "Orchestrator": {
      "status": "completed",
      "attempts": 1,
      "maxAttempts": 3,
      "result": {...}
    },
    "PatternAnalyzer": {...},
    ...
  },
  "errors": [],
  "skillName": null,
  "skillPath": null
}
```

## Fresh Context Per Iteration

**Key Concept**: Each iteration = fresh Claude Code context

- Load state from files
- Execute one agent
- Save state back to files
- Next iteration gets clean context

**Why?** Prevents context pollution in long-running loops

## Error Handling

If an agent fails:

1. Log error to state.errors[]
2. Update agent.status = "failed"
3. Increment agent.attempts
4. Create error checkpoint
5. Retry on next iteration (if attempts < maxAttempts)
6. If max attempts reached, report to user and pause

## Success Criteria

Loop completes successfully when ALL of these are true:

- ✅ All 9 agents status = "completed"
- ✅ verify-completion.ps1 exits with code 0
- ✅ Skill file exists at expected path
- ✅ No critical errors in state.errors[]

## Example Execution Flow

```
Iteration 1:
  → Orchestrator initializes state
  → Invokes PatternAnalyzer
  → Saves state
  → Fresh context for next iteration

Iteration 2:
  → Orchestrator loads state
  → PatternAnalyzer completed, next is SkillGenerator
  → Invokes SkillGenerator
  → Saves state
  → Fresh context

Iteration 3:
  → Load state
  → SkillGenerator completed, next is CodeReviewer
  → Invokes CodeReviewer
  → CodeReviewer finds issues, marks as failed
  → Saves state

Iteration 4:
  → Load state
  → CodeReviewer failed (attempt 1), retry
  → Invokes CodeReviewer again
  → Success this time
  → Saves state

... continues until all agents complete ...

Final Iteration:
  → All agents completed
  → Run verify-completion.ps1
  → All 10 criteria pass
  → Mark loop as SUCCESS
  → Done!
```

## Commands You Can Run

```powershell
# Load current state
.\state-manager.ps1 -Action Load

# Save state
.\state-manager.ps1 -Action Save -State $stateObject

# Update specific field
.\state-manager.ps1 -Action Update -Field "currentAgent" -Value "PatternAnalyzer"

# Create checkpoint
.\state-manager.ps1 -Action Checkpoint

# Verify completion
.\verify-completion.ps1
```

## Integration with Existing Systems

**Hooks**:

- Leverages existing pre-tool-use.ps1 and post-tool-use.ps1 hooks
- Uses agent-triggers.json for autonomous triggering

**Learning Database**:

- Reads from D:\databases\nova_shared.db
- Queries pattern data for skill candidates

**Version Control**:

- Creates D:\ snapshot before starting loop
- Can restore if generation fails

## Safety Measures

1. **D:\ Snapshot**: Always create before loop starts
2. **Dry Run Mode**: Test with -DryRun $true first
3. **Max Iterations**: Prevents infinite loops (default: 10)
4. **Agent Retry Limits**: Max 3 attempts per agent
5. **User Approval**: Optional approval gate before deployment

## Notes

- This agent is the "conductor" of the Ralph Wiggum orchestra
- It doesn't generate skills itself - it coordinates other agents
- Simple = powerful: just load state, run agent, save state, repeat
- "Simple persistence beats complex architecture"
