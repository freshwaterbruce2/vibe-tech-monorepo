# Vibe Finisher

> "Working > Perfect" - The Finisher Philosophy

An AI-powered project finisher tool that runs in an infinite loop until your project ships. Adapted from [repomirror](https://github.com/repomirrorhq/repomirror) for Windows/PowerShell with no git dependencies.

## What It Does

Vibe Finisher is an autonomous agent that:

1. Analyzes your incomplete project
2. Identifies what's blocking ship
3. Fixes ONE thing per iteration
4. Repeats until the project launches without errors

## Requirements

- **Windows 10/11** with PowerShell 7+
- **Node.js 18+** (for TypeScript checking)
- **Claude CLI** - `npm install -g @anthropic-ai/claude-code`
- **Anthropic API key** configured

## Quick Start

```powershell
# 1. Initialize a project
.\init.ps1 -TargetProject "C:\dev\apps\your-project"

# 2. Run single pass (test mode)
.\sync.ps1 -DryRun

# 3. Run single pass (actual)
.\sync.ps1

# 4. Run infinite loop until shipped
.\ralph.ps1
```

## Files

```
vibe-finisher/
├── finisher.yaml      # Configuration
├── prompt.md          # Agent instructions
├── init.ps1           # Initialize a project
├── sync.ps1           # Single iteration runner
├── ralph.ps1          # Infinite loop runner
├── scratchpad/        # Agent's working memory
│   ├── status.md      # Current project state
│   ├── todo.md        # Remaining work
│   └── changelog.md   # What was fixed
├── output/            # Claude output logs
└── logs/              # Session summaries
```

## Configuration

Edit `finisher.yaml`:

```yaml
targetProject: C:\dev\apps\vibe-tutor
backupDir: C:\dev\_backups

finishCriteria:
  - "App launches without crashes"
  - "No TypeScript errors"
  - "Build produces exe/installer"

agent:
  model: claude-sonnet-4-5-20250929
  maxTokens: 8192
  timeout: 300000

loop:
  sleepSeconds: 10
  maxIterations: 100
  stopOnSuccess: true
```

## How It Works

### The Infinite Loop (ralph.ps1)

Named after Ralph Wiggum (the inspiration for repomirror), this script:

1. Runs `sync.ps1` which sends the prompt to Claude
2. Claude analyzes the project and fixes ONE thing
3. Claude outputs `[SHIP_READY] YES` or `[SHIP_READY] NO`
4. If YES for 3 consecutive iterations, project is SHIPPED
5. Otherwise, sleep and repeat

### The Agent Prompt

The agent is instructed to:

- Focus 90% on stability, 10% on polish
- Fix crashes before anything else
- Never add new features
- Create backups before destructive changes
- Update scratchpad with progress

### Safety Features

- **Max iterations** - Won't run forever (default: 100)
- **Automatic backups** - Created before initialization
- **Scratchpad logging** - Full audit trail
- **Graceful shutdown** - Ctrl+C stops cleanly

## Cost Estimation

Based on repomirror's findings:

- ~$10.50/hour per Sonnet agent
- Gets to ~90% complete, needs human for final 10%
- Typical project: 2-4 hours to ship

## Troubleshooting

### Claude CLI not found

```powershell
npm install -g @anthropic-ai/claude-code
claude --version
```

### API key not configured

```powershell
$env:ANTHROPIC_API_KEY = "your-key-here"
# Or set permanently in your profile
```

### Project stuck

- Check `scratchpad/status.md` for current state
- Review `output/*.jsonl` for Claude's reasoning
- Manually fix the blocker, then resume

## Philosophy

This tool embodies "Finisher Mode":

- Every change moves toward SHIP
- Working beats perfect
- One fix per iteration
- No scope creep

## Credits

Inspired by [repomirror](https://github.com/repomirrorhq/repomirror) - built at YC Agents hackathon, shipped 6 repos overnight.
