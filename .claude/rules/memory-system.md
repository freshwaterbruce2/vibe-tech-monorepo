# Memory System & Specialist Agents

Phase 1.5 intelligent memory system with context-aware assistance and specialist agents.

## Core Features

### 1. Task Persistence

- Automatically tracks tasks across Claude Code sessions
- Stores up to 5 recent tasks with metadata (timestamp, complexity, category, project)
- Tasks marked as `in_progress` or `completed` based on completion signals
- **Storage**: `apps/memory-bank/quick-access/recent-tasks.json`

### 2. Project-Aware Context Tracking

- Automatically detects current project from git modified files or working directory
- Filters task history to show only relevant tasks for current project
- Workspace tasks visible across all project contexts
- **Supported structures**:
  - `apps/[project-name]/`
  - `packages/[package-name]/`
  - `backend/[service-name]/`

### 3. Proactive Agent System

- Specialist agents automatically available based on project context
- Each agent includes anti-duplication directives as PRIMARY DIRECTIVE
- **Configuration**: `.claude/agents.json`
- **Agent definitions**: `.claude/agents/*.md`

## Specialist Agents

### Crypto Trading Expert (`@crypto-expert`)

- **Expertise**: Python, AsyncIO, Kraken API, WebSocket, Trading Algorithms
- **Primary Directive**: Anti-Duplication & Code Quality
- **Projects**: crypto-enhanced

### Web Application Expert (`@webapp-expert`)

- **Expertise**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Primary Directive**: Anti-Duplication & Component Reusability
- **Projects**: digital-content-builder, business-booking-platform, shipping-pwa, vibe-tech-lovable

### Desktop Application Expert (`@desktop-expert`)

- **Expertise**: React, TypeScript, Tauri, Electron
- **Primary Directive**: Anti-Duplication & Performance Optimization
- **Projects**: taskmaster, deepcode-editor, nova-agent-current, productivity-dashboard, desktop-commander-v2-final

### Mobile Application Expert (`@mobile-expert`)

- **Expertise**: Capacitor, React Native, PWA, iOS, Android
- **Primary Directive**: Anti-Duplication & Native Performance
- **Projects**: Vibe-Tutor

### Backend API Expert (`@backend-expert`)

- **Expertise**: Node.js, TypeScript, Python, REST API, Databases
- **Primary Directive**: Anti-Duplication & Security
- **Projects**: memory-bank

### DevOps & Infrastructure Expert (`@devops-expert`)

- **Expertise**: Docker, GitHub Actions, CI/CD, Deployment, Monitoring
- **Primary Directive**: Anti-Duplication & Automation
- **Projects**: Available for workspace-level infrastructure tasks

## Session Start Display

When starting a Claude Code session, you'll see:

```text
CONTEXT: [project-name] | Specialist Agent: @[agent-name] is available
         [Agent Display Name] - [Primary Directive]

RECENT WORK
----------------
  In Progress:
    [!] fix nonce synchronization error
        Category: debugging | Started: 2025-10-09 16:40:48
```

## Anti-Duplication Workflow

All specialist agents follow this workflow before implementing new code:

1. **Search** existing codebase for similar implementations
2. **Document** all duplicates found with file paths
3. **Propose** refactoring to consolidate logic
4. **Implement** reusable abstractions
5. **Delete** redundant code after migration

## Memory System Files

- **Configuration**: `.claude/agents.json` - Project-to-agent mappings
- **Agent Definitions**: `.claude/agents/*.md` - Specialist instructions
- **Task History**: `apps/memory-bank/quick-access/recent-tasks.json`
- **Hooks**:
  - `.claude/hooks/session-start.ps1` - Display context on session start
  - `.claude/hooks/user-prompt-submit.ps1` - Track tasks on user input
