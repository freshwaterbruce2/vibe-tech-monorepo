# Sync Memory on Startup Helper
# Automatically runs sync_agents_memory.py to update AGENTS.md on IDE or terminal startup

$ErrorActionPreference = "SilentlyContinue"

$SyncScript = "D:\learning-system\scripts\sync_agents_memory.py"
$TargetAgentsFile = "V:\monorepo\AGENTS.md"

try {
    if (Test-Path $SyncScript) {
        if (Test-Path $TargetAgentsFile) {
            python $SyncScript --target $TargetAgentsFile | Out-Null
        } else {
            python $SyncScript | Out-Null
        }
    }
} catch {
    # Fail silently to prevent terminal/IDE boot blocking
}
