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

## Responsibilities

1. **Initialize Loop State**
   - Create fresh state.json in D:\learning-system\skill-generation\
   - Set up loop parameters (max iterations, pattern, etc.)
   - Initialize all 9 agent states to "pending"

2. **Load/Save State**
   - Always load state from files (NOT context window)
   - Persist progress after each agent execution
   - Create checkpoints before critical operations

3. **Determine Next Agent**
   - Identify which agent should run next based on current state
   - Handle failed agents (retry up to 3 times)
   - Sequence agents in correct order

4. **Handle Failures**
   - Retry failed agents (max 3 attempts per agent)
   - Create error checkpoints
   - Provide feedback to next iteration

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
