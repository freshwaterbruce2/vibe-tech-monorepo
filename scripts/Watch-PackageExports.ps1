#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Monitors packages and auto-triggers memory synchronization when exports change.
.DESCRIPTION
    Watches V:\monorepo\packages recursively for *.ts changes.
    Extracts export signatures, detects differences using a hash cache,
    and indexes API modifications into the Semantic Memory Store of memory.db.
.PARAMETER PackagesPath
    Path to the packages directory to watch (default: V:\monorepo\packages).
.PARAMETER PollIntervalSeconds
    Frequency to check for modifications (default: 3).
.EXAMPLE
    pwsh -File scripts/Watch-PackageExports.ps1
#>

[CmdletBinding()]
param(
    [string]$PackagesPath = "V:\monorepo\packages",
    [int]$PollIntervalSeconds = 3
)

$ErrorActionPreference = "Stop"
$watcherLogDir = "D:\logs\port-watcher"
$exportLog = Join-Path $watcherLogDir "package-exports.log"
$hashCachePath = Join-Path $watcherLogDir "export_hashes.json"
$databasePath = "D:\databases\memory.db"
$queryUtility = "V:\monorepo\scripts\Query-SqliteDatabase.ps1"

# Ensure directories exist
if (-not (Test-Path $watcherLogDir)) {
    New-Item -ItemType Directory -Path $watcherLogDir -Force | Out-Null
}
if (-not (Test-Path $PackagesPath)) {
    Write-Error "Packages directory not found: $PackagesPath"
}

# Load existing hash cache
$HashCache = if (Test-Path $hashCachePath) {
    try {
        Get-Content $hashCachePath -Raw | ConvertFrom-Json -AsHashtable
    } catch {
        @{}
    }
} else {
    @{}
}

function Write-ExportsLog {
    param(
        [string]$Message,
        [ConsoleColor]$Color = "White"
    )
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$stamp] $Message"
    Write-Host $formatted -ForegroundColor $Color
    $formatted | Out-File -FilePath $exportLog -Append -Encoding utf8
}

function Get-ExportHash {
    param([string]$FilePath)
    try {
        # Extract lines starting with "export " or containing export declarations
        $exportLines = Get-Content -LiteralPath $FilePath -ErrorAction SilentlyContinue | 
            Where-Object { $_ -match "^\s*export\s+(?:const|function|interface|type|class|enum|default|\{|\*)" }

        if (-not $exportLines) {
            return ""
        }

        # Join lines and compute MD5 hash
        $joinedText = $exportLines -join "`n"
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($joinedText)
        $md5 = [System.Security.Cryptography.MD5]::Create()
        $hashBytes = $md5.ComputeHash($bytes)
        $md5.Dispose()

        return ($hashBytes | ForEach-Object { $_.ToString("x2") }) -join ""
    } catch {
        return ""
    }
}

