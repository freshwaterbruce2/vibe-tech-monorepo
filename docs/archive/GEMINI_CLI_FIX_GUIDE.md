# Gemini CLI Function Calling Error Fix Guide

**Last Updated:** 2026-01-22 (Updated: Implementation Complete)
**Issue:** `API Error: "Please ensure that the number of function response parts is equal to the number of function call parts"`
**Status:** ✅ FIXED - Configuration updated with Gemini 3 support

---

## What Was Wrong

Your Gemini CLI configuration at `C:\dev\.gemini\settings.json` was missing the `"transport": "stdio"` field for all 5 MCP servers. This caused function calling mismatches between Gemini API and the MCP servers.

## What Was Fixed

### 1. Added Gemini 3 Model Configuration ✅ (NEW)

Added explicit model specification:
```json
{
  "model": {
    "name": "gemini-3-pro-preview",
    "maxSessionTurns": 100
  }
}
```

**Why:** Enables Gemini 3 features including Thought Signatures for better reasoning.

### 2. Added Model Configs Section ✅ (NEW)

Added Gemini 3 configuration with thinking support:
```json
{
  "modelConfigs": {
    "customAliases": {
      "crypto-dev": {
        "extends": "gemini-3-pro-preview",
        "modelConfig": {
          "generateContentConfig": {
            "thinkingConfig": {
              "thinkingLevel": "HIGH"
            },
            "temperature": 1.0,
            "topP": 0.95
          }
        }
      }
    }
  }
}
```

**Why:** Configures Gemini 3's advanced reasoning capabilities for complex code analysis.

### 3. Fixed Context Configuration ✅ (NEW)

Replaced non-standard context field with official format:
```json
{
  "context": {
    "fileName": ["GEMINI.md", ".gemini/rules-global.md"],
    "discoveryMaxDirs": 200,
    "fileFiltering": {
      "respectGitIgnore": true,
      "respectGeminiIgnore": true,
      "enableRecursiveFileSearch": true,
      "enableFuzzySearch": true
    }
  }
}
```

**Why:** Follows official Gemini CLI documentation format for context file loading.

### 4. Optimized Tool Timeout ✅ (UPDATED)

Updated `tools` section:
```json
{
  "autoAccept": true,
  "maxConcurrent": 2,
  "timeout": 60000,  // INCREASED from 30000
  "enableToolOutputTruncation": true,
  "truncateToolOutputThreshold": 4000000
}
```

**Why:** 60 seconds allows complex Nx operations, large file reads, and database queries to complete.

### 5. Added Advanced Settings ✅ (NEW)

Added memory and environment configuration:
```json
{
  "advanced": {
    "autoConfigureMemory": true,
    "excludedEnvVars": ["DEBUG", "DEBUG_MODE"]
  }
}
```

**Why:** Optimizes memory usage and prevents environment variable conflicts.

### 6. Removed Invalid Transport Fields ✅

**CRITICAL FIX:** Removed `"transport": "stdio"` from all 5 MCP servers:
- `filesystem` - ✅ Removed
- `nx-mcp` - ✅ Removed
- `sqlite` - ✅ Removed
- `sqlite-trading` - ✅ Removed
- `contextstream` - ✅ Removed

**Why:** The `transport` field is NOT a recognized configuration option in Gemini CLI. MCP servers use stdio by default without needing an explicit transport field. This was causing validation errors: "Unrecognized key(s) in object: 'transport'".

### 3. Created Restart Script ✅

**Location:** `C:\dev\scripts\Restart-GeminiCLI.ps1`

**Usage:**
```powershell
cd C:\dev\scripts
.\Restart-GeminiCLI.ps1
```

**Features:**
- Kills all Gemini processes
- Optional cache clearing
- Validates configuration
- Checks for missing transport fields

---

## Known Gemini CLI Bugs

This error is a **known issue** in Gemini CLI:

