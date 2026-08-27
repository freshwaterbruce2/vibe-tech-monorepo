#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Query a SQLite database using the best available engine.
.DESCRIPTION
    Attempts to query a SQLite database using:
      1. Native .NET System.Data.SQLite assembly (downloaded to D:\learning-system\bin if missing)
      2. Native sqlite3.exe CLI (if available in PATH)
      3. Inline Node.js executing better-sqlite3 (fully shell-safe via environment variables)
.PARAMETER DatabasePath
    Absolute path to the SQLite database.
.PARAMETER Query
    The SQL query to execute.
.PARAMETER AsJson
    Output the result as a raw JSON string instead of PowerShell custom objects.
.PARAMETER ForceNodeFallback
    Force using the Node.js fallback method.
.EXAMPLE
    pwsh -File scripts/Query-SqliteDatabase.ps1 -DatabasePath "D:\databases\memory.db" -Query "SELECT * FROM memories LIMIT 5"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$DatabasePath,

    [Parameter(Mandatory=$true)]
    [string]$Query,

    [switch]$AsJson,
    [switch]$ForceNodeFallback
)

$ErrorActionPreference = "Stop"
$binDir = "D:\learning-system\bin"
$dllPath = Join-Path $binDir "System.Data.SQLite.dll"
$interopDirX64 = Join-Path $binDir "x64"
$interopPathX64 = Join-Path $interopDirX64 "SQLite.Interop.dll"

# Resolve absolute path for database
$DatabasePath = (Resolve-Path $DatabasePath -ErrorAction SilentlyContinue).Path

if (-not (Test-Path $DatabasePath)) {
    Write-Error "Database file not found: $DatabasePath"
}

# --- METHOD Helper: Download SQLite NuGet Package if Missing ---
function Ensure-SqliteDlls {
    if (Test-Path $dllPath) { return $true }

    try {
        Write-Host "SQLite .NET DLLs not found. Attempting to download System.Data.SQLite from NuGet..." -ForegroundColor Yellow
        if (-not (Test-Path $interopDirX64)) {
            New-Item -ItemType Directory -Path $interopDirX64 -Force | Out-Null
        }

        $tempZip = Join-Path $binDir "sqlite_temp.zip"
        $extractDir = Join-Path $binDir "sqlite_extracted"

        # Download System.Data.SQLite.Core stub NuGet package (ZIP format)
        $nugetUrl = "https://globalcdn.nuget.org/packages/stub.system.data.sqlite.core.netframework.1.0.118.nupkg"
        Invoke-WebRequest -Uri $nugetUrl -OutFile $tempZip -UseBasicParsing

        # Extract package contents
        Expand-Archive -Path $tempZip -DestinationPath $extractDir -Force

        # Copy the .NET Framework 4.6 assembly (compatible with Windows PowerShell 5.1)
        $net46Dll = Get-ChildItem -Path $extractDir -Filter "System.Data.SQLite.dll" -Recurse | 
            Where-Object { $_.FullName -like "*net46*" } | Select-Object -First 1
        if ($net46Dll) {
            Copy-Item -Path $net46Dll.FullName -Destination $dllPath -Force
        }

        # Copy the native x64 interop DLL (needed by System.Data.SQLite)
        $nativeDll = Get-ChildItem -Path $extractDir -Filter "SQLite.Interop.dll" -Recurse | 
            Where-Object { $_.FullName -like "*x64*" } | Select-Object -First 1
        if ($nativeDll) {
            Copy-Item -Path $nativeDll.FullName -Destination $interopPathX64 -Force
        }

        # Clean up temp files
        Remove-Item -Path $tempZip -Force
        Remove-Item -Path $extractDir -Recurse -Force

        Write-Host "SQLite .NET Assembly successfully installed to $dllPath" -ForegroundColor Green
        return $true
    } catch {
        Write-Warning "Could not download SQLite .NET assembly: $_"
        return $false
    }
}

