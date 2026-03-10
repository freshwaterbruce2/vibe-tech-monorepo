# Nova Agent - Rust & Tauri Setup

## Project Overview

**Nova Agent** is a Neural Omnipresent Virtual Assistant built with Tauri 2.x (Rust + React 19).

**Location**: `C:\dev\apps\nova-agent`

## Build Status

**Compilation**: SUCCESS (as of 2025-12-02)

- Zero errors
- 2 warnings (unused methods in database.rs and websocket_client.rs - non-critical)

## Architecture

### Frontend

- **Framework**: React 19 + TypeScript + Vite 7
- **UI**: Radix UI + Tailwind CSS 4
- **State**: TanStack Query 5

### Backend (Tauri/Rust)

- **Version**: Tauri 2.1.1
- **Rust Edition**: 2021
- **Key Dependencies**:
  - tokio (async runtime)
  - rusqlite (database)
  - reqwest (HTTP client)
  - tauri 2.1.1

### Databases

All databases stored on **D:\ drive** (not C:\dev):

- `D:\databases\agent_tasks.db` - Task tracking
- `D:\databases\agent_learning.db` - Learning events
- `D:\databases\nova_activity.db` - Activity logging

## Build Commands

### Development

```bash
# Frontend dev server
pnpm nx dev nova-agent

# Or directly
cd apps/nova-agent
pnpm tauri dev
```

### Production Build

```bash
# Full Tauri build (Rust + Frontend)
pnpm nx build nova-agent

# Or directly
cd apps/nova-agent
pnpm tauri build
```

### Rust-Only Commands

```bash
cd apps/nova-agent/src-tauri

# Check compilation
cargo check

# Build release
cargo build --release

# Run tests
cargo test

# Format code
cargo fmt

# Linting
cargo clippy
```

### Nx Integration

```bash
# Via Nx (recommended for CI/CD)
pnpm nx check:rust nova-agent
pnpm nx build:rust nova-agent
pnpm nx test:rust nova-agent
```

## VS Code Integration

### rust-analyzer Configuration

Added to `.vscode/settings.json`:

```json
{
  "rust-analyzer.linkedProjects": [
    "apps/nova-agent/src-tauri/Cargo.toml",
    "projects/active/desktop-apps/taskmaster/src-tauri/Cargo.toml"
  ],
  "rust-analyzer.check.command": "clippy",
  "rust-analyzer.cargo.features": "all",
  "rust-analyzer.procMacro.enable": true,
  "rust-analyzer.server.extraEnv": {
    "RUST_LOG": "error"
  }
}
```

### Workspace Configuration

Global rust toolchain (`C:\dev\rust-toolchain.toml`):

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
```

## Tauri Commands

The following commands are exposed to the frontend via IPC:

### Core Commands

- `chat_with_agent` - Chat with DeepSeek AI
- `get_agent_status` - Get current agent state
- `update_capabilities` - Update agent capabilities
- `read_file` - Read file with path validation
- `write_file` - Write file with path validation
- `execute_code` - Execute code (not yet implemented)
- `search_memories` - Search conversation history

### Trading Integration

- `get_trading_config` - Get trading system configuration

### Context & Guidance

- `log_activity` - Log activity to database
- `request_guidance` - Request AI guidance (stub)
- `create_project` - Create new project (stub)
- `get_context_snapshot` - Get system context (requires context_engine)

## Common Issues & Fixes

### Issue: rust-analyzer "failed to fetch workspace"

**Cause**: rust-analyzer can't find Cargo.toml or project has compilation errors

**Fix**:

1. Ensure `rust-analyzer.linkedProjects` includes the path to `Cargo.toml`
2. Run `cargo check` to verify no compilation errors
3. Restart VS Code completely (not just window reload)

### Issue: Duplicate function definitions

**Cause**: Auto-save or linter duplicating code

**Fix**:

1. Search for duplicate `#[tauri::command]` annotations
2. Keep only one definition per function
3. Run `cargo check` to verify

### Issue: Build failures in Nx

**Cause**: Working directory mismatch

**Fix**:
Use `cwd` parameter in project.json:

```json
{
  "executor": "nx:run-commands",
  "options": {
    "command": "cargo check",
    "cwd": "apps/nova-agent/src-tauri"
  }
}
```

## Project Structure

```
apps/nova-agent/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── pages/              # Page components
│   └── main.tsx            # Entry point
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri app entry
│   │   ├── database.rs     # Database service
│   │   ├── websocket_client.rs  # WebSocket integration
│   │   └── context_engine.rs    # Context collection
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── package.json            # Node dependencies
├── project.json            # Nx configuration
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```

## Performance

### Build Times

- **Development** (cargo check): ~3-4s (with cache)
- **Release Build** (cargo build --release): ~2-3 minutes
- **Full Tauri Build**: ~3-5 minutes

### Nx Caching

- Nx caching enabled for `check:rust`, `build:rust`, `test:rust`
- ~80-90% faster on repeated builds
- Cache invalidation on Cargo.toml or source file changes

## Related Projects

### Other Tauri Projects in Monorepo

- **taskmaster** (`projects/active/desktop-apps/taskmaster`) - Task management
- **nova-agent-snapshots** (`projects/active/desktop-apps/nova-agent-snapshots`) - Archived versions

## Environment Variables

Required in `.env`:

```bash
# DeepSeek AI
VITE_DEEPSEEK_API_KEY=your_api_key
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com
VITE_DEEPSEEK_MODEL=deepseek-chat

# Database paths (D: drive)
VITE_DATABASE_PATH=D:/databases/agent_tasks.db
VITE_LEARNING_DB_PATH=D:/databases/agent_learning.db
VITE_ACTIVITY_DB_PATH=D:/databases/nova_activity.db

# Trading system integration
VITE_TRADING_DATA_DIR=D:/databases/trading
VITE_TRADING_LOGS_DIR=D:/logs/trading

# WebSocket
VITE_DEEPCODE_WS_URL=ws://localhost:3030/ws
```

## Testing

### Unit Tests (Rust)

```bash
cd apps/nova-agent/src-tauri
cargo test
```

### Frontend Tests (Vitest)

```bash
cd apps/nova-agent
pnpm test
pnpm test:coverage
```

### E2E Tests (Playwright)

```bash
cd apps/nova-agent
pnpm test:e2e
pnpm test:e2e:ui  # UI mode
```

## Deployment

### Windows

```bash
cd apps/nova-agent
pnpm tauri build
```

Output: `src-tauri/target/release/nova-agent.exe`

### Installer

```bash
# MSI installer
Output: `src-tauri/target/release/bundle/msi/nova-agent_1.0.0_x64_en-US.msi`
```

## Resources

- **Tauri Docs**: <https://v2.tauri.app>
- **Rust Book**: <https://doc.rust-lang.org/book/>
- **cargo Book**: <https://doc.rust-lang.org/cargo/>
- **rust-analyzer**: <https://rust-analyzer.github.io/>

## Last Updated

2025-12-02 - Build restored, rust-analyzer configured, Nx integration complete
