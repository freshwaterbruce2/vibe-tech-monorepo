# Find old Claude Code installations and installers

Write-Host "=== Finding Old Claude Code Files ===" -ForegroundColor Cyan
Write-Host ""

$itemsToRemove = @()

# 1. Check AppData\Local for old installations
Write-Host "Checking AppData\Local..." -ForegroundColor Yellow
$localAppData = "$env:USERPROFILE\AppData\Local"
$claudeFolders = Get-ChildItem -Path $localAppData -Directory -Filter "*claude*" -ErrorAction SilentlyContinue | Where-Object {
    $_.FullName -notlike "*\.local\*"  # Keep the new installation
}

if ($claudeFolders) {
    Write-Host "Found old Claude folders:" -ForegroundColor Red
    foreach ($folder in $claudeFolders) {
        $size = (Get-ChildItem -Path $folder.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "  - $($folder.FullName)" -ForegroundColor White
        Write-Host "    Size: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
        $itemsToRemove += $folder
    }
} else {
    Write-Host "  ✓ No old folders found" -ForegroundColor Green
}
Write-Host ""

# 2. Check AppData\Roaming for config
Write-Host "Checking AppData\Roaming..." -ForegroundColor Yellow
$roamingAppData = "$env:USERPROFILE\AppData\Roaming"
$claudeRoaming = Get-ChildItem -Path $roamingAppData -Directory -Filter "*claude*" -ErrorAction SilentlyContinue

if ($claudeRoaming) {
    Write-Host "Found Claude config folders:" -ForegroundColor Yellow
    foreach ($folder in $claudeRoaming) {
        Write-Host "  - $($folder.FullName)" -ForegroundColor White
        Write-Host "    (May contain settings - review before deleting)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✓ No config folders found" -ForegroundColor Green
}
Write-Host ""

# 3. Check Downloads for installers
Write-Host "Checking Downloads for old installers..." -ForegroundColor Yellow
$downloads = "$env:USERPROFILE\Downloads"
$installers = Get-ChildItem -Path $downloads -Filter "*claude*" -File -ErrorAction SilentlyContinue

if ($installers) {
    Write-Host "Found installer files:" -ForegroundColor Yellow
    foreach ($installer in $installers) {
        Write-Host "  - $($installer.Name) ($([math]::Round($installer.Length / 1MB, 2)) MB)" -ForegroundColor White
        $itemsToRemove += $installer
    }
} else {
    Write-Host "  ✓ No installers found" -ForegroundColor Green
}
Write-Host ""

# 4. Check Program Files
Write-Host "Checking Program Files..." -ForegroundColor Yellow
$programFiles = @("$env:PROGRAMFILES", "${env:ProgramFiles(x86)}")
$foundInPrograms = $false

foreach ($pfPath in $programFiles) {
    if (Test-Path $pfPath) {
        $claudePrograms = Get-ChildItem -Path $pfPath -Directory -Filter "*claude*" -ErrorAction SilentlyContinue
        if ($claudePrograms) {
            $foundInPrograms = $true
            Write-Host "Found in ${pfPath}:" -ForegroundColor Yellow
            foreach ($program in $claudePrograms) {
                Write-Host "  - $($program.FullName)" -ForegroundColor White
                $itemsToRemove += $program
            }
        }
    }
}

if (-not $foundInPrograms) {
    Write-Host "  ✓ No installations found" -ForegroundColor Green
}
Write-Host ""

# 5. Summary
Write-Host "=== Current Installation (Keep) ===" -ForegroundColor Green
Write-Host "  Location: C:\Users\fresh_zxae3v6\.local\bin\claude.exe" -ForegroundColor White
Write-Host "  Version: 2.1.50" -ForegroundColor White
Write-Host ""

if ($itemsToRemove.Count -gt 0) {
    Write-Host "=== Items to Remove ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "Found $($itemsToRemove.Count) items to remove" -ForegroundColor Yellow
    Write-Host ""

    Write-Host "Would you like to remove these items? (Y/N): " -NoNewline -ForegroundColor Yellow
    $response = Read-Host

    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host ""
        foreach ($item in $itemsToRemove) {
            Write-Host "Removing: $($item.FullName)" -ForegroundColor Yellow
            try {
                Remove-Item -Path $item.FullName -Recurse -Force -ErrorAction Stop
                Write-Host "  ✓ Removed" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed: $_" -ForegroundColor Red
            }
        }
        Write-Host ""
        Write-Host "Cleanup complete!" -ForegroundColor Green
    } else {
        Write-Host "Skipping removal" -ForegroundColor Gray
        Write-Host ""
        Write-Host "To remove manually:" -ForegroundColor Yellow
        foreach ($item in $itemsToRemove) {
            Write-Host "  Remove-Item -Recurse -Force '$($item.FullName)'" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "✓ No old installations found - system is clean!" -ForegroundColor Green
}

Write-Host ""
