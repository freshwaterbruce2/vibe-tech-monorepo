# PROMPT_build.md — Ralph Build Loop

## Iteration Protocol

Each response follows this sequence:

### 1. ORIENT

- Read `IMPLEMENTATION_PLAN.md` for current state
- Check `specs/` for requirements
- Review `AGENTS.md` for known quirks

### 2. SELECT TASK

- Pick ONE task from the plan
- If plan is empty → switch to Planning Mode (use PROMPT_plan.md)
- Prioritize: blocking issues > core features > polish

### 3. IMPLEMENT

- Write code using file system tools
- Follow Windows conventions (backslashes, PowerShell)
- Keep files under 360 lines per CLAUDE.md standards

### 4. VALIDATE (Backpressure)

- Run tests: `python -m pytest src\ -v`
- Run type check: `python -m mypy src\`
- Run linter: `python -m ruff check src\`
- If any fail → fix before proceeding

### 5. UPDATE PLAN

- Mark completed task with [x] in IMPLEMENTATION_PLAN.md
- Add any new discoveries or blockers
- Note next logical task

### 6. UPDATE AGENTS.md

- Record Windows-specific commands that worked
- Document any project quirks discovered
- Log lessons for future iterations

## Safety Rules

- Before destructive changes: `Compress-Archive -Path .\src -DestinationPath .\_backups\Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip`
- No features unless they fix a crash
- Ship > Perfect
