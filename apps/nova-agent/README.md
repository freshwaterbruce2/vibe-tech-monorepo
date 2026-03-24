# NOVA Agent

NOVA Agent is the Windows desktop app in `apps/nova-agent`. It ships as a
Tauri app with a Rust backend and a React frontend.

## Windows 11 workflow

Run these commands from `C:\dev`:

```powershell
pnpm nx run nova-agent:typecheck
pnpm nx run nova-agent:check:rust
pnpm nx run nova-agent:test
pnpm nx run nova-agent:test:rust
pnpm nx run nova-agent:build
```

For local development:

```powershell
cd apps/nova-agent
pnpm dev
```

## Installers

Build installers with:

```powershell
cd apps/nova-agent
.\scripts\build-installer.ps1
```

Install from the newest generated MSI or NSIS bundle with:

```powershell
cd apps/nova-agent
.\scripts\install.ps1 -EnableAutoStart
```

The installer script now discovers the latest bundle automatically instead of
depending on a hard-coded versioned filename.

## Runtime notes

- Frontend output is `dist/`
- Tauri bundle output is `src-tauri/target/release/bundle`
- Windows auto-start uses the installed executable inside the app directory
- API keys are read from `src-tauri/.env`

## Validation rule

Before merging changes here, rerun the Nx targets above and confirm the
installer path works on the current Windows 11 desktop.
