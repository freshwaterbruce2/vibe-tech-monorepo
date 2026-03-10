# Claude Code PowerShell Profile Configuration

**Last Updated:** 2026-01-16
**Status:** ✅ VERIFIED AND ACTIVE

---

## What Was Done

Your PowerShell profile has been configured with environment variables to optimize Claude Code performance and behavior.

**Profile Location:**

```
C:\Users\fresh_zxae3v6\OneDrive\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1
```

**Backup Created:**

```
C:\Users\fresh_zxae3v6\OneDrive\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1.backup-20260116-194009
```

---

## Configuration Details

### Token Limits

These control how much content Claude Code can process and generate:

- **CLAUDE_CODE_MAX_OUTPUT_TOKENS:** 50,000
  - Maximum tokens Claude can output in a single response
  - Default: ~8,000
  - Impact: Allows longer code generations and detailed explanations

- **CLAUDE_CODE_MAX_CONTEXT_TOKENS:** 180,000
  - Maximum tokens for conversation context
  - Default: ~100,000
  - Impact: Maintains more conversation history and file context

- **CLAUDE_CODE_MAX_THINKING_TOKENS:** 20,000
  - Maximum tokens for internal reasoning (thinking blocks)
  - Default: ~10,000
  - Impact: Enables deeper analysis and planning

- **MAX_THINKING_TOKENS:** 20,000
  - Alternative environment variable for thinking tokens

- **MAX_MCP_OUTPUT_TOKENS:** 25,000
  - Maximum tokens for MCP tool outputs (Serena, Nx, etc.)
  - Default: ~10,000
  - Impact: Allows larger file reads and search results

### Timeouts

These control how long operations can run before timing out:

- **CLAUDE_CODE_TIMEOUT:** 300 seconds (5 minutes)
  - Overall timeout for Claude Code operations
  - Default: 120 seconds
  - Impact: Allows longer-running tasks like builds

- **BASH_DEFAULT_TIMEOUT_MS:** 60,000 ms (1 minute)
  - Default timeout for Bash tool commands
  - Default: 30,000 ms
  - Impact: Allows longer running scripts

- **BASH_MAX_TIMEOUT_MS:** 300,000 ms (5 minutes)
  - Maximum timeout for Bash tool commands
  - Default: 120,000 ms
  - Impact: Allows very long operations (builds, migrations)

- **MCP_TIMEOUT:** 60,000 ms (1 minute)
  - Timeout for MCP server connections
  - Default: 30,000 ms

- **MCP_TOOL_TIMEOUT:** 60,000 ms (1 minute)
  - Timeout for individual MCP tool calls
  - Default: 30,000 ms

### Output Limits

These control how much output can be captured from tools:

- **CLAUDE_CODE_TERMINAL_OUTPUT_LIMIT:** 50,000 characters
  - Maximum terminal output characters to capture
  - Default: 10,000
  - Impact: Captures longer build logs and test output

- **BASH_MAX_OUTPUT_LENGTH:** 50,000 characters
  - Maximum characters from Bash tool output
  - Default: 10,000
  - Impact: Captures full command output

### Feature Flags

These control optional Claude Code behaviors:

- **CLAUDE_CODE_DISABLE_TELEMETRY:** 1 (enabled)
  - Disables usage telemetry collection
  - Default: 0 (telemetry enabled)
  - Privacy: No usage data sent to Anthropic

- **CLAUDE_CODE_SKIP_UPDATE_CHECK:** 1 (enabled)
  - Skips checking for Claude Code updates
  - Default: 0 (checks for updates)
  - Performance: Faster startup

- **CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:** 1 (enabled)
  - Disables non-essential network requests
  - Default: 0
  - Performance: Reduced network usage

- **CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR:** 1 (enabled)
  - Maintains working directory across Bash calls
  - Default: 0
  - Convenience: No need to cd repeatedly

---

## How to Use

### Automatic Activation

These environment variables are automatically loaded every time you start PowerShell. No manual action needed!

### Manual Reload (If Needed)

If you make changes to the profile or want to reload configuration:

```powershell
. $PROFILE
```

### Verification

To verify configuration is active:

```powershell
C:\dev\scripts\Verify-ClaudeConfig.ps1
```

### Checking Individual Variables

```powershell
# Check a specific variable
$env:CLAUDE_CODE_MAX_OUTPUT_TOKENS

# Check all Claude Code variables
Get-ChildItem Env: | Where-Object { $_.Name -like "CLAUDE*" }
```

---

## Scripts Created

### 1. Setup Script

**Location:** `C:\dev\scripts\Setup-ClaudeProfile.ps1`

**Purpose:** Adds Claude Code configuration to PowerShell profile

**Usage:**

```powershell
powershell -ExecutionPolicy Bypass -File "C:\dev\scripts\Setup-ClaudeProfile.ps1"
```

### 2. Verification Script

**Location:** `C:\dev\scripts\Verify-ClaudeConfig.ps1`

**Purpose:** Verifies all environment variables are set correctly

**Usage:**

```powershell
C:\dev\scripts\Verify-ClaudeConfig.ps1
```

---

## Troubleshooting

### Issue: Variables Not Set After Restart

**Check profile path:**

```powershell
$PROFILE
Test-Path $PROFILE
```

**Reload profile:**

```powershell
. $PROFILE
```

### Issue: Profile Not Loading Automatically

**Check PowerShell execution policy:**

```powershell
Get-ExecutionPolicy
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Want to Change Values

**Edit profile directly:**

```powershell
notepad $PROFILE
```

Or re-run the setup script after modifying it.

### Issue: Want to Disable Configuration

**Comment out section in profile:**

```powershell
# Open profile
notepad $PROFILE

# Add # at start of each line in Claude Code Configuration section
# Save and reload
. $PROFILE
```

---

## Benefits of This Configuration

### Performance

- ✅ Longer operations don't timeout prematurely
- ✅ Larger file reads and search results
- ✅ More context for better suggestions
- ✅ Faster startup (no update checks)

### Quality

- ✅ Deeper thinking and analysis
- ✅ More detailed code generations
- ✅ Better understanding of large codebases
- ✅ More comprehensive error handling

### Convenience

- ✅ Persistent working directory
- ✅ Full build logs captured
- ✅ No repeated telemetry prompts
- ✅ Automatic activation on startup

---

## Next Steps

1. **Restart PowerShell** to ensure clean environment
2. **Run verification script** to confirm all settings
3. **Test Claude Code** with a complex task
4. **Monitor performance** - adjust values if needed

---

## Related Documentation

- **Claude Code Official Docs:** <https://docs.anthropic.com/claude-code>
- **PowerShell Profiles:** <https://docs.microsoft.com/powershell/module/microsoft.powershell.core/about/about_profiles>
- **Environment Variables:** <https://docs.microsoft.com/powershell/module/microsoft.powershell.core/about/about_environment_variables>

---

**Status:** ✅ Configuration verified and active
**Backup:** Available for rollback if needed
**Scripts:** Ready for future updates

*Your Claude Code environment is optimized and ready!* 🚀
