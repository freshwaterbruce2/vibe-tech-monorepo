---
name: code-studio:memory
description: Monitor Electron memory usage for Vibe Code Studio
model: sonnet
---

# Vibe Code Studio Memory Monitor

Monitor Electron process memory usage and identify potential memory leaks.

## Steps

1. Check if Vibe Code Studio is running:

   ```bash
   if pgrep -f "vibe-code-studio" > /dev/null; then
     echo "✓ Vibe Code Studio is running"
   else
     echo "⚠ Vibe Code Studio is not running"
     echo "Start it with: code-studio:dev"
     exit 1
   fi
   ```

2. Monitor Electron process memory:

   ```bash
   echo ""
   echo "=== ELECTRON PROCESS MEMORY ==="
   ps aux | grep -i "vibe-code-studio" | grep -v grep | awk '{printf "PID: %s | Memory: %s MB | CPU: %s%%\n", $2, int($6/1024), $3}'
   ```

3. Check renderer vs main process:

   ```bash
   echo ""
   echo "=== PROCESS BREAKDOWN ==="
   echo "Main Process: [PID and memory shown above]"
   echo "Renderer Processes: [count and memory shown above]"
   ```

4. Memory usage warnings:

   ```bash
   MEMORY_MB=$(ps aux | grep -i "vibe-code-studio" | grep -v grep | awk '{sum += $6} END {print int(sum/1024)}')
   echo ""
   echo "=== MEMORY ANALYSIS ==="
   echo "Total Memory Usage: ${MEMORY_MB} MB"
   if [ "$MEMORY_MB" -gt 1000 ]; then
     echo "⚠ WARNING: Memory usage exceeds 1GB"
     echo "→ Consider restarting the application"
   elif [ "$MEMORY_MB" -gt 500 ]; then
     echo "⚠ NOTICE: Memory usage above 500MB"
     echo "→ Monitor for continued growth"
   else
     echo "✓ Memory usage within normal range"
   fi
   ```

## Expected Output

- Process IDs and memory consumption
- Breakdown by main/renderer processes
- CPU usage percentages
- Memory warnings if thresholds exceeded
- Typical range: 200-500MB for normal usage
