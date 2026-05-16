# Command Center ChatGPT App

Command Center can run as a tool-only ChatGPT app through a Streamable HTTP MCP
endpoint. The existing stdio MCP server remains the local Claude/Codex path.

## Shape

- Archetype: tool-only internal dashboard
- Local app: Electron dashboard at port 5180
- Local MCP stdio: `pnpm run mcp:start`
- Local MCP HTTP: `pnpm run mcp:http`
- Default HTTP endpoint: `http://127.0.0.1:3211/mcp`
- ChatGPT endpoint: the HTTPS tunnel URL plus `/mcp`

## Tools

The MCP surface exposes dashboard tools for:

- monorepo overview
- app inventory
- service health
- database metrics
- Nx graph
- filesystem path stats
- recent backups and backup creation
- RAG search
- Claude bridge invocation
- spawned-process listing

`dashboard_invoke_claude` starts a real Claude Code session and should stay
read-only by default unless a specific task needs edit permissions.

## Local Validation

Run from `C:\dev`:

```powershell
pnpm nx run '@vibetech/command-center:build:mcp'
pnpm nx run '@vibetech/command-center:probe:mcp'
pnpm --dir apps/vibetech-command-center run probe:mcp:http
```

The stdio and HTTP probes both initialize MCP, list tools, call
`dashboard_overview`, and expect at least 10 registered tools.

## ChatGPT Developer Mode

1. Build the MCP server with `pnpm nx run '@vibetech/command-center:build:mcp'`.
2. Start the HTTP MCP server:

   ```powershell
   pnpm --dir apps/vibetech-command-center run mcp:http
   ```

3. Expose `http://127.0.0.1:3211` through an HTTPS tunnel.
4. In ChatGPT, enable Developer Mode under app and connector advanced settings.
5. Create a new app using the tunneled HTTPS URL ending in `/mcp`.
6. Refresh the app after changing tool descriptions, schemas, or metadata.

This endpoint is for private/internal use. Public submission would need a stable
hosted HTTPS endpoint, production CSP and domain metadata, privacy/support
materials, and review-safe auth if any authenticated data is exposed.
