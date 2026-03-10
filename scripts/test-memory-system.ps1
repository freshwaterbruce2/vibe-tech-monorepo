#!/usr/bin/env pwsh
# Memory System Integration Test
# Tests all components: Database, Ollama, MCP server, and memory operations
# Run after Claude Code restart to verify MCP integration

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0
$script:NodePath = $null

# Find Node.js executable
function Find-NodeExecutable {
    # Try common locations
    $possiblePaths = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
        "$env:ProgramFiles\nodejs\node.exe"
    )

    # Check if node is in PATH
    try {
        $nodeInPath = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeInPath) {
            return $nodeInPath.Source
        }
    } catch { }

    # Check common installation paths
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            return $path
        }
    }

    # Check via pnpm/npm location
    try {
        $pnpmPath = Get-Command pnpm -ErrorAction SilentlyContinue
        if ($pnpmPath) {
            $nodeDir = Split-Path -Parent $pnpmPath.Source
            $nodePath = Join-Path $nodeDir "node.exe"
            if (Test-Path $nodePath) {
                return $nodePath
            }
        }
    } catch { }

    return $null
}

# Colors for output
function Write-Success($msg) {
    Write-Host "✓ $msg" -ForegroundColor Green
    $script:PassCount++
}

function Write-Failure($msg) {
    Write-Host "✗ $msg" -ForegroundColor Red
    $script:FailCount++
}

function Write-Info($msg) {
    Write-Host "ℹ $msg" -ForegroundColor Cyan
}

function Write-Section($msg) {
    Write-Host "`n═══ $msg ═══" -ForegroundColor Yellow
}

