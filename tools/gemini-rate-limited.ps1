# Gemini CLI Rate-Limited Wrapper
# Prevents quota exhaustion by adding delays between requests

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Query,

    [Parameter(Mandatory=$false)]
    [int]$DelaySeconds = 5,

    [Parameter(Mandatory=$false)]
    [switch]$Debug
)

# Function to run gemini with rate limiting
function Invoke-GeminiRateLimited {
    param(
        [string]$Query,
        [int]$Delay,
        [bool]$EnableDebug
    )

    Write-Host "⏱️ Running Gemini CLI query..." -ForegroundColor Cyan
    Write-Host "Query: $Query" -ForegroundColor Gray

    # Build command
    $command = if ($EnableDebug) {
        "gemini --debug chat `"$Query`""
    } else {
        "gemini chat `"$Query`""
    }

    # Execute
    try {
        Invoke-Expression $command
        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-Host "✅ Query completed successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Query exited with code $exitCode" -ForegroundColor Yellow
        }

    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        return $false
    }

    # Rate limiting delay
    if ($Delay -gt 0) {
        Write-Host "⏳ Waiting $Delay seconds (rate limiting)..." -ForegroundColor Yellow
        Start-Sleep -Seconds $Delay
    }

    return $true
}

# Execute with rate limiting
Invoke-GeminiRateLimited -Query $Query -Delay $DelaySeconds -EnableDebug $Debug.IsPresent

Write-Host "`n💡 Tip: Adjust delay with -DelaySeconds parameter" -ForegroundColor Cyan
Write-Host "   Example: .\gemini-rate-limited.ps1 'your query' -DelaySeconds 10" -ForegroundColor Gray
