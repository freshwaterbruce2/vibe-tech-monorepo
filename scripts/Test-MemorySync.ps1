# Test-MemorySync.ps1
# Quick test script to verify memory sync configuration

Write-Host "`n[TEST] Memory Sync Configuration Test" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check configuration file
$configFile = "C:\dev\memory_sync.yaml"
if (Test-Path $configFile) {
    Write-Host "[OK] Configuration file exists: $configFile" -ForegroundColor Green
    $fileSize = (Get-Item $configFile).Length
    Write-Host "   Size: $($fileSize) bytes" -ForegroundColor Gray
} else {
    Write-Host "[ERROR] Configuration file not found: $configFile" -ForegroundColor Red
    exit 1
}

# Check Python
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Python installed: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Python not found" -ForegroundColor Red
    exit 1
}

# Check required Python packages
Write-Host "`nPython Packages:" -ForegroundColor Yellow
$packages = @("watchdog", "pyyaml", "gitpython")
foreach ($package in $packages) {
    $result = python -m pip show $package 2>&1 | Select-String "Version:"
    if ($result) {
        Write-Host "  [OK] $package : $($result -replace 'Version: ', '')" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $package : Not installed" -ForegroundColor Red
    }
}

# Check memory bank directory
$memoryBank = "D:\memory_bank"
Write-Host "`nMemory Bank Setup:" -ForegroundColor Yellow
if (Test-Path $memoryBank) {
    Write-Host "[OK] Memory bank exists: $memoryBank" -ForegroundColor Green

    # Check subdirectories
    @("projects", "prompts", "prompts\commands", "prompts\agents") | ForEach-Object {
        $path = Join-Path $memoryBank $_
        if (Test-Path $path) {
            Write-Host "  [OK] $_ directory exists" -ForegroundColor Green
        } else {
            Write-Host "  [INFO] $_ directory missing - will be created on first run" -ForegroundColor Yellow
        }
    }

    # Check git
    if (Test-Path "$memoryBank\.git") {
        Write-Host "  [OK] Git repository initialized" -ForegroundColor Green
    } else {
        Write-Host "  [INFO] Git not initialized - will be created on first run" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] Memory bank not found: $memoryBank - will be created on first run" -ForegroundColor Yellow
}

# Check project paths
Write-Host "`nProject Paths:" -ForegroundColor Yellow
$projects = @(
    @{Name="crypto-enhanced"; Path="C:\dev\apps\crypto-enhanced"},
    @{Name="vibe-tech-lovable"; Path="C:\dev\apps\vibe-tech-lovable"},
    @{Name="digital-content-builder"; Path="C:\dev\apps\digital-content-builder"},
    @{Name="business-booking-platform"; Path="C:\dev\apps\business-booking-platform"},
    @{Name="vibe-tutor"; Path="C:\dev\Vibe-Tutor"},
    @{Name="memory-bank"; Path="C:\dev\apps\memory-bank"}
)

$validProjects = 0
foreach ($project in $projects) {
    if (Test-Path $project.Path) {
        Write-Host "  [OK] $($project.Name): Found" -ForegroundColor Green
        $validProjects++
    } else {
        Write-Host "  [MISSING] $($project.Name): Not found at $($project.Path)" -ForegroundColor Red
    }
}

# Check prompt sources
Write-Host "`nPrompt Sources:" -ForegroundColor Yellow
$promptSources = @(
    @{Name="Commands"; Path="C:\dev\.claude\commands"},
    @{Name="Agents"; Path="C:\dev\.claude\agents"},
    @{Name="CLAUDE.md"; Path="C:\dev\CLAUDE.md"}
)

foreach ($prompt in $promptSources) {
    if (Test-Path $prompt.Path) {
        if ((Get-Item $prompt.Path).PSIsContainer) {
            $count = (Get-ChildItem $prompt.Path -Recurse -File).Count
            Write-Host "  [OK] $($prompt.Name): $count files" -ForegroundColor Green
        } else {
            Write-Host "  [OK] $($prompt.Name): Found" -ForegroundColor Green
        }
    } else {
        Write-Host "  [INFO] $($prompt.Name): Not found" -ForegroundColor Yellow
    }
}

# Summary
$memoryBankStatus = if (Test-Path "D:\memory_bank") {"Ready"} else {"Will be created"}
Write-Host "`n[SUMMARY]" -ForegroundColor Cyan
Write-Host "  Projects found: $validProjects / $($projects.Count)" -ForegroundColor White
Write-Host "  Memory bank: $memoryBankStatus" -ForegroundColor White
Write-Host "  Python: Ready" -ForegroundColor White

if ($validProjects -gt 0) {
    Write-Host "`n[OK] System ready for memory sync!" -ForegroundColor Green
    Write-Host "   Run: .\Start-MemorySync.ps1" -ForegroundColor Gray
    Write-Host "   Or : .\Start-MemorySync.ps1 -Silent (background mode)" -ForegroundColor Gray
} else {
    Write-Host "`n[WARNING] No valid projects found. Check paths in memory_sync.yaml" -ForegroundColor Yellow
}