---
name: memory-lifecycle
description: 'Automated memory review at session start, capture during work, and structured handoff at session end. Supports multi-agent plan/execute/review workflows. Use when: starting a session, making decisions, before context compaction, ending a session, resuming work, creating plans, handing off between agents.'
version: '1.1.0'
author: 'VibeTech Workspace'
tags: ['memory', 'persistence', 'session', 'context', 'productivity', 'multi-agent', 'plan', 'execute']
---

# Memory Lifecycle

You are a memory-aware agent. Every session has a lifecycle: **start → work → compact → end**. At each boundary, you interact with persistent memory so that knowledge survives across sessions and agents.

This workspace uses a hybrid memory system:
- **SQLite DB** (`D:\databases\memory.db`): episodic events, semantic facts, procedural patterns
- **Memory Bank** (`memory-bank/`): human-readable Markdown context files
- **Session Handoff** (`memory-bank/next-session-prompt.md`): exact resume instructions
- **Plans** (`docs/plans/`): structured plan artifacts that survive context compaction

---

## Lifecycle Stages

### 1. Session Start — Memory Review

**When**: At the beginning of every conversation.
**Script**: `node scripts/memory-start.cjs`

This script prints a token-budgeted summary (~2,000 chars max) of:
- `memory-bank/next-session-prompt.md` — where to resume if previous session left off
- `memory-bank/activeContext.md` — current task and blockers
- **Active plans** from `docs/plans/` (not completed)
- **Recent procedural workflows** (plan patterns from past sessions)
- Recent episodic memories from the last 24 hours
- Semantic memories relevant to the current git branch

**What you must do**:
1. Run the start script
2. Read its output into your context
3. Acknowledge the current state to the user
4. If a handoff exists, confirm you understand the resume point
5. If active plans exist, confirm which plan you are executing

---

### 2. During Work — Memory Capture

**When**: After significant tool use (Edit, Write, Agent, major Shell commands).
**Script**: `node scripts/memory-capture.cjs --type <decision|pattern|bugfix|learning> --query "..." --response "..."`

**Capture these kinds of information**:
- Architectural decisions with trade-offs
- Bug solutions with root cause
- Discovered project constraints or quirks
- Successful patterns or failed approaches
- Tool/dependency versions that work

**What you must do**:
1. After completing a significant subtask, capture the outcome
2. Be concise: 1-3 sentences for the query, 1-3 sentences for the response
3. The script auto-filters secrets (API keys, tokens, passwords)
4. The script auto-deduplicates: identical content within 5 minutes is skipped

---

### 3. Before Context Compaction — Checkpoint

**When**: When you sense the conversation is getting long (15+ turns, 10K+ tokens) or before a context compaction event.
**Script**: `node scripts/memory-compact.cjs`

This saves a compact checkpoint with:
- Current task state
- Decisions made so far
- Remaining work
- Any blockers

**What you must do**:
1. Run the compact script before context gets critical
2. Continue working with confidence that state is preserved

---

### 4. Session End — Handoff

**When**: Before claiming work is complete or before the session ends.
**Script**: `node scripts/memory-handoff.cjs --summary "..." --decisions "..." --blockers "..." --next-steps "..."`

This writes:
- `memory-bank/next-session-prompt.md` — structured handoff for the next session
- Episodic memory entry for this session
- `memory-bank/progress.md` update if work completed

**What you must do**:
1. Summarize what was accomplished
2. List decisions made with brief rationale
3. Note any blockers or open questions
4. Write exact next steps (files to edit, commands to run, decisions pending)
5. Run the handoff script

---

## Multi-Agent Plan / Execute / Review Workflow

For complex tasks, use the **Plan-and-Execute** pattern with memory-aware handoffs.

### Phase A: Planning (Read-Only)

**Agent role**: Planner / Researcher  
**Tool access**: Read-only (no Edit, Write, or Shell that modifies state)  
**Goal**: Produce a structured plan artifact

