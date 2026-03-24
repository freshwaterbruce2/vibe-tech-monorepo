---
name: prevent-cdev-data-storage
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: C:/dev/.*\.(db|sqlite|sqlite3|log)$
action: block
---

🚨 **CRITICAL: Data storage violation!**

**ALL databases and logs must be stored on D:\ drive, NEVER in C:\dev**

**Correct locations:**

```
❌ C:\dev\database.db
✅ D:\databases\database.db

❌ C:\dev\app.log
✅ D:\logs\app.log

❌ C:\dev\trading.db
✅ D:\databases\crypto-enhanced\trading.db
```

**Why this matters:**

- Separation of code vs data
- Faster builds (no large files in workspace)
- Prevents accidental commits of sensitive data
- D:\ has dedicated snapshot/backup system

**How to fix:**

1. Move file to D:\ drive
2. Update code to use environment variables:
   ```typescript
   const DB_PATH = process.env.DATABASE_PATH || 'D:\\databases\\app.db';
   ```

See: `.claude/rules/paths-policy.md` and `.claude/rules/database-storage.md`
