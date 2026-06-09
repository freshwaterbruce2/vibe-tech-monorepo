#Requires -Version 7.0
<#
.SYNOPSIS
    Integration Test Worker Batch - Executes e2e tests for application packages.

.DESCRIPTION
    This script runs integration and e2e tests for application packages in the Vibe Tech monorepo.
    It executes 'nx run-many -t e2e' with parallel=1 to avoid port conflicts, captures test results,
    screenshots on failure, and traces. Results are stored in structured format for aggregation.

.PARAMETER Projects
    Comma-separated list of project names to test. If not specified, auto-detects e2e projects.

.PARAMETER OutputPath
    Directory where test results will be stored. Defaults to D:\data\test-results.

.PARAMETER Parallel
    Number of parallel workers for nx run-many. Defaults to 1 for e2e tests to avoid port conflicts.

.PARAMETER Browser
    Browser to run tests with (chromium, firefox, webkit). Defaults to all configured browsers.

.PARAMETER Retries
    Number of retries for failed tests. Defaults to 2 in CI, 0 locally.

.PARAMETER CiMode
    Run in CI mode with stricter settings.

.PARAMETER SkipProjects
    Comma-separated list of project names to skip.
#>
[CmdletBinding()]
param(
    [string]$Projects = "",
    [string]$OutputPath = "D:\data\test-results",
    [int]$Parallel = 1,
    [string]$Browser = "",
    [int]$Retries = -1,
    [switch]$CiMode,
    [string]$SkipProjects = ""
)

$ErrorActionPreference = "Stop"
$script:StartTime = Get-Date
$script:Timestamp = $script:StartTime.ToString("yyyyMMdd_HHmmss")
$script:TestRunId = [Guid]::NewGuid().ToString().Substring(0, 8)

if ($CiMode -or $env:CI -or $env:TF_BUILD -or $env:GITHUB_ACTIONS) {
    $script:IsCi = $true
    if ($Retries -eq -1) { $Retries = 2 }
} else {
    $script:IsCi = $false
    if ($Retries -eq -1) { $Retries = 0 }
}

$script:TestResults = @{
    runId = $script:TestRunId
    timestamp = $script:StartTime.ToString("o")
    isCi = $script:IsCi
    configuration = @{ parallel = $Parallel; browser = if ($Browser) { $Browser } else { "all" }; retries = $Retries }
    projects = @()
    summary = @{ total = 0; passed = 0; failed = 0; skipped = 0; flaky = 0; durationMs = 0 }
    artifacts = @()
}

function Write-TestLog {
    param([string]$Message, [ValidateSet("Info","Warning","Error","Success")][string]$Level = "Info")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $prefix = "[$timestamp] [IntegrationTestWorker]"
    switch ($Level) {
        "Info" { Write-Host "$prefix $Message" -ForegroundColor Cyan }
        "Warning" { Write-Warning "$prefix $Message" }
        "Error" { Write-Error "$prefix $Message" }
        "Success" { Write-Host "$prefix $Message" -ForegroundColor Green }
    }
}

function Initialize-TestEnvironment {
    Write-TestLog "Initializing integration test environment..."
    $script:OutputDir = Join-Path $OutputPath "e2e-run-$script:Timestamp-$script:TestRunId"
    $script:ReportsDir = Join-Path $script:OutputDir "reports"
    $script:ArtifactsDir = Join-Path $script:OutputDir "artifacts"
    New-Item -ItemType Directory -Path $script:OutputDir -Force | Out-Null
    New-Item -ItemType Directory -Path $script:ReportsDir -Force | Out-Null
    New-Item -ItemType Directory -Path $script:ArtifactsDir -Force | Out-Null
    Write-TestLog "Output directory: $script:OutputDir"
    
    try {
        $nxVersion = & npx nx --version 2>$null
        Write-TestLog "Nx version: $nxVersion"
    } catch {
        Write-TestLog "Nx not found. Ensure node_modules are installed." -Level "Error"
        throw
    }
    
    $env:CI = if ($script:IsCi) { "true" } else { "false" }
    $env:PLAYWRIGHT_RETRIES = $Retries
    Write-TestLog "Test environment initialized" -Level "Success"
}

