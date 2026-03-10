# Gemini CLI Batch Query Runner
# Run multiple queries with automatic rate limiting

param(
    [Parameter(Mandatory=$true)]
    [string[]]$Queries,

    [Parameter(Mandatory=$false)]
    [int]$DelayBetweenQueries = 5,

    [Parameter(Mandatory=$false)]
    [string]$OutputFile = "",

    [Parameter(Mandatory=$false)]
    [switch]$Debug
)

Write-Host "🚀 Gemini CLI Batch Query Runner" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Total queries: $($Queries.Count)" -ForegroundColor Yellow
Write-Host "Delay between queries: $DelayBetweenQueries seconds" -ForegroundColor Yellow
Write-Host ""

$results = @()
$successCount = 0
$failCount = 0

foreach ($i in 0..($Queries.Count - 1)) {
    $query = $Queries[$i]
    $queryNum = $i + 1

    Write-Host "[$queryNum/$($Queries.Count)] Processing query..." -ForegroundColor Cyan
    Write-Host "Query: $query" -ForegroundColor Gray

    # Build command
    $command = if ($Debug.IsPresent) {
        "gemini --debug chat `"$query`""
    } else {
        "gemini chat `"$query`""
    }

    # Execute
    try {
        $output = Invoke-Expression $command 2>&1
        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-Host "✅ Success" -ForegroundColor Green
            $successCount++
            $results += [PSCustomObject]@{
                Query = $query
                Status = "Success"
                Output = $output
            }
        } else {
            Write-Host "⚠️ Failed with exit code $exitCode" -ForegroundColor Yellow
            $failCount++
            $results += [PSCustomObject]@{
                Query = $query
                Status = "Failed"
                Output = $output
            }
        }

    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        $failCount++
        $results += [PSCustomObject]@{
            Query = $query
            Status = "Error"
            Output = $_.Exception.Message
        }
    }

    # Rate limiting (skip on last query)
    if ($queryNum -lt $Queries.Count) {
        Write-Host "⏳ Waiting $DelayBetweenQueries seconds..." -ForegroundColor Yellow
        Write-Host ""
        Start-Sleep -Seconds $DelayBetweenQueries
    }
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "📊 Batch Query Summary" -ForegroundColor Cyan
Write-Host "Total queries: $($Queries.Count)" -ForegroundColor White
Write-Host "✅ Successful: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red

# Save results to file if specified
if ($OutputFile) {
    $results | ConvertTo-Json -Depth 5 | Out-File -FilePath $OutputFile -Encoding UTF8
    Write-Host "📄 Results saved to: $OutputFile" -ForegroundColor Cyan
}

# Return results
return $results
