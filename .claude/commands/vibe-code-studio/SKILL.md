---
name: vibe-code-studio-skill
description: Electron desktop app development - IPC, main/renderer process, native modules, packaging
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Vibe Code Studio Desktop Skill

> **Electron Desktop Application** - TypeScript, React, IPC communication

## Project Context

| Aspect              | Details                             |
| ------------------- | ----------------------------------- |
| **Location**        | `C:\dev\apps\vibe-code-studio`      |
| **Framework**       | Electron + React + TypeScript       |
| **Build**           | Vite for renderer, esbuild for main |
| **Packaging**       | electron-builder                    |
| **Package Manager** | pnpm                                |

## Tech Stack

- **Main Process**: TypeScript, Node.js APIs
- **Renderer Process**: React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State**: Zustand
- **IPC**: Typed IPC with preload bridge
- **Database**: SQLite via better-sqlite3

## Required Community Skills

| Skill                     | Use Case                   |
| ------------------------- | -------------------------- |
| `typescript-expert`       | Type errors, build issues  |
| `react-patterns`          | UI component design        |
| `systematic-debugging`    | ANY bug investigation      |
| `test-driven-development` | Feature implementation     |
| `performance-profiling`   | Memory leaks, slow renders |

## Architecture

```
vibe-code-studio/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Entry point
│   │   ├── ipc/        # IPC handlers
│   │   └── services/   # Native services
│   ├── renderer/       # React app
│   │   ├── components/
│   │   ├── hooks/
│   │   └── stores/
│   └── preload/        # Context bridge
├── electron-builder.json
└── vite.config.ts
```

## Development Workflow

### Start Development

```bash
# From project root
cd apps/vibe-code-studio
pnpm dev
```

### Build for Production

```bash
pnpm build
pnpm package  # Creates installer
```

### Run Tests

```bash
pnpm test           # Unit tests
pnpm test:e2e       # Electron E2E tests
```

## Critical Patterns

### IPC Communication (Type-Safe)

```typescript
// shared/ipc-types.ts
export interface IpcChannels {
  'file:read': { path: string } => Promise<string>;
  'file:write': { path: string; content: string } => Promise<void>;
  'app:getVersion': void => string;
}

// main/ipc/handlers.ts
ipcMain.handle('file:read', async (_, { path }) => {
  return fs.promises.readFile(path, 'utf-8');
});

// renderer - via preload
const content = await window.api.invoke('file:read', { path });
```

### Preload Security

```typescript
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  invoke: <T>(channel: string, data?: unknown): Promise<T> => {
    const validChannels = ['file:read', 'file:write', 'app:getVersion'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    throw new Error(`Invalid channel: ${channel}`);
  },
});
```

## Quality Checklist

Before completing ANY task:

- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] IPC channels properly typed
- [ ] Context isolation maintained

## Common Issues

### Memory Leaks

- Always remove event listeners in cleanup
- Use WeakMap for caching
- Profile with Chrome DevTools Memory tab

### IPC Performance

- Batch small IPC calls
- Use streaming for large data
- Avoid synchronous IPC

### Build Failures

- Check native module compatibility
- Verify electron-builder config
- Check for missing assets

## Related Commands

- `/vibe-code-studio:dev` - Start development
- `/vibe-code-studio:build` - Production build
- `/vibe-code-studio:test` - Run tests
- `/vibe-code-studio:quality` - Full quality pipeline