function Get-E2eProjects {
    Write-TestLog "Detecting e2e projects..."
    if ($Projects) {
        return $Projects -split "," | ForEach-Object { $_.Trim() }
    }
    
    $e2eProjects = @()
    $appDirs = Get-ChildItem -Path "V:\monorepo\apps" -Directory -ErrorAction SilentlyContinue
    
    foreach ($dir in $appDirs) {
        $projectJson = Join-Path $dir.FullName "project.json"
        if (Test-Path $projectJson) {
            try {
                $content = Get-Content $projectJson -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($content.targets -and $content.targets.PSObject.Properties.Name -contains "e2e") {
                    $e2eProjects += $content.name
                }
            } catch {}
        }
    }
    
    foreach ($dir in $appDirs) {
        if ($dir.Name -like "*e2e*") {
            $projectJson = Join-Path $dir.FullName "project.json"
            if (Test-Path $projectJson) {
                try {
                    $content = Get-Content $projectJson -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
                    if ($content.name -and $content.name -notin $e2eProjects) {
                        $e2eProjects += $content.name
                    }
                } catch {}
            }
        }
    }
    
    if ($SkipProjects) {
        $skipList = $SkipProjects -split "," | ForEach-Object { $_.Trim() }
        $e2eProjects = $e2eProjects | Where-Object { $_ -notin $skipList }
    }
    
    return $e2eProjects | Select-Object -Unique | Sort-Object
}