# Initialize Node.js path
$script:NodePath = Find-NodeExecutable
if (-not $script:NodePath) {
    Write-Host "ERROR: Node.js not found. Please install Node.js or add it to PATH." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

if ($Verbose) {
    Write-Info "Using Node.js at: $($script:NodePath)"
}

# Test 1: Prerequisites
Write-Section "Phase 1: Prerequisites"

# Check database exists
if (Test-Path "D:\databases\memory.db") {
    Write-Success "Database exists at D:\databases\memory.db"
} else {
    Write-Failure "Database not found at D:\databases\memory.db"
}

# Check MCP server built
if (Test-Path "C:\dev\apps\memory-mcp\dist\index.js") {
    Write-Success "MCP server built (apps/memory-mcp/dist/index.js)"
} else {
    Write-Failure "MCP server not built"
}

# Check memory library built
if (Test-Path "C:\dev\packages\memory\dist\index.js") {
    Write-Success "Memory library built (packages/memory/dist/index.js)"
} else {
    Write-Failure "Memory library not built"
}

# Check .mcp.json configuration
try {
    $mcpConfig = Get-Content "C:\dev\.mcp.json" | ConvertFrom-Json
    if ($mcpConfig.mcpServers.'memory') {
        Write-Success "MCP server registered in .mcp.json"
        if ($Verbose) {
            Write-Info "   Command: $($mcpConfig.mcpServers.memory.command)"
            Write-Info "   Args: $($mcpConfig.mcpServers.memory.args -join ' ')"
        }
    } else {
        Write-Failure "MCP server not found in .mcp.json (expected 'memory' key)"
    }
} catch {
    Write-Failure "Failed to parse .mcp.json: $_"
}

# Test 2: Ollama Service
Write-Section "Phase 2: Ollama Service"

try {
    $ollamaHealth = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
    Write-Success "Ollama service is running"

    # Check for nomic-embed-text model
    $hasNomicModel = $ollamaHealth.models | Where-Object { $_.name -like "nomic-embed-text*" }
    if ($hasNomicModel) {
        Write-Success "nomic-embed-text model available"
        if ($Verbose) {
            Write-Info "   Model: $($hasNomicModel.name)"
            Write-Info "   Size: $([math]::Round($hasNomicModel.size / 1MB, 2)) MB"
        }
    } else {
        Write-Failure "nomic-embed-text model not found"
    }
} catch {
    Write-Failure "Ollama service not accessible: $_"
}

# Test 3: Database Schema
Write-Section "Phase 3: Database Schema"

try {
    # Use Node.js to query SQLite (better-sqlite3 is already in dependencies)
    $schemaCheck = & $script:NodePath -e @"
const Database = require('better-sqlite3');
const db = new Database('D:/databases/memory.db', { readonly: true });

const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=?').all('table');
console.log(JSON.stringify(tables.map(t => t.name)));
db.close();
"@

    $tables = $schemaCheck | ConvertFrom-Json

    $expectedTables = @('episodic_memory', 'semantic_memory', 'procedural_memory')
    $missingTables = $expectedTables | Where-Object { $_ -notin $tables }

    if ($missingTables.Count -eq 0) {
        Write-Success "All required tables exist"
        if ($Verbose) {
            Write-Info "   Tables: $($tables -join ', ')"
        }
    } else {
        Write-Failure "Missing tables: $($missingTables -join ', ')"
    }
} catch {
    Write-Failure "Failed to check database schema: $_"
}

# Test 4: Memory Library API
Write-Section "Phase 4: Memory Library API"

try {
    $apiTest = & $script:NodePath -e @"
const { MemoryManager } = require('./packages/memory/dist/index.js');

(async () => {
  try {
    const manager = new MemoryManager({
      dbPath: 'D:/databases/memory.db',
      embeddingProvider: 'transformers',
      embeddingDimension: 768
    });

    await manager.init();

    // Test episodic add
    const episodicId = manager.episodic.add({
      sourceId: 'claude-code',
      query: 'test query',
      response: 'test response',
      timestamp: Date.now()
    });
    console.log('EPISODIC_OK');

    // Test semantic add
    const semanticId = await manager.semantic.add({
      text: 'Test semantic memory content',
      category: 'test',
      importance: 5,
      metadata: {source: 'integration-test'}
    });
    console.log('SEMANTIC_OK');

    // Test procedural add
    manager.procedural.upsert({
      pattern: 'test_command',
      context: 'integration test',
      successRate: 1.0,
      lastUsed: Date.now(),
      metadata: {type: 'test'}
    });
    console.log('PROCEDURAL_OK');

    // Test search
    const results = await manager.semantic.search('test', 5);
    if (results.length > 0) {
      console.log('SEARCH_OK');
    }

    manager.close();
    process.exit(0);
  } catch (error) {
    console.error('API Test Error:', error.message);
    process.exit(1);
  }
})();
"@

    if ($apiTest -match 'EPISODIC_OK') {
        Write-Success "Episodic memory storage works"
    } else {
        Write-Failure "Episodic memory storage failed"
    }

    if ($apiTest -match 'SEMANTIC_OK') {
        Write-Success "Semantic memory storage works"
    } else {
        Write-Failure "Semantic memory storage failed"
    }

    if ($apiTest -match 'PROCEDURAL_OK') {
        Write-Success "Procedural memory tracking works"
    } else {
        Write-Failure "Procedural memory tracking failed"
    }

    if ($apiTest -match 'SEARCH_OK') {
        Write-Success "Semantic search works"
    } else {
        Write-Failure "Semantic search failed"
    }

} catch {
    Write-Failure "Memory library API test failed: $_"
}

# Test 5: Database Size & Records
Write-Section "Phase 5: Database Metrics"

try {
    $dbStats = & $script:NodePath -e @"
const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('D:/databases/memory.db', { readonly: true });

const episodicCount = db.prepare('SELECT COUNT(*) as count FROM episodic_memory').get();
const semanticCount = db.prepare('SELECT COUNT(*) as count FROM semantic_memory').get();
const proceduralCount = db.prepare('SELECT COUNT(*) as count FROM procedural_memory').get();
const dbSize = fs.statSync('D:/databases/memory.db').size;

console.log(JSON.stringify({
  episodic: episodicCount.count,
  semantic: semanticCount.count,
  procedural: proceduralCount.count,
  sizeKB: Math.round(dbSize / 1024)
}));

db.close();
"@

    $stats = $dbStats | ConvertFrom-Json

    Write-Success "Database metrics retrieved"
    Write-Info "   Episodic memories: $($stats.episodic)"
    Write-Info "   Semantic memories: $($stats.semantic)"
    Write-Info "   Procedural memories: $($stats.procedural)"
    Write-Info "   Database size: $($stats.sizeKB) KB"

} catch {
    Write-Failure "Failed to retrieve database metrics: $_"
}

# Test 6: MCP Server Can Start (Don't keep it running)
Write-Section "Phase 6: MCP Server Startup Test"

try {
    # Test that the MCP server can at least be required without errors
    $mcpTest = & $script:NodePath -e @"
try {
  require('./apps/memory-mcp/dist/index.js');
  console.log('MCP_SERVER_LOADABLE');
} catch (e) {
  console.error('Failed to load MCP server:', e.message);
  process.exit(1);
}
"@

    if ($mcpTest -match 'MCP_SERVER_LOADABLE') {
        Write-Success "MCP server module loads successfully"
    } else {
        Write-Failure "MCP server failed to load"
    }
} catch {
    Write-Failure "MCP server startup test failed: $_"
}

# Test 7: Storage Path Compliance
Write-Section "Phase 7: Storage Path Policy Compliance"

$violations = @()

# Check for databases in C:\dev (limited to apps/ and packages/ for performance)
# Only scan specific directories to avoid long scan times
$scanPaths = @("C:\dev\apps", "C:\dev\packages", "C:\dev\backend")
foreach ($scanPath in $scanPaths) {
    if (Test-Path $scanPath) {
        $cDevDatabases = Get-ChildItem -Path $scanPath -Recurse -Include *.db,*.sqlite,*.sqlite3 -Depth 2 -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notlike "*node_modules*" }

        if ($cDevDatabases) {
            foreach ($db in $cDevDatabases) {
                $violations += "Database found in C:\dev: $($db.FullName)"
            }
        }
    }
}

