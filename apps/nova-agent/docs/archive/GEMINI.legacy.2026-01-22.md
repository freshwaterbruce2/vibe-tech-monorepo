# Nova Agent - Application Context

Nova is a Neural Omnipresent Virtual Assistant designed as a personalized AI agent with memory and project management capabilities.

## Architecture

- **Framework**: Tauri (Rust + Webview)
- **Frontend**: React (Vite, TypeScript, Tailwind CSS)
- **AI Engine**: LangChain, ChromaDB (Vector Store), DeepSeek/OpenAI integration
- **Database**: SQLite (via `sqlite3` / `better-sqlite3`) for persistent local storage

## Key Features

- **Project Management**: Tracks projects, tasks, and deadlines.
- **Memory**: Uses ChromaDB for RAG (Retrieval-Augmented Generation) to remember user context.
- **Automation**: Can execute shell commands and manage system tasks (via `desktop-commander-v3` or internal tools).
- **Communication**: Connects to the `ipc-bridge` to share state with Vibe Code Studio.

## Development

- **Run Dev**: `pnpm tauri dev`
- **Build**: `pnpm tauri build`
- **Tests**: `pnpm test` (Vitest), `pnpm test:e2e` (Playwright)

## Integration

- **Shared IPC**: Uses `@vibetech/shared-ipc` for type-safe communication.
- **Backend**: Connects to local backend services for search and advanced inference.
