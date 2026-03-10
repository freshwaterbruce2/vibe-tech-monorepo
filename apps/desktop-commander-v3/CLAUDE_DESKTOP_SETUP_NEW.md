# Claude Desktop Setup - Desktop Commander v3

## Quick Setup (2 minutes)

### 1. Build
```bash
cd C:\dev\apps\desktop-commander-v3 && pnpm run build
```

### 2. Configure
Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "desktop-commander-v3": {
      "command": "node",
      "args": ["C:\\dev\\apps\\desktop-commander-v3\\dist\\mcp.js"]
    }
  }
}
```

### 3. Restart Claude Desktop

---

## Test It

**PowerShell:** `Run: Get-Process | Select-Object -First 5`
**CMD:** `Run: dir C:\dev`

---

## Documentation

- [README.md](./README.md) - Overview
- [TERMINAL_ACCESS.md](./TERMINAL_ACCESS.md) - Complete terminal guide

**Version 2.0.0** - Unrestricted terminal access for AI agents
