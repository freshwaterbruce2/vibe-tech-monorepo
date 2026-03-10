<#
.SYNOPSIS
    Vibe Finisher - Infinite Loop Runner (FIXED)
.DESCRIPTION
    Runs the finisher agent in an infinite loop until the project ships.
#>

param(
    [int]$MaxIterations = 100,
    [int]$SleepSeconds = 10,
    [int]$SuccessStreak = 3
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host @"

 ██╗   ██╗██╗██████╗ ███████╗    ███████╗██╗███╗   ██╗██╗███████╗██╗  ██╗███████╗██████╗ 
 ██║   ██║██║██╔══██╗██╔════╝    ██╔════╝██║████╗  ██║██║██╔════╝██║  ██║██╔════╝██╔══██╗
 ██║   ██║██║██████╔╝█████╗      █████╗  ██║██╔██╗ ██║██║███████╗███████║█████╗  ██████╔╝
 ╚██╗ ██╔╝██║██╔══██╗██╔══╝      ██╔══╝  ██║██║╚██╗██║██║╚════██║██╔══██║██╔══╝  ██╔══██╗
  ╚████╔╝ ██║██████╔╝███████╗    ██║     ██║██║ ╚████║██║███████║██║  ██║███████╗██║  ██║
   ╚═══╝  ╚═╝╚═════╝ ╚══════╝    ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
                                                                                          
"@ -ForegroundColor Magenta

Write-Host "Max iterations: $MaxIterations | Sleep: ${SleepSeconds}s | Success needed: $SuccessStreak" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Cyan

$iteration = 0
$consecutiveSuccess = 0
$startTime = Get-Date

try {
    while ($iteration -lt $MaxIterations) {
        $iteration++
        
        Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
        Write-Host "║  ITERATION $iteration/$MaxIterations | Runtime: $([Math]::Round(((Get-Date) - $startTime).TotalMinutes, 1))m | Streak: $consecutiveSuccess/$SuccessStreak" -ForegroundColor Cyan
        Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
        
        # Run single pass and capture output
        $syncScript = Join-Path $ScriptDir "sync.ps1"
        $result = & $syncScript 2>&1 | Tee-Object -Variable output
        $exitCode = $LASTEXITCODE
        
        # Convert output to string for pattern matching
        $outputStr = $output -join "`n"
        
        # Check for SHIP_READY
        if ($outputStr -match '\[SHIP_READY\]\s*YES') {
            $consecutiveSuccess++
            Write-Host "`n[SHIP_READY] YES - Streak: $consecutiveSuccess/$SuccessStreak" -ForegroundColor Green
        }
        elseif ($outputStr -match '\[SHIP_READY\]\s*NO') {
            $consecutiveSuccess = 0
            Write-Host "`n[SHIP_READY] NO - Streak reset" -ForegroundColor Yellow
        }
        else {
            Write-Host "`n[STATUS] No SHIP_READY found in output" -ForegroundColor Gray
        }
        
        # Check win condition
        if ($consecutiveSuccess -ge $SuccessStreak) {
            Write-Host "`n" -NoNewline
            Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "║           🎉 PROJECT SHIPPED! 🎉                          ║" -ForegroundColor Green
            Write-Host "║  $SuccessStreak consecutive SHIP_READY=YES achieved!                   ║" -ForegroundColor Green
            Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
            break
        }
        
        # Sleep between iterations
        if ($iteration -lt $MaxIterations) {
            Write-Host "`n--- SLEEPING ${SleepSeconds}s ---" -ForegroundColor DarkGray
            Start-Sleep -Seconds $SleepSeconds
        }
    }
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    $totalTime = (Get-Date) - $startTime
    Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  SESSION COMPLETE" -ForegroundColor Cyan
    Write-Host "  Iterations: $iteration | Time: $([Math]::Round($totalTime.TotalMinutes, 1))m | Final streak: $consecutiveSuccess" -ForegroundColor White
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
}
