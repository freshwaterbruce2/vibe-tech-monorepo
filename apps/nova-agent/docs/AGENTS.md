# AGENTS.md - Nova Agent

> **Location:** `C:\dev\apps\nova-agent`
> **Status:** Active desktop app (`package.json` version 1.3.0)
> **Knowledge Base:** `D:\databases\agent_learning.db`
> **Identity:** Single-user (Bruce), Local-First, Persistent Context

---

## What is Nova Agent?

A **24/7 Context-Aware AI Desktop Assistant** that runs as a background service on Windows 11.
It bridges the gap between your IDE, your filesystem, and your productivity, utilizing a local SQLite brain to "learn" from your habits.

### ✅ Core Capabilities (Active)

1.  **AI Intelligence (Robust Fallback)**:
    *   Primary: **DeepSeek V3** (Reasoning & Code)
    *   Fallback 1: **Groq** (Llama 3.3 70B - High Speed)
    *   Fallback 2: **HuggingFace** (Mistral/Mixtral - Backup)
    *   *System automatically switches providers on failure and logs "System Note: AI_FALLBACK_TRIGGERED".*

2.  **Activity Daemon (Context Engine)**:
    *   Background service (`activity_monitor.rs`) polls window state every 1s.
    *   Captures full **Workspace Snapshots** (git status, active file, deep work score) every 60s.
    *   Persists to `D:\databases\nova_activity.db` (WAL Mode Enabled).

3.  **Persistent Memory**:
    *   Stores conversations, facts, and project context in `agent_learning.db`.
    *   Current Knowledge Base: >400 items.

4.  **Desktop Integration**:
    *   Read/Write files.
    *   Execute code (Python, JS, PowerShell).
    *   Web Search (simulated/API).

---

## Critical Storage Architecture

```
C:\dev\apps\nova-agent    = APPLICATION CODE (Stateless)
D:\databases\             = STATE & MEMORY (Persistent)
├── nova_activity.db      # High-frequency activity logs & snapshots
├── agent_learning.db     # Long-term memory & knowledge
└── agent_tasks.db        # Project tasks & kanban
```

---

## Developer Guide

### Key Files

*   `src-tauri/src/modules/llm.rs`: AI Fallback logic (`call_with_fallback`).
*   `src-tauri/src/activity_monitor.rs`: Background daemon loop.
*   `src-tauri/src/context_engine.rs`: Logic for capturing system state.

### Commands

```powershell
# Run Dev
pnpm nx run nova-agent:dev

# Build Release
pnpm nx run nova-agent:build

# Verify
pnpm nx run nova-agent:test
pnpm nx run nova-agent:test:rust
pnpm nx run nova-agent:check:rust
```

---

*This document supersedes all previous "Status" or "Plan" markdowns.*
