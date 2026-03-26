# Memory System & Specialist Agents

## Core Features

- **Task persistence**: tracks up to 5 recent tasks across sessions (`apps/memory-bank/quick-access/recent-tasks.json`)
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
| `@devops-expert` | Docker, GitHub Actions, CI/CD, Monitoring | workspace-level |

All agents have **Anti-Duplication** as their primary directive.

## Anti-Duplication Workflow

Before implementing any new code, agents must:

1. Search existing codebase for similar implementations
2. Document all duplicates found (with file paths)
3. Propose refactoring to consolidate logic
4. Implement reusable abstractions
5. Delete redundant code after migration
