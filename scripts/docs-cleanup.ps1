param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$repoRootPath = $repoRoot.Path
$keywordFile = Join-Path $repoRootPath "config\docs-cleanup.keywords.txt"
$logDirectory = "D:\logs\learning-system"
$logRetentionDays = 30

if (-not (Test-Path $keywordFile)) {
    throw "Keyword config not found: $keywordFile"
}

if (-not (Test-Path $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
}

$logPath = $null
if (-not $DryRun) {
    $logPath = Join-Path $logDirectory ("deleted-{0:yyyy-MM-dd}.log" -f (Get-Date))
}

$keywords = Get-Content -Path $keywordFile |
ForEach-Object { $_.Trim() } |
Where-Object { $_ -and -not $_.StartsWith("#") }

$keywordsLower = $keywords | ForEach-Object { $_.ToLowerInvariant() } | Sort-Object -Unique

$excludeFileNamesLower = @(
    "readme.md",
    "changelog.md"
)

$excludePathFragmentsLower = @(
    (Join-Path "apps" "vibe-justice").ToLowerInvariant()
)

$deleteFolderFragmentsLower = @(
    (Join-Path "docs" "archive").ToLowerInvariant(),
    (Join-Path "docs" "history").ToLowerInvariant(),
    (Join-Path "docs" "reports").ToLowerInvariant(),
    (Join-Path "docs" "plans").ToLowerInvariant(),
    (Join-Path "docs" "deprecated").ToLowerInvariant(),
    (Join-Path "docs" "legacy").ToLowerInvariant(),
    (Join-Path "docs" "old").ToLowerInvariant(),
    (Join-Path "docs" "obsolete").ToLowerInvariant()
)

$deleteFileNameMarkersLower = @(
    "deprecated",
    "legacy",
    "obsolete",
    "archive",
    "history",
    "report",
    "plan",
    "old"
)

function Test-ContainsAny {
    param(
        [string]$Text,
        [string[]]$Needles
    )

    foreach ($needle in $Needles) {
        if ($Text.Contains($needle)) {
            return $true
        }
    }

    return $false
}

$docsRoot = Join-Path $repoRootPath "docs"
$docFiles = @()
if (Test-Path $docsRoot) {
    $docFiles = Get-ChildItem -Path $docsRoot -Recurse -File -Filter *.md
}

$rootFiles = Get-ChildItem -Path $repoRootPath -File -Filter *.md

$allFiles = @{}
foreach ($file in @($docFiles + $rootFiles)) {
    $allFiles[$file.FullName] = $file
}

$deletedCount = 0
$skippedCount = 0
$deletedBytes = 0
$startTime = Get-Date

foreach ($file in $allFiles.Values) {
    $pathLower = $file.FullName.ToLowerInvariant()
    $nameLower = $file.Name.ToLowerInvariant()

    if ($excludeFileNamesLower -contains $nameLower) {
        $skippedCount++
        continue
    }

    if (Test-ContainsAny -Text $pathLower -Needles $excludePathFragmentsLower) {
        $skippedCount++
        continue
    }

    if (Test-ContainsAny -Text $pathLower -Needles $keywordsLower) {
        $skippedCount++
        continue
    }

    $shouldDelete = $false

    if (Test-ContainsAny -Text $pathLower -Needles $deleteFolderFragmentsLower) {
        $shouldDelete = $true
    }
    elseif (Test-ContainsAny -Text $nameLower -Needles $deleteFileNameMarkersLower) {
        $shouldDelete = $true
    }

    if (-not $shouldDelete) {
        $skippedCount++
        continue
    }

    if ($DryRun) {
        Write-Host "[DryRun] Delete $($file.FullName)"
        continue
    }

    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "$timestamp`t$($file.Length)`t$($file.FullName)"
    Add-Content -Path $logPath -Value $line

    Remove-Item -LiteralPath $file.FullName -Force

    $deletedCount++
    $deletedBytes += $file.Length
}

$duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)
if (-not $DryRun) {
    $summaryLine = "Summary`tDeleted=$deletedCount`tSkipped=$skippedCount`tBytes=$deletedBytes`tSeconds=$duration"
    Add-Content -Path $logPath -Value $summaryLine

    Get-ChildItem -Path $logDirectory -Filter "deleted-*.log" -File |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$logRetentionDays) } |
    Remove-Item -Force

    Write-Host "Cleanup complete. Deleted: $deletedCount. Skipped: $skippedCount. Log: $logPath"
}
else {
    Write-Host "Dry run complete. Deleted: $deletedCount. Skipped: $skippedCount."
}
