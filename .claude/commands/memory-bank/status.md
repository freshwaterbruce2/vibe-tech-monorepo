---
name: memory:status
description: Check Memory Bank database and recent activity
model: sonnet
---

# Memory Bank Status Check

Check the Memory Bank database health, size, and recent memory operations.

## Steps

1. Check database exists:

   ```bash
   if [ -f "D:\databases\memory-bank.db" ]; then
     echo "✓ Memory Bank database found"
     ls -lh D:\databases\memory-bank.db
   else
     echo "⚠ Memory Bank database not found at D:\databases\memory-bank.db"
     exit 1
   fi
   ```

2. Query recent memory operations:

   ```bash
   sqlite3 D:\databases\memory-bank.db "SELECT COUNT(*) as total_memories FROM memories;" 2>/dev/null || echo "Unable to query database"
   ```

3. Show database size:

   ```bash
   echo ""
   echo "=== DATABASE METRICS ==="
   du -sh D:\databases\memory-bank.db
   ```

4. Check recent activity:

   ```bash
   if [ -f "D:\logs\memory-bank.log" ]; then
     echo ""
     echo "=== RECENT ACTIVITY (last 10 entries) ==="
     tail -10 D:\logs\memory-bank.log
   fi
   ```

5. Report active sessions:

   ```
   ✓ Memory Bank operational
   → Database size: [shown above]
   → Active memory sessions: [from query]
   ```

## Expected Output

- Database file size and location
- Total memory count
- Recent log entries
- System health indicators
