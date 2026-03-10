# Memory System - Troubleshooting Guide

Quick diagnostic steps for common Memory System issues.

## Pre-Flight Checklist

Run these checks before using the Memory System:

```powershell
# 1. Run integration tests
C:\dev\scripts\test-memory-system.ps1

# 2. Check Ollama
curl http://localhost:11434/api/tags

# 3. Verify database
Test-Path D:\databases\memory.db

# 4. Check MCP registration
node -e "console.log(JSON.parse(require('fs').readFileSync('C:/dev/.mcp.json','utf8')).mcpServers['memory-bank'])"
```

**Expected Results:**
- ✅ All integration tests pass
- ✅ Ollama returns model list with `nomic-embed-text`
- ✅ Database exists
- ✅ MCP config shows memory-bank entry

---

## Common Issues

### 1. MCP Tools Not Available in Claude Code

**Symptoms:**
- `memory_health`, `memory_add_semantic`, etc. not showing up
- Claude Code doesn't recognize memory tools

**Diagnostic:**
```powershell
# Check .mcp.json
Get-Content C:\dev\.mcp.json | ConvertFrom-Json | Select-Object -ExpandProperty mcpServers

# Verify MCP server built
Test-Path C:\dev\apps\memory-mcp\dist\index.js
```

**Solutions:**

1. **Rebuild MCP server:**
   ```powershell
   cd C:\dev
   pnpm --filter memory-mcp build
   ```

2. **Verify .mcp.json format:**
   ```json
   {
     "mcpServers": {
       "memory-bank": {
         "command": "node",
         "args": ["apps/memory-mcp/dist/index.js"],
         "env": {
           "DATABASE_PATH": "D:\\databases\\memory.db",
           "OLLAMA_HOST": "http://localhost:11434"
         },
         "type": "stdio"
       }
     }
   }
   ```

3. **Restart Claude Code COMPLETELY:**
   - Close all Claude Code windows
   - Wait 10 seconds
   - Reopen Claude Code
   - Verify: `Get-Process | Where {$_.Name -like "*claude*"}`

---

### 2. Ollama Not Running

**Symptoms:**
- `memory_health` shows "Embedding provider: unavailable"
- Semantic search fails

**Diagnostic:**
```powershell
# Check Ollama process
Get-Process | Where {$_.Name -like "*ollama*"}

# Test API
curl http://localhost:11434/api/tags
```

**Solutions:**

1. **Start Ollama:**
   ```powershell
   # If installed as service
   Start-Service Ollama

   # Or launch manually
   ollama serve
   ```

2. **Pull embedding model:**
   ```powershell
   ollama pull nomic-embed-text
   ```

3. **Verify model location:**
   ```powershell
   # Check D:\ollama\models (if configured)
   Get-ChildItem D:\ollama\models -Recurse | Where {$_.Name -like "*nomic*"}
   ```

---

### 3. Database Locked Errors

**Symptoms:**
- "Database is locked" errors
- Write operations fail

**Diagnostic:**
```powershell
# Check for processes using the database
$dbPath = "D:\databases\memory.db"
Get-Process | Where {$_.Modules.FileName -contains $dbPath}
```

**Solutions:**

1. **Enable WAL mode (should already be enabled):**
   ```powershell
   node -e "const db = require('better-sqlite3')('D:/databases/memory.db'); db.pragma('journal_mode = WAL'); console.log('WAL enabled'); db.close();"
   ```

2. **Checkpoint and close connections:**
   ```powershell
   node -e "const db = require('better-sqlite3')('D:/databases/memory.db'); db.pragma('wal_checkpoint(TRUNCATE)'); db.close();"
   ```

3. **Restart services accessing the database:**
   - Close Claude Code
   - Wait for all Node.js processes to close
   - Reopen Claude Code

---

### 4. Search Returns No Results

**Symptoms:**
- `memory_search_semantic` finds nothing
- `memory_search_episodic` returns empty

**Diagnostic:**
```powershell
# Check if memories exist
node -e "const db = require('better-sqlite3')('D:/databases/memory.db', {readonly: true}); console.log('Semantic:', db.prepare('SELECT COUNT(*) as c FROM semantic_memories').get()); console.log('Episodic:', db.prepare('SELECT COUNT(*) as c FROM episodic_memories').get()); db.close();"
```

**Solutions:**

1. **If no memories exist, add some:**
   ```
   Use memory_add_semantic tool with:
     content: "Test memory content"
     metadata: { "test": true }
   ```

2. **Check similarity threshold:**
   ```
   Use memory_search_semantic tool with:
     query: "your query"
     minSimilarity: 0.5  # Lower threshold
   ```

3. **Verify embeddings were generated:**
   ```powershell
   node -e "const db = require('better-sqlite3')('D:/databases/memory.db', {readonly: true}); const row = db.prepare('SELECT LENGTH(embedding) as len FROM semantic_memories LIMIT 1').get(); console.log('Embedding size:', row ? row.len : 'none'); db.close();"
   ```

   **Expected:** `Embedding size: 3072` (768 floats × 4 bytes)

---

### 5. Slow Search Performance

**Symptoms:**
- Semantic search takes >5 seconds
- Tools timeout

**Diagnostic:**
```powershell
# Check database size
$dbSize = (Get-Item D:\databases\memory.db).Length / 1MB
Write-Host "Database size: $([math]::Round($dbSize, 2)) MB"

# Count memories
node -e "const db = require('better-sqlite3')('D:/databases/memory.db', {readonly: true}); console.log('Semantic count:', db.prepare('SELECT COUNT(*) as c FROM semantic_memories').get().c); db.close();"
```

