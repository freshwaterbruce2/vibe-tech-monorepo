# AVGE — Findings Log (Protocol Zebra)

> Continuous log of research discoveries, API constraints, and architectural decisions.

---

## 2026-02-12 — Project Initialization

### Discovery: Existing `ai-youtube-pipeline`
- **Location:** `C:\dev\apps\ai-youtube-pipeline\`
- **Type:** Python scripts (`full_pipeline.py`, `pipeline.py`)
- **Decision:** Keep separate. AVGE is a TypeScript/React system with MCP integration. The Python pipeline may serve as reference but is architecturally incompatible with the agentic BLAST framework.

### Discovery: D:\ Drive Layout
- Pre-existing directories: `databases/`, `data/`, `recordings/`, `learning-system/`
- AVGE data isolated under `D:\avge\` to prevent cross-contamination with other projects.
- SQLite database at `D:\avge\databases\avge.db` for pipeline state persistence.

### Discovery: NotebookLM MCP Server
- Available and configured in the IDE environment.
- 32+ tools accessible including `notebook_create`, `notebook_add_url`, `notebook_query`.
- **Auth required:** Browser-based Google OAuth — must run `notebooklm-mcp-auth` before pipeline calls.

### Constraint: API Credentials
- Google AI Studio (Gemini 2.5 Pro) — requires API key, stored in `.env`
- Google Flow (Nano Banana Pro) — requires API key, stored in `.env`
- Credentials NOT committed to git (`.env` in `.gitignore`)
