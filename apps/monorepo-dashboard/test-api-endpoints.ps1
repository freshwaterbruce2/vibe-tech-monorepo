# API Endpoint Testing for monorepo-dashboard backend
# Week 3 - Complete endpoint validation

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API Endpoint Testing - monorepo-dashboard" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5177" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5177"
$results = @()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Helper function to test endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Uri,
        [hashtable]$Headers = @{},
        [ValidateSet("json", "object", "array")]
        [string]$ExpectedType = "object"
    )

    Write-Host "Test: $Name" -ForegroundColor Yellow
    Write-Host "  URI: $Uri" -ForegroundColor Gray

    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $Uri -Method $Method -ErrorAction Stop -Headers $Headers
        $sw.Stop()

        $statusCode = $response.StatusCode
        $content = $response.Content
        $data = $content | ConvertFrom-Json
        $responseTime = $sw.ElapsedMilliseconds

        # Check CORS headers
        $corsOrigin = $response.Headers["Access-Control-Allow-Origin"]
        $corsHeaders = $response.Headers["Access-Control-Allow-Headers"]

        Write-Host "  ✅ Status: $statusCode" -ForegroundColor Green
        Write-Host "     Response Time: ${responseTime}ms" -ForegroundColor Green

        # Validate response time
        $timeOk = if ($responseTime -lt 500) { "✅" } else { "⚠️" }
        Write-Host "     ${timeOk} Response Time Check: ${responseTime}ms (target: <500ms)"

        # Check CORS
        if ($corsOrigin) {
            Write-Host "     ✅ CORS Header: $corsOrigin" -ForegroundColor Green
        } else {
            Write-Host "     ⚠️ CORS Header: Missing" -ForegroundColor Yellow
        }

        # Validate structure
        Write-Host "     Data Type: $($data.GetType().Name)" -ForegroundColor Gray
        if ($data -is [Array]) {
            Write-Host "     Array Length: $($data.Count) items" -ForegroundColor Gray
            if ($data.Count -gt 0) {
                Write-Host "     First Item Keys: $($data[0].PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
            }
        } elseif ($data -is [PSObject]) {
            Write-Host "     Object Keys: $($data.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
        }

        $results += [PSCustomObject]@{
            Endpoint = $Name
            URI = $Uri
            Status = "PASS"
            StatusCode = $statusCode
            ResponseTime = $responseTime
            DataType = $data.GetType().Name
            Error = $null
            CORS = $corsOrigin
            HasData = -not [string]::IsNullOrEmpty($content)
        }

    } catch {
        Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red

        # Try to extract status code from exception
        $statusCode = "Exception"
        if ($_.Exception -like "*404*") { $statusCode = 404 }
        elseif ($_.Exception -like "*500*") { $statusCode = 500 }
        elseif ($_.Exception -like "*400*") { $statusCode = 400 }

        $results += [PSCustomObject]@{
            Endpoint = $Name
            URI = $Uri
            Status = "FAIL"
            StatusCode = $statusCode
            ResponseTime = 0
            DataType = "Error"
            Error = $_.Exception.Message
            CORS = $null
            HasData = $false
        }
    }

    Write-Host ""
}

# =================================================================
# Test Endpoints
# =================================================================

# Test 1: GET /api/nx-cloud/status (Simplest - no parameters)
Test-Endpoint -Name "GET /api/nx-cloud/status" `
    -Uri "$baseUrl/api/nx-cloud/status" `
    -Method GET

# Test 2: GET /api/coverage/latest
Test-Endpoint -Name "GET /api/coverage/latest" `
    -Uri "$baseUrl/api/coverage/latest" `
    -Method GET

# Test 3: GET /api/coverage/trends?days=30
Test-Endpoint -Name "GET /api/coverage/trends?days=30" `
    -Uri "$baseUrl/api/coverage/trends?days=30" `
    -Method GET

# Test 4: GET /api/bundles/latest
Test-Endpoint -Name "GET /api/bundles/latest" `
    -Uri "$baseUrl/api/bundles/latest" `
    -Method GET

# Test 5: GET /api/bundles/trends?days=30
Test-Endpoint -Name "GET /api/bundles/trends?days=30" `
    -Uri "$baseUrl/api/bundles/trends?days=30" `
    -Method GET

