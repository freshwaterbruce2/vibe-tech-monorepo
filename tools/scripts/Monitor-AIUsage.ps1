# AI Usage Monitoring Script
# Based on 2025 Solo Developer Best Practices

param(
    [switch]$Continuous = $false,
    [int]$IntervalSeconds = 60
)

$script:LogPath = "D:\logs\ai-usage"
$script:StatsFile = "$script:LogPath\ai-usage-stats.json"

# Ensure log directory exists
if (-not (Test-Path $script:LogPath)) {
    New-Item -ItemType Directory -Path $script:LogPath -Force | Out-Null
}

function Get-AIProcesses {
    $aiProcesses = @{
        "Copilot" = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
            $_.MainWindowTitle -match "copilot" -or
            $_.CommandLine -match "copilot"
        }
        "Claude" = Get-Process -Name "claude*" -ErrorAction SilentlyContinue
        "Cursor" = Get-Process -Name "cursor*" -ErrorAction SilentlyContinue
        "VSCode" = Get-Process -Name "Code" -ErrorAction SilentlyContinue
    }

    return $aiProcesses
}

function Get-CodeStats {
    $stats = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        FileCounts = @{}
        LargeFiles = @()
        RecentChanges = @()
    }

    # Count files by extension
    $extensions = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.py", "*.cs", "*.ps1")
    foreach ($ext in $extensions) {
        $count = (Get-ChildItem -Path "C:\dev" -Recurse -Include $ext -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build" }).Count
        $stats.FileCounts[$ext.Replace("*.", "")] = $count
    }

    # Find files over 360 lines
    $largeFiles = Get-ChildItem -Path "C:\dev" -Recurse -Include "*.ts","*.tsx","*.js","*.jsx","*.py" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.FullName -notmatch "node_modules|\.git|dist|build" -and
            $_.Length -gt 0
        } | ForEach-Object {
            $lines = (Get-Content $_.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
            if ($lines -gt 360) {
                @{
                    Path = $_.FullName.Replace("C:\dev\", "")
                    Lines = $lines
                }
            }
        }
    $stats.LargeFiles = $largeFiles

    # Get recently modified files (last hour)
    $recentFiles = Get-ChildItem -Path "C:\dev" -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $_.LastWriteTime -gt (Get-Date).AddHours(-1) -and
            $_.FullName -notmatch "node_modules|\.git|dist|build|logs"
        } | Select-Object @{Name="Path";Expression={$_.FullName.Replace("C:\dev\", "")}}, LastWriteTime

    $stats.RecentChanges = $recentFiles

    return $stats
}

function Show-Dashboard {
    Clear-Host

    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║          🤖 AI-Assisted Development Monitor              ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""

    # AI Process Status
    Write-Host "AI TOOLS STATUS" -ForegroundColor Yellow
    Write-Host "─" * 40
    $aiProcs = Get-AIProcesses
    foreach ($tool in $aiProcs.Keys) {
        $procs = $aiProcs[$tool]
        if ($procs) {
            $memoryMB = [math]::Round(($procs | Measure-Object WorkingSet -Sum).Sum / 1MB, 2)
            Write-Host "  ✅ $tool`: Running ($($procs.Count) process$(if($procs.Count -gt 1){'es'}), $memoryMB MB)" -ForegroundColor Green
        } else {
            Write-Host "  ⚫ $tool`: Not running" -ForegroundColor DarkGray
        }
    }

    # Code Statistics
    $stats = Get-CodeStats
    Write-Host ""
    Write-Host "CODE METRICS" -ForegroundColor Yellow
    Write-Host "─" * 40

    Write-Host "  File Counts:"
    foreach ($ext in $stats.FileCounts.Keys | Sort-Object) {
        $count = $stats.FileCounts[$ext]
        if ($count -gt 0) {
            Write-Host "    .$ext`: $count files" -ForegroundColor Cyan
        }
    }

    # Compliance Issues
    Write-Host ""
    Write-Host "COMPLIANCE" -ForegroundColor Yellow
    Write-Host "─" * 40

    if ($stats.LargeFiles.Count -eq 0) {
        Write-Host "  ✅ All files within 360-line limit" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Files exceeding 360 lines:" -ForegroundColor Yellow
        $stats.LargeFiles | Select-Object -First 5 | ForEach-Object {
            Write-Host "     - $($_.Path) ($($_.Lines) lines)" -ForegroundColor Yellow
        }
        if ($stats.LargeFiles.Count -gt 5) {
            Write-Host "     ... and $($stats.LargeFiles.Count - 5) more" -ForegroundColor DarkGray
        }
    }

    # Recent Activity
    Write-Host ""
    Write-Host "RECENT ACTIVITY (Last Hour)" -ForegroundColor Yellow
    Write-Host "─" * 40

    if ($stats.RecentChanges.Count -eq 0) {
        Write-Host "  No recent file changes" -ForegroundColor DarkGray
    } else {
        Write-Host "  Modified files: $($stats.RecentChanges.Count)" -ForegroundColor Cyan
        $stats.RecentChanges | Select-Object -First 5 | ForEach-Object {
            Write-Host "    - $($_.Path)" -ForegroundColor Gray
        }
    }

    # System Resources
    Write-Host ""
    Write-Host "SYSTEM RESOURCES" -ForegroundColor Yellow
    Write-Host "─" * 40

    $mem = Get-CimInstance Win32_OperatingSystem
    $usedMem = [math]::Round(($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / 1MB, 2)
    $totalMem = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 2)
    $memPercent = [math]::Round($usedMem / $totalMem * 100, 1)

    $cpu = (Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1).CounterSamples.CookedValue

    Write-Host "  CPU Usage: $([math]::Round($cpu, 1))%" -ForegroundColor $(if($cpu -gt 80){"Red"}elseif($cpu -gt 50){"Yellow"}else{"Green"})
    Write-Host "  Memory: ${usedMem}GB / ${totalMem}GB ($memPercent%)" -ForegroundColor $(if($memPercent -gt 80){"Red"}elseif($memPercent -gt 60){"Yellow"}else{"Green"})

    # Disk Usage
    $cDrive = Get-PSDrive C
    $dDrive = Get-PSDrive D -ErrorAction SilentlyContinue

    $cPercent = [math]::Round($cDrive.Used / ($cDrive.Used + $cDrive.Free) * 100, 1)
    Write-Host "  C:\ Drive: $([math]::Round($cDrive.Used/1GB, 2))GB / $([math]::Round(($cDrive.Used + $cDrive.Free)/1GB, 2))GB ($cPercent%)" -ForegroundColor $(if($cPercent -gt 80){"Red"}elseif($cPercent -gt 60){"Yellow"}else{"Green"})

    if ($dDrive) {
        $dPercent = [math]::Round($dDrive.Used / ($dDrive.Used + $dDrive.Free) * 100, 1)
        Write-Host "  D:\ Drive: $([math]::Round($dDrive.Used/1GB, 2))GB / $([math]::Round(($dDrive.Used + $dDrive.Free)/1GB, 2))GB ($dPercent%)" -ForegroundColor $(if($dPercent -gt 80){"Red"}elseif($dPercent -gt 60){"Yellow"}else{"Green"})
    }

    # Save stats to file
    $stats | ConvertTo-Json -Depth 3 | Out-File $script:StatsFile -Force
}

# Main loop
if ($Continuous) {
    Write-Host "Starting continuous monitoring (Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host "Refresh interval: $IntervalSeconds seconds" -ForegroundColor Gray
    Start-Sleep -Seconds 2

    while ($true) {
        Show-Dashboard
        Start-Sleep -Seconds $IntervalSeconds
    }
} else {
    Show-Dashboard
    Write-Host ""
    Write-Host "Run with -Continuous flag for live monitoring" -ForegroundColor DarkGray
}