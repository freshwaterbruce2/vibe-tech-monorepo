---
description: SQLite database storage patterns for D:\ drive. Use when creating or accessing databases.
---

# Database Storage Pattern

**CRITICAL RULE:** ALL databases MUST be stored on D:\ drive, NEVER in C:\dev

## Official Path Structure

```
D:\
├── databases\                   # PRIMARY: All SQLite databases
│   ├── vibe-tutor.db
│   ├── nova-agent.db
│   ├── trading.db (crypto-enhanced)
│   └── database.db (iconforge - unified)
├── logs\                        # Application logs
│   ├── trading.log
│   ├── trading_new.log
│   └── vibe_justice_YYYYMMDD.log
├── learning-system\             # Learning data (as of 2025-12-24)
│   ├── agent-memory\            # Nova-agent file/loop tracking
│   ├── analytics\               # Vibe-tutor user analytics
│   └── case-logs\               # Vibe-justice legal AI logs
└── data\                        # Other data files
```

### Deprecated Paths (DO NOT USE)

- ❌ `D:\learning` - DEPRECATED (use `D:\learning-system` instead)
- ❌ `C:\dev\data\` - NEVER store data in source tree
- ❌ `C:\dev\logs\` - NEVER store logs in source tree
- ❌ Hardcoded absolute paths in code

## SQLite Database Connections

### TypeScript/JavaScript

```typescript
import path from 'path';
import Database from 'better-sqlite3';

// ✅ CORRECT: Use environment variable or config
const DB_PATH = process.env.DATABASE_PATH || 'D:\\databases\\app.db';
const db = new Database(DB_PATH);

// ❌ WRONG: Hardcoded path
const db = new Database('D:\\databases\\app.db');

// ❌ WRONG: Storing in source tree
const db = new Database('./data/app.db');
```

### Python

```python
import os
import sqlite3
from pathlib import Path

# ✅ CORRECT: Use environment variable or config
DB_PATH = os.getenv('DATABASE_PATH', r'D:\databases\trading.db')
conn = sqlite3.connect(DB_PATH)

# ✅ CORRECT: Ensure directory exists
db_dir = Path(DB_PATH).parent
db_dir.mkdir(parents=True, exist_ok=True)

# ❌ WRONG: Hardcoded path
conn = sqlite3.connect(r'D:\databases\trading.db')
```

## Environment Variables

**`.env.example`:**

```bash
# Database Configuration
DATABASE_PATH=D:\databases\app.db
LOGS_PATH=D:\logs
LEARNING_SYSTEM_PATH=D:\learning-system
```

## Project Examples

### Crypto Trading System

```python
# apps/crypto-enhanced/database.py
DB_PATH = Path(os.getenv('DATABASE_PATH', r'D:\databases\trading.db'))

class Database:
    def __init__(self):
        # Ensure D:\databases\ exists
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(DB_PATH))
```

### IconForge (Unified Database)

```typescript
// apps/iconforge/backend/src/db.ts
const DB_PATH = process.env.DATABASE_PATH || 'D:\\databases\\database.db';

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);
```

## Database Optimization

```typescript
// Use WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Set busy timeout
db.pragma('busy_timeout = 5000');

// Close connections properly
process.on('exit', () => db.close());
```

## Common Issues

### Issue: "Permission denied" errors

**Solution:**

```powershell
# Grant user permissions
icacls D:\databases /grant "${env:USERNAME}:(OI)(CI)F" /T

# Or use validation script
.\check-vibe-paths.ps1 -FixPermissions
```

### Issue: "Path not found" errors

**Solution:**

```powershell
# Create directories if missing
New-Item -Path D:\databases -ItemType Directory -Force
New-Item -Path D:\logs -ItemType Directory -Force
New-Item -Path D:\learning-system -ItemType Directory -Force
```

### Issue: Database locked errors

**Solution:**

```typescript
// ✅ Use WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// ✅ Set busy timeout
db.pragma('busy_timeout = 5000');

// ✅ Close connections properly
process.on('exit', () => db.close());
```

## Enforcement

### Pre-commit Checks

- ✅ No data files in `C:\dev\` (except .gitignored config)
- ✅ All database paths use environment variables
- ✅ Validation script passes: `.\check-vibe-paths.ps1`

### Nx Project Tags

Projects that use D:\ storage must have appropriate tags:

```json
// project.json
{
  "tags": ["database", "filesystem", "learning-system"]
}
```

Run affected tests:

```bash
pnpm nx run-many -t test --projects=tag:database --parallel=2
```

## Related Documentation

- **Path Policy:** `.claude/rules/paths-policy.md`
- **Official Policy Document:** `C:\dev\docs\PATHS_POLICY.md`
- **Validation Script:** `C:\dev\check-vibe-paths.ps1`
- **Crypto Trading Example:** `.claude/rules/project-specific/crypto-trading.md`