# Test 6: GET /api/dependencies/vulnerabilities
Test-Endpoint -Name "GET /api/dependencies/vulnerabilities" `
    -Uri "$baseUrl/api/dependencies/vulnerabilities" `
    -Method GET

# Test 7: GET /api/nx-cloud/builds?days=7
Test-Endpoint -Name "GET /api/nx-cloud/builds?days=7" `
    -Uri "$baseUrl/api/nx-cloud/builds?days=7" `
    -Method GET

# Test 8: GET /api/nx-cloud/performance
Test-Endpoint -Name "GET /api/nx-cloud/performance" `
    -Uri "$baseUrl/api/nx-cloud/performance" `
    -Method GET

# =================================================================
# Test Error Handling
# =================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Error Handling Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test invalid query parameter
Write-Host "Test: Invalid query parameter (days=invalid)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/coverage/trends?days=invalid" -Method GET -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Yellow
} catch {
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { "Exception" }
    Write-Host "  ❌ Got response (status: $statusCode) - API may not validate this" -ForegroundColor Yellow
}

Write-Host ""

# Test missing required parameter
Write-Host "Test: Missing query parameter (trends without days)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/coverage/trends" -Method GET -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Yellow
    Write-Host "  ⚠️ API returned success without required parameter" -ForegroundColor Yellow
} catch {
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { "Exception" }
    Write-Host "  ✅ Got expected error (status: $statusCode)" -ForegroundColor Green
}

Write-Host ""

# Test 404 - non-existent endpoint
Write-Host "Test: Non-existent endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/nonexistent" -Method GET -ErrorAction Stop
    Write-Host "  ❌ Got response when expecting 404" -ForegroundColor Red
} catch {
    Write-Host "  ✅ Got expected 404 error" -ForegroundColor Green
}

Write-Host ""

# =================================================================
# Summary Report
# =================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$totalTests = $results.Count

Write-Host "Results: $passCount PASS, $failCount FAIL (Total: $totalTests)" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

# Table view
Write-Host "Detailed Results:" -ForegroundColor Cyan
$results | Format-Table -AutoSize @(
    @{ Name = "Endpoint"; Expression = { $_.Endpoint } },
    @{ Name = "Status"; Expression = { $_.Status }; Alignment = "Left" },
    @{ Name = "Code"; Expression = { $_.StatusCode } },
    @{ Name = "Time(ms)"; Expression = { $_.ResponseTime } },
    @{ Name = "Type"; Expression = { $_.DataType } }
) -Wrap

Write-Host ""
Write-Host "Response Time Analysis:" -ForegroundColor Cyan
$results | Where-Object { $_.Status -eq "PASS" } | ForEach-Object {
    $status = if ($_.ResponseTime -lt 200) { "✅ Fast" } elseif ($_.ResponseTime -lt 500) { "✅ OK" } else { "⚠️ Slow" }
    Write-Host "  $status - $($_.Endpoint): $($_.ResponseTime)ms"
}

Write-Host ""
Write-Host "Test Report Saved: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray

# =================================================================
# Save detailed report to file
# =================================================================

$reportPath = "C:\dev\apps\monorepo-dashboard\test-results-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').txt"

@"
========================================
API Endpoint Test Report
========================================
Timestamp: $timestamp
Backend URL: $baseUrl
Test Count: $totalTests
Passed: $passCount
Failed: $failCount

========================================
Endpoint Test Results
========================================

$($results | ForEach-Object {
@"
Endpoint: $($_.Endpoint)
URI: $($_.URI)
Status: $($_.Status)
Status Code: $($_.StatusCode)
Response Time: $($_.ResponseTime)ms
Data Type: $($_.DataType)
CORS Header: $($_.CORS)
Has Data: $($_.HasData)
Error: $(if ($_.Error) { $_.Error } else { "None" })
---

"@
})

========================================
Summary
========================================
All endpoints tested successfully: $(if ($failCount -eq 0) { "YES ✅" } else { "NO ❌ ($failCount failures)" })
Response times acceptable: $(if (($results | Where-Object { $_.ResponseTime -lt 500 }).Count -eq $passCount) { "YES ✅" } else { "NO ⚠️" })
CORS headers present: $(if (($results | Where-Object { $_.CORS -ne $null }).Count -gt 0) { "YES ✅" } else { "PARTIALLY ⚠️" })
"@ | Out-File -FilePath $reportPath -Force

Write-Host "Detailed report saved to: $reportPath" -ForegroundColor Gray
