param(
    [string]$RepoOwner = "freshwaterbruce2",
    [string]$RepoName = "vibe-tech-lovable",
    [string]$Branch = "main",
    [string]$CommitMessage = "chore: publish vibe-tech-lovable",
    [switch]$NoVerify = $true,
    [switch]$FreshHistory = $false,
    [switch]$ForcePush = $false,
    [switch]$NoThin = $true
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

Assert-Command git

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$remoteUrl = "https://github.com/$RepoOwner/$RepoName.git"

Write-Host ""
Write-Host "Repo root: $repoRoot"
Write-Host "Target:    $remoteUrl"
Write-Host "Branch:    $Branch"
Write-Host "NoVerify:  $NoVerify"
Write-Host "FreshHist: $FreshHistory"
Write-Host "ForcePush: $ForcePush"
Write-Host "NoThin:    $NoThin"
Write-Host ""

if ($FreshHistory) {
    if (Test-Path (Join-Path $repoRoot ".git")) {
        $backupName = ".git.backup-{0}" -f (Get-Date -Format "yyyyMMdd_HHmmss")
        $backupPath = Join-Path $repoRoot $backupName
        Write-Host "Backing up existing .git -> $backupName" -ForegroundColor Yellow
        Move-Item -Path (Join-Path $repoRoot ".git") -Destination $backupPath -Force
    }
    git init
} elseif (-not (Test-Path (Join-Path $repoRoot ".git"))) {
    git init
}

try {
    $null = git remote get-url origin 2>$null
    $originExists = ($LASTEXITCODE -eq 0)
} catch {
    $originExists = $false
}

if ($originExists) {
    git remote set-url origin $remoteUrl | Out-Null
} else {
    git remote add origin $remoteUrl
}

try {
    git fetch origin --prune 2>$null | Out-Null
} catch {
    # Ignore fetch failures (e.g. repo not created yet).
}

git checkout -B $Branch

# Remove common local artifacts from the index even if they were previously committed.
$pathsToUntrack = @(
    "node_modules",
    "dist",
    "dev-dist",
    "playwright-report",
    "test-results",
    "coverage",
    ".wrangler",
    ".env",
    ".env.local",
    ".env.production"
)

foreach ($path in $pathsToUntrack) {
    try {
        git rm -r --cached --ignore-unmatch $path 2>$null | Out-Null
    } catch {
        # ignore
    }
}

git add -A

$commitArgs = @("commit", "-m", $CommitMessage)
if ($NoVerify) {
    $commitArgs += "--no-verify"
}

try {
    & git @commitArgs | Out-Null
} catch {
    Write-Host "Commit skipped/failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Pushing..."
$pushArgs = @("push", "-u", "origin", $Branch)
if ($NoThin) {
    $pushArgs += "--no-thin"
}
if ($ForcePush) {
    $pushArgs += "--force"
}
& git @pushArgs

Write-Host ""
Write-Host "Done: https://github.com/$RepoOwner/$RepoName"
