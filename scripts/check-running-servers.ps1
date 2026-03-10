# Check for running dev servers
# Run this before cleanup to see what needs to be stopped

Write-Host "Checking for running dev servers..." -ForegroundColor Cyan
Write-Host ""

# Check Node processes
$nodeProcesses = Get-Process | Where-Object {$_.Name -like "*node*"}
if ($nodeProcesses) {
    Write-Host "Node.js processes found:" -ForegroundColor Yellow
    $nodeProcesses | Select-Object Id, Name, CPU, StartTime | Format-Table -AutoSize
    Write-Host ""
    Write-Host "To stop all Node processes, run:" -ForegroundColor Yellow
    Write-Host "  Get-Process | Where-Object {`$_.Name -like '*node*'} | Stop-Process -Force" -ForegroundColor Gray
} else {
    Write-Host "✓ No Node.js processes running" -ForegroundColor Green
}

Write-Host ""

# Check for common dev server ports
$portsToCheck = @{
    "5173" = "Vite dev server"
    "3000" = "Backend API"
    "3001" = "OpenRouter proxy"
    "4200" = "Angular dev server"
    "8080" = "Generic dev server"
}

$activePorts = @()
foreach ($port in $portsToCheck.Keys) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $activePorts += "$port ($($portsToCheck[$port]))"
    }
}

if ($activePorts.Count -gt 0) {
    Write-Host "Active dev server ports:" -ForegroundColor Yellow
    foreach ($portInfo in $activePorts) {
        Write-Host "  Port: $portInfo" -ForegroundColor Gray
    }
} else {
    Write-Host "✓ No dev servers detected on common ports" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($nodeProcesses -or $activePorts.Count -gt 0) {
    Write-Host "⚠ Active processes/servers found - stop them before cleanup" -ForegroundColor Yellow
} else {
    Write-Host "✓ All clear - safe to run cleanup" -ForegroundColor Green
}
