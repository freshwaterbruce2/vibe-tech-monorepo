# Gemini CLI MCP Error Fix

**Issue:** `ERR_INVALID_URL` in `mcp-client-manager.js` + API 400 errors
**Root Cause:** Gemini CLI's MCP client can't parse some MCP server configurations in `.mcp.json`

---

## 🔍 Diagnosis from Error Logs

From the error report (`D:\temp\gemini-client-error-*.json`):

```json
{
  "error": {
    "code": 400,
    "message": "Request contains an invalid argument.",
    "status": "INVALID_ARGUMENT"
  }
}
```

**Location:** `mcp-client.js:981:27` → `mcp-client-manager.js:140:25`
**Error Code:** `ERR_INVALID_URL`
**Input:** `'...'` (empty/malformed URL)

---

## ✅ Solution 1: Create Gemini-Specific MCP Config (RECOMMENDED)

Gemini CLI looks for `.gemini/settings.json` for its own MCP configuration, separate from Claude Code's `.mcp.json`.

### Step 1: Create Gemini Settings Directory

```powershell
# Create Gemini workspace settings
New-Item -ItemType Directory -Path "C:\dev\.gemini" -Force
```

### Step 2: Create Gemini MCP Config

Create `C:\dev\.gemini\settings.json` with ONLY stable MCP servers:

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\npm\\node_modules\\@modelcontextprotocol\\server-filesystem\\dist\\index.js",
        "C:\\dev"
      ]
    },
    "sqlite": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\npm\\node_modules\\mcp-server-sqlite-npx\\dist\\index.js",
        "D:\\databases\\database.db"
      ]
    }
  },
  "experimental": {
    "enableMcp": true
  }
}
```

**Why this works:**

- Gemini CLI reads `.gemini/settings.json` for its own MCP config
- This keeps Gemini isolated from Claude Code's complex MCP setup
- Only includes fully compatible MCP servers (filesystem, sqlite)

---

## ✅ Solution 2: Disable MCP in Gemini CLI (QUICK FIX)

If you don't need MCP tools in Gemini CLI:

```powershell
# Disable MCP entirely for Gemini
'{"experimental": {"enableMcp": false}}' | Out-File -FilePath "C:\dev\.gemini\settings.json" -Encoding UTF8
```

**Result:** Gemini CLI will skip MCP loading, no more ERR_INVALID_URL errors.

---

## ✅ Solution 3: Fix Problematic MCP Servers in .mcp.json

The issue is that some MCP servers in your `.mcp.json` use `npx -y` which Gemini's MCP client doesn't handle well.

### Problematic Servers

```json
// ❌ PROBLEMATIC (Gemini can't parse npx -y)
"fetch": {
  "type": "stdio",
  "command": "cmd",
  "args": ["/c", "npx", "-y", "@anthropic-ai/mcp-server-fetch"]
},
"memory": {
  "type": "stdio",
  "command": "cmd",
  "args": ["/c", "npx", "-y", "@anthropic-ai/mcp-server-memory"]
}
```

### Fixed Version

```json
// ✅ FIXED (Use absolute paths)
"fetch": {
  "type": "stdio",
  "command": "node",
  "args": [
    "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\mcp-server-fetch\\dist\\index.js"
  ]
},
"memory": {
  "type": "stdio",
  "command": "node",
  "args": [
    "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\mcp-server-memory\\dist\\index.js"
  ]
}
```

---

## 🔧 Implementation (Recommended Approach)

Use Solution 1 (Gemini-specific config) for cleanest separation:

```powershell
# Step 1: Create Gemini workspace settings
New-Item -ItemType Directory -Path "C:\dev\.gemini" -Force

# Step 2: Create minimal MCP config for Gemini
@'
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\npm\\node_modules\\@modelcontextprotocol\\server-filesystem\\dist\\index.js",
        "C:\\dev"
      ]
    }
  },
  "experimental": {
    "enableMcp": true
  }
}
'@ | Out-File -FilePath "C:\dev\.gemini\settings.json" -Encoding UTF8

Write-Host "✅ Gemini MCP config created!" -ForegroundColor Green
Write-Host "Location: C:\dev\.gemini\settings.json" -ForegroundColor Cyan
```

---

## 🧪 Test the Fix

```bash
# Test Gemini CLI (should work now)
cd C:\dev
gemini chat "list files in this directory"
```

**Expected result:**

- ✅ No more ERR_INVALID_URL errors
- ✅ Gemini CLI starts cleanly
- ✅ Can use filesystem MCP tools (if enabled)

---

## 📋 Complete Gemini Settings.json Reference

For advanced users who want ALL compatible MCP servers:

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\npm\\node_modules\\@modelcontextprotocol\\server-filesystem\\dist\\index.js",
        "C:\\dev",
        "D:\\"
      ]
    },
    "sqlite": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\npm\\node_modules\\mcp-server-sqlite-npx\\dist\\index.js",
        "D:\\databases\\database.db"
      ]
    },
    "nx-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "nx-mcp"]
    },
    "desktop-commander": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\dev\\apps\\desktop-commander-v3\\dist\\mcp.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  },
  "experimental": {
    "enableMcp": true
  },
  "debug": false
}
```

**Note:** Only include servers you actually need and that you've verified work.

---

## 🔍 Debugging MCP Issues

### Check MCP Server Paths

```powershell
# Verify filesystem server exists
Test-Path "C:\Users\fresh_zxae3v6\AppData\Roaming\npm\node_modules\@modelcontextprotocol\server-filesystem\dist\index.js"

# Verify sqlite server exists
Test-Path "C:\Users\fresh_zxae3v6\AppData\Roaming\npm\node_modules\mcp-server-sqlite-npx\dist\index.js"

# Verify desktop-commander exists
Test-Path "C:\dev\apps\desktop-commander-v3\dist\mcp.js"
```

### Test Individual MCP Server

```powershell
# Test filesystem server directly
node "C:\Users\fresh_zxae3v6\AppData\Roaming\npm\node_modules\@modelcontextprotocol\server-filesystem\dist\index.js" "C:\dev"
```

If this hangs or errors, the MCP server itself has issues.

---

## 🎯 Summary

| Solution | Pros | Cons | Recommended |
|----------|------|------|-------------|
| **Solution 1: Gemini-specific config** | Clean separation, no conflicts | Requires separate config file | ✅ **YES** |
| **Solution 2: Disable MCP** | Quick fix, no setup | Loses MCP functionality | ⚠️ If you don't need MCP |
| **Solution 3: Fix .mcp.json** | Works for both tools | Affects Claude Code config | ❌ Risky |

**Recommendation:** Use **Solution 1** to create `.gemini/settings.json` with only stable MCP servers.

---

## ✅ What to Do Next

1. **Create `.gemini/settings.json`** with minimal config (Solution 1)
2. **Test Gemini CLI:** `gemini chat "hello"`
3. **If still errors:** Use Solution 2 (disable MCP entirely)
4. **Check debug logs:** `gemini --debug chat "test"` to see MCP loading

---

**Status:** Ready to implement
**Files to Create:**

- `C:\dev\.gemini\settings.json` (Gemini MCP config)
- `C:\dev\GEMINI_CLI_MCP_FIX.md` (this documentation)

**Next Steps:**

- Run the PowerShell script above to create the fix
- Test with `gemini chat "test query"`
- Report back if errors persist
