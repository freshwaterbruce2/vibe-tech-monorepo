$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logDirectory = "D:\logs\learning-system"

if (-not (Test-Path $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
}

$runLog = Join-Path $logDirectory ("doc-cleanup-run-{0:yyyy-MM-dd}.log" -f (Get-Date))
$startTime = Get-Date

Set-Location $repoRoot

$commandOutput = & pnpm doc:cleanup 2>&1
if ($commandOutput) {
    $commandOutput | Tee-Object -FilePath $runLog -Append
}

$duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)
$summaryLine = "RunSummary`tSeconds=$duration"
Add-Content -Path $runLog -Value $summaryLine
