# DevAutomation PowerShell Module for C:\dev Monorepo
# Based on 2025 Solo Developer Best Practices

# Module variables
$script:MonorepoRoot = "C:\dev"
$script:DataRoot = "D:\"
$script:LogPath = "D:\logs\dev-automation"

# Ensure log directory exists
if (-not (Test-Path $script:LogPath)) {
    New-Item -ItemType Directory -Path $script:LogPath -Force | Out-Null
}

function Start-DevEnvironment {
    <#
    .SYNOPSIS
    Starts the development environment with monitoring
    #>
    param(
        [ValidateSet("web", "crypto", "mobile", "all")]
        [string]$Project = "all"
    )

    Write-Host "🚀 Starting development environment..." -ForegroundColor Cyan

    # Check prerequisites
    Test-DevPrerequisites

    # Start Docker if needed
    if (Get-Service "com.docker.service" -ErrorAction SilentlyContinue | Where-Object {$_.Status -ne "Running"}) {
        Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
        Start-Service "com.docker.service" -ErrorAction SilentlyContinue
    }

    # Navigate to monorepo
    Set-Location $script:MonorepoRoot

    # Start appropriate projects
    switch ($Project) {
        "web" {
            Write-Host "Starting web projects..." -ForegroundColor Green
            Start-Process "pnpm" -ArgumentList "nx dev digital-content-builder" -NoNewWindow
        }
        "crypto" {
            Write-Host "Starting crypto trading system..." -ForegroundColor Green
            Set-Location "$script:MonorepoRoot\apps\crypto-enhanced"
            Start-Process "docker-compose" -ArgumentList "up -d" -NoNewWindow
        }
        "mobile" {
            Write-Host "Starting mobile app..." -ForegroundColor Green
            Start-Process "pnpm" -ArgumentList "nx dev vibe-tutor" -NoNewWindow
        }
        "all" {
            Write-Host "Starting all projects..." -ForegroundColor Green
            Start-Process "pnpm" -ArgumentList "nx run-many -t dev" -NoNewWindow
        }
    }
}

function Test-DevPrerequisites {
    <#
    .SYNOPSIS
    Checks if all required tools are installed
    #>
    $missing = @()

    # Check Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $missing += "Node.js"
    }

    # Check pnpm
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        $missing += "pnpm"
    }

    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        $missing += "Docker"
    }

    if ($missing.Count -gt 0) {
        Write-Warning "Missing prerequisites: $($missing -join ', ')"
        return $false
    }

    Write-Host "✅ All prerequisites installed" -ForegroundColor Green
    return $true
}

function Test-CodeCompliance {
    <#
    .SYNOPSIS
    Checks code compliance with best practices
    #>
    param(
        [string]$Path = $script:MonorepoRoot
    )

    Write-Host "🔍 Checking code compliance..." -ForegroundColor Cyan

    # Check file sizes
    $largeFiles = Get-ChildItem -Path $Path -Recurse -Include "*.ts","*.tsx","*.js","*.jsx","*.py" |
        Where-Object {
            $_.FullName -notmatch "node_modules|\.git|dist|build" -and
            (Get-Content $_.FullName | Measure-Object -Line).Lines -gt 360
        }

    if ($largeFiles) {
        Write-Warning "Files exceeding 360 lines:"
        $largeFiles | ForEach-Object {
            $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
            Write-Host "  - $($_.FullName.Replace($script:MonorepoRoot, '.')): $lines lines" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ All files within 360-line limit" -ForegroundColor Green
    }

    # Check for D:\ storage compliance
    $wrongStorage = Get-ChildItem -Path $Path -Recurse -Include "*.db","*.log","*.sqlite" |
        Where-Object { $_.FullName -notmatch "node_modules|\.git" }

    if ($wrongStorage) {
        Write-Warning "Data files in code directory (should be on D:\):"
        $wrongStorage | ForEach-Object {
            Write-Host "  - $($_.FullName.Replace($script:MonorepoRoot, '.'))" -ForegroundColor Yellow
        }
    }
}

function Get-DevMetrics {
    <#
    .SYNOPSIS
    Shows development metrics and statistics
    #>

    Write-Host "`n📊 Development Metrics" -ForegroundColor Cyan
    Write-Host ("=" * 50)

    # Quick project count
    Write-Host "`nProjects in monorepo:"
    $projectDirs = @("apps", "packages", "backend", "tools")
    $totalProjects = 0

    foreach ($dir in $projectDirs) {
        $path = Join-Path $script:MonorepoRoot $dir
        if (Test-Path $path) {
            $count = (Get-ChildItem -Path $path -Directory -ErrorAction SilentlyContinue).Count
            if ($count -gt 0) {
                Write-Host "  $dir/: $count projects" -ForegroundColor Cyan
                $totalProjects += $count
            }
        }
    }
    Write-Host "  Total: $totalProjects projects"

    # Quick file stats (limited to apps folder for speed)
    Write-Host "`nFile counts (apps folder only):"
    $appsPath = Join-Path $script:MonorepoRoot "apps"

    if (Test-Path $appsPath) {
        # Use simpler counting method that won't timeout
        $tsCount = @(Get-ChildItem -Path $appsPath -Include "*.ts","*.tsx" -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch "node_modules" }).Count
        $jsCount = @(Get-ChildItem -Path $appsPath -Include "*.js","*.jsx" -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch "node_modules" }).Count

        Write-Host "  TypeScript: $tsCount files" -ForegroundColor Cyan
        Write-Host "  JavaScript: $jsCount files" -ForegroundColor Cyan
    }

    # Check disk usage
    Write-Host "`nDisk Usage:"
    $cDrive = Get-PSDrive C
    $dDrive = Get-PSDrive D -ErrorAction SilentlyContinue

    $cPercent = [math]::Round($cDrive.Used / ($cDrive.Used + $cDrive.Free) * 100, 1)
    $cColor = if ($cPercent -gt 90) { "Red" } elseif ($cPercent -gt 75) { "Yellow" } else { "Green" }
    Write-Host "  C:\ $([math]::Round($cDrive.Used/1GB, 2))GB / $([math]::Round(($cDrive.Used + $cDrive.Free)/1GB, 2))GB ($cPercent%)" -ForegroundColor $cColor

    if ($dDrive) {
        $dPercent = [math]::Round($dDrive.Used / ($dDrive.Used + $dDrive.Free) * 100, 1)
        $dColor = if ($dPercent -gt 90) { "Red" } elseif ($dPercent -gt 75) { "Yellow" } else { "Green" }
        Write-Host "  D:\ $([math]::Round($dDrive.Used/1GB, 2))GB / $([math]::Round(($dDrive.Used + $dDrive.Free)/1GB, 2))GB ($dPercent%)" -ForegroundColor $dColor
    }

    Write-Host ""
}

