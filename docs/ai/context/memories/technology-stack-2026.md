# Technology Stack (2026)

Last Updated: 2026-01-06

## Frontend (Web Apps)

- **React**: 19 (latest stable - verify before using)
- **TypeScript**: 5.9+
- **Vite**: 7 (latest build tool)
- **UI Framework**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4.18 (stable - v4 downgraded due to @apply directive issues)
- **State Management**: React Query 5 (TanStack Query)
- **Routing**: React Router v7
- **Forms**: React Hook Form 7 + Zod 4 validation
- **3D Graphics**: Three.js 0.180 + React Three Fiber 9

## Desktop Apps

- **Preferred**: Tauri (smaller bundles, better performance than Electron)
- **Legacy**: Electron (for vibe-code-studio)
- **Projects**: nova-agent (Tauri), vibe-code-studio (Electron), desktop-commander-v3 (MCP)

## Mobile Apps

- **Framework**: Capacitor 7 + React 19
- **Strategy**: PWA → Native conversion
- **Projects**: vibe-tutor (Production v1.0.5+)
- **Critical**: Use Tailwind v3 (NOT CDN), explicit CapacitorHttp

## Backend

- **Node.js**: 22.x LTS (latest)
- **Runtime**: Express for APIs
- **Python**: 3.x for crypto-enhanced
- **Database**: SQLite (D:\databases\)

## Build Tools

- **Package Manager**: pnpm 9.15.0 (59.5% disk space savings)
- **Monorepo Tool**: Nx 21.6.3
- **CI/CD**: GitHub Actions
- **Testing**: Vitest (unit), Playwright (E2E)

## Platform Requirements

- **OS**: Windows 11 ONLY (no cross-platform)
- **Shell**: PowerShell 7+ (NOT bash)
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
