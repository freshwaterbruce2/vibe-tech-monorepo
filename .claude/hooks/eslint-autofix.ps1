# ESLint auto-fix after code changes.
# Standalone utility — not wired in project settings.json (global hook handles this).
# Can be invoked manually or wired up as an alternative to the global hook.

$ErrorActionPreference = 'SilentlyContinue'

$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

try {
    $json = $raw | ConvertFrom-Json -ErrorAction Stop
    $filePath = $json.tool_input.file_path
    if ($filePath -and ($filePath -match '\.(js|jsx|ts|tsx)$')) {
        npx eslint "$filePath" --fix --quiet 2>$null | Out-Null
    }
} catch {}
