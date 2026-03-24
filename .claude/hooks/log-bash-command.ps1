# Log bash commands to audit trail
try {
    $stdinContent = @($input)
    if ($stdinContent.Count -gt 0) {
        $json = $stdinContent -join "`n" | ConvertFrom-Json
        $command = $json.tool_input.command
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $logEntry = "[$timestamp] $command"
        Add-Content -Path "C:\dev\.claude\bash-commands.log" -Value $logEntry -ErrorAction SilentlyContinue
    }
} catch {
    # Silently fail - don't block the hook
}
