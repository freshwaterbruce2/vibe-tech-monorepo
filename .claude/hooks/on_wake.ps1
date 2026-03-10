
# MoltBot Wake Hook - Context Refresh
$LogPath = "D:\logs\moltbot\wake.log"
$Date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Ensure log directory exists
if (!(Test-Path "D:\logs\moltbot")) {
    New-Item -ItemType Directory -Force -Path "D:\logs\moltbot" | Out-Null
}

try {
    "$Date [WAKE] Triggering context refresh..." | Out-File -FilePath $LogPath -Append

    # 1. Trigger Memory Refresh via Signal
    Set-Content -Path "C:\Users\fresh_zxae3v6\.openclaw\wake_signal" -Value $Date

    # 2. Read recent insights from Learning System (Simulated read for log)
    if (Test-Path "D:\learning-system\learning_insights.json") {
        $Insights = Get-Content "D:\learning-system\learning_insights.json" -Raw
        "$Date [WAKE] Insights available: $($Insights.Length) bytes" | Out-File -FilePath $LogPath -Append
    }
}
catch {
    "$Date [ERROR] Wake hook failed: $_" | Out-File -FilePath $LogPath -Append
}
