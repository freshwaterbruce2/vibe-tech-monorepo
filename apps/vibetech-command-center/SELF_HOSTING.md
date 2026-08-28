# Self-Hosting Vibe-Tech Command Center

This guide covers building and packaging the Command Center from source on Windows.

---

## Prerequisites

- **Node.js** 22 or later
- **pnpm** 10 (managed via corepack or global install)
- **Windows 11** recommended (primary development and runtime target)
- **Git** (to clone the monorepo)

---

## Build Steps

Run all commands from the app directory:

```powershell
cd V:\monorepo\apps\vibetech-command-center
```

### 1. Install dependencies

```powershell
pnpm install
```

### 2. Rebuild native modules for Electron

```powershell
pnpm rebuild:native
```

This recompiles `better-sqlite3` against Electron 33's ABI. The step is required before both dev and packaging.

### 3. Build the application

```powershell
pnpm build
```

This compiles the main process, preload, renderer, and the MCP server.

### 4. Package the installer

```powershell
pnpm package
```

Produces `release/Vibe-Tech Command Center-Setup-${version}.exe`.

For an unpacked directory instead of an installer:

```powershell
pnpm package:dir
```

---

## Runtime Requirements

- **No external database** is required. The app reads monorepo source files and SQLite databases from local disk.
- Default read paths: `D:\databases\*.db` and `D:\learning-system\*.db`.
- The app runs entirely offline after build. Network is only used for health probes if configured.

---

## Output Locations

| Artifact | Path |
|----------|------|
| Packaged installer | `release/Vibe-Tech Command Center-Setup-${version}.exe` |
| Unpacked build | `release/win-unpacked/` |
| Build output (main/preload/renderer) | `out/` |
| MCP server output | `dist/mcp/` |

---

## Important Notes

- **Auto-updates are disabled** (`publish: null` in `package.json`). Updates must be distributed manually or via your own release pipeline.
- **Code signing is not configured**. Windows SmartScreen may flag the installer until a certificate is added to `build.win.certificateFile`.
- The app keeps running after the window is closed (tray icon). Quit explicitly via the tray menu or Task Manager.
