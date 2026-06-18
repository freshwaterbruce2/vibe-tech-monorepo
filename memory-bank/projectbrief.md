# Project Brief: VibeTech Monorepo

## Scope
Large-scale multi-platform software ecosystem (~24 apps, ~27 libs) managed with Nx + pnpm.

## Primary Products
- **NOVA Agent** — Tauri desktop AI assistant
- **Vibe Code Studio** — Tauri AI code editor
- **Vibe Tutor** — Electron + Capacitor education platform
- **Gravity Claw** — Local-only AI agent orchestrator (WIP)
- **VibeTech Command Center** — Operations console with DB explorer, agent orchestrator, memory viz

## Key Constraints
- Code lives on `V:\monorepo`; runtime data on `D:\`
- Node >= 22, pnpm 10.33.0, Nx 22.7.1
- Strict TypeScript, no explicit `any`
- Tailwind CSS 4, React 19, Vite 7
- Electron apps: custom ESLint rule `no-localstorage-electron`
- Crypto/trading: observation-only unless explicitly authorized
