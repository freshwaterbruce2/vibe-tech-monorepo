# Test Dashboard API Endpoints

Write-Host "`n=== Testing Dashboard API Endpoints ===" -ForegroundColor Cyan

# Test health
Write-Host "`n1. Health Check:" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri 'http://localhost:5177/api/health' -Method Get
    Write-Host "   Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Services: $($health.services | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

# Test workspace
Write-Host "`n2. Workspace (with nxJson field):" -ForegroundColor Yellow
try {
    $workspace = Invoke-RestMethod -Uri 'http://localhost:5177/api/workspace?filter=' -Method Get
    $projectCount = ($workspace.projects | Get-Member -MemberType NoteProperty).Count
    $hasNxJson = $null -ne $workspace.nxJson
    Write-Host "   Projects: $projectCount" -ForegroundColor Green
    Write-Host "   Has nxJson: $hasNxJson" -ForegroundColor Green
    Write-Host "   Version: $($workspace.version)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

# Test services
Write-Host "`n3. Services:" -ForegroundColor Yellow
try {
    $services = Invoke-RestMethod -Uri 'http://localhost:5177/api/services' -Method Get
    $running = ($services | Where-Object { $_.status -eq 'running' }).Count
    Write-Host "   Total: $($services.Count)" -ForegroundColor Green
    Write-Host "   Running: $running" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

# Test databases
Write-Host "`n4. Databases:" -ForegroundColor Yellow
try {
    $databases = Invoke-RestMethod -Uri 'http://localhost:5177/api/databases' -Method Get
    Write-Host "   Total: $($databases.Count)" -ForegroundColor Green
    if ($databases.Count -gt 0) {
        Write-Host "   First 3:" -ForegroundColor Green
        $databases | Select-Object -First 3 | ForEach-Object {
            $sizeMB = [math]::Round($_.size / 1MB, 2)
            Write-Host "     - $($_.name): ${sizeMB} MB" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

# Test trading
Write-Host "`n5. Trading Balance:" -ForegroundColor Yellow
try {
    $balance = Invoke-RestMethod -Uri 'http://localhost:5177/api/trading/balance' -Method Get
    if ($balance) {
        Write-Host "   Balance: $($balance.balance)" -ForegroundColor Green
    } else {
        Write-Host "   No balance data" -ForegroundColor Gray
    }
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
