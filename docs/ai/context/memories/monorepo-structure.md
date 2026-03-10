# VibeTech Monorepo Structure

Last Updated: 2026-01-06

## Overview

C:\dev is an Nx monorepo containing 52+ integrated projects with shared tooling and intelligent caching.

## Project Breakdown

### Applications (apps/) - 24 Total

- **15 Nx-Integrated**: business-booking-platform, crypto-enhanced, desktop-commander-v3, digital-content-builder, iconforge, invoice-automation-saas, memory-bank, nova-agent, shipping-pwa, symptom-tracker, vibe-code-studio, vibe-justice, vibe-shop, vibe-tech-lovable, vibe-tutor
- **9 Non-Integrated**: advanced, chatbox-cli, claude-agents, n8n-automation, nova-mobile-app, prompt-engineer, shared-web, vibe-subscription-guard, _archived

### Backend Services (backend/) - 11 Total

All Nx-integrated: symptom-tracker-api, config, dap-proxy, data, ipc-bridge, lsp-proxy, middleware, nova-sqlite-mcp, prompt-engineer, search-service, workflow-engine

### Shared Packages (packages/) - 18 Total

All Nx-integrated: nova-core, nova-database, nova-types, shared-config, shared-ipc, shared-logic, shared-utils, vibetech-hooks, vibetech-shared, vibetech-types, ui, backend, logger, feature-flags, db-app, db-learning, service-common, vibe-python-shared

## Key Files

- nx.json - Nx workspace configuration
- pnpm-workspace.yaml - pnpm workspace definition
- CLAUDE.md - Primary workspace documentation
- MONOREPO_WORKFLOW.md - Git workflow guide
- .claude/rules/ - Modular documentation system

## Performance Benefits

- Nx caching: 80-90% faster builds
- Affected-only builds: Only build what changed
- Parallel execution: Tasks run concurrently
- Shared dependencies: Single node_modules via pnpm

## Navigation Tips

1. Use nx.json to understand project relationships
2. Check project.json in each project for targets
3. Use `pnpm nx graph` to visualize dependencies
4. Run `pnpm nx show projects --projects=tag:web` to filter by tag
