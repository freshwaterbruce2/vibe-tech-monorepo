# VibeBlox — AI Context

## What this is
Token-based incentive/reward system for developmental growth — kids earn "VibeBucks" for completing tasks and achievements.

## Stack
- **Runtime**: Node.js 22
- **Framework**: Vite + React 19 (client) + Hono (API server)
- **Key deps**: better-sqlite3, zustand, framer-motion, react-router-dom v7, bcryptjs + jsonwebtoken

## Dev
```bash
pnpm --filter @vibetech/vibeblox dev        # Vite dev server (port 5173)
pnpm --filter @vibetech/vibeblox server     # Hono API server
pnpm --filter @vibetech/vibeblox build      # tsc + vite build → dist/
pnpm --filter @vibetech/vibeblox db:seed    # Seed SQLite DB
```

## Notes
- Full-stack app: Vite SPA + separate Hono API server (run both concurrently in dev)
- SQLite DB path via `DATABASE_PATH` env var (store on `D:\databases\`)
- Uses `@vibetech/ui` workspace package for shared components
- Auth uses bcryptjs + JWT; store tokens in secure storage
