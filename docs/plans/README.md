# Plans Directory

This directory contains **structured plan artifacts** that survive across agent sessions.

## Why Plan Artifacts Matter

Research shows that agents perform significantly better when planning and execution are separated:
- Plans written to files survive context compaction
- Execution agents can reference the plan without re-reading conversation history
- Reviewer agents can verify against explicit acceptance criteria
- Plans enable multi-agent handoffs (Planner → Executor → Reviewer)

## Plan Template

Create a new plan file: `docs/plans/<feature-or-task>.md`

```markdown
# Plan: [Feature/Task Name]

**Scope**: [Brief description]  
**Status**: draft | approved | in-progress | completed  
**Created**: [Date]  
**Agent**: [planner-name]

## Context

[Background, user request, problem statement]

## Goals

1. [Specific, measurable goal]
2. [Specific, measurable goal]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Architecture / Decisions

- **Decision 1**: [What was decided and why]
- **Decision 2**: [What was decided and why]

## Constraints

- [Constraint 1]
- [Constraint 2]

## Dependencies

- [Dependency or prerequisite]

## Tasks

| # | Task | Agent | Status |
|---|------|-------|--------|
| 1 | [Task description] | executor | pending |
| 2 | [Task description] | reviewer | pending |

## Notes

[Any additional context, risks, or open questions]
```

## Integration with Memory System

When a plan is created or updated, capture it to memory:

```bash
node scripts/memory-plan.cjs --plan-file docs/plans/my-feature.md --scope my-feature --status draft
```

When execution completes, verify against the plan:

```bash
node scripts/memory-verify.cjs --plan docs/plans/my-feature.md --outcome "Implemented OAuth" --verdict partial --gaps "Tests still needed"
```

## Active Plans

Plans with status `draft`, `approved`, or `in-progress` are automatically loaded
by `scripts/memory-start.cjs` at the beginning of each agent session.
