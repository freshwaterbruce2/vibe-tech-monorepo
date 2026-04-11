# vtde — AI Context

## What this is
Vibe-Tech Desktop Environment — a full-screen Tauri v2 desktop OS-like shell with a windowed app launcher, xterm.js terminal, d3-force-based file explorer, and Nova AI quick-chat widget.

## Stack
- **Runtime**: Node.js 22 + Rust (Tauri v2)
- **Framework**: Tauri v2 + Vite + React 19
- **Key deps**: @xterm/xterm + addons (fit, webgl, web-links), d3 + d3-force, @vibetech/openrouter-client

## Dev
```bash
pnpm --filter vtde dev           # Vite dev server (port 1420)
pnpm --filter vtde tauri:dev     # Full Tauri dev mode (Rust + Vite)
pnpm --filter vtde tauri:build   # Production build → Windows NSIS installer
pnpm --filter vtde test          # Vitest tests
pnpm --filter vtde test:rust     # cargo test for Rust backend
```

## Notes
- Launches fullscreen, no decorations (configured in tauri.conf.json)
- Identifier: `com.vibetech.vtde`; bundle target: Windows NSIS
- CSP allows connections to Google APIs and `localhost:*` (for dev MCP servers)
- Widgets: Terminal, SystemMonitor, VibeExplorer, HealingDashboard, NovaQuickChat, MemoryPanel
- Desktop apps drawer in `src/desktop/apps/` — add new app tiles there
