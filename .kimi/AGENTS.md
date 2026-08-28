# Kimi Code CLI - Persistent Memory Rules

## Memory Lifecycle Skill

This workspace uses the **memory-lifecycle** skill (`.kimi/skills/memory-lifecycle/SKILL.md`).
You MUST follow its lifecycle stages:

1. **Session Start** — Run `node scripts/memory-start.cjs` and read the output
2. **During Work** — Run `node scripts/memory-capture.cjs` after significant decisions
3. **Before Compaction** — Run `node scripts/memory-compact.cjs` when context gets long
4. **Session End** — Run `node scripts/memory-handoff.cjs` before ending

## Memory Systems Available

This workspace has **two memory layers** you can use for persistent context across sessions:

### 1. SQLite Memory Database (Primary)
- **Path**: `D:\databases\memory.db`
- **Schema**: Episodic, semantic, procedural stores + full-text search
- **Population**: 15K+ semantic memories, 1K+ episodic memories from Claude Code MCP sessions
- **Access**: Use `scripts/memory-query.ps1` or direct `sqlite3` commands

### 2. File-Based Memory Bank (Fallback / Human-Readable)
- **Path**: `memory-bank/` directory
- **Purpose**: High-level context, decisions, and session state that must survive any DB issues
- **Files**: See `memory-bank/README.md` for structure

## When to Use Memory

### At Session Start
1. Check `memory-bank/activeContext.md` for current task state
2. Search the SQLite DB for recent context: `scripts/memory-query.ps1 -Search "<topic>"`
3. Check `memory-bank/progress.md` for what was last accomplished

### During Work
Store to memory when:
- Making architectural decisions with trade-offs
- Discovering bug solutions or gotchas
- Finding project-specific patterns or constraints
- Leaving work incomplete (save session state)
- Completing significant milestones

### Before Ending a Session
If work is incomplete:
1. Update `memory-bank/activeContext.md` with task status and next steps
2. Add an episodic memory: `scripts/memory-query.ps1 -AddEpisodic -Query "<task>" -Response "<status + next steps>"`

## Memory Commands

```bash
# Search episodic memory (recent events)
node scripts/memory-cli.cjs search "auth refactor" 10

# Search semantic memory (knowledge)
node scripts/memory-cli.cjs semantic "database schema" 10

# Add episodic memory (session events)
node scripts/memory-cli.cjs add-episodic "Implemented OAuth flow" "Used PKCE, tested with Google provider" [session-id]

# Add semantic memory (knowledge)
node scripts/memory-cli.cjs add-semantic "Never use localStorage in Electron apps" constraint 8

# Get recent episodic memories
node scripts/memory-cli.cjs recent 10

# Get session stats
node scripts/memory-cli.cjs stats
```

## What to Remember
- Architecture decisions and rationale
- Project constraints (e.g., Electron security rules, path policies)
- Current focus and blockers
- Bug solutions with root cause
- Tool/dependency versions that work

## What NOT to Remember
- API keys or secrets (use `.env` only)
- Large code snippets (reference file paths instead)
- Raw logs or error dumps (summarize the fix)

## Memory Hygiene
- Keep semantic memories concise (1-3 sentences)
- Use consistent categories: `decision`, `constraint`, `pattern`, `bugfix`, `learning`, `session`
- Importance scale: 1-10 (10 = critical architectural decision)
- Update `memory-bank/` files when high-level context changes
