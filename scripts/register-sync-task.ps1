# PowerShell script to register a Windows Scheduled Task to auto-sync NotebookLM daily at 4:30 AM
$TaskName = "VibeTechNotebookLMSync"
$Description = "Daily auto-synchronization of local VibeTech monorepo docs and logs to NotebookLM"
$ScriptPath = "V:\monorepo\scripts\sync-notebooklm.py"
$PythonPath = (Get-Command python.exe -ErrorAction SilentlyContinue).Source

if (-not $PythonPath) {
    Write-Error "python.exe not found in PATH. Please install Python or add it to system PATH."
    exit 1
}

# Define the action to run the Python script
$Action = New-ScheduledTaskAction -Execute $PythonPath -Argument $ScriptPath -WorkingDirectory "V:\monorepo"

# Define the trigger (Daily at 4:30 AM)
$Trigger = New-ScheduledTaskTrigger -Daily -At 4:30am

# Define task settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the task
Register-ScheduledTask -TaskName $TaskName -Description $Description -Action $Action -Trigger $Trigger -Settings $Settings -Force

Write-Host "Successfully registered Windows Scheduled Task '$TaskName' to run daily at 4:30 AM."
