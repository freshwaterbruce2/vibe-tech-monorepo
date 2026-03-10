# Cleanup and Build Script for Vibe Code Studio
# Forcefully kills all processes and cleans up file locks before building

Write-Host "=== Vibe Code Studio Cleanup & Build ===" -ForegroundColor Cyan

# Step 1: Kill all electron processes
Write-Host "`n[1/6] Stopping Electron processes..." -ForegroundColor Yellow
Get-Process | Where-Object {
    $_.Name -like "*electron*" -or
    $_.Path -like "*vibe-code-studio*"
} | ForEach-Object {
    Write-Host "  Killing process: $($_.Name) (PID: $($_.Id))" -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Step 2: Kill OpenRouter proxy (port 3001)
Write-Host "`n[2/6] Stopping OpenRouter proxy on port 3001..." -ForegroundColor Yellow
$connections = netstat -ano | Select-String ":3001"
if ($connections) {
    $connections | ForEach-Object {
        if ($_ -match '\s+(\d+)$') {
            $pid = $matches[1]
            try {
                $process = Get-Process -Id $pid -ErrorAction Stop
                Write-Host "  Killing process: $($process.Name) (PID: $pid)" -ForegroundColor Gray
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            } catch {
                # Process already dead
            }
        }
    }
}

# Step 3: Kill any pnpm dev servers
Write-Host "`n[3/6] Stopping pnpm dev servers..." -ForegroundColor Yellow
Get-Process | Where-Object {
    $_.Name -eq "node" -and
    $_.CommandLine -like "*pnpm*dev*"
} | ForEach-Object {
    Write-Host "  Killing process: pnpm dev (PID: $($_.Id))" -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Step 4: Wait for file handles to release
Write-Host "`n[4/6] Waiting for file handles to release..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Step 5: Force remove dist-electron
Write-Host "`n[5/6] Removing dist-electron directory..." -ForegroundColor Yellow
if (Test-Path "dist-electron") {
    Remove-Item -Recurse -Force "dist-electron" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1

    # Retry if first attempt failed
    if (Test-Path "dist-electron") {
        Write-Host "  First cleanup failed, retrying with delay..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        Remove-Item -Recurse -Force "dist-electron" -ErrorAction SilentlyContinue
    }

    if (Test-Path "dist-electron") {
        Write-Host "  WARNING: Could not remove dist-electron. Manual cleanup required." -ForegroundColor Red
        Write-Host "  Run: taskkill /F /IM electron.exe /T && Remove-Item -Recurse -Force dist-electron" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "  Successfully removed dist-electron" -ForegroundColor Green
    }
} else {
    Write-Host "  dist-electron does not exist (clean state)" -ForegroundColor Green
}

# Step 6: Run the build
Write-Host "`n[6/6] Starting electron-builder..." -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
npx electron-builder --win

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== Build Successful ===" -ForegroundColor Green
} else {
    Write-Host "`n=== Build Failed ===" -ForegroundColor Red
    exit $LASTEXITCODE
}