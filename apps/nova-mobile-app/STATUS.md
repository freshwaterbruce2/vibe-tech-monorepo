# Status: Active — Beta (Mobile Client)

Cross-platform mobile client for the Nova AI Agent ecosystem.

## Connection Model

- **Bridge Architecture**: Mobile → HTTP → Nova Desktop Server (port 3000)
- **Protocol**: REST/JSON via `HttpAgentAdapter`
- **State**: Zustand + AsyncStorage persistence

## Features

- 💬 Real-time chat with Nova Agent
- 🧠 Memory search & browsing
- 📊 Live connection status & agent health
- ⚙️ Configurable server URL (LAN / ADB reverse)

## Active Projects

- `nova-agent` (desktop backend)
- `@nova/core` (shared abstractions)
- `@nova/types` (shared type contracts)

**Data Rule**: All data must remain on D:\ per root `AGENTS.md` / Antigravity rules.
