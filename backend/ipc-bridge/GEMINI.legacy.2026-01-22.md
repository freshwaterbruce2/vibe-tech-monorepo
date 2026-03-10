# IPC Bridge - Service Context

The IPC Bridge is the central WebSocket message router for the Nova/Vibe ecosystem. It enables real-time communication between desktop apps, background services, and MCP servers.

## Architecture

- **Type**: Node.js WebSocket Server
- **Port**: 3001 (Default)
- **Protocol**: Custom JSON-RPC style messages defined in `@vibetech/shared-ipc`.

## Responsibilities

- **Routing**: Routes messages between `nova-agent`, `vibe-code-studio`, and `desktop-commander-v3`.
- **Broadcasting**: Handles event broadcasts (e.g., `learning_event`).
- **Health Checks**: Monitors connected clients.

## Development

- **Start**: `pnpm start` or `pnpm dev`
- **Dependencies**: Minimal (just `ws` and `shared-ipc`).

## Critical Notes

- This service MUST be running for the desktop apps to communicate.
- It acts as a "dumb" pipe; business logic should reside in the Apps or the Workflow Engine.
