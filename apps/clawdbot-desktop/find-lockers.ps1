# Find processes accessing clawdbot files
$targetPath = "$env:USERPROFILE\.clawdbot"

# List all node processes with their command lines
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object {
    [PSCustomObject]@{
        PID = $_.ProcessId
        CommandLine = $_.CommandLine
    }
} | Where-Object { $_.CommandLine -like "*clawdbot*" -or $_.CommandLine -like "*$targetPath*" } | Format-Table -AutoSize

# Also show any processes with handles to auth-profiles.json
Write-Host "`nLooking for processes with open handles to clawdbot files..."
Write-Host "If empty, the locking process may have terminated but windows didn't release."
Write-Host ""
Write-Host "SOLUTION: Delete the locked file and let clawdbot recreate it:"
Write-Host "Remove-Item '$env:USERPROFILE\.clawdbot\agents\main\agent\auth-profiles.json' -Force -ErrorAction SilentlyContinue"
