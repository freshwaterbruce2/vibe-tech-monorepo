# prompt-engineer — AI Context

## What this is
Interactive Vite + React tool for designing, testing, and iterating on LLM prompts — sends prompts to OpenAI-compatible APIs and displays structured results.

## Stack
- **Runtime**: Node.js 22
- **Framework**: Vite + React 19 (client, port 5173) + Express v4 (API server)
- **Key deps**: openai SDK, zod, react-hook-form (implied), @vibetech/shared-utils

## Dev
```bash
pnpm --filter @vibetech/prompt-engineer dev        # Both client + server concurrently
pnpm --filter @vibetech/prompt-engineer dev:client # Vite only (port 5173)
pnpm --filter @vibetech/prompt-engineer dev:server # Express API only (tsx watch)
pnpm --filter @vibetech/prompt-engineer build      # tsc + vite build → dist/
```

## Notes
- Two processes in dev (concurrently): Vite SPA on 5173 + Express server (port TBD in server/index.ts)
- Two tsconfig files: `tsconfig.json` (client) and `tsconfig.server.json` (server)
- API key passed via env vars — never hardcode OpenAI/OpenRouter keys
- Depends on `packages/shared-utils` workspace package