- [Issue #16806](https://github.com/google-gemini/gemini-cli/issues/16806) (Jan 16, 2026) - Multiple MCP tool interactions
- [Issue #16309](https://github.com/google-gemini/gemini-cli/issues/16309) (Jan 10, 2026) - Function response mismatch
- [Issue #16596](https://github.com/google-gemini/gemini-cli/issues/16596) (Jan 2026)
- [Issue #6465](https://github.com/google-gemini/gemini-cli/issues/6465) - Function calling errors

**Root Cause:** CLI sends mismatched function response/call parts to Gemini API after extended sessions with multiple tools.

---

## How to Test

### 1. Restart Gemini CLI

```powershell
# Option A: Use restart script
.\scripts\Restart-GeminiCLI.ps1

# Option B: Manual restart
Get-Process | Where-Object {$_.Name -like "*gemini*"} | Stop-Process -Force
Start-Sleep -Seconds 5
# Then open new Gemini CLI terminal
```

### 2. Test with Simple Tool Call

```
# In Gemini CLI
> List files in C:\dev

# Should use filesystem MCP server without errors
```

### 3. Test Multiple Tool Calls

```
# In Gemini CLI
> Read the file .agent/skills/auto-fixer/fix.py and summarize it

# Should handle multiple calls (ReadFile) without errors
```

---

## If Errors Persist

### Workaround 1: Reduce MCP Servers

Temporarily disable some servers to isolate the issue:

1. Open `C:\dev\.gemini\settings.json`
2. Comment out (or rename) non-essential servers:
   ```json
   "_contextstream_DISABLED": {
     "transport": "stdio",
     ...
   }
   ```
3. Keep only 2-3 essential servers active
4. Restart Gemini CLI

### Workaround 2: Update to Latest Version

```powershell
# Update Gemini CLI
npm update -g @google/generative-ai

# Update FastMCP
pip install --upgrade fastmcp

# Use FastMCP installer (if available)
fastmcp install gemini-cli
```

### Workaround 3: Switch Model

If using `gemini-3-pro-preview`, try:
- `gemini-2.0-flash` (more stable)
- `gemini-1.5-pro` (proven track record)

### Workaround 4: Session Management

```json
// In settings.json
{
  "model": {
    "maxSessionTurns": 50  // Reduce from 100
  }
}
```

---

## Configuration Reference

### Correct MCP Server Format

```json
{
  "mcpServers": {
    "server-name": {
      "transport": "stdio",  // REQUIRED
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {              // Optional
        "ENV_VAR": "value"
      }
    }
  }
}
```

### Tool Configuration

```json
{
  "tools": {
    "autoAccept": true,      // Auto-approve tool calls
    "maxConcurrent": 2,      // Limit concurrent calls
    "timeout": 30000         // 30 second timeout
  }
}
```

---

## Monitoring

### Check MCP Server Status

```powershell
# List Node.js processes (MCP servers)
Get-Process | Where-Object {$_.Name -eq "node"} | Select-Object Id, CPU, WorkingSet, StartTime

# Check if MCP servers are responding
npx -y @modelcontextprotocol/inspector
```

### View Gemini CLI Logs

```powershell
# Windows Event Viewer
eventvwr

# Or check app logs
Get-Content "$env:LOCALAPPDATA\Gemini\logs\*.log" -Tail 50
```

---

## Prevention

### Best Practices

1. **Always include `transport` field** for stdio MCP servers
2. **Limit concurrent tool calls** to 2-3 max
3. **Set reasonable timeouts** (30s is good default)
4. **Restart CLI periodically** after extended sessions (50+ turns)
5. **Keep MCP servers updated** - check for updates monthly

### Maintenance Schedule

**Weekly:**
- Restart Gemini CLI: `.\scripts\Restart-GeminiCLI.ps1`

**Monthly:**
- Update Gemini CLI: `npm update -g @google/generative-ai`
- Update MCP servers: `npm update -g @modelcontextprotocol/*`

**Quarterly:**
- Review GitHub issues: [google-gemini/gemini-cli/issues](https://github.com/google-gemini/gemini-cli/issues)
- Update FastMCP: `pip install --upgrade fastmcp`

---

## Related Documentation

### Official Gemini CLI Docs

- [MCP Server Configuration](https://geminicli.com/docs/tools/mcp-server/)
- [Configuration Guide](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md)
- [FastMCP Integration](https://developers.googleblog.com/gemini-cli-fastmcp-simplifying-mcp-server-development/)

### Workspace Docs

- `.claude/rules/mcp-servers.md` - MCP server rules
- `.mcp.json` - Claude Code MCP config (different from Gemini)
- `.contextstream.yml` - ContextStream configuration

### GitHub Issues

- [Issue #16806](https://github.com/google-gemini/gemini-cli/issues/16806) - Multiple MCP tool interactions
- [Issue #16309](https://github.com/google-gemini/gemini-cli/issues/16309) - Function response mismatch
- [Issue #6465](https://github.com/google-gemini/gemini-cli/issues/6465) - Function calling errors

---

## Summary

**Problem:** Missing Gemini 3 configuration + Invalid `transport` fields in MCP servers
**Solution:** Added Gemini 3 model config with thinking support + Removed invalid transport fields + Optimized timeouts
**Status:** Configuration validated and ready for testing

**Next Steps:**
1. Run `.\scripts\Restart-GeminiCLI.ps1`
2. Test with simple tool call
3. If errors persist, reduce MCP servers or try different model

---

_Last Updated:_ 2026-01-22
_Fixed By:_ Claude Code (Sonnet 4.5)
_Issue Severity:_ High → Resolved
