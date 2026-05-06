# VibeTech Port Manager

Quick utility to manage dev server ports across the monorepo.

## Quick Start

```powershell
# Add to your PowerShell profile for global access:
# Add-Content $PROFILE "`nfunction port { & 'C:\dev\tools\port-manager\port.ps1' @args }"

# Or run directly:
C:\dev\tools\port-manager\port.ps1 <command> [args]
```

## Commands

| Command                   | Description               | Example               |
| ------------------------- | ------------------------- | --------------------- |
| `port check <port>`       | Check if port is in use   | `port check 8091`     |
| `port kill <port>`        | Kill process on port      | `port kill 8091`      |
| `port list`               | Show all registered ports | `port list`           |
| `port clear [type]`       | Kill all dev servers      | `port clear vite`     |
| `port find [start] [end]` | Find free port in range   | `port find 3000 3099` |

## Port Registry

All port assignments are documented in `port-registry.json`:

### Port Ranges

| Range     | Description          |
| --------- | -------------------- |
| 3000-3099 | Backend API servers  |
| 3100-3199 | MCP servers          |
| 5173-5199 | Vite dev servers     |
| 8000-8999 | Specialized services |

### Current Assignments

| Port | App                       | Type    |
| ---- | ------------------------- | ------- |
| 3000 | nova-agent-backend        | backend |
| 3001 | openrouter-proxy          | backend |
| 3002 | digital-content-builder   | backend |
| 3003 | vibeblox-backend          | backend |
| 3100 | mcp-sse-bridge            | mcp     |
| 5173 | root-dev                  | vite    |
| 5174 | vibeblox                  | vite    |
| 5175 | shipping-pwa              | vite    |
| 5176 | vibetech-command-center   | vite    |
| 5177 | vibetech-command-center   | backend |
| 5179 | symptom-tracker           | vite    |
| 8000 | crypto-enhanced           | python  |
| 8765 | memory-bank               | backend |
| 9001 | ai-backend                | backend |

## Adding to PowerShell Profile

To use `port` from anywhere, add this to your PowerShell profile:

```powershell
# Open profile
notepad $PROFILE

# Add this line:
function port { & 'C:\dev\tools\port-manager\port.ps1' @args }

# Reload profile
. $PROFILE
```

## Adding New Ports

Edit `port-registry.json` to add new port assignments:

```json
{
  "ports": {
    "8092": { "app": "new-app", "type": "backend", "description": "New App Backend" }
  }
}
```

## Integration with Apps

Apps can auto-free their port before starting by adding to their startup script:

```powershell
# In start-app.ps1
& C:\dev\tools\port-manager\port.ps1 kill 8091
pnpm run dev
```

Or in package.json:

```json
{
  "scripts": {
    "predev": "powershell -File C:/dev/tools/port-manager/port.ps1 kill 8091",
    "dev": "tsx watch src/server.ts"
  }
}
```
