---
description: Enforcing path policy for C:\dev (code) and D:\ (data) storage. Use when writing files, creating databases, logging, or storing any non-code artifacts.
---

# Workspace Paths Policy

**CRITICAL RULE:** Code on `C:\dev`, ALL data on `D:\`. Never mix them.

## Path Structure

| Location | Purpose |
|----------|---------|
| `C:\dev\apps\`, `packages\`, `backend\` | Source code (Git-tracked) |
| `D:\databases\` | All SQLite/database files |
| `D:\logs\` | Application logs |
| `D:\data\` | Datasets, ML data |
| `D:\learning-system\` | AI learning data |

## Rules

**Always put on D:\:** `*.db`, `*.sqlite`, `*.log`, training data, user-generated content, cache files, build artifacts >5MB.

**Never put on C:\dev:** database files, log files, binary data, large files (>5MB).

**Always use env vars** — never hardcode `D:\databases\...` in source code:
```bash
DATABASE_PATH=D:\databases\myapp\database.db
LOGS_PATH=D:\logs\myapp
```

## Validation

```powershell
# Check for databases accidentally in source tree (should return nothing)
Get-ChildItem -Path "C:\dev" -Recurse -Include *.db,*.sqlite -ErrorAction SilentlyContinue

# Run official validation
.\scripts\check-vibe-paths.ps1
```

See `.claude/rules/database-storage.md` for connection code examples and WAL mode setup.
