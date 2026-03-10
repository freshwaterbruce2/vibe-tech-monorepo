# The Finisher Plugin

> **"I will not stop until the project is green."**

An autonomous project completion agent for Claude Code that solves the "Last 10%" problem.

## Overview

The Finisher is a stateful loop agent that autonomously drives projects from 90% complete to production-ready status. Unlike typical AI assistants that require constant guidance, The Finisher:

- **Loops autonomously** until completion criteria are met
- **Manages state** across sessions via `FINISHER_STATE.md`
- **System-aware** understands your C:\dev (code) + D:\ (data/learning) architecture
- **Researches current best practices** (2026-aware web search)
- **Works in small batches** (1-3 items per loop) to prevent overwhelm
- **Enforces completion** via stop hook that prevents premature exit

## The "Last 10%" Problem

Projects often stall at 90% completion because the remaining work is:

- **Unknowns** - "Is this dependency outdated?" (Requires research)
- **Tedium** - "Fix these 20 linting errors." (Requires grunt work)
- **Verification** - "Did that fix break something else?" (Requires testing)

Humans get fatigued here. The Finisher does not.

## How It Works

### State Machine Loop

```mermaid
graph TD
    A[/finish command] --> B[Phase 1: Audit]
    B --> C[Phase 2: Research]
    C --> D[Phase 3: Execution]
    D --> E[Phase 4: Final Polish]
    E --> F{All Criteria Met?}
    F -->|No| D
    F -->|Yes| G[Phase 5: Complete]
    G --> H[Stop Hook Allows Exit]
```

### Phase Breakdown

1. **Audit** - Health report, D:\ path validation, dependency scan, code grading
2. **Research** - Verify dependencies against 2026 standards (checks D:\learning-system first, then web)
3. **Execution** - Fix blockers (lint errors, type errors, broken D:\ paths) in small batches
4. **Final Polish** - Run full build, test suite, documentation check
5. **Completion** - Output completion tag, allow loop to exit

### State Persistence

All progress is tracked in `FINISHER_STATE.md` (project root):

```markdown
## 1. Health Overview

- **Build Status:** Passing
- **External Resources (D:\):**
  - [✅] Database Connection (D:\databases\app.db)
  - [✅] Learning System Access (D:\learning-system)
- **Code Grade:** A

## 2. Critical Blockers

- [✅] Fixed: Type errors in src/services/api.ts

## 5. Execution Log

- Loop 1: Fixed 3 lint errors
- Loop 2: Added types to api.ts
- Loop 3: Verified dependencies
```

## Installation

### Option 1: Workspace Plugin (Recommended)

Already installed at:

```
C:\dev\.claude\plugins\the-finisher
```

Claude Code will auto-discover it in your monorepo workspace.

### Option 2: Global Plugin

Copy to your global plugins directory:

```powershell
Copy-Item -Path "C:\dev\.claude\plugins\the-finisher" `
          -Destination "C:\Users\$env:USERNAME\.claude\plugins\" `
          -Recurse
```

## Usage

### Basic Usage

Navigate to a project and run:

```
/finish
```

The agent will:

1. Read the system prompt
2. Validate D:\ paths
3. Create/update `FINISHER_STATE.md`
4. Begin the audit phase
5. Loop autonomously until completion

### With Project Context

```
/finish "Get Nova Agent production-ready for v1.0 release"
```

The agent will prioritize work based on your goal.

### Monitoring Progress

Check the state file at any time:

```
C:\dev\[your-project]\FINISHER_STATE.md
```

It contains:

- Current phase
- Code grade
- Critical blockers
- Execution log
- Completion checklist

### Stopping the Loop

The loop will ONLY stop when:

1. All completion criteria are met (`<FINISHER_STATUS>COMPLETE</FINISHER_STATUS>`)
2. OR you manually interrupt with Ctrl+C

Otherwise, the stop hook will restart the agent automatically.

## System Requirements

### Environment

- **OS:** Windows 11
- **Claude Code:** Latest version
- **PowerShell:** 5.1 or 7+

### Drive Architecture

The Finisher expects this structure:

```
C:\dev                  # Code (monorepo)
├── apps\
├── packages\
└── .claude\
    └── plugins\
        └── the-finisher\

