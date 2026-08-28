# Technology Stack (2026)

Last Updated: 2026-05-04

## Frontend (Web Apps)

- **React**: 19.2.4
- **TypeScript**: 5.9.3
- **Vite**: 7.x for current React/Vite apps
- **Next.js**: 16.1.6 only for `apps/vibe-shop`; this is an approved exception to the no-Next default
- **UI Framework**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind is app-local; root apps use both Tailwind 4.1.x and legacy Tailwind 3.4.x (`vibe-tutor` remains 3.4.15)
- **State Management**: React Query 5 (TanStack Query)
- **Routing**: React Router v7
- **Forms**: React Hook Form 7 + Zod 4 validation
- **3D Graphics**: Three.js 0.180 + React Three Fiber 9

## Desktop Apps

- **Tauri 2**: `nova-agent`, `vibe-code-studio`, and `vibe-justice/frontend`
- **Electron 33**: `vibetech-command-center` through electron-vite and electron-builder; do not call it Tauri
- **Electron 35.7**: `vibe-tutor` desktop shell through electron-builder
- **Local-only WIP**: `apps/gravity-claw` has Tauri scripts but is excluded from `pnpm-workspace.yaml`; its package version is not a shipped workspace release

## Mobile Apps

- **Capacitor 8**: `apps/vibe-tutor` Android app; it is not React Native or Expo
- **Expo 54 + React Native 0.81**: `apps/nova-mobile-app`, the actual React Native mobile app
- **Critical**: Use app-local Android/Nx targets and verify package manifests before assuming root package scripts

## Backend

- **Node.js**: 22.x
- **Runtime**: Express/Fastify/Hono depending on app
- **Python**: 3.x for `crypto-enhanced` and `vibe-justice/backend`
- **Database**: SQLite (D:\databases\)
- **Packaging**: `vibe-justice` backend uses a PyInstaller `.spec`; `vibe-justice` has no root `package.json`

## Build Tools

- **Package Manager**: pnpm 10.33.0
- **Monorepo Tool**: Nx 22.6.5
- **CI/CD**: GitHub Actions
- **Testing**: Vitest (unit), Playwright (E2E)

## Platform Requirements

- **OS**: Windows 11 ONLY (no cross-platform)
- **Shell**: PowerShell 7+ preferred
- **File System**: NTFS (C:\ for code, D:\ for data)

## Version Verification

ALWAYS verify package versions before using:

1. Use web search: "[library name] 2026 latest version"
2. Check official documentation
3. Review changelogs for breaking changes
4. Don't assume 2024/2025 knowledge is current

## Deprecation Warnings

- moment.js → Use date-fns instead
- Tailwind CDN → Install via npm
- fetch() in Capacitor → Use CapacitorHttp explicitly
