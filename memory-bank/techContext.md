# Tech Context

## Runtime Versions
- Node.js: 22.x
- pnpm: 10.33.0
- Nx: 22.7.1
- TypeScript: 5.9.3 (strict)
- React: 19.2.4
- Vite: 7.3.1
- Tailwind CSS: 4.1.18

## Build Notes
- `pnpm nx build <project>` for single projects
- `pnpm run quality:affected` for repo-level validation
- Root `pnpm run build` intentionally fails
- `memory-mcp` requires `@vibetech/memory` to be built first

## Environment
- Primary dev: Windows 11
- Code: `V:\monorepo`
- Data: `D:\databases`, `D:\logs`, `D:\learning-system`
- SQLite databases use WAL mode

## Known Quirks
- PowerShell quote handling for `node -e` is fragile; prefer script files
- `better-sqlite3` has native bindings; rebuild after Node upgrades
- OpenRouter proxy runs on `localhost:3001`
- Nx Cloud ID: `6977fcd7ceb01e5b11be2a95`
