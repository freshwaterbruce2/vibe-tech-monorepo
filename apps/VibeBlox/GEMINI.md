# GEMINI.md - VibeBlox

## Project Type
Gamified token economy web application for developmental growth (Autism support).

## Location
`C:\dev\apps\VibeBlox\`

## Tech Stack
- **Frontend**: React 19 + Vite + TypeScript (Port 5173 default)
- **Backend**: Node.js + Hono (Port 3003)
- **Database**: SQLite (Better-SQLite3)
- **Styling**: Tailwind CSS 4.x + Shadcn/UI
- **State**: Zustand

## Key Commands
```bash
# In apps/VibeBlox/
pnpm install          # Install dependencies
pnpm dev              # Start frontend (Vite)
pnpm server           # Start backend (Hono)
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed database with initial data
```

## Architecture
```
VibeBlox/
├── src/               # Frontend (React)
│   ├── app/           # Routes and pages
│   ├── components/    # UI components
│   ├── stores/        # Zustand state
│   └── api/           # API client
└── server/            # Backend (Hono)
    ├── db/            # Database schema & connection
    ├── routes/        # API endpoints
    └── services/      # Business logic
```

## Critical Patterns
- **Database Path**: Strictly `D:\data\vibeblox\vibeblox.db`. Code enforces this to avoid pollution of `C:\dev`.
- **Auth**: JWT-based. Uses `bcryptjs` for password hashing to avoid Windows native binding issues.
- **State Management**: Zustand for global state (user, coins, quests).
- **Gamification**: logic for streaks, multipliers, and XP lives in `server/services/` but is mirrored in frontend stores for immediate feedback.

## Configuration
- `server/db/index.ts`: Controls DB path logic.
- `server/index.ts`: Entry point, runs on port 3003.

## Quality Checklist
- [ ] Frontend compiles (Vite)
- [ ] Backend starts (Hono)
- [ ] Database connects at `D:\data\...`
- [ ] Auth (Login/Me) works
- [ ] `bcryptjs` used instead of `bcrypt`

## Related Skills
- React/Vite/TypeScript
- Hono/Node.js
- SQLite/Better-SQLite3
- Gamification Logic
