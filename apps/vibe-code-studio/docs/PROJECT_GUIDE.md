# Vibe Code Studio - Project Guide

**Project Path:** `V:\monorepo\apps\vibe-code-studio`  
**Database:** `D:\databases\vibe-code-studio`  
**Logs:** `D:\logs\vibe-code-studio`  
**Data:** `D:\data\vibe-code-studio`  
**Type:** Tauri 2 Desktop Application (AI-Powered IDE)  
**Status:** Active Development - Production Builds Available

---

## 🎯 Project Overview

AI-powered desktop code editor built with Tauri 2, React, and TypeScript. Features Monaco Editor integration, multi-file editing, AI assistance, and comprehensive code analysis tools. The Windows 11 release path is Tauri-only.

### Key Features

- Monaco Editor (VS Code editor engine)
- Multi-file editing and management
- AI code completion and analysis
- Project workspace management
- Git integration
- Terminal integration
- File system explorer
- Code search and navigation
- Theme customization

---

## 📁 Project Structure

```
vibe-code-studio/
├── src-tauri/              # Tauri backend (Rust)
│   ├── src/               # Rust source
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── src/                   # React frontend
│   ├── components/        # React components
│   ├── modules/           # Feature modules (editor, git, terminal, ...)
│   ├── services/          # Business logic (incl. ElectronService Tauri bridge)
│   ├── app/               # App shell + hooks
│   └── utils/             # Utilities
├── scripts/               # Helper scripts (run-tauri.cjs, backend-server.js, ...)
├── public/                # Static assets
├── dist/                  # Vite frontend build output
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## 🚀 Quick Start

### First Time Setup

```powershell
# Navigate to project
cd V:\monorepo\apps\vibe-code-studio

# Install dependencies
pnpm install

# Set up environment
Copy-Item .env.example .env
code .env
```

### Development Mode

```powershell
# Frontend only (Vite, hot reload)
pnpm dev

# Full Tauri dev (Rust backend + frontend)
pnpm tauri:dev

# Preferred from the monorepo root (Nx)
pnpm nx run vibe-code-studio:dev
```

### Building

```powershell
# Frontend production build (tsc + vite build)
pnpm build

# Full Tauri build + Windows installer
pnpm package
# (alias: pnpm tauri:build)

# Preferred from the monorepo root (Nx)
pnpm nx run vibe-code-studio:package
```

Installer artifacts are written to
`apps/vibe-code-studio/src-tauri/target/release/bundle/nsis/`.

---

## 🛠️ Development Workflow

### Making Code Changes

```powershell
# 1. Start dev server
pnpm dev

# 2. Make changes (hot reload will update automatically)

# 3. Type check
pnpm typecheck

# 4. Lint
pnpm lint

# 5. Format
pnpm format

# 6. Test
pnpm test
```

### Working with Monaco Editor

```typescript
// src/editor/MonacoEditor.tsx
import * as monaco from 'monaco-editor';

// Initialize editor
const editor = monaco.editor.create(element, {
  value: code,
  language: 'typescript',
  theme: 'vs-dark',
  automaticLayout: true,
});

// Get/Set content
const content = editor.getValue();
editor.setValue(newContent);

// Listen for changes
editor.onDidChangeModelContent(() => {
  const newValue = editor.getValue();
  // Handle change
});
```

### Native / file-system access

Native access goes through `src/services/ElectronService.ts`, which detects the
Tauri runtime (`__TAURI_INTERNALS__`) and uses the Tauri plugins
(`@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`). A legacy Electron
`window.electron` bridge is kept only as a fallback.

```typescript
import { ElectronService } from '@/services/ElectronService';

const native = new ElectronService();

// Tauri-backed file operations
const content = await native.readFile(filePath);
await native.writeFile(filePath, newContent);
```

---

## 📊 Database Schema

**Location:** `D:\databases\vibe-code-studio\vibe_studio.db`

### Key Tables

```sql
-- Recent projects
CREATE TABLE recent_projects (
    id INTEGER PRIMARY KEY,
    path TEXT UNIQUE,
    name TEXT,
    last_opened DATETIME,
    favorite BOOLEAN DEFAULT 0
);

-- Editor settings
CREATE TABLE editor_settings (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    settings_json TEXT
);

-- File history
CREATE TABLE file_history (
    id INTEGER PRIMARY KEY,
    file_path TEXT,
    opened_at DATETIME,
    closed_at DATETIME
);
```

### Database Operations

```powershell
# Backup database
Copy-Item D:\databases\vibe-code-studio\*.db D:\_backups\vibe-code-studio\

# Query recent projects
sqlite3 D:\databases\vibe-code-studio\vibe_studio.db "SELECT * FROM recent_projects ORDER BY last_opened DESC LIMIT 10;"
```

---

## 🎨 Theming & Customization

### Theme Configuration

**Location:** `src/themes/`

```typescript
// Available themes
- 'vs-dark' (default)
- 'vs-light'
- 'hc-black' (high contrast)

// Custom theme
monaco.editor.defineTheme('custom-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [...],
  colors: {...}
});
```

### User Preferences

**Location:** `D:\data\vibe-code-studio\preferences.json`

```json
{
  "editor": {
    "fontSize": 14,
    "fontFamily": "Consolas, monospace",
    "tabSize": 2,
    "wordWrap": "on"
  },
  "theme": "vs-dark",
  "autoSave": true,
  "autoSaveDelay": 1000
}
```

---

## 🧪 Testing

### Run Tests

```powershell
# Unit tests (Vitest)
pnpm test

# Unit + E2E
pnpm test:all

# Auto-verify build harness
pnpm test:verify
```

### E2E Tests

```powershell
# Playwright tests
pnpm test:e2e

# With UI
pnpm test:e2e:ui

