# Self-Healing 4 AM Maintenance Script
# Runs the orchestrator in live mode, logs output, sends Telegram report.
# Registered as Windows Scheduled Task: VibeOps-SelfHealing-4AM

param(
    [switch]$DryRun,            # Override: force dry-run even if config says live
    [string]$Loop,              # Optional: run specific loop only (lint, typecheck, etc.)
    [switch]$SkipNotify         # Skip Telegram notification
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logDir = "D:\logs\self-healing"
$logFile = Join-Path $logDir "run_$timestamp.log"
$reportFile = Join-Path $logDir "report_$timestamp.json"

# Ensure log directory exists
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Log header
"===== SELF-HEALING RUN: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') =====" | Out-File $logFile

# Build command arguments
$pythonArgs = @("-m", "tools.self-healing.orchestrator", "--json")

if (-not $DryRun) {
    $pythonArgs += "--auto-apply"
}
if ($Loop) {
    $pythonArgs += "--loop"
    $pythonArgs += $Loop
}

# Execute orchestrator
try {
    "Command: python $($pythonArgs -join ' ')" | Out-File $logFile -Append
    $output = & python @pythonArgs 2>&1
    $exitCode = $LASTEXITCODE
    $output | Out-File $logFile -Append

    # The orchestrator outputs the report path in --json mode
    $reportPath = ($output | Select-Object -Last 1).Trim()
    if (Test-Path $reportPath) {
        Copy-Item $reportPath $reportFile -Force
        "Report saved: $reportFile" | Out-File $logFile -Append
    }

    "Exit code: $exitCode" | Out-File $logFile -Append
} catch {
    "ERROR: $_" | Out-File $logFile -Append
    $exitCode = 1
}

# Send Telegram notification (via Gravity Claw bot)
if (-not $SkipNotify -and (Test-Path $reportFile)) {
    try {
        & "$PSScriptRoot\notify-healing-report.ps1" -ReportPath $reportFile -LogPath $logFile
        "Notification sent." | Out-File $logFile -Append
    } catch {
        "Notification failed: $_" | Out-File $logFile -Append
    }
}

"===== RUN COMPLETE: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') =====" | Out-File $logFile -Append

exit $exitCode
