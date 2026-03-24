# Run tests after code modifications
try {
    $stdinContent = @($input)
    if ($stdinContent.Count -gt 0) {
        $json = $stdinContent -join "`n" | ConvertFrom-Json -ErrorAction SilentlyContinue

        # Get file path from tool response or input
        $filePath = $json.tool_response.filePath
        if (-not $filePath) {
            $filePath = $json.tool_input.file_path
        }

        # Only run tests for source files (not test files themselves)
        if ($filePath -match '\.(ts|tsx|js|jsx)$' -and $filePath -notmatch '\.(test|spec)\.(ts|tsx|js|jsx)$') {
            $testFile = $filePath -replace '\.(ts|tsx|js|jsx)$', '.test.$1'
            if (Test-Path $testFile) {
                Push-Location "C:\dev" -ErrorAction SilentlyContinue
                pnpm run test -- "$testFile" 2>$null | Out-Null
                Pop-Location -ErrorAction SilentlyContinue
            }
        }
    }
} catch {
    # Silently fail - don't block the hook
}
