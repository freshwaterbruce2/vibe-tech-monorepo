# agent-engine — AI Context

## What this is
Local-first autonomous coding engine with gated self-improvement — orchestrates AI agents to plan, implement, review, and gate-check monorepo tasks.

## Stack
- **Runtime**: Node.js 22
- **Framework**: CLI / TypeScript library (no web UI); built with tsup
- **Key deps**: zod, vitest; communicates with MCP tools and OpenRouter models

## Dev
```bash
pnpm --filter @vibetech/agent-engine dev         # Run with help command (tsx src/index.ts)
pnpm --filter @vibetech/agent-engine build       # tsup → dist/
pnpm --filter @vibetech/agent-engine orchestrate # Run monorepo orchestrator
pnpm --filter @vibetech/agent-engine test        # Vitest unit tests
```

## Notes
- Five agent roles: orchestrator, monorepo-orchestrator, code-reviewer, quality-gate, task-runner
- Uses `kimi-k2.5` as the primary model via OpenRouter
- `self-eval`, `promote-candidate`, `behavioral-eval` commands manage the self-improvement pipeline
- No web server — pure CLI/library that other services invoke
