# Memory System & Specialist Agents

## Core Features

- **Project detection**: auto-detects context from git modified files or working directory
- **Specialist agents**: available based on project context; config in `.claude/agents.json` and `.claude/agents/*.md`

## Specialist Agents

| Agent | Expertise | Projects |
|-------|-----------|---------|
| `@crypto-expert` | Python, AsyncIO, Kraken API, WebSocket | crypto-enhanced |
| `@webapp-expert` | React, TypeScript, Vite, Tailwind, shadcn/ui | digital-content-builder, shipping-pwa, vibe-tech-lovable |
| `@desktop-expert` | React, TypeScript, Tauri, Electron | nova-agent-current, taskmaster, deepcode-editor |
| `@mobile-expert` | Capacitor, React Native, PWA, iOS, Android | vibe-tutor |
| `@backend-expert` | Node.js, TypeScript, Python, REST, Databases | memory-bank |

All agents have **Anti-Duplication** as their primary directive.

## Anti-Duplication Workflow

Before implementing any new code, agents must:

1. Search existing codebase for similar implementations
2. Document all duplicates found (with file paths)
3. Propose refactoring to consolidate logic
4. Implement reusable abstractions
5. Delete redundant code after migration

## Automated Agent Execution Recording

Specialist agent invocations (Agent tool) are automatically recorded to
`D:\databases\agent_learning.db` via the `PostToolUse(Agent)` hook:
`.claude/hooks/record-agent-execution.ps1`.

Each invocation writes: `agent_id` (subagent_type), `task_type` (description),
`success`, `execution_time_ms`, `project_name`, and `context` (truncated prompt).

View recent executions:
```bash
sqlite3 D:\databases\agent_learning.db "SELECT agent_id, task_type, success, started_at FROM agent_executions ORDER BY started_at DESC LIMIT 10;"
```

Per-agent success rates:
```bash
sqlite3 D:\databases\agent_learning.db "SELECT agent_id, COUNT(*) as runs, ROUND(AVG(success)*100,1) as success_pct FROM agent_executions GROUP BY agent_id ORDER BY runs DESC;"
```

Disable: set `"hooks": {}` in `.claude/settings.json` and restart Claude Code.
