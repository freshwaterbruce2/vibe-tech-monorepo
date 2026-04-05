# Clear stale .git/index.lock before git/Serena operations
# Prevents Serena MCP server race condition with git index.lock
$projectDir = if ($env:PROJECT_DIR) { $env:PROJECT_DIR } else { 'C:\dev' }
$lockFile = Join-Path $projectDir ".git\index.lock"
if (-not (Test-Path $lockFile)) { exit 0 }

$age = (Get-Date) - (Get-Item $lockFile).LastWriteTime
# If lock is older than 2s, it's almost certainly stale — remove unconditionally
if ($age.TotalSeconds -gt 2) {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
    exit 0
}
# If lock is fresh (<2s), only remove if no git.exe is actually running
$gitProcs = Get-Process -Name 'git' -ErrorAction SilentlyContinue
if (-not $gitProcs) {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
}