function Start-MonitoringDashboard {
    <#
    .SYNOPSIS
    Starts a simple monitoring dashboard in a new window
    #>

    $scriptBlock = {
        while ($true) {
            Clear-Host
            Write-Host "🎯 Dev Environment Monitor" -ForegroundColor Magenta
            Write-Host "=" * 50
            Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

            # Check running processes
            $node = Get-Process node -ErrorAction SilentlyContinue
            $docker = Get-Service "com.docker.service" -ErrorAction SilentlyContinue

            Write-Host "`nServices:"
            if ($node) {
                Write-Host "  ✅ Node.js: $($node.Count) processes running" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Node.js: Not running" -ForegroundColor Red
            }

            if ($docker -and $docker.Status -eq 'Running') {
                Write-Host "  ✅ Docker: Running" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Docker: Not running" -ForegroundColor Red
            }

            # Memory usage
            $mem = Get-CimInstance Win32_OperatingSystem
            $usedMem = [math]::Round(($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / 1MB, 2)
            $totalMem = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 2)
            Write-Host "`nMemory: ${usedMem}GB / ${totalMem}GB used"

            # CPU usage
            $cpu = (Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1).CounterSamples.CookedValue
            Write-Host "CPU: $([math]::Round($cpu, 1))% usage"

            Start-Sleep -Seconds 5
        }
    }

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $scriptBlock
    Write-Host "✅ Monitoring dashboard started in new window" -ForegroundColor Green
}

function New-SymbolicLink {
    <#
    .SYNOPSIS
    Creates symbolic links between C:\dev and D:\ for large files
    #>
    param(
        [Parameter(Mandatory)]
        [string]$LinkPath,

        [Parameter(Mandatory)]
        [string]$TargetPath
    )

    # Ensure target exists on D:\
    if (-not (Test-Path $TargetPath)) {
        New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null
    }

    # Create symbolic link
    New-Item -ItemType SymbolicLink -Path $LinkPath -Target $TargetPath -Force
    Write-Host "✅ Created symlink: $LinkPath -> $TargetPath" -ForegroundColor Green
}

# Export functions
Export-ModuleMember -Function @(
    'Start-DevEnvironment',
    'Test-DevPrerequisites',
    'Test-CodeCompliance',
    'Get-DevMetrics',
    'Start-MonitoringDashboard',
    'New-SymbolicLink'
)

Write-Host "DevAutomation module loaded. Available commands:" -ForegroundColor Cyan
Write-Host "  Start-DevEnvironment  - Start dev servers"
Write-Host "  Test-CodeCompliance   - Check code standards"
Write-Host "  Get-DevMetrics       - Show project statistics"
Write-Host "  Start-MonitoringDashboard - Live monitoring"
Write-Host "  New-SymbolicLink     - Create C: to D: links"