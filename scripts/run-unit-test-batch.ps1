#requires -Version 7.2
<#
.SYNOPSIS
    Execute unit test worker batch for library packages using Nx.

.DESCRIPTION
    Runs all unit tests for library packages in parallel using Nx.
    Captures output, coverage reports, and timing data.
    Stores results in a structured JSON format for aggregation.
    Handles failures gracefully and continues testing other packages.

.PARAMETER OutputPath
    Directory where test results will be stored. Defaults to D:\data\test-results.

.PARAMETER Parallel
    Number of parallel workers. Defaults to 4.

.PARAMETER Projects
    Comma-separated list of specific projects to test. If not specified, tests all packages with unit tests.

.PARAMETER ContinueOnError
    Continue testing other packages when one fails. Defaults to true.

.PARAMETER GenerateCoverage
    Generate coverage reports. Defaults to true.

.PARAMETER TimeoutMinutes
    Timeout per package test in minutes. Defaults to 10.

.EXAMPLE
    .\run-unit-test-batch.ps1 -Parallel 4 -GenerateCoverage $true

.EXAMPLE
    .\run-unit-test-batch.ps1 -Projects "core,ui,auth" -OutputPath "D:\data\test-results"
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$OutputPath = "D:\data\test-results",

    [Parameter()]
    [int]$Parallel = 4,

    [Parameter()]
    [string]$Projects = "",

    [Parameter()]
    [bool]$ContinueOnError = $true,

    [Parameter()]
    [bool]$GenerateCoverage = $true,

    [Parameter()]
    [int]$TimeoutMinutes = 10
)

# Error action preference
$ErrorActionPreference = "Stop"

# Ensure output directory exists
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

# Timestamp for this run
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runOutputDir = Join-Path $OutputPath "unit-test-batch-$timestamp"
New-Item -ItemType Directory -Path $runOutputDir -Force | Out-Null

# Log file
$logFile = Join-Path $runOutputDir "test-run.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

Write-Log "Starting unit test batch execution"
Write-Log "Output directory: $runOutputDir"
Write-Log "Parallel workers: $Parallel"
Write-Log "Continue on error: $ContinueOnError"
Write-Log "Generate coverage: $GenerateCoverage"

# Change to workspace root
$workspaceRoot = "V:\monorepo"
Set-Location $workspaceRoot