**Solutions:**

1. **If >10,000 semantic memories:**
   - Consider pruning old entries
   - Add filters to search queries (metadata)

2. **Optimize database:**
   ```powershell
   node -e "const db = require('better-sqlite3')('D:/databases/memory.db'); db.pragma('optimize'); console.log('Optimized'); db.close();"
   ```

3. **Use Ollama instead of Transformers.js:**
   - Ollama is 5-10x faster
   - Verify: `memory_health` should show "ollama" as provider

---

### 6. Path Policy Violations

**Symptoms:**
- Database found in `C:\dev`
- Permission errors

**Diagnostic:**
```powershell
# Run validation script
C:\dev\check-vibe-paths.ps1

# Check for databases in wrong location
Get-ChildItem C:\dev -Recurse -Include *.db,*.sqlite -ErrorAction SilentlyContinue | Where {$_.FullName -notlike "*node_modules*"}
```

**Solutions:**

1. **Move database to D:\:**
   ```powershell
   # If database is in wrong location
   Move-Item "C:\dev\wrong-location\memory.db" "D:\databases\memory.db"
   ```

2. **Update environment variables:**
   ```powershell
   # Check .mcp.json
   $mcpConfig = Get-Content C:\dev\.mcp.json | ConvertFrom-Json
   $mcpConfig.mcpServers.'memory-bank'.env.DATABASE_PATH
   # Should output: D:\databases\memory.db
   ```

---

### 7. Build Failures

**Symptoms:**
- `pnpm build` fails for memory packages
- TypeScript errors

**Diagnostic:**
```powershell
# Check TypeScript compilation
cd C:\dev\packages\memory
pnpm run build

# Check for missing dependencies
pnpm list --depth=0
```

**Solutions:**

1. **Clean rebuild:**
   ```powershell
   cd C:\dev
   pnpm --filter memory clean
   pnpm --filter memory build
   pnpm --filter memory-mcp build
   ```

2. **Install missing dependencies:**
   ```powershell
   cd C:\dev
   pnpm install
   ```

3. **Check TypeScript config:**
   ```powershell
   # Verify tsconfig.json exists
   Test-Path C:\dev\packages\memory\tsconfig.json
   Test-Path C:\dev\apps\memory-mcp\tsconfig.json
   ```

---

## Diagnostic Commands

### Quick Health Check

```powershell
# All-in-one diagnostic
$checks = @{
    "Database" = Test-Path D:\databases\memory.db
    "MCP Dist" = Test-Path C:\dev\apps\memory-mcp\dist\index.js
    "Lib Dist" = Test-Path C:\dev\packages\memory\dist\index.js
    "Ollama" = (Invoke-RestMethod http://localhost:11434/api/tags -ErrorAction SilentlyContinue) -ne $null
}

$checks.GetEnumerator() | ForEach-Object {
    $icon = if ($_.Value) { "✓" } else { "✗" }
    Write-Host "$icon $($_.Key): $($_.Value)" -ForegroundColor $(if ($_.Value) { "Green" } else { "Red" })
}
```

### Database Inspection

```powershell
# View schema
node -e "const db = require('better-sqlite3')('D:/databases/memory.db', {readonly: true}); console.log(db.prepare('SELECT sql FROM sqlite_master WHERE type=?').all('table').map(t => t.sql).join('\n\n')); db.close();"

# View sample records
node -e "const db = require('better-sqlite3')('D:/databases/memory.db', {readonly: true}); console.log('EPISODIC:', JSON.stringify(db.prepare('SELECT * FROM episodic_memories LIMIT 2').all(), null, 2)); console.log('SEMANTIC:', JSON.stringify(db.prepare('SELECT id, content, created_at FROM semantic_memories LIMIT 2').all(), null, 2)); db.close();"
```

### MCP Server Test

```powershell
# Test MCP server loads
node -e "try { require('./apps/memory-mcp/dist/index.js'); console.log('✓ MCP server loads'); } catch(e) { console.error('✗ Error:', e.message); }"
```

---

## Emergency Reset

If all else fails, reset the Memory System:

```powershell
# 1. Backup existing database
Copy-Item D:\databases\memory.db D:\databases\memory.db.backup

# 2. Clean build artifacts
cd C:\dev
Remove-Item packages\memory\dist -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item apps\memory-mcp\dist -Recurse -Force -ErrorAction SilentlyContinue

# 3. Rebuild
pnpm --filter memory build
pnpm --filter memory-mcp build

# 4. Reinitialize database (run integration test)
C:\dev\scripts\test-memory-system.ps1

# 5. Restart Claude Code
# (Close completely, wait 10s, reopen)
```

---

## Getting Help

If issues persist:

1. **Run full integration test:**
   ```powershell
   C:\dev\scripts\test-memory-system.ps1 -Verbose
   ```

2. **Collect diagnostics:**
   ```powershell
   # Save output to file
   C:\dev\scripts\test-memory-system.ps1 -Verbose > C:\dev\memory-diagnostics.txt
   ```

3. **Check logs:**
   - Claude Code logs (if available)
   - Ollama logs: `ollama logs`
   - Database journal: `D:\databases\memory.db-wal`

---

## Reference

- **Integration Test:** `C:\dev\scripts\test-memory-system.ps1`
- **Quick Start:** `C:\dev\docs\memory-system\QUICK_START.md`
- **Path Policy:** `.claude/rules/paths-policy.md`
- **MCP Config:** `C:\dev\.mcp.json`

---

**Last Updated:** 2026-02-14