# --- METHOD 1: Direct .NET Assembly Query ---
function Invoke-NetSqlQuery {
    param(
        [string]$DbPath,
        [string]$SqlQuery
    )

    # Load Assembly
    Add-Type -Path $dllPath

    $connString = "Data Source=$DbPath;Version=3;Read Only=True;"
    $conn = New-Object System.Data.SQLite.SQLiteConnection($connString)
    try {
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $SqlQuery
        $adapter = New-Object System.Data.SQLite.SQLiteDataAdapter($cmd)
        $ds = New-Object System.Data.DataSet
        $null = $adapter.Fill($ds)
        
        $table = $ds.Tables[0]
        # Convert DataTable rows to custom PowerShell objects
        $results = foreach ($row in $table.Rows) {
            $obj = [ordered]@{}
            foreach ($col in $table.Columns) {
                $obj[$col.ColumnName] = $row[$col.ColumnName]
            }
            [pscustomobject]$obj
        }
        return $results
    } finally {
        $conn.Close()
    }
}

# --- METHOD 2: sqlite3 CLI ---
function Invoke-CliSqlQuery {
    param(
        [string]$DbPath,
        [string]$SqlQuery
    )
    $sqliteCmd = Get-Command sqlite3 -ErrorAction SilentlyContinue
    if (-not $sqliteCmd) { throw "sqlite3.exe not found in PATH" }

    # Execute and output JSON
    $jsonResult = & $sqliteCmd.Source -json $DbPath $SqlQuery 2>$null
    if ($jsonResult) {
        return $jsonResult | ConvertFrom-Json
    }
    return @()
}

# --- METHOD 3: Node.js better-sqlite3 Fallback (Shell-Safe) ---
function Invoke-NodeSqlQuery {
    param(
        [string]$DbPath,
        [string]$SqlQuery
    )
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) { throw "Node.js not found in PATH" }

    # Set environment variables for shell safety (handles spaces, quotes, and complex query syntax)
    $env:SQLITE_DB_PATH = $DbPath
    $env:SQLITE_QUERY = $SqlQuery

    $nodeCode = @"
const Database = require('better-sqlite3');
try {
    const db = new Database(process.env.SQLITE_DB_PATH, { readonly: true });
    const stmt = db.prepare(process.env.SQLITE_QUERY);
    const results = stmt.all();
    console.log(JSON.stringify(results));
    db.close();
} catch (err) {
    console.error(err.message);
    process.exit(1);
}
"@
    
    # Run Node with raw script
    $jsonResult = & $nodeCmd.Source -e $nodeCode 2>$null
    
    # Clear environment variables
    Remove-Item Env:\SQLITE_DB_PATH
    Remove-Item Env:\SQLITE_QUERY

    if ($jsonResult) {
        return $jsonResult | ConvertFrom-Json
    }
    return @()
}

# --- MAIN EXECUTION ROUTER ---
$results = @()
$success = $false

if (-not $ForceNodeFallback) {
    # Try .NET assembly method first
    if (Ensure-SqliteDlls) {
        try {
            $results = Invoke-NetSqlQuery -DbPath $DatabasePath -SqlQuery $Query
            $success = $true
        } catch {
            Write-Warning "Direct .NET query failed: $_. Falling back to CLI/Node methods..."
        }
    }

    # Try sqlite3 CLI if .NET assembly fails
    if (-not $success) {
        try {
            $results = Invoke-CliSqlQuery -DbPath $DatabasePath -SqlQuery $Query
            $success = $true
        } catch {
            Write-Warning "sqlite3 CLI query failed: $_. Falling back to Node.js method..."
        }
    }
}

# Fall back to Node.js better-sqlite3 method
if (-not $success) {
    try {
        $results = Invoke-NodeSqlQuery -DbPath $DatabasePath -SqlQuery $Query
        $success = $true
    } catch {
        Write-Error "All SQLite query methods failed: $_"
    }
}

# Output format
if ($success) {
    if ($AsJson) {
        $results | ConvertTo-Json -Depth 6
    } else {
        $results
    }
}