function Invoke-ProjectE2ETests {
    param([Parameter(Mandatory)][string]$ProjectName)
    Write-TestLog "Running e2e tests for: $ProjectName"
    
    $projectStartTime = Get-Date
    $projectResult = @{ name = $ProjectName; status = "unknown"; durationMs = 0; tests = @(); errors = @(); artifacts = @() }
    
    try {
        $projectDir = $null
        $appDirs = Get-ChildItem -Path "V:\monorepo\apps" -Directory
        foreach ($dir in $appDirs) {
            $projectJson = Join-Path $dir.FullName "project.json"
            if (Test-Path $projectJson) {
                $content = Get-Content $projectJson -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($content.name -eq $ProjectName) { $projectDir = $dir.FullName; break }
            }
        }
        
        if (-not $projectDir) { throw "Project directory not found: $ProjectName" }
        
        $projectOutputDir = Join-Path $script:ReportsDir $ProjectName
        New-Item -ItemType Directory -Path $projectOutputDir -Force | Out-Null
        
        $env:PLAYWRIGHT_HTML_REPORT = Join-Path $projectOutputDir "playwright-report"
        $env:PLAYWRIGHT_OUTPUT_DIR = Join-Path $projectOutputDir "test-results"
        
        $stdoutLog = Join-Path $projectOutputDir "stdout.log"
        $stderrLog = Join-Path $projectOutputDir "stderr.log"
        
        $nxArgs = @("run", "$ProjectName`:e2e", "--outputStyle=static")
        if ($Parallel -gt 0) { $nxArgs += "--parallel=$Parallel" }
        
        $process = Start-Process -FilePath "npx" -ArgumentList (@("nx") + $nxArgs) -WorkingDirectory "V:\monorepo" `
            -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -Wait -NoNewWindow -PassThru
        
        $exitCode = $process.ExitCode
        
        if ($exitCode -eq 0) {
            $projectResult.status = "passed"
            Write-TestLog "Tests passed for $ProjectName" -Level "Success"
        } else {
            $projectResult.status = "failed"
            $projectResult.errors += "Exit code: $exitCode"
            Write-TestLog "Tests failed for $ProjectName (exit: $exitCode)" -Level "Error"
        }
        
        # Collect artifacts
        $testResultsDir = Join-Path $projectOutputDir "test-results"
        if (Test-Path $testResultsDir) {
            $artifacts = Get-ChildItem -Path $testResultsDir -Recurse -File -ErrorAction SilentlyContinue
            foreach ($artifact in $artifacts) {
                $artifactType = switch ($artifact.Extension) {
                    ".zip" { "trace" }
                    { $_ -in @(".png",".jpg",".jpeg") } { "screenshot" }
                    { $_ -in @(".webm",".mp4") } { "video" }
                    default { "unknown" }
                }
                $artifactEntry = @{ type = $artifactType; path = $artifact.FullName; name = $artifact.Name; size = $artifact.Length }
                $projectResult.artifacts += $artifactEntry
                $script:TestResults.artifacts += $artifactEntry
            }
        }
        
        # Parse test counts from output
        $stdout = Get-Content $stdoutLog -Raw -ErrorAction SilentlyContinue
        if ($stdout -match '(\d+) passed') { $projectResult.tests += @{ status = "passed"; count = [int]$matches[1] } }
        if ($stdout -match '(\d+) failed') { $projectResult.tests += @{ status = "failed"; count = [int]$matches[1] } }
        if ($stdout -match '(\d+) skipped') { $projectResult.tests += @{ status = "skipped"; count = [int]$matches[1] } }
        
    } catch {
        $projectResult.status = "error"
        $projectResult.errors += $_.Exception.Message
        Write-TestLog "Error: $_" -Level "Error"
    }
    
    $projectResult.durationMs = [math]::Round(((Get-Date) - $projectStartTime).TotalMilliseconds)
    return $projectResult
}

function Save-TestResults {
    Write-TestLog "Saving test results..."
    $endTime = Get-Date
    $script:TestResults.summary.durationMs = [math]::Round(($endTime - $script:StartTime).TotalMilliseconds)
    
    foreach ($project in $script:TestResults.projects) {
        $script:TestResults.summary.total++
        switch ($project.status) {
            "passed" { $script:TestResults.summary.passed++ }
            "failed" { $script:TestResults.summary.failed++ }
            "skipped" { $script:TestResults.summary.skipped++ }
            "flaky" { $script:TestResults.summary.flaky++ }
        }
    }
    
    $resultsJson = Join-Path $script:OutputDir "test-results.json"
    $script:TestResults | ConvertTo-Json -Depth 10 | Out-File -FilePath $resultsJson -Encoding UTF8
    
    # JUnit XML
    $junitXml = Join-Path $script:OutputDir "test-results.xml"
    $xml = "<?xml version=`"1.0`"?>`n<testsuites tests=`"$($script:TestResults.summary.total)`" failures=`"$($script:TestResults.summary.failed)`" skipped=`"$($script:TestResults.summary.skipped)`">`n"
    foreach ($p in $script:TestResults.projects) {
        $time = [math]::Round($p.durationMs / 1000, 2)
        $failures = if ($p.status -eq 'failed') { 1 } else { 0 }
        $xml += "  <testsuite name=`"$($p.name)`" tests=`"1`" failures=`"$failures`" time=`"$time`" />`n"
    }
    $xml += "</testsuites>"
    $xml | Out-File -FilePath $junitXml -Encoding UTF8
    
    # Summary markdown
    $summaryMd = Join-Path $script:OutputDir "SUMMARY.md"
    $md = "# Integration Test Results`n`n**Run ID:** $($script:TestRunId)`n**Duration:** $([math]::Round($script:TestResults.summary.durationMs / 1000, 2))s`n`n"
    $md += "| Metric | Count |`n|--------|-------|`n"
    $md += "| Total | $($script:TestResults.summary.total) |`n"
    $md += "| Passed | $($script:TestResults.summary.passed) |`n"
    $md += "| Failed | $($script:TestResults.summary.failed) |`n"
    $md += "| Artifacts | $($script:TestResults.artifacts.Count) |`n"
    $md | Out-File -FilePath $summaryMd -Encoding UTF8
    
    return $resultsJson
}

function Main {
    try {
        Write-TestLog "Starting Integration Test Worker - Run ID: $script:TestRunId"
        Initialize-TestEnvironment
        
        $e2eProjects = Get-E2eProjects
        if ($e2eProjects.Count -eq 0) {
            Write-TestLog "No e2e projects found." -Level "Warning"
            exit 0
        }
        
        Write-TestLog "Found projects: $($e2eProjects -join ', ')"
        
        foreach ($project in $e2eProjects) {
            $result = Invoke-ProjectE2ETests -ProjectName $project
            $script:TestResults.projects += $result
            Start-Sleep -Seconds 2
        }
        
        $resultsPath = Save-TestResults
        
        Write-TestLog "========================================" -Level "Info"
        Write-TestLog "Total: $($script:TestResults.summary.total), Passed: $($script:TestResults.summary.passed), Failed: $($script:TestResults.summary.failed)" -Level "Info"
        Write-TestLog "Results: $resultsPath" -Level "Info"
        Write-TestLog "========================================" -Level "Info"
        
        exit $(if ($script:TestResults.summary.failed -gt 0) { 1 } else { 0 })
    } catch {
        Write-TestLog "Fatal error: $_" -Level "Error"
        exit 1
    }
}

Main
