---
name: nova-agent-skill
description: Nova Agent desktop app - Tauri, React, TypeScript, AI services, language server
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Nova Agent Desktop Application Skill

> **AI-Powered Development Assistant** - Tauri + React + TypeScript

## Project Context

| Aspect              | Details                                     |
| ------------------- | ------------------------------------------- |
| **Location**        | `C:\dev\apps\nova-agent`                    |
| **Framework**       | Tauri 2.x (Rust backend) + React (frontend) |
| **Language**        | TypeScript (frontend), Rust (backend)       |
| **Build**           | Vite for frontend, Cargo for Rust           |
| **Package Manager** | pnpm                                        |
| **Database**        | SQLite                                      |

## Tech Stack

- **Desktop Framework**: Tauri 2.x (Rust-based, secure)
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **State**: React hooks, context
- **Services**: Language Server, RAG, Workspace, Agent
- **Testing**: Vitest

## Required Community Skills

| Skill                     | Use Case                   |
| ------------------------- | -------------------------- |
| `typescript-expert`       | Type errors, complex types |
| `react-patterns`          | Component design, hooks    |
| `systematic-debugging`    | Bug investigation          |
| `test-driven-development` | Feature implementation     |
| `performance-profiling`   | Memory/render optimization |

## Architecture

```
nova-agent/
├── src/                    # TypeScript frontend
│   ├── components/         # React components
│   ├── features/           # Feature modules
│   │   ├── analysis-manager.ts
│   │   ├── build-manager.ts
│   │   ├── git-manager.ts
│   │   └── project-manager.ts
│   ├── hooks/              # Custom hooks
│   ├── services/           # Core services
│   │   ├── AgentService.ts
│   │   ├── LanguageServer.ts
│   │   ├── RAGService.ts
│   │   └── WorkspaceService.ts
│   └── types/              # TypeScript types
├── src-tauri/              # Rust backend
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

## Development Workflow

### Start Development

```bash
cd apps/nova-agent
pnpm dev           # Tauri dev (full app)
pnpm dev:web       # Vite only (web preview)
pnpm dev:server    # Backend server only
```

### Build for Production

```bash
pnpm build         # Full Tauri build
pnpm build:frontend # Frontend only
```

### Run Tests

```bash
pnpm test          # Vitest
pnpm test:coverage # With coverage
pnpm typecheck     # TypeScript check
```

## Critical Patterns

### Tauri Command (Rust ↔ TypeScript)

```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| e.to_string())
}
```

```typescript
// src/services/file-service.ts
import { invoke } from '@tauri-apps/api/core';

export async function readFile(path: string): Promise<string> {
  return invoke('read_file', { path });
}
```

### Service Pattern

```typescript
// src/services/AgentService.ts
export class AgentService {
  private static instance: AgentService;

  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  async processQuery(query: string): Promise<AgentResponse> {
    // Implementation
  }
}
```

### Feature Manager Pattern

```typescript
// src/features/project-manager.ts
export class ProjectManager {
  private workspace: WorkspaceService;

  async loadProject(path: string): Promise<Project> {
    const metadata = await this.workspace.getMetadata(path);
    const files = await this.workspace.listFiles(path);
    return { metadata, files };
  }
}
```

## Quality Checklist

Before completing ANY task:

- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`
- [ ] Tauri build works: `pnpm build`
- [ ] No Rust warnings: `cargo check` in src-tauri
- [ ] Services properly typed
- [ ] Error handling complete

## Common Issues

### Tauri Commands Not Found

- Check command is registered in `main.rs`
- Verify `invoke` function name matches exactly
- Check tauri.conf.json capabilities

### Build Failures

```bash
# Clean and rebuild
pnpm clean
cd src-tauri && cargo clean && cd ..
pnpm build
```

### Type Errors with Tauri API

```typescript
// Correct import for Tauri 2.x
import { invoke } from '@tauri-apps/api/core';
// NOT from '@tauri-apps/api/tauri' (v1 syntax)
```

## WSL/Cross-Platform Notes

```bash
# Run tests in WSL-compatible mode
pnpm test:wsl
pnpm test:wsl:coverage
```

## Related Commands

- `/dev:doctor` - System health check
- `/dev:port-check` - Check port availability
- `/project:status` - Project health status
