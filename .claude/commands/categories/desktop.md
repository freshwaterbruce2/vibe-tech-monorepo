---
name: desktop-skill
description: Desktop application development - Electron, Tauri, IPC, native modules, packaging
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
category: app-type
---

# Desktop Application Development Skill

> **For ALL desktop apps** in the monorepo: Electron, Tauri

## Applies To

| Project                     | Framework |
| --------------------------- | --------- |
| `apps/vibe-code-studio`     | Electron  |
| `apps/nova-agent`           | Tauri 2.x |
| `apps/desktop-commander-v3` | Electron  |

## Tech Stacks

### Electron Apps

- **Main Process**: Node.js, TypeScript
- **Renderer**: React, TypeScript, Vite
- **IPC**: contextBridge, ipcMain/ipcRenderer
- **Packaging**: electron-builder

### Tauri Apps

- **Backend**: Rust
- **Frontend**: React, TypeScript, Vite
- **IPC**: Tauri commands, invoke()
- **Packaging**: tauri-bundler

## Standard Commands

```bash
# Electron
pnpm dev           # Development mode
pnpm build         # Build app
pnpm package       # Create installer
pnpm test          # Run tests

# Tauri
pnpm dev           # tauri dev
pnpm build         # tauri build
cargo check        # Check Rust (in src-tauri/)
```

## Architecture Pattern

### Electron

```
apps/{electron-app}/
├── src/
│   ├── main/               # Main process
│   │   ├── index.ts        # Entry point
│   │   ├── ipc/            # IPC handlers
│   │   └── services/       # Native services
│   ├── renderer/           # React app
│   │   ├── components/
│   │   ├── hooks/
│   │   └── App.tsx
│   └── preload/            # Context bridge
│       └── index.ts
├── electron-builder.json
└── vite.config.ts
```

### Tauri

```
apps/{tauri-app}/
├── src/                    # Frontend (React)
│   ├── components/
│   ├── services/
│   └── App.tsx
├── src-tauri/              # Backend (Rust)
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
└── vite.config.ts
```

## Critical Patterns

### Electron IPC (Type-Safe)

```typescript
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('file:write', { path, content }),
});

// main/ipc/handlers.ts
ipcMain.handle('file:read', async (_, path: string) => {
  return fs.promises.readFile(path, 'utf-8');
});

// renderer - usage
const content = await window.api.readFile('/path/to/file');
```

### Tauri Commands

```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_file])
        .run(tauri::generate_context!())
        .expect("error running app");
}
```

```typescript
// Frontend
import { invoke } from '@tauri-apps/api/core';
const content = await invoke<string>('read_file', { path: '/file' });
```

## Security Rules

### Electron

- ALWAYS enable `contextIsolation: true`
- ALWAYS use preload scripts
- NEVER disable `nodeIntegration`
- Validate IPC channel names
- Sanitize all file paths

### Tauri

- Use Tauri's capability system
- Validate all command inputs in Rust
- Don't expose unnecessary APIs

## Quality Checklist

- [ ] TypeScript compiles
- [ ] Lint passes
- [ ] Tests pass
- [ ] App builds successfully
- [ ] Installer created
- [ ] IPC channels properly typed
- [ ] No memory leaks
- [ ] Context isolation maintained

## Common Issues

### Memory Leaks

- Remove event listeners on cleanup
- Use WeakMap for caches
- Profile with DevTools Memory tab

### Build Failures

```bash
# Clean rebuild
pnpm clean
rm -rf node_modules/.cache
pnpm build
```

## Community Skills to Use

- `typescript-expert` - Type safety
- `react-patterns` - UI components
- `performance-profiling` - Memory optimization
- `systematic-debugging` - Bug investigation
