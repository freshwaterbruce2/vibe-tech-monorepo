# ESLint auto-fix after code changes
try {
    $stdinContent = @($input)
    if ($stdinContent.Count -gt 0) {
        $json = $stdinContent -join "`n" | ConvertFrom-Json -ErrorAction SilentlyContinue

        # Get file path from tool response or input
        $filePath = $json.tool_response.filePath
        if (-not $filePath) {
            $filePath = $json.tool_input.file_path
        }

        # Only run ESLint on JS/TS files
        if ($filePath -and ($filePath -match '\.(js|jsx|ts|tsx)$')) {
            npx eslint "$filePath" --fix --quiet 2>$null | Out-Null
        }
    }
} catch {
    # Silently fail - don't block the hook
}