# Specific test
pnpm test:e2e tests/editor.spec.ts
```

### Test Files

```
tests/
├── unit/              # Unit tests
│   ├── components/
│   ├── services/
│   └── utils/
├── integration/       # Integration tests
│   ├── editor/
│   └── file-system/
└── e2e/              # End-to-end tests
    └── scenarios/
```

---

## 📦 Building & Distribution

### Build Configuration

**File:** `src-tauri/tauri.conf.json` (Tauri bundler config; targets the Windows NSIS installer)

### Creating Installers

```powershell
# Full Tauri build + Windows installer
pnpm package
# (alias: pnpm tauri:build)

# Preferred from the monorepo root (Nx)
pnpm nx run vibe-code-studio:package

# Output location
ls apps\vibe-code-studio\src-tauri\target\release\bundle\nsis\
```

### Build Output

```
src-tauri/target/release/bundle/
└── nsis/
    └── Vibe Code Studio_<version>_x64-setup.exe   # NSIS installer
```

Installed executable: `V:\Apps\Vibe_Code_Studio\vibe-code-studio.exe`

---

## 🔧 Configuration Files

### Vite Config

**File:** `vite.config.ts` (standard Vite config for the React frontend; Tauri wraps it)

```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

### TypeScript Config

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 🐛 Debugging

### Development Debugging

```powershell
# Start with DevTools
pnpm dev

# Main process debugging
pnpm dev --inspect
# Then attach debugger at chrome://inspect

# Renderer process debugging
# DevTools open automatically in dev mode
```

### Production Debugging

```powershell
# Launch the installed Tauri build
& 'V:\Apps\Vibe_Code_Studio\vibe-code-studio.exe'

# Check logs
Get-Content D:\logs\vibe-code-studio\app.log -Tail 100
```

### Common Debug Commands

```typescript
// In the frontend (renderer)
console.log('Debug:', data);

// Rust-side logging (src-tauri) goes through the Tauri log plugin / println!;
// view it in the terminal running `pnpm tauri:dev`.
```

---

## 🔧 Troubleshooting

### Build Fails

```powershell
# Clean everything
Remove-Item -Recurse -Force node_modules, dist
Remove-Item -Recurse -Force src-tauri\target
pnpm install --filter vibe-code-studio
pnpm package
```

### Monaco Editor Not Loading

```powershell
# Check monaco-editor installation
pnpm list monaco-editor

# Reinstall
pnpm remove monaco-editor
pnpm add monaco-editor

# Clear vite cache
Remove-Item -Recurse -Force node_modules/.vite
```

### Native bridge / file-access Issues

```powershell
# Confirm the Tauri runtime is detected (ElectronService.isTauri())
# Verify the fs/dialog plugin capabilities in src-tauri/capabilities/

# Check Tauri command wiring in src-tauri/src/
# Run `pnpm tauri:dev` and watch the terminal for Rust-side errors
```

### App Won't Start

```powershell
# Check for port conflicts (Vite dev server)
netstat -ano | findstr :5173

# Kill hung processes
Get-Process | Where-Object { $_.ProcessName -like "*vibe*" } | Stop-Process -Force

# Do not recreate a C-drive app profile. Use the app's documented reset workflow
# for D:\data\vibe-code-studio if a reset is actually required.
```

---

## 📚 Important Documentation

### Project Docs

- `README.md` - Overview
- `ARCHITECTURE.md` - Architecture design
- `MULTIFILE_EDITOR_GUIDE.md` - Multi-file editing
- `API.md` - API documentation
- `SETUP_INSTRUCTIONS.md` - Setup guide

### Feature Specs

Located in `FEATURE_SPECS/`:

- File management
- Editor integration
- Project workspace
- Terminal integration
- Git integration

---

## 🎯 Key Features Implementation

### File Explorer

```typescript
// src/components/FileExplorer.tsx
import { useState, useEffect } from 'react';

const FileExplorer = () => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    // Load files via the Tauri-backed native bridge
    new ElectronService().readDir(projectPath).then(setFiles);
  }, [projectPath]);

  return (
    // Render file tree
  );
};
```

### Terminal Integration

```typescript
// src/components/Terminal.tsx
import { Terminal } from 'xterm';

const term = new Terminal();
term.open(terminalElement);

// Terminal I/O is bridged through the terminal module / Tauri commands
// (see src/modules/terminal/).
```

### AI Code Completion

```typescript
// AI is handled by the multi-provider services under src/services/ai/
// (e.g. UnifiedAIService.ts, AIProviderFactory.ts), proxied through OpenRouter.
import { UnifiedAIService } from '@/services/ai/UnifiedAIService';
```

---

## 🔄 Maintenance

### Daily

```powershell
# Check for updates
pnpm outdated

# Run type check
pnpm typecheck
```

### Weekly

```powershell
# Update dependencies
pnpm update

# Run full test suite
pnpm test

# Clean build artifacts
Remove-Item -Recurse -Force dist, src-tauri\target
```

### Monthly

```powershell
# Dependency audit
pnpm audit

# Bundle analysis
pnpm build:analyze

# Database cleanup
python scripts\cleanup-old-data.py
```

---

## 🚀 Performance Optimization

### Startup Performance

- Lazy load Monaco editor
- Cache file system reads
- Optimize IPC calls
- Use web workers for heavy tasks

### Build Size

```powershell
# Analyze bundle
pnpm build:analyze

# Check output
ls dist -Recurse | Measure-Object -Property Length -Sum
```

### Memory Usage

```powershell
# Monitor in development
# Use Chrome DevTools Memory profiler

# Check in production
# Task Manager → Details → Vibe Code Studio.exe
```

---

**Last Updated:** July 18, 2026 (V/D path-policy reconciliation)  
**Status:** Active Development
