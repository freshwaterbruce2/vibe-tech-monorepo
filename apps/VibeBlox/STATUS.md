# Status: Active (Local Dev)

**Last updated:** 2026-01-20

## Current state
- ✅ Backend server runs on `http://localhost:3003`
- ✅ SQLite DB stored on `D:\data\vibeblox\vibeblox.db` (never inside `C:\dev`)
- ✅ Auth/login working (seeded users exist)

## Key implementation notes
- **bcrypt native bindings** can fail on Windows/Node 22. VibeBlox uses **`bcryptjs`** (pure JS) to avoid native `.node` binding issues.
- DB path isolation:
  - Prefer `VIBEBLOX_DATABASE_PATH`
  - `DATABASE_PATH` is **ignored** unless it contains `vibeblox` (to avoid monorepo-wide env contamination)

## Quick commands
```powershell
# Terminal 1: backend
cd C:\dev\apps\VibeBlox
pnpm run server

# Terminal 2: frontend
cd C:\dev\apps\VibeBlox
pnpm run dev
```

## DB init / seed
```powershell
cd C:\dev\apps\VibeBlox
pnpm run db:migrate
pnpm run db:seed
```

## Seeded dev logins
- Parent: `dad` / `vibeblox2026`
- Child: `player1` / `letsplay`

