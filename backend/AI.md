---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-01-22
project:
  name: backend
  path: backend
category: backend
---

# backend AI Notes

## What this directory is

- Backend microservices and proxies (IPC, workflow, search, DAP/LSP, model proxies, etc.).

## Guardrails

- Validate required env vars at startup.
- Keep services loosely coupled; communicate over IPC/WebSockets or HTTP.
- Databases belong in `D:\databases`; logs belong in `D:\logs`.

## References

- Workspace rules: [../docs/ai/WORKSPACE.md](../docs/ai/WORKSPACE.md)
- Backend area: [../docs/ai/areas/BACKEND.md](../docs/ai/areas/BACKEND.md)
