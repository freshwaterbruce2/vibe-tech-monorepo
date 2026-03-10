---
description: Enforcing path policy for C:\dev (code) and D:\ (data) storage. Use when writing files, creating databases, logging, or storing any non-code artifacts.
---

# Managing Workspace Paths

**CRITICAL RULE:** ALL data must go to D:\ drive, NEVER in C:\dev

## Path Policy

### Code Storage (C:\dev)

All source code, configuration, and version-controlled files:

- **Monorepo Root:** `C:\dev` (Git repository: vibetech.git)
- **Applications:** `C:\dev\apps\[app-name]\`
- **Packages:** `C:\dev\packages\[package-name]\`
- **Backend:** `C:\dev\backend\[service-name]\`

### Data Storage (D:\)

All databases, logs, datasets, learning systems, build artifacts:

- **Databases:** `D:\databases\[app-name]\` or `D:\databases\database.db` (unified)
- **Logs:** `D:\logs\[app-name]\`
- **Datasets:** `D:\data\[dataset-name]\`
- **Learning Systems:** `D:\learning-system\`
- **Build Cache:** `D:\build-cache\`

## When to Use D:\ Drive

**ALWAYS use D:\ for:**

- SQLite databases (`*.db`, `*.sqlite`, `*.sqlite3`)
- Application logs (`*.log`, `*.txt` logs)
- Training data / ML datasets
- User-generated content
- Session data / cache files
- Build artifacts (temporary)

**NEVER put on C:\dev:**

- Large files (>5MB)
- Binary data files
- Database files
- Log files with timestamps
- Learning/training data

## Validation Before Writing

```javascript
// TypeScript example - validate before writing
import path from 'path';

function validateStoragePath(filepath: string): { valid: boolean; suggestion?: string } {
  const isDatabase = filepath.match(/\.(db|sqlite|sqlite3)$/i);
  const isLog = filepath.match(/\.(log|txt)$/i) && filepath.includes('log');
  const isDataFile = filepath.match(/\.(json|csv|parquet)$/i) && filepath.includes('data');

  if (isDatabase || isLog || isDataFile) {
    if (filepath.startsWith('C:\\dev')) {
      return {
        valid: false,
        suggestion: filepath.replace('C:\\dev', 'D:\\databases')
      };
    }
  }

  return { valid: true };
}
```

```python
# Python example - crypto trading system
import os
from pathlib import Path

class PathPolicy:
    CODE_ROOT = Path("C:/dev")
    DATA_ROOT = Path("D:/")

    @classmethod
    def get_database_path(cls, app_name: str, db_name: str = "database.db") -> Path:
        """Get validated database path on D:\ drive"""
        db_path = cls.DATA_ROOT / "databases" / app_name / db_name
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return db_path

    @classmethod
    def get_log_path(cls, app_name: str, log_name: str) -> Path:
        """Get validated log path on D:\ drive"""
        log_path = cls.DATA_ROOT / "logs" / app_name / log_name
        log_path.parent.mkdir(parents=True, exist_ok=True)
        return log_path

# Usage in crypto-enhanced
db_path = PathPolicy.get_database_path("crypto-enhanced", "trading.db")
log_path = PathPolicy.get_log_path("crypto-enhanced", "trading.log")
```

## Environment Variables (Recommended)

```bash
# .env file (per-app)
DATA_ROOT=D:\
DB_PATH=D:\databases\myapp\database.db
LOG_PATH=D:\logs\myapp\app.log
```

```typescript
// TypeScript usage
const dbPath = process.env.DB_PATH || 'D:\\databases\\myapp\\database.db';
```

```python
# Python usage
import os
from pathlib import Path

DATA_ROOT = Path(os.getenv("DATA_ROOT", "D:/"))
db_path = DATA_ROOT / "databases" / "myapp" / "database.db"
```

## Verification Commands

```powershell
# Check if any databases in C:\dev (should be none)
Get-ChildItem -Path "C:\dev" -Recurse -Include *.db,*.sqlite,*.sqlite3 -ErrorAction SilentlyContinue

# Check D:\ storage usage
Get-ChildItem -Path "D:\databases" -Recurse | Measure-Object -Property Length -Sum
Get-ChildItem -Path "D:\logs" -Recurse | Measure-Object -Property Length -Sum

# Run official validation script
.\check-vibe-paths.ps1
```

## Related Documentation

- **Official Policy:** `C:\dev\docs\PATHS_POLICY.md`
- **Validation Script:** `C:\dev\check-vibe-paths.ps1`
- **Database Storage Pattern:** `.claude/rules/database-storage.md`
- **Crypto Trading Example:** `.claude/rules/project-specific/crypto-trading.md`
