# Nova Agent System Architecture

## 🤝 Nova–Deep Code Editor Contract

**Roles**

- **Nova**: Context collector + guidance engine + scaffolder.
- **Deep Code Editor**: IDE with VS Code/Cursor-class features.

**Storage & Learning**

- **Location**: D:\ WAL DBs only (`agent_tasks.db`, `agent_learning.db`, `nova_activity.db`).
- **Access**: Both apps read/write to the same SQLite databases.

**IPC & Communication**

- **Transport**: WebSocket Bridge (`ws://127.0.0.1:5004`).
- **Schema**: `@vibetech/shared-ipc` (Strict Zod schemas).
- **Client Behavior**: Queueing, exponential backoff, status telemetry.

**AI & Intelligence**

- **Model**: DeepSeek latest required for both.
- **Context**: Nova collects system/git context; Deep Code Editor provides file/AST context.

**Capabilities**

- **Nova**: Handles `project:create` + GitHub operations.
- **Deep Code Editor**: Handles `file:open` commands and returns context updates.

## High-Level Overview

The Nova Agent is the orchestrator of the VibeTech ecosystem. It connects the user's desktop environment, the Deep Code Editor (Vibe Code Studio), and a shared persistent memory system.

```mermaid
graph TD
    User[User] <--> NovaUI[Nova Agent UI (React)]
    NovaUI <--> NovaBackend[Nova Backend (Tauri/Rust)]

    subgraph "Desktop Environment"
        NovaBackend -- Monitor --> ActiveWindow[Active Window]
        NovaBackend -- Monitor --> Processes[System Processes]
        NovaBackend -- Control --> FileSystem[File System (C: / D:)]
    end

    subgraph "VibeTech Ecosystem"
        NovaBackend <-- IPC --> IPCBridge[IPC Bridge]
        IPCBridge <-- IPC --> VibeCode[Vibe Code Studio]
        IPCBridge <-- IPC --> DesktopCmd[Desktop Commander V3]
    end

    subgraph "Persistent Memory (D: Drive)"
        NovaBackend -- Read/Write --> SharedDB[(Shared Database)]
        NovaBackend -- Read/Write --> LearningSys[(Learning System)]
        VibeCode -- Read/Write --> SharedDB
    end
```

## Key Components

### 1. Context Awareness Engine

- **Responsibility**: Monitors user activity to determine "Current Context".
- **Inputs**: Active window title, process list, open files (via Vibe Code Studio), recent terminal commands.
- **Outputs**: "Next Step" recommendations, "Error" detection.
- **Implementation**: Polling service in `src-tauri` (Rust) or `desktop-commander-v3`.

### 2. Shared Memory System (D: Drive)

- **Location**: `D:\shared_memory` (Target)
- **Components**:
  - **Operational DB**: SQLite database for active project state, tasks, and logs.
  - **Learning DB**: Vector database (or structured JSON) for storing "Lessons" and "Patterns".
- **Access**: Shared by Nova Agent and Vibe Code Studio. File-based locking or a dedicated DB service (via `ipc-bridge`) is required to prevent corruption.

### 3. Deep Code Editor Integration

- **Communication**: WebSocket via `ipc-bridge`.
- **Protocol**: `@vibetech/shared-ipc` schemas.
- **Features**:
  - **Context Sharing**: Editor sends "File Opened", "Build Failed" events to Nova.
  - **Remote Control**: Nova sends "Create File", "Run Command" requests to Editor.

### 4. Project Scaffolding

- **Engine**: Template-based generator.
- **Execution**: Runs `npx` or `git clone` commands via `desktop-commander-v3`.
- **Registration**: Automatically adds new projects to the Shared Database.

## Data Flow: "The Guidance Loop"

1. **Observe**: Nova captures "User is in VS Code, editing `App.tsx`, Build failed".
2. **Analyze**: Nova queries Learning System: "How to fix build error in App.tsx?".
3. **Guide**: Nova UI displays: "It looks like you have a routing error. Check `App.tsx` line 25."
4. **Act**: User clicks "Fix it". Nova sends command to Vibe Code Studio to apply patch.
5. **Learn**: If build succeeds, Nova records "Routing error fixed by X" to Learning System.
