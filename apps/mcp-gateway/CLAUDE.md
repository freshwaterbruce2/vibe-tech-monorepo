# mcp-gateway — AI Context

## What this is
MCP Gateway that bridges OpenClaw (Brain AI) with Antigravity MCP servers (Environment) via WebSocket IPC — acts as a proxy/router between AI agents and tool servers.

## Stack
- **Runtime**: Node.js 22
- **Framework**: MCP stdio server (`@modelcontextprotocol/sdk`) + WebSocket (ws)
- **Key deps**: @vibetech/shared-ipc, @vibetech/logger, zod

## Dev
```bash
pnpm --filter @vibetech/mcp-gateway dev     # tsx watch src/index.ts
pnpm --filter @vibetech/mcp-gateway build   # tsc → dist/
node apps/mcp-gateway/dist/index.js         # run as MCP server
```

## Notes
- IPC Bridge endpoint: `ws://localhost:5004` (env: `IPC_BRIDGE_URL`)
- Used by gravity-claw's `start:full` command alongside the Hono server
- Depends on `packages/shared-ipc` and `packages/logger` workspace packages
- Routes tool calls from OpenClaw agent to the correct downstream MCP server
