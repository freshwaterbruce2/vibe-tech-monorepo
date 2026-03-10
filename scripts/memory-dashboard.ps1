#!/usr/bin/env pwsh
# Memory System Dashboard
# Displays current memory statistics and recent activity

param(
    [int]$RecentLimit = 10,
    [switch]$Detailed = $false
)

$ErrorActionPreference = "Stop"

# Find Node.js executable
function Find-NodeExecutable {
    # Check if node is in PATH
    try {
        $nodeInPath = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeInPath) {
            return $nodeInPath.Source
        }
    } catch { }

    # Try common locations
    $possiblePaths = @(
        "C:\Program Files\Volta\node.exe",
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
    )

    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            return $path
        }
    }

    return $null
}

$nodePath = Find-NodeExecutable
if (-not $nodePath) {
    Write-Host "ERROR: Node.js not found. Please install Node.js or add it to PATH." -ForegroundColor Red
    exit 1
}

# Colors
function Write-Title($text) {
    Write-Host "`n$text" -ForegroundColor Cyan
    Write-Host ("=" * $text.Length) -ForegroundColor Cyan
}

function Write-Stat($label, $value, $color = "White") {
    $padding = 25 - $label.Length
    Write-Host "  $label" -NoNewline
    Write-Host (" " * $padding) -NoNewline
    Write-Host $value -ForegroundColor $color
}

Write-Title "Memory System Dashboard"

# Get system stats
$stats = & "$nodePath" -e @"
// Suppress console output except JSON result
const originalLog = console.log;
const originalError = console.error;
const originalInfo = console.info;
console.log = () => {};
console.error = () => {};
console.info = () => {};

const { MemoryManager } = require('./packages/memory/dist/index.js');

(async () => {
  const manager = new MemoryManager({
    dbPath: 'D:/databases/memory.db',
    embeddingProvider: 'ollama',
    embeddingModel: 'nomic-embed-text',
    embeddingDimension: 768
  });

  await manager.init();

  const stats = manager.getStats();
  const health = await manager.healthCheck();

  // Restore console.log for output
  console.log = originalLog;

  console.log(JSON.stringify({
    ...stats,
    health
  }));

  manager.close();
})();
"@

$data = $stats | ConvertFrom-Json

# System Health
Write-Title "System Health"
$healthStatus = if ($data.health.healthy) { "HEALTHY" } else { "DEGRADED" }
$healthColor = if ($data.health.healthy) { "Green" } else { "Red" }
Write-Stat "Status" $healthStatus $healthColor
Write-Stat "Database" $(if ($data.health.database) { "OK" } else { "ERROR" }) $(if ($data.health.database) { "Green" } else { "Red" })
Write-Stat "Embeddings" $(if ($data.health.embedding) { "OK" } else { "ERROR" }) $(if ($data.health.embedding) { "Green" } else { "Red" })

# Memory Counts
Write-Title "Memory Statistics"
Write-Stat "Episodic Memories" $data.database.episodicCount "Yellow"
Write-Stat "Semantic Memories" $data.database.semanticCount "Cyan"
Write-Stat "Procedural Patterns" $data.database.proceduralCount "Magenta"
Write-Stat "Database Size" "$([math]::Round($data.database.sizeBytes / 1KB, 2)) KB" "Gray"

# Embedding Config
Write-Title "Embedding Configuration"
Write-Stat "Provider" $data.embedding.provider "White"
Write-Stat "Dimension" "$($data.embedding.dimension)d" "White"

# Recent Episodic Memories
Write-Title "Recent Activity (Last $RecentLimit Events)"

$recentEvents = & "$nodePath" -e @"
const originalLog = console.log;
console.log = () => {};
console.error = () => {};
console.info = () => {};

const { MemoryManager } = require('./packages/memory/dist/index.js');

(async () => {
  const manager = new MemoryManager({
    dbPath: 'D:/databases/memory.db',
    embeddingProvider: 'ollama',
    embeddingModel: 'nomic-embed-text',
    embeddingDimension: 768
  });

  await manager.init();

  const recent = manager.episodic.getRecent($RecentLimit);

  console.log = originalLog;
  console.log(JSON.stringify(recent));

  manager.close();
})();
"@

$events = $recentEvents | ConvertFrom-Json

foreach ($event in $events) {
    $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($event.timestamp).LocalDateTime
    $timeAgo = (Get-Date) - $timestamp
    $timeAgoStr = if ($timeAgo.TotalDays -ge 1) {
        "$([math]::Floor($timeAgo.TotalDays))d ago"
    } elseif ($timeAgo.TotalHours -ge 1) {
        "$([math]::Floor($timeAgo.TotalHours))h ago"
    } elseif ($timeAgo.TotalMinutes -ge 1) {
        "$([math]::Floor($timeAgo.TotalMinutes))m ago"
    } else {
        "just now"
    }

    Write-Host ""
    Write-Host "  [$timeAgoStr]" -ForegroundColor Gray -NoNewline
    Write-Host " $($event.sourceId)" -ForegroundColor Yellow
    Write-Host "    Q: $($event.query)" -ForegroundColor White

    if ($Detailed) {
        Write-Host "    R: $($event.response)" -ForegroundColor Gray
        if ($event.metadata) {
            $meta = $event.metadata | ConvertFrom-Json
            Write-Host "    Metadata: $($meta | ConvertTo-Json -Compress)" -ForegroundColor DarkGray
        }
    } else {
        $response = $event.response
        if ($response.Length -gt 80) {
            $response = $response.Substring(0, 77) + "..."
        }
        Write-Host "    R: $response" -ForegroundColor Gray
    }
}

# Top Procedural Patterns
Write-Title "Top Command Patterns"

$patterns = & "$nodePath" -e @"
const originalLog = console.log;
console.log = () => {};
console.error = () => {};
console.info = () => {};

const { MemoryManager } = require('./packages/memory/dist/index.js');

(async () => {
  const manager = new MemoryManager({
    dbPath: 'D:/databases/memory.db',
    embeddingProvider: 'ollama',
    embeddingModel: 'nomic-embed-text',
    embeddingDimension: 768
  });

  await manager.init();

  const patterns = manager.procedural.getMostFrequent(5);

  console.log = originalLog;
  console.log(JSON.stringify(patterns));

  manager.close();
})();
"@

$topPatterns = $patterns | ConvertFrom-Json

foreach ($pattern in $topPatterns) {
    $successRate = [math]::Round($pattern.successRate * 100, 0)
    $successColor = if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" }

    Write-Host ""
    Write-Host "  $($pattern.pattern)" -ForegroundColor White
    Write-Host "    Usage: $($pattern.frequency)x" -ForegroundColor Gray -NoNewline
    Write-Host " | Success: $successRate%" -ForegroundColor $successColor
    Write-Host "    Context: $($pattern.context)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Dashboard updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""
