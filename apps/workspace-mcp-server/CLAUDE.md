# workspace-mcp-server — AI Context

## What this is
MCP server acting as a centralised config registry for the VibeTech workspace — provides tools to look up API keys, port assignments, registered MCP servers, and database paths.

## Stack
- **Runtime**: Node.js 22
- **Framework**: MCP stdio server (`@modelcontextprotocol/sdk`)
- **Key deps**: dotenv, zod

## Dev
```bash
pnpm --filter workspace-mcp-server dev     # tsc --watch
pnpm --filter workspace-mcp-server build   # tsc → dist/index.js
node apps/workspace-mcp-server/dist/index.js  # run as MCP server
```

## Notes
- Reads configuration from `.env` and potentially a workspace config file
- Registered in `.mcp.json` as the `workspace` server
- Exposes tools for: env var lookup, port registry, server config, database path resolution
- Keep this server lightweight — it is queried at startup by agent-engine and other tools
