# Desktop Commander V3 (MCP Server)

A powerful Model Context Protocol (MCP) server for Windows 11 desktop automation with **unrestricted terminal access** for AI agents.

## Features

### 🖥️ Terminal Access (NEW v2.0)
- **PowerShell**: Execute any PowerShell command with full system access
- **Command Prompt**: Execute any CMD command with full system access
- **No Restrictions**: No command allow-lists - complete shell freedom
- **Configurable Timeouts**: Default 60s, up to unlimited
- See [TERMINAL_ACCESS.md](./TERMINAL_ACCESS.md) for detailed documentation

### 📁 Filesystem
- Full read/write/search capabilities
- Access restricted to `C:\dev`, `D:\`, and `OneDrive` (Read-only)
- Advanced features: ACL, file hashing, robocopy integration

### 🖱️ Desktop Control
- Mouse & Keyboard simulation
- Window management (Focus, Minimize, Launch apps)
- Clipboard access
- Screenshot capture (to `D:\screenshots`)

### ⚙️ System Information
- CPU, Memory, Disk usage
- Process management
- Network information
- Battery status
- Volume and brightness control

## Installation

```bash
pnpm install
pnpm build
```

## Running the Server

### IPC Mode (Legacy)

```bash
pnpm start
```

### MCP Mode (Standard)

```bash
pnpm start:mcp
```

Or directly via node:

```bash
node dist/mcp.js
```

## Configuration for AI Clients

Add the following to your MCP client configuration (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "node",
      "args": [
        "C:\\dev\\apps\\desktop-commander-v3\\dist\\mcp.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## ⚠️ Security Warning

**CRITICAL**: This server has **UNRESTRICTED** system access including:
- ✅ Full PowerShell execution (any command, any script)
- ✅ Full CMD execution (any command, batch files)
- ✅ File system operations (C:\dev, D:\, OneDrive)
- ✅ Input simulation (mouse, keyboard)
- ✅ System control (volume, brightness, processes)

**Only use with:**
- Trusted AI agents (Claude Desktop, etc.)
- Controlled development environments
- Systems you own and control

**Never expose to:**
- Untrusted users
- Public networks
- Production systems without security review

Filesystem access is limited to:
- `C:\dev` (Read/Write)
- `D:\` (Read/Write)
- `C:\Users\fresh_zxae3v6\OneDrive` (Read-Only)

Terminal access (PowerShell/CMD) has **no restrictions** - any command can be executed.
