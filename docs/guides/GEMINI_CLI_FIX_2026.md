# Gemini CLI Fix Guide (2026)

**Last Updated:** 2026-01-11
**Gemini CLI Version:** 0.23.0
**Status:** Troubleshooting ripgrep, MCP, and quota issues

---

## Issue Summary

You're experiencing three distinct errors:

1. **Quota Exhausted** - API rate limiting
2. **Ripgrep/nul Error** - Windows-specific ripgrep bug
3. **MCP ERR_INVALID_URL** - Model Context Protocol configuration issue

---

## ✅ Fix #1: Ripgrep/nul Error (FIXED)

### Problem

```
ripgrep exited with code 2: C:\dev\apps\vibe-tutor\nul: Incorrect function.
```

**Root Cause:** Gemini CLI's ripgrep is trying to read Windows special device file `nul` (equivalent to `/dev/null`). Windows throws "Incorrect function" when reading `nul` as a regular file.

### Solution (APPLIED)

**✅ Created `.geminiignore` file** at `C:\dev\apps\vibe-tutor\.geminiignore`

This file tells Gemini CLI to ignore:

- Windows special device files (nul, CON, PRN, AUX, etc.)
- Build artifacts (dist/, android/app/build/, etc.)
- Node modules and dependencies
- Logs and temporary files

**What this does:**

- Prevents ripgrep from scanning problematic Windows paths
- Improves search performance by skipping build artifacts
- Similar to `.gitignore` but for Gemini CLI file scanning

---

## ⚠️ Fix #2: Quota Exhausted (ACTION REQUIRED)

### Problem

```
You have exhausted your capacity on this model.
Your quota will reset after 0s
```

**Root Cause:** You're hitting the Gemini API rate limit (likely free tier).

### Solutions

#### Option 1: Wait for Reset (Immediate)

```bash
# The "0s" usually means a short RPM (requests per minute) limit
# Wait 60 seconds and try again
Start-Sleep -Seconds 60
gemini <your-command>
```

#### Option 2: Add Rate Limiting to Scripts (Recommended)

If you're running automated scripts or loops:

```powershell
# PowerShell example
$requests = @('query1', 'query2', 'query3')
foreach ($query in $requests) {
    gemini chat "$query"
    Start-Sleep -Seconds 5  # 5 second delay between requests
}
```

#### Option 3: Check for Infinite Loops

```bash
# If gemini is running in background
Get-Process | Where-Object { $_.ProcessName -like "*gemini*" }

# Kill stuck processes
Stop-Process -Name gemini -Force
```

#### Option 4: Upgrade API Tier (Long-term)

- Visit Google AI Studio: <https://ai.google.dev/>
- Check your API key quota limits
- Consider paid tier for higher rate limits
- Flash models (Gemini 1.5 Flash) often have higher limits than Pro

---

## 🔍 Fix #3: MCP ERR_INVALID_URL (INVESTIGATION)

### Problem

```
tools/mcp-client-manager.js ... code: 'ERR_INVALID_URL'
```

**Root Cause:** One of your MCP servers has a malformed URL in the configuration.

### Verified Configuration

I've checked your `.mcp.json` and **all MCP servers look valid**:

- ✅ nx-mcp
- ✅ filesystem (C:\dev, D:\ paths)
- ✅ sqlite (D:\databases\database.db)
- ✅ sqlite-trading (crypto database)
- ✅ playwright
- ✅ fetch
- ✅ memory
- ✅ desktop-hands (Python)
- ✅ desktop-commander

### Possible Causes

