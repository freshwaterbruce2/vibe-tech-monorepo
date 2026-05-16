# Memory Bank

This directory provides **human-readable, file-based persistent memory** for AI agents working in the VibeTech monorepo. It complements the SQLite memory database (`D:\databases\memory.db`) with high-level context that is easy to read, edit, and version.

## Structure

| File | Purpose | Update Frequency |
|------|---------|-----------------|
| `projectbrief.md` | Project scope, goals, stakeholders | Rarely |
| `systemPatterns.md` | Architecture decisions, design patterns, tech constraints | When decisions change |
| `techContext.md` | Stack versions, dependencies, environment quirks | When stack changes |
| `activeContext.md` | Current task, blockers, next steps | Every session |
| `progress.md` | Completed work, milestones, open items | When work completes |

## How Agents Use This

1. **At session start**: Read `activeContext.md` and `progress.md`
2. **During work**: Reference `systemPatterns.md` and `techContext.md` for constraints
3. **Before ending**: Update `activeContext.md` with status and next steps
4. **On milestones**: Append to `progress.md`

## Relationship to SQLite Memory DB

- **Memory Bank** = Hot, human-readable, always-loaded context
- **SQLite DB** = Deep, searchable, structured memory (episodic events, semantic knowledge, procedural patterns)

Use both. The Memory Bank is the index; the SQLite DB is the archive.
