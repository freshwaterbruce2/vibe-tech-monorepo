# stop-hook.ps1
# The Finisher Loop Enforcer
#
# This hook prevents Claude Code from stopping until the project reaches
# production-ready status (completion criteria met).

param()

$ErrorActionPreference = "SilentlyContinue"

# Get current working directory (project root)
$projectRoot = Get-Location

# Path to state file
$stateFilePath = Join-Path $projectRoot "FINISHER_STATE.md"

# Function to check if state file exists
function Test-StateFileExists {
    return Test-Path $stateFilePath
}

# Function to read state file and check for completion
function Test-LoopComplete {
    if (-not (Test-StateFileExists)) {
        # No state file = not started yet or first run
        return $false
    }

    try {
        $stateContent = Get-Content $stateFilePath -Raw -ErrorAction Stop

        # Check for completion marker
        if ($stateContent -match '<FINISHER_STATUS>COMPLETE</FINISHER_STATUS>') {
            return $true
        }

        return $false
    }
    catch {
        # If can't read state file, assume not complete
        return $false
    }
}

# Function to get current phase from state file
function Get-CurrentPhase {
    if (-not (Test-StateFileExists)) {
        return "Not Started"
    }

    try {
        $stateContent = Get-Content $stateFilePath -Raw -ErrorAction Stop

        if ($stateContent -match '\*\*Current Phase:\*\*\s+(.+)') {
            return $Matches[1]
        }

        return "Unknown"
    }
    catch {
        return "Unknown"
    }
}

# Function to count remaining blockers
function Get-BlockerCount {
    if (-not (Test-StateFileExists)) {
        return 0
    }

    try {
        $stateContent = Get-Content $stateFilePath -Raw -ErrorAction Stop

        # Count unchecked blockers (lines starting with "- [ ]" in Critical Blockers section)
        $blockerSection = $stateContent -match '(?s)## 2\. Critical Blockers(.+?)##'
        if ($blockerSection) {
            $blockers = ([regex]::Matches($stateContent, '- \[ \]')).Count
            return $blockers
        }

        return 0
    }
    catch {
        return 0
    }
}

# Main logic
$isComplete = Test-LoopComplete

if ($isComplete) {
    # Project is complete - allow session to stop
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Green
    Write-Host "✅ THE FINISHER: PROJECT COMPLETE" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Green
    Write-Host ""
    Write-Host "The project has reached production-ready status." -ForegroundColor White
    Write-Host "All completion criteria have been met." -ForegroundColor White
    Write-Host ""
    Write-Host "Check FINISHER_STATE.md for the final report." -ForegroundColor Gray
    Write-Host ""

    # Exit with code 0 to allow stop
    exit 0
}
else {
    # Project not complete - prevent stop and continue loop
    $currentPhase = Get-CurrentPhase
    $blockerCount = Get-BlockerCount

    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Yellow
    Write-Host "⏳ THE FINISHER: WORK IN PROGRESS" -ForegroundColor Yellow
    Write-Host "=" * 60 -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Current Phase: $currentPhase" -ForegroundColor Cyan
    Write-Host "Critical Blockers: $blockerCount" -ForegroundColor $(if ($blockerCount -gt 0) { "Red" } else { "Green" })
    Write-Host ""
    Write-Host "The project is not yet production-ready." -ForegroundColor White
    Write-Host "The Finisher will continue working..." -ForegroundColor White
    Write-Host ""
    Write-Host "💡 To stop manually, press Ctrl+C" -ForegroundColor Gray
    Write-Host "📄 Progress: Check FINISHER_STATE.md" -ForegroundColor Gray
    Write-Host ""

    # Exit with non-zero code to prevent stop
    # Claude Code will interpret this as "don't stop, continue"
    exit 1
}
