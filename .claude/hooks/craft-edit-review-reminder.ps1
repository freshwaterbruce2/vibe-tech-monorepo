# Fires after any Craft block mutation tool.
# Outputs a reminder injected into Claude's context so it knows to
# reference the edit-review panel and handle undo/redo context updates.

$raw = [Console]::In.ReadToEnd()
$resultJson = $env:CLAUDE_TOOL_RESULT

# Parse success flag from result
$success = $false
try {
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
        $hookData = $raw | ConvertFrom-Json -ErrorAction Stop
        $success = ($hookData.tool_response.success -eq $true) -or
            ($hookData.tool_response.is_error -eq $false)
    } elseif (-not [string]::IsNullOrWhiteSpace($resultJson)) {
        $result = $resultJson | ConvertFrom-Json -ErrorAction Stop
        $success = $result.success -eq $true
    }
} catch { }

if ($success) {
    Write-Output "CRAFT EDIT-REVIEW: The edit-review widget (ui://craft/edit-review) has received this mutation result. Tell the user the change is done and that they can Undo/Redo from the Craft review panel. Do NOT repeat the diff text — the widget shows it. If the user sends a context update like 'User clicked undo on the...', acknowledge the revert and adjust your plan."
} else {
    Write-Output "CRAFT EDIT-REVIEW: The Craft mutation tool returned an error or unexpected result. Check the tool output and report the issue to the user before retrying."
}
