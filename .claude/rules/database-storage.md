---
description: SQLite database storage patterns for D:\ drive. Use when creating or accessing databases.
---

# Database Storage Pattern

**CRITICAL RULE:** ALL databases MUST be stored on `D:\databases\`, NEVER in `C:\dev`.

## Path Structure

```
D:\databases\   — all SQLite databases (primary)
D:\logs\        — application logs
D:\learning-system\ — learning/AI data
D:\data\        — datasets and other data files
```

Deprecated: `D:\learning` (use `D:\learning-system`). Never hardcode absolute paths in code.

## Connections — Always Use Env Vars

**TypeScript:**
```typescript
const DB_PATH = process.env.DATABASE_PATH || 'D:\\databases\\app.db';
const db = new Database(DB_PATH);
```

**Python:**
```python
DB_PATH = os.getenv('DATABASE_PATH', r'D:\databases\trading.db')
Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
conn = sqlite3.connect(DB_PATH)
```

**`.env.example`:**
```
DATABASE_PATH=D:\databases\app.db
LOGS_PATH=D:\logs
```

## SQLite Optimization

```typescript
db.pragma('journal_mode = WAL');   // better concurrency
db.pragma('busy_timeout = 5000');  // avoid lock errors
process.on('exit', () => db.close());
```

## Troubleshooting

- **Permission denied:** `icacls D:\databases /grant "${env:USERNAME}:(OI)(CI)F" /T`
- **Path not found:** `New-Item -Path D:\databases -ItemType Directory -Force`
- **Locked:** enable WAL mode (above)
