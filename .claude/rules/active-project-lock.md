# Active Project Lock

Priority: CRITICAL — MANDATORY
Scope: All AI agents (Claude, Gemini, Augment, Codex, etc.) working in this monorepo.
Last Updated: 2026-05-02

---

## Core Rule

**Finish the active project before starting another.**

A single state file `D:\active-project\active-project.json` declares which project is currently locked and the criteria that must be satisfied to mark it complete. While a lock is active, work outside the lock's allowed paths is refused.

This rule operates alongside (not instead of) `.claude/rules/project-completion.md`. That file defines what "done" means; this file enforces "one at a time."

---

## State File: `D:\active-project\active-project.json`

Lives on `D:\` per `paths-policy.md` (operational state, not source code; survives git resets and worktree experiments).

```jsonc
{
  "activeProject": "<name-or-null>",
  "lockedAt": "<ISO 8601>",
  "lockedBy": "<user>",
  "criteria": [
    { "id": "<short-id>", "type": "auto" | "manual", "description": "<text>", "satisfied": false }
  ],
  "allowedPaths": [ "<glob>", ... ]
}
```

If the file is absent or `activeProject` is `null`, no lock is in effect — work proceeds normally.

---

## Behavior Contract

### 1. At session start
Read `D:\active-project\active-project.json`. If a lock is active, surface it briefly in the first response that touches project work:

> "Active project lock: `<name>` (3/9 criteria met). Run `pnpm project:status` for the checklist."

Don't repeat this every turn — once per session is enough.

### 2. Before starting cross-project work

"Cross-project work" means a Write/Edit/Bash that touches a path NOT matching `allowedPaths`.

Refuse and surface the lock state. Example:

> User: "start building the new vibe-shop checkout page"
>
> Me: "I can't — there's an active project lock on `invoice-automation-saas` with 3 criteria still open:
>   - [ ] /webhooks/stripe handles invoice.paid
>   - [ ] PDF download works for paid invoices
>   - [ ] user can: signup → invoice → pay → PDF
>
> Want me to work on those instead, or run `pnpm project:complete` once you've verified them?"

### 3. What's NEVER cross-project (always allowed)

- Anything matching `allowedPaths`
- Read-only investigation: Glob, Grep, Read, WebSearch, WebFetch — these never block
- Genuine emergencies the user explicitly authorizes ("hotfix mode: edit X", "bypass for this one change")

### 4. Marking criteria satisfied

- **`type: "auto"`** criteria: only `tools/active-project/check.ps1` may flip these. I never edit them by hand.
- **`type: "manual"`** criteria: I only flip these when the user says explicitly "mark X done" or "I tested X, it works." Never silently assume completion from build success.

### 5. Switching projects

I cannot switch the lock unilaterally. The user runs:

- `pnpm project:complete` — verifies all criteria, archives lock, clears active-project.json
- `pnpm project:start <new>` — replaces lock (warns if previous is incomplete)

If asked to "switch to project X" mid-flow, I refuse and explain the user must run one of the above commands.

---

## Allowed Paths Glob Semantics

`allowedPaths` is an array of globs. A staged or edited file is allowed if it matches **any** glob.

Standard defaults (see plan for rationale):

```
apps/<active-project>/**
packages/**             — shared packages serve the active project
tools/active-project/** — the lock tooling itself
.claude/**              — rules and hooks
*.md                    — root docs
package.json
pnpm-lock.yaml
nx.json
tsconfig.base.json
```

Custom additions per project (e.g., a specific config file the active project owns) go in the lock's `allowedPaths`.

---

## Bypass

Two distinct bypasses, with different meanings:

| Mechanism | Effect | When to use |
|-----------|--------|-------------|
| `ALLOW_CROSS_PROJECT=1 git commit ...` | Skips the cross-project pre-commit check only. Branch protection still active. | Genuine cross-project hotfix that the user authorized |
| `git commit --no-verify` | Skips ALL pre-commit checks (branch + cross-project + anything else). | True emergencies only. Discouraged. |

In conversation, the soft gate's bypass is the user explicitly saying "edit X anyway" or "hotfix mode." I should still acknowledge what's being bypassed.

---

## Behavioral Invariants

1. **Lock state is read once per check, not cached.** Every Write/Edit/Bash that could be cross-project re-reads `D:\active-project\active-project.json` (cheap; tiny file).
2. **Read-only operations never trigger the lock.** Investigation is always free.
3. **The lock applies to me, not just commits.** Even if the user asks me to make an edit that won't be committed, I refuse if it's outside `allowedPaths`.
4. **No silent satisfaction.** I never write `"satisfied": true` to the file from inside Write/Edit. Only `tools/active-project/check.ps1` flips auto criteria; manual criteria flip only with explicit user acknowledgment via the appropriate tool.
5. **The hard gate is the source of truth at commit time.** If the soft gate (me) and the hard gate (pre-commit hook) disagree, the hook wins. They read the same file, so they shouldn't disagree.

---

## Tooling Reference

| Command | Purpose |
|---------|---------|
| `pnpm project:start <name>` | Initialize a new lock (refuses if previous incomplete unless confirmed) |
| `pnpm project:status` | Show active lock and per-criterion ✓/✗ |
| `pnpm project:check` | Run auto criteria, update flags |
| `pnpm project:complete` | Verify all criteria met, archive lock, clear state file |

---

## Why this exists

VibeTech has 30+ apps. Without a lock, attention drifts: a smoke test, a peer-dep bump, a new component, a refactor — each individually small, collectively a graveyard of unfinished apps. The lock makes finishing the path of least resistance: cross-project work isn't impossible, it's just visible and intentional.
