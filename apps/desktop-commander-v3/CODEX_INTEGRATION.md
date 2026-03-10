# ChatGPT Codex / MCP Integration Guide

This guide explains how to integrate **Desktop Commander V3** with MCP-compliant AI clients (often referred to as "Codex" tools, Claude Desktop, or AI IDEs).

## Prerequisites

1. Ensure the project is built:

   ```powershell
   cd C:\dev\apps\desktop-commander-v3
   pnpm build
   ```

## Option 1: Local Stdio Integration (Recommended)

Most local AI agents (including Cursor, Windsurf, and Claude Desktop) connect via **Standard Input/Output (Stdio)**.

### Configuration

Add this to your agent's `mcp_servers.json` or `config.toml`:

**JSON Format:**

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
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**TOML Format (common for Python/Rust CLI tools):**

```toml
[mcp_servers.desktop-commander]
command = "node"
args = ["C:\\dev\\apps\\desktop-commander-v3\\dist\\mcp.js"]
```

## Option 2: Remote/Cloud Integration (ChatGPT Web)

To connect **ChatGPT Web** (via Actions) to this local server, you must:

1. **Switch Transport**: Modify `src/mcp.ts` to use `SSEServerTransport` instead of `StdioServerTransport` (requires code changes).
2. **Tunneling**: Run a tunnel like `ngrok` to expose the local port.
3. **Action Config**: Import the OpenAPI schema into ChatGPT.

*Note: The current build is optimized for Option 1 (Local Stdio).*

## Verification

To test the integration without an AI agent, you can use the `inspector` from the MCP SDK:

```powershell
npx @modelcontextprotocol/inspector node C:\dev\apps\desktop-commander-v3\dist\mcp.js
```

```
