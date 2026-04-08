# MCP Server Configuration & Troubleshooting

Last Updated: 2026-04-08

## Canonical Server List

| Server | Command | Purpose |
|--------|---------|---------|
| `desktop-commander` | `node apps/desktop-commander-v3/dist/mcp.js` | Windows automation |
| `filesystem` | `npx @modelcontextprotocol/server-filesystem` | File access (C:\dev, D:\) |
| `codeberg` | `node apps/mcp-codeberg/dist/index.js` | GitHub API integration |
| `nx-mcp` | `npx nx-mcp@latest` | Nx workspace management |
| `sqlite` | `npx @modelcontextprotocol/server-sqlite` | Main DB (D:\databases\database.db) |
| `skills` | `node apps/mcp-skills-server/dist/index.js` | Agent skills system |
| `playwright` | `npx @playwright/mcp@latest` | Browser automation |
| `chrome-devtools` | `npx chrome-devtools-mcp@latest` | Browser debugging (Claude Code only) |
| `youtube` | `npx @anaisbetts/mcp-youtube` | YouTube subtitles (Claude Code only) |
| `notebooklm` | `python -m notebooklm_mcp_server` | NotebookLM (Claude Code only) |
| `memory` | `node apps/memory-mcp/dist/index.js` | Long-term memory, embeddings, learning |
| `rag` | `node apps/mcp-rag-server/dist/index.js` | Hybrid vector + FTS search over monorepo |
| `workspace` | `node apps/workspace-mcp-server/dist/index.js` | Config registry: env vars, ports, MCP servers, databases |

## Config File Locations

| Editor | Config File | Key format notes |
|--------|-------------|-----------------|
| Claude Code | `C:\dev\.mcp.json` | `"mcpServers"` key, `"type": "stdio"` |
| Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` | `"mcpServers"` key, NO `"type"` field |
| VS Code | `C:\dev\.vscode\mcp.json` | `"servers"` key (not `"mcpServers"`) |
| Gemini CLI | `C:\dev\.gemini\settings.json` | `"trust": true` per server; use `uvx` for sqlite |
| Codex CLI | `C:\dev\.codex\config.toml` | TOML `[mcp_servers.<name>]` sections |

## Rebuild Custom Servers

```powershell
pnpm --filter mcp-codeberg build          # C:\dev\apps\mcp-codeberg
pnpm --filter mcp-skills-server build     # C:\dev\apps\mcp-skills-server
pnpm --filter memory-mcp build            # C:\dev\apps\memory-mcp
pnpm --filter mcp-rag-server build        # C:\dev\apps\mcp-rag-server
pnpm --filter workspace-mcp-server build  # C:\dev\apps\workspace-mcp-server
```

## Common Issues

- **Tools not appearing**: validate JSON/TOML syntax; verify dist files exist; requires Node 20+
- **Timeout errors**: Claude Desktop has hard 60s timeout (not configurable); use streaming for large ops
- **Claude Desktop restart**: right-click tray → Quit (not window close); wait 10s; relaunch
