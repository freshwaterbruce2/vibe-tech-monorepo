# Vibe Code Studio - Project Guide

**Project Path:** `C:\dev\apps\vibe-code-studio`  
**Database:** `D:\databases\vibe-code-studio`  
**Logs:** `D:\logs\vibe-code-studio`  
**Data:** `D:\data\vibe-code-studio`  
**Type:** Electron Desktop Application (AI-Powered IDE)  
**Status:** Active Development - Production Builds Available

---

## 🎯 Project Overview

AI-powered desktop code editor built with Electron, React, and TypeScript. Features Monaco Editor integration, multi-file editing, AI assistance, and comprehensive code analysis tools.

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
├── electron/               # Electron main process
│   ├── main.ts            # Main entry point
│   ├── preload.ts         # Preload script
│   └── ipc/               # IPC handlers
├── src/                   # React renderer process
│   ├── components/        # React components
│   ├── editor/            # Monaco editor integration
│   ├── services/          # Business logic
│   ├── store/             # State management
│   └── utils/             # Utilities
├── packages/              # Internal packages
│   └── shared/            # Shared code
├── public/                # Static assets
├── dist/                  # Production builds
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

---

## 🚀 Quick Start

### First Time Setup

```powershell
# Navigate to project
cd C:\dev\apps\vibe-code-studio

# Install dependencies
pnpm install

# Set up environment
Copy-Item .env.example .env
code .env
```

### Development Mode

```powershell
# Start development server (hot reload enabled)
pnpm dev

# Development with debugging
pnpm dev --inspect

# Clean start (clear cache)
pnpm clean
pnpm dev
```

### Building

```powershell
# Build for Windows
pnpm build:win

# Build for all platforms
pnpm build

# Build without code signing
pnpm build:win --no-sign

# Build with verbose output
pnpm build:win --verbose
```

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
  automaticLayout: true
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

### IPC Communication

```typescript
// Renderer → Main
window.electron.ipcRenderer.send('open-file', filePath);

// Main → Renderer
ipcMain.on('open-file', (event, filePath) => {
  // Handle in main process
});

// With response
const result = await window.electron.ipcRenderer.invoke('read-file', filePath);
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
Copy-Item D:\databases\vibe-code-studio\*.db D:\backups\vibe-code-studio\

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
# All tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage

# Specific test file
pnpm test MonacoEditor.test.tsx
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

**File:** `electron-builder.yml`

```yaml
appId: com.vibe.code-studio
productName: Vibe Code Studio
directories:
  output: dist
  buildResources: build-resources
win:
  target:
    - nsis
    - portable
  icon: build-resources/icon.ico
```

### Creating Installers

```powershell
# NSIS installer (recommended)
pnpm build:win

# Portable version
pnpm build:win --portable

# Both
pnpm build:win --win nsis portable

# Output location
ls dist/*.exe
```

### Build Output

```
dist/
├── Vibe-Code-Studio-Setup-1.0.0.exe    # NSIS installer
├── Vibe-Code-Studio-1.0.0-portable.exe # Portable version
└── win-unpacked/                        # Unpacked files
```

---

## 🔧 Configuration Files

### Electron Vite Config

**File:** `electron.vite.config.ts`

```typescript
export default defineConfig({
  main: {
    // Main process config
  },
  preload: {
    // Preload script config
  },
  renderer: {
    // Renderer process config
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  }
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
# Enable logging
$env:ELECTRON_ENABLE_LOGGING = "1"
.\dist\win-unpacked\Vibe-Code-Studio.exe

# Check logs
Get-Content D:\logs\vibe-code-studio\app.log -Tail 100
```

### Common Debug Commands

```javascript
// In renderer process
console.log('Debug:', data);

// In main process
import { app } from 'electron';
console.log('App path:', app.getPath('userData'));

// IPC debugging
ipcMain.on('*', (event, ...args) => {
  console.log('IPC:', event.type, args);
});
```

---

## 🔧 Troubleshooting

### Build Fails

```powershell
# Clean everything
pnpm clean
Remove-Item -Recurse -Force node_modules, dist, out
pnpm install
pnpm build:win
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

### IPC Communication Issues

```powershell
# Check preload script
# Ensure contextIsolation is properly configured

# Verify IPC handlers are registered
# Check electron/main.ts

# Enable IPC logging
$env:ELECTRON_ENABLE_LOGGING = "1"
```

### App Won't Start

```powershell
# Check for port conflicts
netstat -ano | findstr :5173

# Kill hung processes
Get-Process | Where-Object { $_.ProcessName -like "*vibe*" } | Stop-Process -Force

# Reset user data
Remove-Item -Recurse "$env:APPDATA\vibe-code-studio"
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
    // Load files via IPC
    window.electron.ipcRenderer.invoke('get-files', projectPath)
      .then(setFiles);
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

// Connect to shell
window.electron.ipcRenderer.on('terminal-data', (data) => {
  term.write(data);
});
```

### AI Code Completion

```typescript
// src/services/ai-completion.ts
export async function getCompletion(code: string, position: Position) {
  const context = extractContext(code, position);
  const completion = await aiService.complete(context);
  return completion;
}
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
pnpm clean
```

### Monthly

```powershell
# Dependency audit
pnpm audit

# Performance profiling
pnpm build:win --analyze

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
pnpm build:win --analyze

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

**Last Updated:** January 2, 2026  
**Version:** 1.0.0  
**Status:** Active Development

