# MCP Server Configuration & Troubleshooting

Last Updated: 2026-03-25
Status: ACTIVE

## Canonical Server List

| Server              | Command                                       | Purpose                                  |
| ------------------- | --------------------------------------------- | ---------------------------------------- |
| `desktop-commander` | `node apps/desktop-commander-v3/dist/mcp.js`  | Windows automation                       |
| `filesystem`        | `npx @modelcontextprotocol/server-filesystem` | File access (C:\dev, D:\)                |
| `codeberg`          | `node apps/mcp-codeberg/dist/index.js`        | GitHub API integration                   |
| `nx-mcp`            | `npx nx-mcp@latest`                           | Nx workspace management                  |
| `sqlite`            | `npx @modelcontextprotocol/server-sqlite`     | Main DB (D:\databases\database.db)       |
| `skills`            | `node apps/mcp-skills-server/dist/index.js`   | Agent skills system                      |
| `playwright`        | `npx @playwright/mcp@latest`                  | Browser automation                       |
| `chrome-devtools`   | `npx chrome-devtools-mcp@latest`              | Advanced browser debugging & performance |
| `youtube`           | `npx @anaisbetts/mcp-youtube`                 | YouTube subtitles (Claude Code only)     |
| `notebooklm`        | `python -m notebooklm_mcp_server`             | NotebookLM (Claude Code only)            |

## Configuration Files by Editor/IDE

### Server Matrix

| Server            | Claude Code | Claude Desktop | VS Code | Gemini CLI | Codex CLI |
| ----------------- | :---------: | :------------: | :-----: | :--------: | :-------: |
| desktop-commander |      Y      |       Y        |    Y    |     Y      |     Y     |
| filesystem        |      Y      |       Y        |    Y    |     Y      |     Y     |
| codeberg          |      Y      |       Y        |    Y    |     Y      |     Y     |
| nx-mcp            |      Y      |       Y        |    Y    |     Y      |     Y     |
| sqlite            |      Y      |       Y        |    Y    |     Y      |     Y     |
| skills            |      Y      |       Y        |    Y    |     Y      |     Y     |
| playwright        |      Y      |       Y        |    Y    |     Y      |     Y     |
| chrome-devtools   |      Y      |       -        |    -    |     -      |     -     |
| youtube           |      Y      |       -        |    -    |     -      |     -     |
| notebooklm        |      Y      |       -        |    -    |     -      |     -     |

### Config File Locations & Formats

| Editor                  | Config File                                   | Format                                                |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------- |
| **Claude Code**         | `C:\dev\.mcp.json`                            | JSON, `"mcpServers"` key, `"type": "stdio"`           |
| **Claude Desktop**      | `%APPDATA%\Claude\claude_desktop_config.json` | JSON, `"mcpServers"` key, NO `"type"` field           |
| **VS Code**             | `C:\dev\.vscode\mcp.json`                     | JSON, `"servers"` key, `"type": "stdio"`              |
| **Gemini CLI**          | `C:\dev\.gemini\settings.json`                | JSON, `"mcpServers"` inside settings, `"trust": true` |
| **Codex CLI (user)**    | `~\.codex\config.toml`                        | TOML, `[mcp_servers.<name>]` sections                 |
| **Codex CLI (project)** | `C:\dev\.codex\config.toml`                   | TOML, `[mcp_servers.<name>]` sections                 |

### Format Notes

- **Claude Desktop** does NOT use `"type"` field (differs from Claude Code)
- **VS Code** uses `"servers"` key (not `"mcpServers"`)
- **Gemini CLI** adds `"trust": true` per server and uses backslash paths (`C:\\dev`)
- **Codex CLI** uses TOML with `[mcp_servers.<name>.env]` for env vars
- **Gemini CLI** uses `uvx` for sqlite servers (Python-native) instead of `npx`

## Custom MCP Servers (2 active)

### 1. GitHub API Server

- **Location:** `C:\dev\apps\mcp-codeberg`
- **Package:** `mcp-codeberg@1.0.0`
- **Build:** `pnpm --filter mcp-codeberg build`
- **Tools:** `codeberg_search_repos`, `codeberg_read_file`, `codeberg_get_repo_details`

### 2. Agent Skills Server

- **Location:** `C:\dev\apps\mcp-skills-server`
- **Package:** `mcp-skills-server@1.0.0`
- **Build:** `pnpm --filter mcp-skills-server build`
- **Tools:** `skills_list`, `skills_search`, `skills_get`, `skills_refresh`

### Rebuilding All Custom Servers

```powershell
pnpm --filter mcp-codeberg build
pnpm --filter mcp-skills-server build
```

## Validation

```powershell
# Verify dist files exist
Test-Path C:\dev\apps\mcp-codeberg\dist\index.js
Test-Path C:\dev\apps\mcp-skills-server\dist\index.js
Test-Path C:\dev\apps\desktop-commander-v3\dist\mcp.js

# Verify databases exist
Test-Path D:\databases\database.db

# Validate JSON configs
node -e "JSON.parse(require('fs').readFileSync('C:/dev/.mcp.json','utf8')); console.log('OK')"
node -e "JSON.parse(require('fs').readFileSync('C:/dev/.vscode/mcp.json','utf8')); console.log('OK')"
```

## Common MCP Issues

### 1. Connection Failures

**Symptom:** MCP tools not appearing

**Solution:**

- Validate JSON/TOML syntax in config file
- Verify dist files exist (rebuild if needed)
- Check Node.js version compatibility (requires Node 20+)

### 2. Timeout Errors

**Symptom:** Operations fail after 60 seconds

**Solution:**

- Claude Desktop has hard 60s timeout (not configurable)
- Use streaming/progressive results for large operations

### 3. Restart Protocol (Claude Desktop)

- Right-click system tray -> Quit (NOT window close)
- Wait 10 seconds for complete shutdown
- Verify: `Get-Process | Where {$_.Name -like "*Claude*"}`
- Relaunch Claude Desktop

### 4. Gemini CLI MCP Check

```bash
# In Gemini CLI session
/mcp
```

### 5. Codex CLI MCP Check

```bash
codex mcp
```
