# Dependency Audit — Competitive-Gaps Specs

**Date**: 2026-07-04 · **By**: Claude Opus 4.8 (planning session) · **Trigger**: spec 16 shipped with a fictional dependency (the `scheduled-tasks` MCP it named does not exist in the monorepo). This audit verifies every monorepo-service / MCP / package citation in the remaining specs against disk.

**Method**: checked `mcp/registry.json` (the canonical MCP server list), `backend/`, `packages/`, and `apps/`. `mcp/registry.json` is authoritative for what MCP servers actually exist.

---

## Verdict per spec

| Spec | Cited dependency                                                       | Reality                                                                                                                                                                    | Action                                                                                                                                                                                           |
| ---- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 16   | `scheduled-tasks` MCP                                                  | ❌ **FICTIONAL** — not in `mcp/registry.json`. The `mcp__scheduled-tasks__*` tools are a Cowork-platform feature, not a monorepo server.                                   | ✅ Already handled (in-app 30s tick, `f3a8ef15`). Spec **body** still describes the MCP as real in Architecture/Integration/Success — cosmetic inconsistency in a shipped doc; optional cleanup. |
| 04   | `memory` MCP (`mcp__memory__*`) + `D:\memory_bank`                     | ✅ **REAL** — registry `memory` → `apps/memory-mcp/dist/index.js`; DB `D:/databases/memory.db`; tool names (`memory_add_semantic`, `memory_search_semantic`) are accurate. | Accurate. Minor: the MCP's DB is `D:/databases/memory.db`, not `D:\memory_bank` — implementer should confirm the intended target. `rag` + `learning-pipeline` MCPs are also relevant.            |
| 07   | (spec said build LSP bridge as a new Tauri sidecar)                    | ⚠️ **UNDER-REFERENCED** — `backend/lsp-proxy/` already exists and works.                                                                                                   | **Spec edited** with a reuse callout. Extend the proxy, don't rebuild.                                                                                                                           |
| 12   | (spec said build DAP host from scratch)                                | ⚠️ **UNDER-REFERENCED** — `backend/dap-proxy/` already exists and works.                                                                                                   | **Spec edited** with a reuse callout.                                                                                                                                                            |
| 11   | (spec said build browser control via a new CDP/Playwright sidecar)     | ⚠️ **UNDER-REFERENCED** — `chrome-devtools` **and** `playwright` MCP servers are both in `mcp/registry.json`.                                                              | Reuse those instead of a fresh sidecar (see below).                                                                                                                                              |
| 15   | monorepo Express backend (port 5177)                                   | ✅ **REAL** — `backend/server.js` etc. `5177` is assigned in `tools/port-manager/port-registry.json` (not hardcoded in backend code).                                      | Accurate.                                                                                                                                                                                        |
| 17   | Express backend, `@vibetech/billing`, `@vibetech/entitlements`, Docker | ✅ **REAL** packages + backend; Docker runner is new infra (as the spec already acknowledges).                                                                             | Accurate.                                                                                                                                                                                        |

**Net**: only **one** truly fictional dependency (spec 16, already fixed). The more useful finding is the inverse — **real infrastructure the specs told implementers to build from scratch**.

---

## Existing infra the specs under-referenced (reuse this — don't rebuild)

- **`backend/lsp-proxy/src/index.js`** — a working WebSocket↔stdio **LSP bridge** (default port 5002). Already spawns `typescript-language-server` (TS/JS), `pyright-langserver` (Python), `rust-analyzer` (Rust) and handles `Content-Length` framing. → **Spec 07 Phase 1 is largely already built.**
- **`backend/dap-proxy/src/index.js`** — a working WebSocket↔stdio **DAP bridge** (default port 5003), wired for `node` and `python` (debugpy). Caveat: Node path uses raw `node --inspect-brk`, not a real DAP adapter — needs `vscode-js-debug` for true fidelity. → **Spec 12 foundation exists.**
- **`chrome-devtools` MCP** (registry → `scripts/start-chrome-devtools-mcp.ps1`) **and `playwright` MCP** (`@playwright/mcp`) — both already registered. → **Spec 11** should drive the browser through one of these instead of a new CDP sidecar.
- **`serena` MCP** — semantic symbol ops (`find_symbol`, `find_referencing_symbols`). → complements **Spec 07** go-to-def / find-refs while the LSP UI is built.
- **`memory` (`apps/memory-mcp`), `rag` (`apps/mcp-rag-server`), `learning-pipeline` MCPs** — → **Spec 04** knowledge/memory targets already exist.
- **`command-center` MCP (`apps/vibetech-command-center`)** — an existing dashboard host → relevant to **Spec 17** web dashboard and **Spec 15** webhook host.
- **`backend/ipc-bridge/`** (Windows-service IPC bridge) — relevant transport prior art for **Spec 13** remote dev.

Architectural decision common to 07/12 (resolve together): keep the proxies as **standalone Node backend services** VCS connects to over WS (current shape, shared across tools), **or** port them into **Tauri `externalBin` sidecars** for a single-process desktop install.

---

## Confirmed accurate (no change)

Specs 03 (RulesParser/MCPService transports), 05 (TaskPlanner/SemanticSearch/AgentOrchestrator), 06 (self-flags the `@vibetech/auth` sync endpoint as not-yet-existing), 08 (`services/testing/*` exists), 09/10 (TaskMonitorPanel/BackgroundAgentSystem/GitService), 13 (`@devcontainers/cli`, russh), 14 (Jupyter/@jupyterlab/services), 18 (Open VSX) — all cite real libraries or correctly-flagged gaps.

**Standing rule for implementers** (per PROGRESS.md line 53): before wiring a spec to a named monorepo service or MCP, confirm it in `mcp/registry.json` / on disk. One spec (16) named a server that never existed; two (07, 12) missed servers that already do.