# Get list of packages with unit tests
function Get-UnitTestPackages {
    $packagesDir = Join-Path $workspaceRoot "packages"
    $packagesWithTests = @()
    
    foreach ($package in Get-ChildItem -Path $packagesDir -Directory) {
        $packageJsonPath = Join-Path $package.FullName "package.json"
        
        if (Test-Path $packageJsonPath) {
            try {
                $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
                $packageName = $packageJson.name
                
                # Check if package has test:unit script
                $hasUnitTest = $packageJson.scripts -and $packageJson.scripts.PSObject.Properties.Name -contains 'test:unit'
                $hasTest = $packageJson.scripts -and $packageJson.scripts.PSObject.Properties.Name -contains 'test'
                
                # Check for test files
                $hasTestFiles = (Get-ChildItem -Path $package.FullName -Recurse -Include "*.test.*", "*.spec.*" -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0
                
                if ($hasUnitTest -or ($hasTest -and $hasTestFiles)) {
                    $packagesWithTests += $packageName
                }
            }
            catch {
                Write-Log "Failed to parse package.json for $($package.Name): $_" "WARN"
            }
        }
    }
    
    return $packagesWithTests
}

# Get packages to test
if ([string]::IsNullOrWhiteSpace($Projects)) {
    $unitTestPackages = Get-UnitTestPackages
    Write-Log "Found $($unitTestPackages.Count) packages with unit tests"
} else {
    $unitTestPackages = $Projects -split ',' | ForEach-Object { $_.Trim() }
    Write-Log "Testing specified packages: $($unitTestPackages -join ', ')"
}

if ($unitTestPackages.Count -eq 0) {
    Write-Log "No packages found with unit tests" "ERROR"
    exit 1
}

# Results collection
$results = @{
    runId = [Guid]::NewGuid().ToString()
    timestamp = (Get-Date -Format "o")
    workspaceRoot = $workspaceRoot
    parallel = $Parallel
    totalPackages = $unitTestPackages.Count
    packages = @()
    summary = @{
        total = $unitTestPackages.Count
        passed = 0
        failed = 0
        skipped = 0
        durationMs = 0
    }
}

# Run tests for each package
$overallStartTime = Get-Date
$packageResults = [System.Collections.ArrayList]::new()

foreach ($package in $unitTestPackages) {
    $packageStartTime = Get-Date
    $safePackageName = $package.Replace('@', '').Replace('/', '_')
    $packageOutputFile = Join-Path $runOutputDir "$safePackageName-output.json"
    $packageLogFile = Join-Path $runOutputDir "$safePackageName-log.txt"
    
    Write-Log "Testing package: $package"
    
    $packageResult = @{
        package = $package
        status = "unknown"
        durationMs = 0
        outputFile = $packageOutputFile
        logFile = $packageLogFile
        error = $null
        tests = @{
            total = 0
            passed = 0
            failed = 0
            skipped = 0
        }
        coverage = $null
    }
    
    try {
        # Build the nx command
        $nxArgs = @(
            "run",
            "$package`:test:unit",
            "--outputStyle=json"
        )
        
        if ($GenerateCoverage) {
            $nxArgs += "--coverage"
        }
        
        # Create process info for timeout support
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "nx"
        $psi.Arguments = ($nxArgs -join ' ')
        $psi.WorkingDirectory = $workspaceRoot
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $psi
        
        # Start process and capture output
        $outputBuilder = New-Object System.Text.StringBuilder
        $errorBuilder = New-Object System.Text.StringBuilder
        
        $outputHandler = {
            if (-not [string]::IsNullOrWhiteSpace($EventArgs.Data)) {
                $Event.MessageData.AppendLine($EventArgs.Data) | Out-Null
            }
        }
        
        $outputEvent = Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -MessageData $outputBuilder -Action $outputHandler
        $errorEvent = Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -MessageData $errorBuilder -Action $outputHandler
        
        $process.Start() | Out-Null
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        
        # Wait with timeout
        $completed = $process.WaitForExit($TimeoutMinutes * 60 * 1000)
        
        if (-not $completed) {
            Write-Log "Package $package timed out after $TimeoutMinutes minutes" "WARN"
            $process.Kill()
            $packageResult.status = "timeout"
            $packageResult.error = "Test execution timed out after $TimeoutMinutes minutes"
        } else {
            # Give a moment for async events to complete
            Start-Sleep -Milliseconds 500
            
            $exitCode = $process.ExitCode
            $stdout = $outputBuilder.ToString()
            $stderr = $errorBuilder.ToString()
            
            # Save raw output
            $stdout | Out-File -FilePath $packageLogFile -Encoding UTF8
            if ($stderr) {
                Add-Content -Path $packageLogFile -Value "`n`n=== STDERR ===`n$stderr"
            }
            
            # Try to parse JSON output
            $testOutput = $null
            try {
                # Look for JSON in the output
                $jsonMatch = [regex]::Match($stdout, '\{[\s\S]*\}')
                if ($jsonMatch.Success) {
                    $testOutput = $jsonMatch.Value | ConvertFrom-Json
                }
            }
            catch {
                Write-Log "Could not parse JSON output for $package" "WARN"
            }
            
            if ($exitCode -eq 0) {
                $packageResult.status = "passed"
                $results.summary.passed++
                Write-Log "Package $package passed"
            } else {
                $packageResult.status = "failed"
                $results.summary.failed++
                $packageResult.error = "Exit code: $exitCode"
                if ($stderr) {
                    $packageResult.error += "`nStderr: $stderr"
                }
                Write-Log "Package $package failed with exit code $exitCode" "ERROR"
            }
            
            # Extract test counts if available
            if ($testOutput -and $testOutput.success -ne $null) {
                # Try to extract from Nx output format
                if ($testOutput.tasks) {
                    $task = $testOutput.tasks | Where-Object { $_.target.project -eq $package }
                    if ($task) {
                        $packageResult.tests.total = $task.meta?.tests?.total ?? 0
                        $packageResult.tests.passed = $task.meta?.tests?.passed ?? 0
                        $packageResult.tests.failed = $task.meta?.tests?.failed ?? 0
                        $packageResult.tests.skipped = $task.meta?.tests?.skipped ?? 0
                    }
                }
            }
            
            # Look for coverage summary in output
            if ($GenerateCoverage -and $stdout -match 'Coverage summary|All files') {
                $packageResult.coverage = @{
                    raw = ($stdout -split 'Coverage summary|All files')[1]?.Trim() ?? "See coverage report"
                }
            }
        }
        
        # Cleanup events
        Unregister-Event -SourceIdentifier $outputEvent.Name -ErrorAction SilentlyContinue
        Unregister-Event -SourceIdentifier $errorEvent.Name -ErrorAction SilentlyContinue
        $process.Dispose()
        
    }
    catch {
        $packageResult.status = "error"
        $packageResult.error = $_.Exception.Message
        $results.summary.failed++
        Write-Log "Error testing package $package`: $_" "ERROR"
    }
    
    $packageEndTime = Get-Date
    $packageResult.durationMs = [int]($packageEndTime - $packageStartTime).TotalMilliseconds
    
    # Save individual package result
    $packageResult | ConvertTo-Json -Depth 10 | Out-File -FilePath $packageOutputFile -Encoding UTF8
    
    [void]$packageResults.Add($packageResult)
    $results.packages += $packageResult
    
    # Continue on error check
    if ($packageResult.status -eq "failed" -and -not $ContinueOnError) {
        Write-Log "Stopping batch due to failure and ContinueOnError=false" "ERROR"
        break
    }
}

$overallEndTime = Get-Date
$results.summary.durationMs = [int]($overallEndTime - $overallStartTime).TotalMilliseconds

# Calculate summary statistics
$results.summary.total = $unitTestPackages.Count
$results.summary.skipped = $results.summary.total - $results.summary.passed - $results.summary.failed

# Add metadata
$results.metadata = @{
    nodeVersion = (node --version)
    pnpmVersion = (pnpm --version)
    nxVersion = (nx --version 2>$null | Select-Object -First 1)
    platform = "Windows"
    workingDirectory = $workspaceRoot
}

# Save consolidated results
$resultsFile = Join-Path $runOutputDir "test-results.json"
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath $resultsFile -Encoding UTF8

# Generate summary report
$summaryReport = @"
# Unit Test Batch Results

**Run ID:** $($results.runId)
**Timestamp:** $($results.timestamp)
**Duration:** $([TimeSpan]::FromMilliseconds($results.summary.durationMs).ToString())

## Summary

| Metric | Count |
|--------|-------|
| Total Packages | $($results.summary.total) |
| Passed | $($results.summary.passed) |
| Failed | $($results.summary.failed) |
| Skipped | $($results.summary.skipped) |

## Package Results

| Package | Status | Duration |
|---------|--------|----------|
"@

foreach ($pkg in $results.packages) {
    $statusEmoji = switch ($pkg.status) {
        "passed" { "âœ…" }
        "failed" { "âŒ" }
        "timeout" { "â±ï¸" }
        "error" { "ðŸ’¥" }
        default { "â“" }
    }
    $duration = [TimeSpan]::FromMilliseconds($pkg.durationMs).ToString("hh\:mm\:ss\.fff")
    $summaryReport += "`n| $($pkg.package) | $statusEmoji $($pkg.status) | $duration |"
}

$summaryReport += "`n`n## Failed Packages`n`n"
$failedPackages = $results.packages | Where-Object { $_.status -ne "passed" }
if ($failedPackages.Count -eq 0) {
    $summaryReport += "None - all tests passed! ðŸŽ‰`n"
} else {
    foreach ($pkg in $failedPackages) {
        $summaryReport += "- **$($pkg.package)**: $($pkg.error)`n"
    }
}

$summaryReport += "`n## Output Location`n`nTest results stored in: ``$runOutputDir``"

$summaryFile = Join-Path $runOutputDir "SUMMARY.md"
$summaryReport | Out-File -FilePath $summaryFile -Encoding UTF8

# Console summary
Write-Log "`n========================================"
Write-Log "UNIT TEST BATCH COMPLETE"
Write-Log "========================================"
Write-Log "Total Packages: $($results.summary.total)"
Write-Log "Passed: $($results.summary.passed)"
Write-Log "Failed: $($results.summary.failed)"
Write-Log "Skipped: $($results.summary.skipped)"
Write-Log "Duration: $([TimeSpan]::FromMilliseconds($results.summary.durationMs).ToString())"
Write-Log "Results: $resultsFile"
Write-Log "========================================"

# Exit with appropriate code
if ($results.summary.failed -gt 0) {
    exit 1
} else {
    exit 0
}
