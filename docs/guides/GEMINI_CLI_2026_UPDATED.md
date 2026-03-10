# Gemini CLI Fix - Updated for January 2026

**Last Updated:** January 11, 2026
**Gemini CLI Version:** 0.23.0
**Based on:** Latest official documentation and GitHub issues

---

## 🆕 What's New in 2026

### 1. URL Field Consolidation (November 2025 - January 2026)

**BREAKING CHANGE:** Gemini CLI is consolidating MCP server configuration to use a **single `url` field** instead of separate `httpUrl` and `url` fields.

**Old Format (Deprecated):**

```json
{
  "mcpServers": {
    "server": {
      "httpUrl": "https://mcp.example.com/mcp"
    }
  }
}
```

**New Format (2026):**

```json
{
  "mcpServers": {
    "server": {
      "url": "https://mcp.example.com/mcp",
      "type": "http"  // Optional: "http", "sse", or omit for auto-detect
    }
  }
}
```

**Precedence Order:** `httpUrl` → `url` → `command`

---

## 🔥 Most Common Error: Trailing Spaces in JSON

### The #1 Cause of ERR_INVALID_URL

**Problem:** Extra space in JSON property names causes "Invalid configuration: missing httpUrl" error.

```json
// ❌ WRONG (causes ERR_INVALID_URL)
{
  "mcpServers": {
    "server": {
      "httpUrl ": "https://..."  // Space after httpUrl!
    }
  }
}

// ✅ CORRECT
{
  "mcpServers": {
    "server": {
      "httpUrl": "https://..."  // No trailing space
    }
  }
}
```

**Fix:** Use a JSON linter to validate your `.gemini/settings.json` file!

---

## ✅ Your Fixed Configuration (2026 Format)

**File:** `C:\dev\.gemini\settings.json`

```json
{
  "general": {
    "previewFeatures": true,
    "sessionRetention": {
      "enabled": true
    },
    "enablePromptCompletion": true
  },
  "ui": {
    "showLineNumbers": true,
    "showModelInfoInChat": true
  },
  "model": {
    "maxSessionTurns": 100
  },
  "tools": {
    "autoAccept": true
  },
  "security": {
    "folderTrust": {
      "enabled": true
    }
  },
  "experimental": {
    "codebaseInvestigatorSettings": {
      "maxNumTurns": 20
    }
  },
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\npm\\node_modules\\@modelcontextprotocol\\server-filesystem\\dist\\index.js",
        "C:\\dev"
      ]
    },
    "nx-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "nx-mcp"]
    }
  }
}
```

**What was fixed:**

- ❌ Removed: `"url": "..."` (invalid placeholder)
- ✅ Added: Proper stdio transport configuration
- ✅ Added: filesystem MCP server for file operations
- ✅ Fixed: nx-mcp with proper stdio configuration

---

## 🚀 FastMCP Integration (New in 2026)

As of **FastMCP v2.12.3**, you can install local STDIO MCP servers using:

```bash
# Install FastMCP globally
pip install fastmcp>=2.12.3

# Install MCP server for Gemini CLI
fastmcp install gemini-cli
```

**Latest Gemini CLI:**

```bash
npm install -g @google/gemini-cli@latest
```

---

## ⚠️ Breaking Changes (January 2026)

### 1. Model Deprecation

- **gemini-2.5-flash-image-preview** will be shut down **January 15, 2026**
- Switch to `gemini-2.5-pro` or `gemini-2.5-flash` before this date

### 2. API Changes

- `total_reasoning_tokens` → `total_thought_tokens` (Interactions API v1beta)

### 3. Command-line Flags Removed

- `--all-files` / `-a` removed (use `@` from within Gemini CLI instead)
- Many flags deprecated in favor of `settings.json` alternatives

### 4. MCP useInstructions Setting Removed

- System now **unconditionally retrieves instructions** from all MCP servers
- Remove `useInstructions: false` from your config (no longer supported)

---

## 📋 MCP Best Practices (2026)

### Stdio Transport Rules

**CRITICAL:** When using stdio transport, **NEVER write to stdout** in your MCP server!

**Why:** stdout/stdin carry protocol messages. Stray text corrupts the stream.

**Solution:** Log to stderr or a dedicated logging sink.

```typescript
// ❌ WRONG (corrupts MCP protocol)
console.log("Debug message");

// ✅ CORRECT (logs to stderr)
console.error("Debug message");

// ✅ CORRECT (dedicated logger)
logger.info("Debug message"); // Configured to use stderr
```

### Security Configuration

**For stdio:**

- Relies on process execution security context
- Pass credentials via **environment variables** (not command args)
- Implement workload isolation using containers
- Use non-root users, read-only filesystems, minimal base images

