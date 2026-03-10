# Set-McpEnv.ps1
# Sets persistent environment variables for MCP servers
# Run this script as Administrator to set system-wide variables, or it will set User-level variables by default.

Write-Host "Setting up MCP Environment Variables..." -ForegroundColor Cyan

# Helper function
function Set-EnvVar {
    param (
        [string]$Name,
        [string]$Value
    )
    if ($Value -match "YOUR_.*_HERE" -or [string]::IsNullOrWhiteSpace($Value)) {
        Write-Host "⚠️  MISSING VALUE for $Name. Please edit this script to set it." -ForegroundColor Yellow
    }
    else {
        [System.Environment]::SetEnvironmentVariable($Name, $Value, [System.EnvironmentVariableTarget]::User)
        Write-Host "✅ Set $Name" -ForegroundColor Green
    }
}

# --- Keys found in configuration/docs ---
# Do NOT commit real keys here. Use placeholders and set values locally.
Set-EnvVar "TAVILY_API_KEY" "tvly_YOUR_TAVILY_API_KEY_HERE"
Set-EnvVar "SUPABASE_ACCESS_TOKEN" "sbp_YOUR_SUPABASE_ACCESS_TOKEN_HERE"

# --- Keys required but currently missing (Placeholders) ---
# Please replace these values with your actual API keys
Set-EnvVar "GITHUB_PERSONAL_ACCESS_TOKEN" "YOUR_GITHUB_ACCESS_TOKEN_HERE"
Set-EnvVar "CONTEXT7_API_KEY" "YOUR_CONTEXT7_API_KEY_HERE"
Set-EnvVar "PERPLEXITY_API_KEY" "pplx-YOUR_PERPLEXITY_API_KEY_HERE"
Set-EnvVar "KAGI_API_KEY" "YOUR_KAGI_API_KEY_HERE"
Set-EnvVar "JINA_AI_API_KEY" "jina_YOUR_JINA_AI_API_KEY_HERE"
Set-EnvVar "BRAVE_API_KEY" "YOUR_BRAVE_API_KEY_HERE"
Set-EnvVar "FIRECRAWL_API_KEY" "fc-YOUR_FIRECRAWL_API_KEY_HERE"

Write-Host "`nEnvironment variables updated (User scope)." -ForegroundColor Cyan
Write-Host "Please restart your terminal and the Gemini CLI/Extension for changes to take effect." -ForegroundColor Cyan
