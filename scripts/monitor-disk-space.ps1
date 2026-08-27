# Requires -Version 7.0
# ==============================================================================
# VibeTech Workspace - D:\ Drive Real-Time Disk Space Monitor
# Audits physical free space on the stateful D:\ drive, evaluates available
# capacity against safe thresholds, and registers logs to agent_learning.db.
# ==============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$targetDrive = "D"
$learningDbPath = "D:\databases\agent_learning.db"
$minFreeSpaceGB = 15.0       # Trigger warning if free space is below 15GB
$minFreePercent = 10.0       # Trigger warning if free space is below 10% of total drive size

# Helper function for trailing padding (must be defined before use)
function PSPad($text, $length) {
    $str = [string]$text
    if ($str.Length -ge $length) {
        return $str.Substring(0, $length)
    }
    return $str + (" " * ($length - $str.Length))
}

$logTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "[$logTime] Initializing D:\ Drive storage capacity audit..." -ForegroundColor Cyan

# 1. Retrieve Drive Information
$totalSize = $null
$freeSpace = $null

try {
    # Method A: Get-Volume (Modern Windows PowerShell / Core utility)
    $volume = Get-Volume -DriveLetter $targetDrive -ErrorAction SilentlyContinue
    if ($volume) {
        $totalSize = $volume.Size
        $freeSpace = $volume.SizeRemaining
    } else {
        # Method B: Get-CimInstance fallback
        $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$($targetDrive):'" -ErrorAction SilentlyContinue
        if ($disk) {
            $totalSize = $disk.Size
            $freeSpace = $disk.FreeSpace
        }
    }
} catch {
    Write-Host "⚠️ Failed to query drive info natively. Attempting .NET fallback..." -ForegroundColor Yellow
    # Method C: .NET System.IO.DriveInfo fallback
    try {
        $drive = New-Object System.IO.DriveInfo("$targetDrive")
        if ($drive.IsReady) {
            $totalSize = $drive.TotalSize
            $freeSpace = $drive.TotalFreeSpace
        }
    } catch {
        Write-Host "❌ FATAL: Unable to resolve disk drive metrics." -ForegroundColor Red
        exit 1
    }
}

if (-not $totalSize -or -not $freeSpace) {
    Write-Host "❌ FATAL: Drive '$targetDrive': is not ready or could not be mapped." -ForegroundColor Red
    exit 1
}

# 2. Compute Capacity Metrics
$totalGB = [Math]::Round(($totalSize / 1GB), 2)
$freeGB = [Math]::Round(($freeSpace / 1GB), 2)
$usedGB = [Math]::Round(($totalGB - $freeGB), 2)
$freePercent = [Math]::Round((($freeSpace / $totalSize) * 100), 2)
$usedPercent = [Math]::Round((100 - $freePercent), 2)

# 3. Determine Capacity Status
$status = "HEALTHY"
$statusColor = "Green"
$alerts = @()

if ($freeGB -lt $minFreeSpaceGB) {
    $status = "WARN_SPACE"
    $statusColor = "Yellow"
    $alerts += "Available storage capacity ($freeGB GB) has fallen below the safety limit of $minFreeSpaceGB GB."
}

if ($freePercent -lt $minFreePercent) {
    $status = "CRITICAL_PCT"
    $statusColor = "Red"
    $alerts += "Free storage ratio ($freePercent%) has fallen below the safety limit of $minFreePercent%."
}

# 4. Print ASCII Console Dashboard
$dashLine = "+" + ("-" * 50) + "+"
$statusText = "D:\ DRIVE CAPACITY MONITOR STATUS: $status"
$paddedStatus = PSPad $statusText 48

Write-Host "`n$dashLine" -ForegroundColor Gray
Write-Host "| $paddedStatus |" -ForegroundColor $statusColor
Write-Host $dashLine -ForegroundColor Gray
Write-Host "| Total Volume Capacity : $(PSPad "$totalGB GB" 25) |" -ForegroundColor White
Write-Host "| Managed Free Storage   : $(PSPad "$freeGB GB" 25) |" -ForegroundColor Green
Write-Host "| Actively Used Space    : $(PSPad "$usedGB GB" 25) |" -ForegroundColor Gray
Write-Host "| Percentage Free Ratio  : $(PSPad "$freePercent %" 25) |" -ForegroundColor White
Write-Host "| Percentage Used Ratio  : $(PSPad "$usedPercent %" 25) |" -ForegroundColor Gray
Write-Host "$dashLine`n" -ForegroundColor Gray

if ($alerts.Count -gt 0) {
    Write-Host "🚨 CAPACITANCE ALERTS TRIGGERED:" -ForegroundColor Red
    foreach ($alert in $alerts) {
        Write-Host " - $alert" -ForegroundColor Red
    }
} else {
    Write-Host "✅ D:\ Drive storage layers are fully operational and within healthy boundaries." -ForegroundColor Green
}

# 5. Log Execution Telemetry to Learning Database
if (Test-Path $learningDbPath) {
    try {
        $sqliteCheck = Get-Command sqlite3 -ErrorAction SilentlyContinue
        if ($sqliteCheck) {
            $guid = ([guid]::NewGuid()).ToString()
            $nowStr = Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"
            $epoch = [DateTimeOffset]::Now.ToUnixTimeSeconds()
            
            $isSuccess = 1
            $errorMsg = "NULL"
            if ($status -eq "CRITICAL_PCT") {
                $isSuccess = 0
                $errorMsg = "'Critical storage shortage: free space ratio ($freePercent%) is below safety threshold.'"
            } elseif ($status -eq "WARN_SPACE") {
                $isSuccess = 1
                $errorMsg = "'Warning: free storage space ($freeGB GB) is below safety threshold.'"
            }
            
            $metadataJson = '{"totalGB":' + $totalGB + ',"freeGB":' + $freeGB + ',"usedGB":' + $usedGB + ',"freePercent":' + $freePercent + ',"usedPercent":' + $usedPercent + ',"status":"' + $status + '"}'
            
            $sqliteQuery = "INSERT INTO agent_executions (execution_id, agent_id, task_type, started_at, completed_at, success, execution_time_ms, error_message, metadata, project_name, agent_name, created_at) VALUES ('$guid', 'storage-learning-expert', 'disk-capacity-monitor', '$nowStr', '$nowStr', $isSuccess, 0, $errorMsg, '$metadataJson', 'vibetech-monorepo', 'storage-learning-expert', $epoch);"
            
            sqlite3 $learningDbPath "$sqliteQuery"
            Write-Host "`nTelemetry metrics successfully synchronized with agent_learning.db." -ForegroundColor DarkGray
        }
    } catch {
        # Fail silently if database locks prevent logging to preserve pipeline continuity
    }
}
Write-Host ""
