# Clear stale .git/index.lock before git operations
# Prevents Serena MCP server race condition with git index.lock
$lockFile = Join-Path $env:PROJECT_DIR ".git\index.lock"
if (Test-Path $lockFile) {
    $age = (Get-Date) - (Get-Item $lockFile).LastWriteTime
    if ($age.TotalSeconds -gt 5) {
        Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
    }
}
