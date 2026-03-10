# Version Map

Expected dependency versions across the ecosystem. Updated after each maintenance cycle.

## Core Framework Versions

| Package | Expected Version | Scope | Notes |
|---------|-----------------|-------|-------|
| react | 19.2.x | All frontend apps | React 19.2 stable (Activity API, useEffectEvent, React Compiler) |
| react-dom | 19.2.x | All frontend apps | Must match react |
| typescript | 5.9.3 | All packages | Strict mode required. TS 6.0 Beta out (bridge release). TS 7.0 "Corsa" (Go-based, 10x faster) coming mid-2026 |
| nx | 22.x (22.5.2) | Monorepo root | ⚠️ **SECURITY**: Nx 21.5.0 and 21.6.0 were compromised in the S1ngularity supply chain attack. Use 21.5.1+ or 21.6.1+ minimum. Prefer 22.x |
| pnpm | 9.x+ | Package manager | Workspace protocol, pnpm catalog support in Nx 22 |
| node | 22.x LTS | Runtime | Nx 21+ requires Node 20.19+. Specified in .nvmrc |

## Build Tool Versions

| Package | Expected Version | Scope |
|---------|-----------------|-------|
| vite | 7.x | Web apps (Nx 21.6+ supports Vite 7; Vite 6.x also acceptable) |
| electron | Latest stable | Desktop apps |
| @tauri-apps/cli | 2.x | Tauri apps (nova-agent) |
| esbuild | Latest stable | Build tooling |

## AI/MCP Versions

| Package | Expected Version | Scope |
|---------|-----------------|-------|
| @modelcontextprotocol/sdk | 1.27.x (v1 stable) | All MCP servers. ⚠️ v2 is pre-alpha, Q1 2026 target. Stay on v1.x for production |
| @anthropic-ai/sdk | Latest stable | Apps calling Claude API |
| zod | 3.25+ (peer dep of MCP SDK) | MCP SDK 1.27 imports `zod/v4` but backward-compat with v3.25+. Required as peer dep |
| openai | Latest stable | If used for embeddings |

### MCP SDK API Migration Note

The MCP SDK has two API styles. **Both work in v1.27**, but new code should use McpServer:

**Legacy (Server + setRequestHandler):**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...] }));
```

**Current (McpServer + registerTool with zod schemas):**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
server.registerTool("tool_name", {
  description: "...",
  inputSchema: { param: z.string() }
}, async ({ param }) => ({ content: [{ type: "text", text: "..." }] }));
```

Desktop Extensions use `.mcpb` format (replaces old `.dxt`). Existing `.dxt` files still work.

## Agent Model IDs

| Model ID | Status | Use Case |
|----------|--------|----------|
| claude-opus-4-6 | ✅ Current | Orchestrator |
| claude-sonnet-4-5-20250929 | ✅ Current | Reasoning-heavy workers |
| claude-haiku-4-5-20251001 | ✅ Current | Fast/routine workers |

### Shorthand in Agent Configs

| Shorthand | Maps To | Status |
|-----------|---------|--------|
| opus-4.5 / opus-4.6 | claude-opus-4-6 | ✅ |
| sonnet-4 / sonnet-4.5 | claude-sonnet-4-5-20250929 | ✅ |
| haiku-4 / haiku-4.5 | claude-haiku-4-5-20251001 | ✅ |

## UI Library Versions

| Package | Expected Version | Scope |
|---------|-----------------|-------|
| tailwindcss | 4.x | All UI (CSS-native theme variables, no config file) |
| shadcn/ui | Latest | Component library |
| lucide-react | Latest | Icons |
| recharts | Latest | Charts |

## TypeScript Migration Roadmap

| Version | Status | Timeline | Notes |
|---------|--------|----------|-------|
| TS 5.9.3 | ✅ Current stable | Now | Production use |
| TS 6.0 | Beta | Q1 2026 | Bridge release. Deprecations to prep for 7.0. Highly compatible with 5.9 |
| TS 7.0 | Pre-alpha | Mid/Late 2026 | Go-based compiler ("Corsa"). 5-10x faster builds, ~50% memory reduction |

**Action**: Enable `--deprecation` flag in TS 6.0 to identify deprecated features before 7.0 lands.

## Testing Versions

| Package | Expected Version | Scope |
|---------|-----------------|-------|
| vitest | Latest stable | Unit tests |
| playwright | Latest stable | E2E tests |
| @testing-library/react | Latest | React component tests |

## Mobile Versions

| Package | Expected Version | Scope |
|---------|-----------------|-------|
| @capacitor/core | Latest stable | Mobile apps |
| @capacitor/cli | Latest stable | Mobile build |

---

**Update Protocol**: After running `pnpm update` or bumping a major dependency:
1. Update this file with new version targets
2. Run ecosystem-sync to propagate changes
3. Verify all MCP servers build with new versions
4. Check npm advisories for supply chain attacks (remember S1ngularity hit Nx 21.5.0/21.6.0)

**Security Note**: Always verify package integrity after major updates. The S1ngularity attack (2025) compromised Nx via a GitHub Actions CI vulnerability, leaking 2,000+ secrets. Use `npm audit` and lockfile verification.