D:\                     # Data/Logs/Learning
├── databases\          # SQLite, PostgreSQL
├── learning-system\    # Reference patterns
└── logs\               # Application logs
```

**Critical:** Projects that reference D:\ paths in config files will have those paths validated during the audit phase.

## Completion Criteria

The agent considers a project "production-ready" when ALL of these are met:

- [ ] **Code Grade:** A or B+
- [ ] **Critical Blockers:** 0
- [ ] **Build:** Success (exit code 0)
- [ ] **Tests:** All passing
- [ ] **D:\ Paths:** All validated
- [ ] **FIXME Tags:** 0 (converted to issues or resolved)

## Features

### System Awareness

Unlike generic AI agents, The Finisher understands your specific environment:

- **C:\dev** - Source code, monorepo
- **D:\databases** - SQLite/PostgreSQL databases
- **D:\learning-system** - Reference patterns (checked BEFORE web search)
- **D:\logs** - Application logs

Missing D:\ paths are flagged as CRITICAL BLOCKERS.

### 2026-Aware Research

When verifying dependencies, the agent:

1. **Checks D:\learning-system first** for verified patterns
2. **Falls back to web search** if not found locally
3. **Filters results by date** (only trusts results from 2025+)
4. **Caches results** in state file to avoid redundant searches

Example:

```markdown
## 3. Dependencies (Verified)

- react: 18.2.0 → 19.0.0 (verified 2026-01-15, Learning System)
  - Breaking changes: None critical
```

### Small Batch Philosophy

The agent works in **small batches** (1-3 items per loop) to:

- Prevent token exhaustion
- Allow incremental progress
- Provide user visibility (state file updates)
- Enable manual intervention if needed

### User Review for Destructive Changes

The agent will NEVER automatically:

- Delete files
- Make major version bumps (e.g., React 18 → 19)
- Modify D:\ contents
- Change build configuration

Instead, these are marked as `REQUIRES_USER_REVIEW` in the state file.

## Utility Scripts

### Test-DrivePaths.ps1

Validates D:\ path references in project config files:

```powershell
powershell -File "$env:CLAUDE_PLUGIN_ROOT/tools/Test-DrivePaths.ps1"
```

Output:

```
🔍 Validating D:\ paths for project: C:\dev\apps\nova-agent

📂 Scanning configuration files...
  ✓ Found: .env
    ✅ Valid: D:\databases\nova-agent.db
    ✅ Valid: D:\learning-system

✅ All D:\ path validations passed!
```

If paths are missing, the script suggests remediation:

```
🚨 CRITICAL BLOCKERS DETECTED

The following D:\ paths are referenced but do not exist:
  - D:\databases\app.db

🔧 Recommended Actions:
  1. Create missing directories:
     New-Item -Path 'D:\databases' -ItemType Directory -Force
  2. Update config files with correct paths
