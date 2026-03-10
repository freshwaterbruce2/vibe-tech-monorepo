#Requires -RunAsAdministrator
# MSI Center Complete Cleanup Script
# Right-click this file -> "Run with PowerShell" (as Admin)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MSI Center Complete Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Stop and disable MSI services
Write-Host "`n[1/4] Stopping and disabling MSI services..." -ForegroundColor Yellow
$services = @("MSI_Case_Service", "MSI_Center_Service")
foreach ($svc in $services) {
    $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($s) {
        if ($s.Status -eq 'Running') {
            Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
        Set-Service -Name $svc -StartupType Disabled -ErrorAction SilentlyContinue
        sc.exe delete $svc 2>&1 | Out-Null
        Write-Host "  [OK] $svc - stopped, disabled, removed" -ForegroundColor Green
    } else {
        Write-Host "  [OK] $svc - already gone" -ForegroundColor Green
    }
}

# 2. Kill any remaining MSI processes
Write-Host "`n[2/4] Killing MSI processes..." -ForegroundColor Yellow
$killed = 0
Get-Process | Where-Object {
    $_.Path -like '*MSI*Center*' -or
    $_.Name -like '*CC_engine*' -or
    $_.Name -like '*MSI_Central*' -or
    $_.Name -like '*MSI.Central*' -or
    $_.Name -like '*MSI.Toast*' -or
    $_.Name -like '*MSI.Notify*' -or
    $_.Name -like '*MSI.Terminal*'
} | ForEach-Object {
    Write-Host "  Killing: $($_.Name) (PID $($_.Id))" -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    $killed++
}
if ($killed -eq 0) { Write-Host "  [OK] No MSI processes running" -ForegroundColor Green }

Start-Sleep -Seconds 2

# 3. Delete MSI Center folder
Write-Host "`n[3/4] Deleting MSI Center files..." -ForegroundColor Yellow
$msiPath = 'C:\Program Files (x86)\MSI\MSI Center'
if (Test-Path $msiPath) {
    Remove-Item $msiPath -Recurse -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $msiPath)) {
        Write-Host "  [OK] MSI Center folder deleted" -ForegroundColor Green
    } else {
        Write-Host "  [PARTIAL] Some locked files remain - will be gone after reboot" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [OK] Already deleted" -ForegroundColor Green
}

# Clean parent if empty
$parentPath = 'C:\Program Files (x86)\MSI'
if (Test-Path $parentPath) {
    $children = Get-ChildItem $parentPath -ErrorAction SilentlyContinue
    if ($children.Count -eq 0) {
        Remove-Item $parentPath -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Empty MSI parent folder removed" -ForegroundColor Green
    }
}

# 4. Clean scheduled tasks
Write-Host "`n[4/4] Removing MSI scheduled tasks..." -ForegroundColor Yellow
$tasks = Get-ScheduledTask | Where-Object { $_.TaskName -like '*MSI*' -or $_.TaskName -like '*PushCast*' }
if ($tasks) {
    $tasks | ForEach-Object {
        Unregister-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath -Confirm:$false
        Write-Host "  [OK] Removed task: $($_.TaskName)" -ForegroundColor Green
    }
} else {
    Write-Host "  [OK] No MSI tasks found" -ForegroundColor Green
}

# Final verification
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$issues = 0

if (Test-Path 'C:\Program Files (x86)\MSI\MSI Center') {
    Write-Host "  [!] MSI Center folder still exists (reboot will fix)" -ForegroundColor Yellow
    $issues++
} else {
    Write-Host "  [OK] MSI Center folder: GONE" -ForegroundColor Green
}

$svc1 = Get-Service -Name "MSI_Case_Service" -ErrorAction SilentlyContinue
$svc2 = Get-Service -Name "MSI_Center_Service" -ErrorAction SilentlyContinue
if ($svc1) { Write-Host "  [!] MSI_Case_Service still registered (reboot will fix)" -ForegroundColor Yellow; $issues++ }
else { Write-Host "  [OK] MSI_Case_Service: GONE" -ForegroundColor Green }
if ($svc2) { Write-Host "  [!] MSI_Center_Service still registered (reboot will fix)" -ForegroundColor Yellow; $issues++ }
else { Write-Host "  [OK] MSI_Center_Service: GONE" -ForegroundColor Green }

$tasks2 = Get-ScheduledTask | Where-Object { $_.TaskName -like '*MSI*' -or $_.TaskName -like '*PushCast*' }
if ($tasks2) { Write-Host "  [!] MSI tasks still exist" -ForegroundColor Yellow; $issues++ }
else { Write-Host "  [OK] Scheduled tasks: CLEAN" -ForegroundColor Green }

Write-Host "`n========================================" -ForegroundColor Cyan
if ($issues -eq 0) {
    Write-Host "  CLEANUP COMPLETE! All clear." -ForegroundColor Green
} else {
    Write-Host "  CLEANUP MOSTLY DONE. Reboot to finish." -ForegroundColor Yellow
}
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
