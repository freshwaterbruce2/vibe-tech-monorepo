#!/usr/bin/env powershell
# Debug hook to see what data Claude Code provides

$DebugLog = "D:\learning-system\temp\hook-debug.log"

# Log all parameters
$LogEntry = @"
=== DEBUG HOOK EXECUTION $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===
Script Args Count: $($args.Count)
Args: $args
`$ToolName: $ToolName
`$Success: $Success
`$ToolOutput: $ToolOutput
`$ErrorMessage: $ErrorMessage

Environment Variables:
$(Get-ChildItem env: | Where-Object { $_.Name -like '*CLAUDE*' -or $_.Name -like '*TOOL*' } | Format-List | Out-String)

All Params:
$(Get-Variable | Where-Object { $_.Name -like '*Tool*' -or $_.Name -like '*Success*' } | Format-List | Out-String)
==========
"@

Add-Content -Path $DebugLog -Value $LogEntry -ErrorAction SilentlyContinue

exit 0
