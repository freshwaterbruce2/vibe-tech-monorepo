# ⚠️ DEPRECATED

This package has been deprecated and merged into the unified MCP server.

## Migration

Use `@vibetech/mcp-server` instead:

```bash
cd C:\dev\apps\mcp-server
pnpm build
node dist/main.js
```

Enable skills capability:
```
MCP_ENABLE_SKILLS=true
```

## Tools Available in Unified Server

| Old Tool | New Tool | Notes |
|----------|----------|-------|
| `skills_list` | `skills_list` | Same functionality |
| `skills_search` | `skills_search` | Same functionality |
| `skills_get` | `skills_get` | Same functionality |
| `skills_refresh` | `skills_refresh` | Same functionality |

## Resources

- `skill://{id}` — Get skill content by ID

## Removal

This app will be removed in a future cleanup. All functionality is preserved in `apps/mcp-server`.

---
Deprecated: 2026-02-02
Replacement: apps/mcp-server (vibetech-unified)
