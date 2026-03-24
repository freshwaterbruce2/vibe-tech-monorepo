# Agent Architecture Reference

This documents the multi-agent system designed for Claude Code's sub-agent spawning.
These configs live on disk at `C:\dev\.claude\` and may be used when working in Claude Code.

## Overview

- **Pattern**: Orchestrator-worker (Anthropic reference architecture)
- **Orchestrator**: Claude Opus 4.5 / Claude Code
- **Workers**: Sonnet 4.5 (reasoning tasks) + Haiku 4.5 (routine tasks)

## Parent Agents (12)

Located in `C:\dev\.claude\agents\`:

| Agent             | Category    | Expertise                                    |
| ----------------- | ----------- | -------------------------------------------- |
| `desktop-expert`  | Desktop     | Electron, Tauri, IPC                         |
| `webapp-expert`   | Web         | React, Vite, Tailwind, shadcn/ui             |
| `backend-expert`  | Backend     | Express, REST API, SQLite                    |
| `mobile-expert`   | Mobile      | Capacitor, PWA, responsive                   |
| `crypto-expert`   | Trading     | Python, Kraken API, WebSocket                |
| `database-expert` | Infra       | SQLite, migrations, D:\ policy               |
| `frontend-expert` | UI          | React 19, accessibility, design systems      |
| `api-expert`      | Integration | OpenRouter, DeepSeek, rate limiting          |
| `learning-expert` | ML          | Pattern recognition, RAG, execution tracking |
| `qa-expert`       | Testing     | Vitest, Playwright, coverage                 |
| `ui-ux-expert`    | Design      | WCAG, responsive, design systems             |
| `data-expert`     | Data        | ChromaDB, vector DBs, ETL                    |

## Sub-Agents (30)

Located in `C:\dev\.claude\sub-agents\`. Each has a parent agent and model assignment.
Full specs in `C:\dev\.claude\agents.json`.

## App-to-Agent Routing

Defined in `C:\dev\.claude\agents.json` under `project_agents`. Maps each app to its parent agent.

## Delegation Rules

Defined in `C:\dev\.claude\agent-delegation.yaml`. Key rules:

- Security specialist runs before deployment specialist
- Quality check before testing
- Build before test
- Database specialist enforces D:\ storage policy
- Capacitor specialist always increments Android versionCode