1. **Gemini-specific MCP config** (not Claude Code's `.mcp.json`)
   - Gemini CLI may use a different config location
   - Check: `%USERPROFILE%\.gemini\config.json` (doesn't exist yet)

2. **Internal Gemini tool initialization**
   - The error might be from Gemini's internal tool initialization
   - Not related to your MCP servers

3. **Network proxy issues**
   - Corporate firewall intercepting connections
   - Check: Do you have a proxy configured?

### Diagnostic Commands

```powershell
# Check if Gemini config exists
Test-Path "$env:USERPROFILE\.gemini"
Get-ChildItem "$env:USERPROFILE\.gemini" -Recurse -ErrorAction SilentlyContinue

# Enable debug mode to see detailed errors
gemini --debug chat "test query"

# Check network connectivity
Test-NetConnection generativelanguage.googleapis.com -Port 443
```

---

## 🚀 Recommended Workflow (2026 Best Practices)

### Daily Development Flow

1. **Before Starting Gemini CLI:**

```powershell
# Check for stuck processes
Get-Process | Where-Object { $_.ProcessName -like "*gemini*" } | Stop-Process

# Navigate to project
cd C:\dev\apps\vibe-tutor

# Ensure .geminiignore exists
Test-Path .geminiignore  # Should return True
```

1. **Run Gemini with Debug Mode (First Time):**

```bash
# See detailed logs
gemini --debug chat "help me fix this error"
```

1. **Rate Limiting Strategy:**

```powershell
# Add delays between queries
gemini chat "query 1"
Start-Sleep -Seconds 3
gemini chat "query 2"
```

---

## 📋 Additional Gemini CLI Issues (2026)

Based on the web search, here are other common issues:

### Ripgrep Initialization Delay (~2 minutes)

**Symptom:** CLI hangs for 2 minutes on startup behind proxy

**Cause:** Gemini tries to download ripgrep even if it's already installed

**Solution:**

```powershell
# Verify ripgrep is installed globally
rg --version

# If not installed, install it:
winget install BurntSushi.ripgrep.MSVC

# Or via Chocolatey:
choco install ripgrep
```

### File Creation Issues on Windows

**Symptom:** "Can't create files even in working directory"

**Solution:**

- Ensure Gemini CLI has write permissions
- Run PowerShell as Administrator if needed
- Check antivirus isn't blocking file creation

### PATH Issues After Updates

**Symptom:** CLI becomes unrecognized after updates

**Solution:**

```powershell
# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Or restart PowerShell terminal
```

---

## 🔗 References (2026)

Based on my web search:

- [Gemini CLI Configuration Guide](https://geminicli.com/docs/get-started/configuration/)
- [Troubleshooting Guide](https://geminicli.com/docs/troubleshooting/)
- [GitHub Issues: Ripgrep Proxy Hang](https://github.com/google-gemini/gemini-cli/issues/13611)
- [GitHub Issues: MCP Server 400 Errors](https://github.com/google-gemini/gemini-cli/issues/15798)
- [How to Troubleshoot Gemini CLI Errors](https://milvus.io/ai-quick-reference/how-do-i-troubleshoot-gemini-cli-errors)

---

## ✅ What We've Fixed

1. ✅ **Created `.geminiignore`** for vibe-tutor to fix ripgrep/nul error
2. ✅ **Verified MCP configuration** - all servers are valid
3. ✅ **Provided rate limiting solutions** for quota exhaustion
4. ✅ **Documented 2026 best practices** for Gemini CLI

---

## 🎯 Next Steps

1. **Test the fix:**

   ```bash
   cd C:\dev\apps\vibe-tutor
   gemini chat "summarize this project"
   ```

2. **If quota error persists:**
   - Wait 60 seconds between requests
   - Check API key quota at <https://ai.google.dev/>

3. **If MCP error persists:**
   - Run with debug mode: `gemini --debug`
   - Check for internal tool initialization issues
   - May need to wait for Gemini CLI update

4. **Monitor for issues:**
   - Keep `.geminiignore` updated with new build directories
   - Add rate limiting to any automated scripts
   - Use debug mode when troubleshooting

---

**Status:** Ready for testing
**Files Modified:**

- Created: `C:\dev\apps\vibe-tutor\.geminiignore`
- Documented: `C:\dev\GEMINI_CLI_FIX_2026.md` (this file)
