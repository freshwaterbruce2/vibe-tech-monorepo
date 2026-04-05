# Workspace Context — @vibetech/workspace

## Owner
Bruce Freshwater — solo Windows 11 developer. No team. Ships everything himself.

## Architecture
- **Monorepo**: C:\dev — 28 apps, 26 packages, Nx 22.5.0 orchestration
- **Package Manager**: pnpm 10.32.1 (isolated mode), store on D:\pnpm-store
- **Code**: C:\dev only (Git-tracked)
- **Data**: D:\ only (databases, logs, learning-system, screenshots)
- **Version Control**: Codeberg (primary), GitHub mirror (CI/CD)

## Stack
- TypeScript 5.9.3 strict, React 19.2.4, Tailwind 4.x
- Desktop: Tauri 2.0 (nova-agent, vtde), Electron (vibe-code-studio, vibe-tutor)
- Mobile: Expo 54 (nova-mobile-app), Capacitor (vibe-tutor)
- Backend: Express 5 (port 5177), Vite dev (port 5173)
- AI: OpenRouter → DeepSeek R1 (primary), Kimi 2.5 via Moonshot
- Database: SQLite on D:\databases\ with WAL mode
- Python 3.x (crypto-enhanced), Rust MSVC (Tauri apps)

## Key Constraints
- Windows 11 ONLY — PowerShell 7+, no bash
- pnpm ONLY with --filter — never bare install, never npm
- 500-line file limit (360 hard rule in CLAUDE.md)
- No git commands from AI — Bruce uses manual zip backups
- Backup before destructive changes (Compress-Archive)
- Search before creating (no-duplicates rule)
- Complete features to 100% before starting new ones (Finisher Mode)

## Current Focus (as of 2026-04-05)
1. VTDE — beta ship
2. Memory System — integration
3. Nova Mobile App — stabilization
4. Vibe Tutor — Play Store release

## Specialist Agent System
19 agents configured in .claude/agents.json — crypto-expert, webapp-expert, desktop-expert, mobile-expert, backend-expert, devops-expert, plus 11 sub-specialists.
