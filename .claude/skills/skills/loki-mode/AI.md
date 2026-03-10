---
type: ai-notes
scope: deploy-skill
status: detailed
lastReviewed: 2026-01-22
---

# loki-mode (Claude Code skill)

Multi-agent autonomous skill for Claude Code. Read the skill definition first, then use the references progressively.

## Canonical docs

- Skill definition: `SKILL.md`
- Installation/usage: `README.md`, `INSTALLATION.md`
- Deeper references: `references/`
- Workspace rules: `../../../../docs/ai/WORKSPACE.md`

## Usage notes

- The skill triggers on the phrase "Loki Mode".
- It is designed for Claude Code; it may assume elevated permissions (per `SKILL.md`). Only run with elevated permissions if you understand the implications.

## State & memory

When used, it expects state under `.loki/` (continuity, queues, orchestrator state, metrics).