# Verify D:\ usage
if (Test-Path "D:\databases\memory.db") {
    Write-Success "Database correctly stored on D:\ drive"
} else {
    $violations += "Database not found at D:\databases\memory.db"
}

if (Test-Path "D:\ollama\models") {
    Write-Success "Ollama models correctly stored on D:\ drive"
} else {
    Write-Info "   Ollama models directory not found (may use default location)"
}

if ($violations.Count -gt 0) {
    Write-Failure "Path policy violations found:"
    foreach ($v in $violations) {
        Write-Host "     - $v" -ForegroundColor Red
    }
} else {
    Write-Success "No path policy violations"
}

# Final Summary
Write-Section "Test Summary"

$total = $script:PassCount + $script:FailCount
$passRate = if ($total -gt 0) { [math]::Round(($script:PassCount / $total) * 100, 1) } else { 0 }

Write-Host ""
Write-Host "Passed: $($script:PassCount)/$total ($passRate%)" -ForegroundColor $(if ($passRate -ge 80) { 'Green' } else { 'Yellow' })
Write-Host "Failed: $($script:FailCount)/$total" -ForegroundColor $(if ($script:FailCount -eq 0) { 'Green' } else { 'Red' })
Write-Host ""

if ($script:FailCount -eq 0) {
    Write-Host "✓ All tests passed! Memory System is ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart Claude Code to load the MCP server"
    Write-Host "  2. Verify MCP tools are available in Claude Code session"
    Write-Host "  3. Try: memory_health, memory_add_semantic, memory_search_semantic"
    Write-Host ""
} else {
    Write-Host "⚠ Some tests failed. Review errors above." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

exit 0
