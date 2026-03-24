# TypeScript type checking after TS file changes
try {
    $stdinContent = @($input)
    if ($stdinContent.Count -gt 0) {
        $json = $stdinContent -join "`n" | ConvertFrom-Json -ErrorAction SilentlyContinue

        # Get file path from tool response or input
        $filePath = $json.tool_response.filePath
        if (-not $filePath) {
            $filePath = $json.tool_input.file_path
        }

        # Only run tsc on TS/TSX files
        if ($filePath -and ($filePath -match '\.(ts|tsx)$')) {
            # Run type check in the project root
            $projectRoot = "C:\dev"
            Push-Location $projectRoot -ErrorAction SilentlyContinue
            npx tsc --noEmit 2>$null | Out-Null
            Pop-Location -ErrorAction SilentlyContinue
        }
    }
} catch {
    # Silently fail - don't block the hook
}