function Sync-ExportToMemory {
    param(
        [string]$FilePath,
        [string]$PackageName,
        [string[]]$ExportSignatures
    )

    $fileName = Split-Path $FilePath -Leaf
    $signaturesText = $ExportSignatures -join "; "
    if ($signaturesText.Length -gt 1500) {
        $signaturesText = $signaturesText.Substring(0, 1497) + "..."
    }

    $summaryText = "[API CONTRACT UPDATE] Package '$PackageName' file '$fileName' exports modified. Current exports: $signaturesText"
    Write-ExportsLog "  Indexing API update: $summaryText" -Color Cyan

    # Node.js integration script to insert via MemoryManager natively (preserves embedding generation)
    $nodeScript = @'
const { MemoryManager } = require('./packages/memory/dist/index.js');
(async () => {
    try {
        const manager = new MemoryManager({
            dbPath: 'D:/databases/memory.db',
            embeddingProvider: 'ollama',
            embeddingModel: 'nomic-embed-text',
            embeddingDimension: 768
        });
        await manager.init();
        await manager.semantic.add({
            text: process.env.MEM_TEXT,
            category: 'package-export',
            importance: 8,
            metadata: {
                source: 'package-watcher',
                packageName: process.env.MEM_PKG,
                filePath: process.env.MEM_FILE,
                timestamp: Date.now()
            }
        });
        manager.close();
        console.log("SUCCESS");
    } catch (err) {
        console.error("NODE_ERR: " + err.message);
        process.exit(1);
    }
})();
'@

    # Run Node integration with environment variables for shell safety
    $env:MEM_TEXT = $summaryText
    $env:MEM_PKG = $PackageName
    $env:MEM_FILE = $FilePath.Replace('\', '/')

    $success = $false
    try {
        $nodeResult = & node -e $nodeScript 2>&1
        if ($LASTEXITCODE -eq 0 -and $nodeResult -contains "SUCCESS") {
            Write-ExportsLog "  [OK] Successfully synced to memory.db via MemoryManager." -Color Green
            $success = $true
        } else {
            Write-Warning "MemoryManager sync failed: $nodeResult"
        }
    } catch {
        Write-Warning "MemoryManager sync exception: $_"
    }

    # Fallback: Direct DB query insertion if Node integration is offline/fails
    if (-not $success) {
        Write-ExportsLog "  [WARN] Falling back to direct database insertion..." -Color Yellow
        $createdStamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        $metadataJson = @{
            source = "package-watcher"
            packageName = $PackageName
            filePath = $FilePath.Replace('\', '/')
            timestamp = $createdStamp * 1000
        } | ConvertTo-Json -Compress

        $escapedText = $summaryText -replace "'", "''"
        $escapedMetadata = $metadataJson -replace "'", "''"

        # Insert via Query-SqliteDatabase utility
        $insertQuery = "INSERT INTO semantic_memory (text, category, importance, created, metadata, embedding_model) VALUES ('$escapedText', 'package-export', 8, $createdStamp, '$escapedMetadata', 'text-embedding-3-small')"
        try {
            & pwsh -File $queryUtility -DatabasePath $databasePath -Query $insertQuery -AsJson | Out-Null
            Write-ExportsLog "  [OK] Successfully inserted direct SQL record to memory.db." -Color Green
        } catch {
            Write-ExportsLog "  [ERROR] Direct database insertion failed: $_" -Color Red
        }
    }

    # Clear env variables
    Remove-Item Env:\MEM_TEXT
    Remove-Item Env:\MEM_PKG
    Remove-Item Env:\MEM_FILE
}

function Get-PackageName {
    param([string]$FilePath)
    # Extract package name from file path, e.g. packages/memory/src/... -> memory
    if ($FilePath -match "packages\\(?<pkg>[^\\]+)") {
        return "@vibetech/$($Matches['pkg'])"
    }
    return "unknown-package"
}

function Check-FileChanges {
    param([string]$FilePath)
    $currentHash = Get-ExportHash -FilePath $FilePath
    if (-not $currentHash) { return }

    $cachedHash = if ($HashCache.ContainsKey($FilePath)) { $HashCache[$FilePath] } else { "" }

    if ($currentHash -ne $cachedHash) {
        $HashCache[$FilePath] = $currentHash
        $pkgName = Get-PackageName -FilePath $FilePath
        
        Write-ExportsLog "  [CHANGE] Exports changed in $pkgName ($($FilePath.Substring($PackagesPath.Length + 1)))" -Color Yellow

        # Extract current signatures to store in memory
        $signatures = Get-Content -LiteralPath $FilePath | 
            Where-Object { $_ -match "^\s*export\s+(?:const|function|interface|type|class|enum|default|\{|\*)" } |
            ForEach-Object { $_.Trim() }

        Sync-ExportToMemory -FilePath $FilePath -PackageName $pkgName -ExportSignatures $signatures

        # Save hash cache changes to disk immediately
        $HashCache | ConvertTo-Json | Set-Content -Path $hashCachePath -Encoding utf8
    }
}

# --- MAIN WATCHER LOOP ---
Write-ExportsLog "  [START] Package Export Watcher Sidecar initialized." -Color Green
Write-ExportsLog "  Watching: $PackagesPath" -Color Cyan
Write-ExportsLog "  Press Ctrl+C to terminate." -Color DarkGray

while ($true) {
    # Scan recursively for all .ts files under packages/ excluding node_modules or dist
    $tsFiles = Get-ChildItem -Path $PackagesPath -Recurse -File -Filter "*.ts" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*" -and $_.FullName -notlike "*build*" }

    foreach ($file in $tsFiles) {
        Check-FileChanges -FilePath $file.FullName
    }

    Start-Sleep -Seconds $PollIntervalSeconds
}
