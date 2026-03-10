---
type: ai-entrypoint
scope: project
audience:
  - gemini
status: production-ready
lastReviewed: 2026-02-06
---

# nova-agent GEMINI.md

Canonical project rules live here:

- AI notes: AI.md
- Workspace rules: ../../docs/ai/WORKSPACE.md

## Status (2026-02-06)
- **Codebase:** Reviewed and validated manually.
- **Architecture:** React + Tauri (Rust) with Python integrations.
- **Verification:** Automated tests blocked by environment file locking issues (pnpm).
- **Next Steps:** Resolve environment locking (requires restart) before running full CI suite.

Legacy (archived): GEMINI.legacy.2026-01-22.md
