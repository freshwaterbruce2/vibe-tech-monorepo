---
name: vibetech-agents
description: Documentation and invocation patterns for Bruce's 19-agent multi-agent system. Use when orchestrating tasks across desktop, web, backend, or mobile categories. Use when invoking sub-agents, checking agent status, understanding delegation rules, or coordinating parallel/sequential agent workflows. Covers the orchestrator-worker pattern with Claude Opus 4.6 as lead and Sonnet/Haiku workers.
---

# Vibetech Multi-Agent System

19 specialized sub-agents organized by category, following Anthropic's orchestrator-worker pattern.

## Architecture

```
Orchestrator (Claude Opus 4.6 / Claude Code)
├── Desktop Category (5 agents)
├── Web Category (5 agents)
├── Backend Category (5 agents)
└── Mobile Category (4 agents)
```

**Model assignment:** Haiku-4.5 for fast/routine tasks, Sonnet-4.6 for reasoning-heavy tasks.

## Agent Registry

### Desktop Applications

| Agent                            | Model      | Purpose                   | Triggers                                |
| -------------------------------- | ---------- | ------------------------- | --------------------------------------- |
| `desktop-quality-checker`        | Haiku-4.5  | Lint, typecheck, format   | `*.ts`, `*.tsx` changes, pre-commit     |
| `desktop-test-coordinator`       | Sonnet-4.6 | Tests, coverage, e2e      | `*.test.ts`, `*.spec.ts`, test commands |
| `desktop-cleanup-specialist`     | Haiku-4.5  | Build artifacts, cache    | `dist/`, `node_modules/`, `.nx/cache`   |
| `desktop-build-specialist`       | Haiku-4.5  | Electron/Tauri builds     | `electron-builder`, `tauri build`       |
| `desktop-integration-specialist` | Sonnet-4.6 | IPC, preload, native APIs | `preload.ts`, `main.ts`, IPC handlers   |

### Web Applications

| Agent                        | Model      | Purpose                         | Triggers                          |
| ---------------------------- | ---------- | ------------------------------- | --------------------------------- |
| `vite-build-specialist`      | Haiku-4.5  | Build optimization, HMR, chunks | `vite.config.ts`, bundle issues   |
| `react-component-specialist` | Haiku-4.5  | Components, hooks, React 19     | `*.tsx` components, hook patterns |
| `ui-integration-specialist`  | Haiku-4.5  | shadcn/ui, Tailwind             | `components/ui/`, styling         |
| `web-testing-specialist`     | Sonnet-4.6 | Vitest, Playwright              | `*.test.tsx`, e2e tests           |
| `web-cleanup-specialist`     | Haiku-4.5  | Build artifacts, cache          | `dist/`, stale bundles            |

### Backend Services

| Agent                             | Model      | Purpose                         | Triggers                              |
| --------------------------------- | ---------- | ------------------------------- | ------------------------------------- |
| `api-implementation-specialist`   | Sonnet-4.6 | Routes, controllers, OpenAPI    | `routes/`, `controllers/`, API design |
| `database-integration-specialist` | Sonnet-4.6 | SQLite, migrations, D:\ storage | `*.db`, migrations, schema changes    |
| `backend-security-specialist`     | Sonnet-4.6 | Auth, validation, sanitization  | Auth flows, input validation          |
| `backend-deployment-specialist`   | Haiku-4.5  | Docker, PM2, local deploy       | Dockerfile, pm2.config.js             |
| `backend-testing-specialist`      | Haiku-4.5  | API tests, integration tests    | `*.test.ts` for services              |

### Mobile Applications

| Agent                        | Model      | Purpose                        | Triggers                           |
| ---------------------------- | ---------- | ------------------------------ | ---------------------------------- |
| `capacitor-build-specialist` | Sonnet-4.6 | APK/IPA builds, versionCode    | `capacitor.config.ts`, Android/iOS |
| `pwa-specialist`             | Haiku-4.5  | Service workers, manifest      | `manifest.json`, `sw.js`, offline  |
| `mobile-ui-specialist`       | Haiku-4.5  | Responsive, touch interactions | Mobile viewport, touch handlers    |
| `mobile-testing-specialist`  | Haiku-4.5  | Device testing                 | Mobile-specific tests              |

## Sequential Execution Rules

Some agents MUST run in order:

```yaml
desktop:
  - [desktop-quality-checker, desktop-test-coordinator] # lint before test

web:
  - [vite-build-specialist, web-testing-specialist] # build before test
  - [react-component-specialist, web-testing-specialist]

backend:
  - [api-implementation-specialist, backend-security-specialist] # implement → audit
  - [database-integration-specialist, backend-testing-specialist] # schema → test
  - [backend-security-specialist, backend-deployment-specialist] # security → deploy

mobile:
  - [capacitor-build-specialist, mobile-testing-specialist] # build before test
  - [pwa-specialist, mobile-testing-specialist]
```

## Parallel Execution Groups

These agents can run concurrently:

```yaml
desktop: [desktop-cleanup-specialist, desktop-build-specialist]
web: [vite-build-specialist, react-component-specialist, ui-integration-specialist]
backend: [api-implementation-specialist, database-integration-specialist]
mobile: [pwa-specialist, mobile-ui-specialist]
```

## Invocation Patterns

### Via MCP (vibe-ecosystem-mcp-server)

```typescript
// Check agent status
vibe_agent_status({ category: 'desktop' });

// Invoke specific agent
vibe_agent_invoke({
  agentId: 'desktop-build-specialist',
  task: 'Build nova-agent Electron app',
  params: { target: 'win32', arch: 'x64' },
});
```

### Via Claude Code

```bash
# Delegate to sub-agent
/agent desktop-quality-checker "Run lint and typecheck on nova-agent"

# Check what's available
/agents list --category backend
```

## Cross-Cutting Specialists (Parent-Level)

These operate at orchestrator level, not as sub-agents:

- `database-expert` — Schema design, optimization, D:\ storage policy
- `api-expert` — RESTful design, OpenAPI specs
- `qa-expert` — Test strategy, coverage targets
- `ui-ux-expert` — Design systems, accessibility

## Critical Rules

1. **D:\ storage policy**: All databases live on D:\, enforced by `database-integration-specialist`
2. **Security before deploy**: `backend-security-specialist` MUST run before `backend-deployment-specialist`
3. **versionCode increment**: `capacitor-build-specialist` always increments Android versionCode
4. **PWA requires HTTPS**: `pwa-specialist` needs secure context for service workers

## Config Locations

- Agent definitions: `C:\dev\.claude\sub-agents\config.yml`
- Delegation rules: `C:\dev\.claude\agent-delegation.yaml`
- Parent mappings: `C:\dev\.claude\agents.json`

## Phase Status

| Phase | Category | Status      | Agents |
| ----- | -------- | ----------- | ------ |
| 1     | Desktop  | ✅ Complete | 5      |
| 2     | Web      | ✅ Complete | 5      |
| 3     | Backend  | ✅ Complete | 5      |
| 4     | Mobile   | ✅ Complete | 4      |
| 5     | Crypto   | 📋 Planned  | 3      |
