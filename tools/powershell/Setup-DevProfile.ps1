# Setup PowerShell Profile for Solo Developer Best Practices
# Run this once to configure your PowerShell environment

$profilePath = $PROFILE.CurrentUserAllHosts
$profileDir = Split-Path $profilePath

# Create profile directory if it doesn't exist
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

# Profile content
$profileContent = @'
# Solo Developer PowerShell Profile - 2025 Best Practices

# Set execution policy for development
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force -ErrorAction SilentlyContinue

# Import custom modules
$devModule = "C:\dev\tools\powershell\DevAutomation.psm1"
if (Test-Path $devModule) {
    Import-Module $devModule -Force
}

# Set aliases for common tasks
Set-Alias -Name dev -Value Start-DevEnvironment
Set-Alias -Name metrics -Value Get-DevMetrics
Set-Alias -Name compliance -Value Test-CodeCompliance
Set-Alias -Name monitor -Value Start-MonitoringDashboard

# Quick navigation
function cdev { Set-Location C:\dev }
function ddata { Set-Location D:\ }
function dlogs { Set-Location D:\logs }
function ddb { Set-Location D:\databases }

# Git aliases
function gs { git status }
function gp { git pull }
function gc { param($m) git commit -m $m }
function gca { git commit --amend --no-edit }
function gl { git log --oneline -10 }

# Nx/pnpm aliases
function nx { pnpm nx $args }
function nxdev { param($project) pnpm nx dev $project }
function nxtest { pnpm nx run-many -t test }
function nxbuild { pnpm nx run-many -t build }
function nxlint { pnpm nx run-many -t lint }

# AI assistant helpers
function claude {
    Set-Location C:\dev
    claude-code
}

# Docker helpers
function dps { docker ps }
function dstart { Start-Service "com.docker.service" }
function dstop { Stop-Service "com.docker.service" }

# Show current directory in prompt with git branch
function prompt {
    $branch = ""
    if (Test-Path .git) {
        $branch = git branch --show-current 2>$null
        if ($branch) { $branch = " [$branch]" }
    }

    $path = (Get-Location).Path.Replace($HOME, "~")
    Write-Host "$path" -NoNewline -ForegroundColor Cyan
    Write-Host "$branch" -NoNewline -ForegroundColor Yellow
    return "> "
}

# Welcome message
Write-Host "`n🚀 Solo Developer Environment Loaded" -ForegroundColor Magenta
Write-Host "Type 'Get-Command -Module DevAutomation' for custom commands" -ForegroundColor Gray
Write-Host ""

# Auto-navigate to monorepo on startup
if (Test-Path C:\dev) {
    Set-Location C:\dev
}
'@

# Write profile
$profileContent | Out-File -FilePath $profilePath -Encoding UTF8 -Force

Write-Host "✅ PowerShell profile created at: $profilePath" -ForegroundColor Green
Write-Host "✅ Restart PowerShell to load the new profile" -ForegroundColor Yellow

# Install Oh-My-Posh for better prompt (optional)
$installOMP = Read-Host "Install Oh-My-Posh for enhanced prompt? (y/n)"
if ($installOMP -eq 'y') {
    winget install JanDeDobbeleer.OhMyPosh -s winget
    Write-Host "✅ Oh-My-Posh installed. Configure themes with 'oh-my-posh init pwsh'" -ForegroundColor Green
}