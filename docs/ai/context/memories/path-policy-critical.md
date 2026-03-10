# Path Policy (CRITICAL)

Last Updated: 2026-01-06

## Storage Rules

### Code Storage (C:\dev)

ALL source code, configuration, and version-controlled files

- Monorepo Root: C:\dev (Git repository)
- Applications: C:\dev\apps\
- Packages: C:\dev\packages\
- Backend: C:\dev\backend\

NEVER store data or logs in C:\dev

### Data Storage (D:\)

ALL databases, logs, datasets, learning systems, build artifacts

Directory Structure:

```
D:\
├── learning-system\    # PRIMARY: Learning data (agent-memory, analytics, case-logs)
├── databases\          # SQLite databases (vibe-tutor.db, nova-agent.db, trading.db)
├── logs\               # Application logs (trading.log, vibe_justice_*.log)
└── data\               # Other data files
```

DEPRECATED PATHS (DO NOT USE):

- D:\learning (use D:\learning-system instead)

## When to Use D:\ Drive

ALWAYS use D:\ for:

- SQLite databases (*.db, *.sqlite, *.sqlite3)
- Application logs (*.log)
- Training data / ML datasets
- User-generated content
- Session data / cache files
- Build artifacts (temporary)

NEVER put on C:\dev:

- Large files (>5MB)
- Binary data files
- Database files
- Log files
- Learning/training data

## Environment Variables (Recommended)

```bash
# .env file
DATA_ROOT=D:\
DB_PATH=D:\databases\myapp\database.db
LOG_PATH=D:\logs\myapp\app.log
LEARNING_SYSTEM_PATH=D:\learning-system
```

## Validation

Run: .\check-vibe-paths.ps1

## Related Documentation

- C:\dev\docs\PATHS_POLICY.md (official policy)
- .claude/rules/database-storage.md
- .claude/rules/paths-policy.md
