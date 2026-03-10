# Loop Logger - Structured logging for overnight loop sessions
# Usage: . C:\dev\scripts\loop-logger.ps1
#        Write-LoopLog -Loop "quality-sweep" -Project "vibe-tutor" -Message "lint: 3 errors fixed"
#        Write-LoopLog -Loop "cleanup-hygiene" -Phase 2 -Message "staged 45 deleted build artifacts"
#        Write-LoopLog -Loop "review-optimize" -Project "nova-agent" -Message "reviewed: anti-patterns=12, security=0"

param(
    [string]$SessionDate = (Get-Date -Format "yyyyMMdd")
)

$script:SessionDir = "D:\logs\loop-sessions\$SessionDate"

function Initialize-LoopSession {
    [CmdletBinding()]
    param(
        [string]$Date = (Get-Date -Format "yyyyMMdd")
    )

    $script:SessionDir = "D:\logs\loop-sessions\$Date"

    if (-not (Test-Path $script:SessionDir)) {
        New-Item -Path $script:SessionDir -ItemType Directory -Force | Out-Null
        Write-Host "Created session directory: $script:SessionDir"
    }

    $logFile = Join-Path $script:SessionDir "loop.log"
    if (-not (Test-Path $logFile)) {
        $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
        "[$timestamp] [system] Session initialized" | Out-File -FilePath $logFile -Encoding utf8
    }

    return $script:SessionDir
}

function Write-LoopLog {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateSet("quality-sweep", "cleanup-hygiene", "review-optimize", "prepare", "system")]
        [string]$Loop,

        [string]$Project = "",

        [int]$Phase = 0,

        [Parameter(Mandatory)]
        [string]$Message,

        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    $logFile = Join-Path $script:SessionDir "loop.log"

    # Build context tag
    $context = ""
    if ($Project) {
        $context = " [$Project]"
    }
    if ($Phase -gt 0) {
        $context = " [phase-$Phase]"
    }

    $entry = "[$timestamp] [$Loop]$context $Message"

    # Add level prefix for non-INFO
    if ($Level -ne "INFO") {
        $entry = "[$timestamp] [$Level] [$Loop]$context $Message"
    }

    # Append to log file
    $entry | Out-File -FilePath $logFile -Append -Encoding utf8

    # Also write to console with color
    switch ($Level) {
        "ERROR"   { Write-Host $entry -ForegroundColor Red }
        "WARN"    { Write-Host $entry -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $entry -ForegroundColor Green }
        default   { Write-Host $entry }
    }
}

function Get-LoopState {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateSet("quality-sweep", "cleanup")]
        [string]$Loop
    )

    $stateFile = switch ($Loop) {
        "quality-sweep" { Join-Path $script:SessionDir "quality-sweep-state.json" }
        "cleanup"       { Join-Path $script:SessionDir "cleanup-state.json" }
    }

    if (Test-Path $stateFile) {
        return Get-Content $stateFile -Raw | ConvertFrom-Json
    }

    Write-Warning "State file not found: $stateFile"
    return $null
}

function Set-LoopState {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateSet("quality-sweep", "cleanup")]
        [string]$Loop,

        [Parameter(Mandatory)]
        [PSObject]$State
    )

    $stateFile = switch ($Loop) {
        "quality-sweep" { Join-Path $script:SessionDir "quality-sweep-state.json" }
        "cleanup"       { Join-Path $script:SessionDir "cleanup-state.json" }
    }

    $State | ConvertTo-Json -Depth 5 | Out-File -FilePath $stateFile -Encoding utf8
}

function Get-LoopSummary {
    [CmdletBinding()]
    param()

    $logFile = Join-Path $script:SessionDir "loop.log"

    if (-not (Test-Path $logFile)) {
        Write-Host "No log file found at $logFile"
        return
    }

    $lines = Get-Content $logFile
    $totalEntries = $lines.Count
    $errors = ($lines | Where-Object { $_ -match "\[ERROR\]" }).Count
    $commits = ($lines | Where-Object { $_ -match "COMMIT:|commit: YES" }).Count
    $projects = ($lines | Where-Object { $_ -match "\[quality-sweep\]" } |
        ForEach-Object { if ($_ -match "\[quality-sweep\]\s+\[([^\]]+)\]") { $Matches[1] } } |
        Sort-Object -Unique).Count

    Write-Host ""
    Write-Host "================================================================"
    Write-Host "  LOOP SESSION SUMMARY - $SessionDate"
    Write-Host "================================================================"
    Write-Host ""
    Write-Host "  Log entries:        $totalEntries"
    Write-Host "  Errors:             $errors"
    Write-Host "  Commits made:       $commits"
    Write-Host "  Projects processed: $projects"
    Write-Host ""
    Write-Host "  Log file: $logFile"

    $reviewReport = Join-Path $script:SessionDir "review-report.md"
    if (Test-Path $reviewReport) {
        $reviewedCount = (Get-Content $reviewReport | Where-Object { $_ -match "^## " }).Count
        Write-Host "  Projects reviewed:  $reviewedCount"
        Write-Host "  Review report: $reviewReport"
    }

    Write-Host ""
    Write-Host "================================================================"
    Write-Host ""

    # Show last 10 log entries
    Write-Host "Last 10 log entries:"
    $lines | Select-Object -Last 10 | ForEach-Object { Write-Host "  $_" }
}

# Auto-initialize on dot-source
Initialize-LoopSession -Date $SessionDate | Out-Null