```

## File Structure

```
the-finisher/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── commands/
│   └── finish.md                # /finish command (entry point)
├── hooks/
│   ├── hooks.json               # Hook configuration
│   └── stop-hook.ps1            # Loop enforcer (prevents exit)
├── prompts/
│   ├── system.md                # Agent persona & state machine logic
│   └── state_template.md       # Blank state file structure
├── tools/
│   └── Test-DrivePaths.ps1     # D:\ path validator
└── README.md                    # This file
```

## Troubleshooting

### Issue: Agent stops after one iteration

**Cause:** Stop hook not executing or completion tag detected prematurely.

**Fix:**

1. Check `FINISHER_STATE.md` for `<FINISHER_STATUS>COMPLETE</FINISHER_STATUS>`
2. Verify hooks are enabled in Claude Code settings
3. Run `/finish` again to restart the loop

### Issue: "Missing D:\ paths" blocker

**Cause:** Project config references D:\ paths that don't exist.

**Fix:**

1. Run `Test-DrivePaths.ps1` to see missing paths
2. Create directories: `New-Item -Path "D:\databases" -ItemType Directory -Force`
3. OR update config files with correct paths

### Issue: Agent hallucinating outdated solutions

**Cause:** Not checking Learning System, or web search returning old results.

**Fix:**

1. Verify `D:\learning-system` exists and is accessible
2. Check state file for "Verified" date (should be recent)
3. Agent should reject web results from before 2025

### Issue: Loop stuck in Phase 3 (Execution)

**Cause:** Blockers keep reappearing or fixes not working.

**Fix:**

1. Check Execution Log in state file for failure patterns
2. Look for items marked "FAILED" 3+ times
3. These should auto-escalate to REQUIRES_USER_REVIEW
4. Manually review and fix, then restart `/finish`

## Limitations

- **Windows 11 only** - Uses PowerShell scripts
- **No real-time monitoring** - Check state file for progress updates
- **Requires D:\ drive** - System awareness assumes this architecture
- **English only** - System prompt and state file in English

## Examples

### Example 1: Vibe Code Studio

```
cd C:\dev\apps\vibe-code-studio
/finish "Prepare for v1.0.0 release"
```

Output (FINISHER_STATE.md):

```markdown
## 1. Health Overview

- **Build Status:** Failing (TypeScript errors)
- **Code Grade:** C

## 2. Critical Blockers

- [ ] Type errors in src/services/AIService.ts
- [ ] Missing D:\databases\vibe-code-studio.db

## 5. Execution Log

- Loop 1: Audit complete, 2 critical blockers found
```

After 5 loops:

```markdown
## 1. Health Overview

- **Build Status:** ✅ Passing
- **Code Grade:** A

<FINISHER_STATUS>COMPLETE</FINISHER_STATUS>
```

### Example 2: Nova Agent

```
cd C:\dev\apps\nova-agent
/finish
```

The agent:

1. **Audit:** Found 12 lint errors, React 18.2.0
2. **Research:** Verified React 19.0.0 stable (2026-01-15, Web Search)
3. **Execution:** Fixed lint errors (3 loops), added types (2 loops)
4. **Polish:** Ran build + tests, all passing
5. **Complete:** Grade A, production-ready

## Configuration

### Adjusting Completion Criteria

Edit `prompts/system.md` to customize what "production-ready" means:

```markdown
## PHASE 5: COMPLETION

### Completion Criteria (ALL REQUIRED)

- [ ] Code Grade = A or B+
- [ ] Critical Blockers = 0
- [ ] Build = Success (exit code 0)
- [ ] Tests > 80% passing # <-- Adjust this
- [ ] All D:\ paths validated
- [ ] No FIXME tags
- [ ] No console.log statements # <-- Add custom criteria
```

### Adjusting Batch Size

In `prompts/system.md`, change the small batch rule:

```markdown
### Execution Strategy

**Priority Order:**

1. **Quick Wins:** Linting auto-fixes, typos, formatting
2. **Type Errors:** Add missing types, fix imports

**Tool Selection:**

- **Low-Level (Lint/Format):** Use `Edit` tool directly
- **High-Level (Refactor):** Spawn `Task` agent if complexity score > 7/10

**Max items per loop:** 3 # <-- Change this (default: 3, max: 5)
```

## Contributing

This plugin is part of the VibeTech monorepo:

```
C:\dev\.claude\plugins\the-finisher
```

To modify:

1. Edit files in the plugin directory
2. Test with `/finish` in a sample project
3. Commit changes to the monorepo

## License

MIT License

Copyright (c) 2026 Bruce (<freshwaterbruce2@gmail.com>)

## Related

- **Ralph-Wiggum Plugin** - Inspiration for loop mechanics
- **Plugin-Dev Plugin** - Official Claude Code plugin development kit
- **C:\dev\CLAUDE.md** - Monorepo workspace guidelines

---

**Remember:** The Finisher does not stop until the project is green.
