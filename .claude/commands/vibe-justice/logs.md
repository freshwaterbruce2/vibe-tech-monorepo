---
name: vibe-justice:logs
description: Check case logs and application logs for Vibe-Justice
model: sonnet
---

# Vibe-Justice Logs Viewer

View recent case logs and application activity for the legal AI platform.

## Steps

1. Check case logs directory:

   ```bash
   if [ -d "D:\learning-system\case-logs" ]; then
     echo "=== RECENT CASE LOGS ==="
     ls -lth D:\learning-system\case-logs | head -10
   else
     echo "⚠ Case logs directory not found: D:\learning-system\case-logs"
   fi
   ```

2. Check application logs:

   ```bash
   if [ -d "D:\logs" ]; then
     echo ""
     echo "=== APPLICATION LOGS ==="
     ls -lth D:\logs\vibe_justice_*.log 2>/dev/null | head -5
   else
     echo "⚠ Application logs directory not found: D:\logs"
   fi
   ```

3. Display most recent log content:

   ```bash
   LATEST_LOG=$(ls -t D:\logs\vibe_justice_*.log 2>/dev/null | head -1)
   if [ -n "$LATEST_LOG" ]; then
     echo ""
     echo "=== LATEST LOG ENTRIES (last 20 lines) ==="
     tail -20 "$LATEST_LOG"
   fi
   ```

4. Summary of recent activity:

   ```bash
   echo ""
   echo "=== ACTIVITY SUMMARY ==="
   echo "Case logs: $(ls D:\learning-system\case-logs 2>/dev/null | wc -l) files"
   echo "App logs: $(ls D:\logs\vibe_justice_*.log 2>/dev/null | wc -l) files"
   ```

## Expected Output

- List of recent case analysis files
- Application log entries (errors, warnings, info)
- Timestamp information for debugging
- Activity metrics