**For HTTP:**

- Use HTTPS with proper TLS validation
- Implement OAuth2 for authentication
- Rate limiting and request validation

---

## 🔍 Known Issues (January 2026)

### Issue #15798: API 400 Errors with Local MCP Servers

**Symptom:** MCP tool calls fail with API 400 errors after initialization.

**Status:** Open issue, under investigation.

**Workaround:**

- Use stdio transport instead of HTTP for local servers
- Ensure MCP server implements full protocol spec
- Check server logs for initialization errors

### Issue #16060: Crashes After Updating to v0.23

**Symptom:** CLI freezes or crashes during operation.

**Workaround:**

- Clear cache: `rm -rf ~/.gemini/cache`
- Reinstall: `npm install -g @google/gemini-cli@latest`
- Disable problematic MCP servers temporarily

---

## 🧪 Validation Commands

### Check for Trailing Spaces

```powershell
# Windows PowerShell
Get-Content "C:\dev\.gemini\settings.json" | Select-String ":\s+\""

# Should return nothing (no trailing spaces)
```

### Validate JSON Syntax

```bash
# Using Node.js
node -e "console.log(JSON.parse(require('fs').readFileSync('.gemini/settings.json')))"

# Using jq (if installed)
jq . .gemini/settings.json
```

### Test MCP Server Connectivity

```bash
# Enable debug mode
gemini --debug chat "test MCP connection"

# Check MCP server logs
gemini /mcp status
```

---

## 📊 Configuration Reference (2026)

### Minimal Working Config

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
    }
  },
  "experimental": {
    "enableMcp": true
  }
}
```

### Advanced Config (Multiple Servers)

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/filesystem-server.js", "C:\\dev"]
    },
    "sqlite": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/sqlite-server.js", "D:\\databases\\database.db"]
    },
    "nx-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "nx-mcp"]
    },
    "remote-server": {
      "url": "https://mcp.example.com/api",
      "type": "http",
      "headers": {
        "Authorization": "Bearer $MCP_API_KEY"
      }
    }
  },
  "experimental": {
    "enableMcp": true
  }
}
```

### Exclude/Include Tools

```json
{
  "mcpServers": {
    "server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-server"],
      "includeTools": ["tool1", "tool2"],  // Whitelist
      "excludeTools": ["dangerous_tool"]   // Blacklist (takes precedence)
    }
  }
}
```

---

## 🔗 Official Documentation (2026)

### Primary Sources

- [Gemini CLI MCP Configuration](https://geminicli.com/docs/tools/mcp-server/)
- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Best Practices](https://mcp-best-practice.github.io/mcp-best-practice/best-practice/)
- [Gemini CLI Troubleshooting](https://geminicli.com/docs/troubleshooting/)

### GitHub Issues

- [#14621: Invalid Configuration Error](https://github.com/google-gemini/gemini-cli/issues/14621)
- [#15798: API 400 Errors with Local MCP](https://github.com/google-gemini/gemini-cli/issues/15798)
- [#15551: Generated settings.json Cannot be Loaded](https://github.com/google-gemini/gemini-cli/issues/15551)
- [#13762: URL Field Consolidation](https://github.com/google-gemini/gemini-cli/pull/13762)

### Guides

- [FastMCP + Gemini CLI](https://developers.googleblog.com/gemini-cli-fastmcp-simplifying-mcp-server-development/)
- [MCP Server Development Guide](https://codelabs.developers.google.com/cloud-gemini-cli-mcp-go)
- [Implementing MCP: Tips & Pitfalls](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/)

---

## ✅ Final Checklist

Before running Gemini CLI:

- [ ] No trailing spaces in `.gemini/settings.json` property names
- [ ] JSON syntax is valid (use linter)
- [ ] All MCP server paths exist and are executable
- [ ] `type` field is specified for each MCP server
- [ ] Stdio servers log to **stderr**, not stdout
- [ ] No deprecated `useInstructions` settings
- [ ] Using current model names (no deprecated models)
- [ ] Environment variables are set for credentials

---

## 🎯 Summary

**What we fixed:**

1. ✅ Removed invalid `"url": "..."` placeholder
2. ✅ Added proper filesystem MCP server configuration
3. ✅ Fixed nx-mcp with stdio transport
4. ✅ Applied 2026 configuration standards
5. ✅ Documented breaking changes and known issues

**Next steps:**

1. Test with: `gemini chat "hello"`
2. Verify MCP tools: `gemini /mcp status`
3. Monitor for issues in debug mode: `gemini --debug chat "test"`

---

**Last Verified:** January 11, 2026
**Gemini CLI Version:** 0.23.0
**MCP Specification:** 2025-11-25