1. Explore codebase, read relevant files
2. Write plan to `docs/plans/<feature>.md` using the template
3. Capture plan to memory:
   ```bash
   node scripts/memory-plan.cjs --plan-file docs/plans/<feature>.md --scope <feature> --status draft
   ```
4. Record handoff to executor:
   ```bash
   node scripts/memory-agent-handoff.cjs --from planner --to executor --artifact docs/plans/<feature>.md --state "Plan drafted, awaiting approval"
   ```

### Phase B: Execution (Full Access)

**Agent role**: Executor / Worker  
**Tool access**: Full (Edit, Write, Shell, etc.)  
**Goal**: Implement the approved plan

1. At session start, `memory-start.cjs` will load the active plan
2. Follow the plan's tasks and acceptance criteria
3. Capture decisions as you work:
   ```bash
   node scripts/memory-capture.cjs --type decision --query "..." --response "..."
   ```
4. Before ending, run handoff if work is incomplete

### Phase C: Verification (Read + Test)

**Agent role**: Reviewer / Critic  
**Tool access**: Read + test execution  
**Goal**: Validate against plan acceptance criteria

1. Read the plan and the implementation
2. Run verification:
   ```bash
   node scripts/memory-verify.cjs --plan docs/plans/<feature>.md --outcome "..." --gaps "..." --verdict <pass|fail|partial|incomplete>
   ```
3. If gaps exist, the verification script will recommend replanning
4. Record handoff back to planner if needed:
   ```bash
   node scripts/memory-agent-handoff.cjs --from reviewer --to planner --artifact docs/plans/<feature>.md --state "Verification failed, gaps identified"
   ```

### Phase D: Replanning (Read-Only)

If verification finds gaps:
1. Planner re-reads the plan + verification report
2. Updates `docs/plans/<feature>.md` with revised tasks
3. Re-captures the plan:
   ```bash
   node scripts/memory-plan.cjs --plan-file docs/plans/<feature>.md --scope <feature> --status draft
   ```
4. Hands off to executor again

---

## What to Store

| Category | Examples | Memory Type |
|----------|----------|-------------|
| Decisions | "Chose Zod over Joi for validation" | semantic |
| Constraints | "Electron apps cannot use localStorage" | semantic |
| Bugfixes | "Null pointer caused by unhandled async error" | episodic + semantic |
| Patterns | "Use `pnpm nx build <project>` instead of direct commands" | semantic |
| Session state | "Implemented auth flow, need to test OAuth callback" | episodic |
| Blockers | "Blocked by missing API key for Stripe test mode" | episodic |
| Plans | "Plan: OAuth integration (docs/plans/oauth.md)" | procedural |
| Agent handoffs | "Planner → Executor for docs/plans/oauth.md" | episodic |
| Verifications | "OAuth plan: partial — tests missing" | episodic |

## What NOT to Store

- API keys, secrets, passwords (the privacy filter catches most, but don't try)
- Large code snippets (reference file paths instead)
- Raw logs or error dumps (summarize the fix)
- Transient thoughts or speculation
- User personal information

---

## Quick Reference

```bash
# Start of session
node scripts/memory-start.cjs

# After significant work
node scripts/memory-capture.cjs --type decision --query "Chose Vite over webpack" --response "Vite has faster HMR and aligns with monorepo's existing tooling"

# Before context gets long
node scripts/memory-compact.cjs

# End of session
node scripts/memory-handoff.cjs --summary "Implemented OAuth login flow" --decisions "Used PKCE for mobile support" --blockers "Need Stripe test keys" --next-steps "Test OAuth callback handler in apps/vibe-shop/src/auth/callback.tsx"

# Plan created
node scripts/memory-plan.cjs --plan-file docs/plans/oauth.md --scope oauth --status draft

# Agent handoff
node scripts/memory-agent-handoff.cjs --from planner --to executor --artifact docs/plans/oauth.md --state "Plan approved"

# Verification
node scripts/memory-verify.cjs --plan docs/plans/oauth.md --outcome "Implemented but tests missing" --verdict partial --gaps "Unit tests for token refresh not written"
```
