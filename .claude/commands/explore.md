---
description: Read-only codebase exploration that produces a diagnosis and approach plan before any implementation
argument-hint: <problem or feature description>
allowed-tools: Bash(git:*), Bash(pnpm nx:*), Bash(npx nx:*), Bash(node:*), Read, Glob, Grep
---

# explore — Diagnose Before Implementing

**PHASE 1 ONLY: Read-only exploration. Zero edits. Zero writes.**

This command diagnoses the problem, finds relevant code, and proposes an approach.
Implementation does NOT start until the user explicitly approves the plan.

If no argument provided:

```
ERROR: Problem description required.

Usage: /explore <what you want to do or fix>

Examples:
  /explore why does the nova-agent RAG search return stale results
  /explore add pagination to the user list in vibe-tutor
  /explore fix TypeScript errors in packages/memory/src
  /explore how does the existing auth middleware work
```

---

## Step 1: Restate the Problem

In 2-3 sentences, restate `$ARGUMENTS` in your own words to confirm understanding.
If the problem is ambiguous, ask ONE clarifying question before proceeding.

---

## Step 2: Orient in the Codebase

Run these in parallel to understand the workspace shape:

```bash
git branch --show-current
git log --oneline -5
```

```bash
npx nx show projects 2>/dev/null | sort | head -30
```

Identify which projects are likely relevant based on the problem description.

---

## Step 3: Search for Relevant Code

Use Glob and Grep to find what already exists. Be thorough — missing an existing
implementation is exactly the mistake this command exists to prevent.

**Search by file pattern** (adapt to the problem):

```
Glob pattern="**/*<keyword>*" (limit to likely directories)
```

**Search by functionality**:

```
Grep pattern="<keyword>" output_mode="files_with_matches"
Grep pattern="<related term>" output_mode="files_with_matches"
```

**Search for the entry point** (where does this feature/bug live?):

```
Grep pattern="<function or class name>" output_mode="content"
```

Document EVERY relevant file found, even if it looks tangential.

---

## Step 4: Read the Relevant Files

Read the top 3-5 most relevant files completely. For each file, note:

- What it does
- What patterns it uses
- What it does NOT do that the problem requires

Do not skim. The wrong-approach problem comes from implementing before reading.

If a file has related imports, follow them to understand the full call chain.

---

## Step 5: Check for Prior Solutions

```bash
git log --oneline --all --grep="<keyword>" | head -10
```

```bash
git log --oneline --all -- "*<relevant-path-pattern>*" | head -10
```

Have similar problems been solved before? Was something attempted and reverted?
This prevents rediscovering solutions that already exist or were rejected.

---

## Step 6: Identify Constraints

Check for anything that would constrain the implementation:

- **Safety rules**: Is this in `crypto-enhanced/`? (never modify without review)
- **Path policy**: Does it involve databases or logs? (must go on D:\)
- **Existing tests**: Are there tests that would break?
- **Dependencies**: Does this touch shared packages that other projects import?
- **CLAUDE.md guardrails**: Any relevant rules from session guardrails?

```bash
git diff --stat HEAD 2>/dev/null | head -20
```

Are there already in-progress changes that could conflict?

---

## Step 7: Draft the Plan

Produce a structured output:

```
══════════════════════════════════════════════════════════
  EXPLORATION COMPLETE
══════════════════════════════════════════════════════════

PROBLEM
  <2-3 sentence restatement>

RELEVANT FILES FOUND
  <file path>  — <what it does, why it's relevant>
  <file path>  — <what it does, why it's relevant>
  ...

EXISTING PATTERNS TO FOLLOW
  <describe the pattern: how similar things are done in this codebase>

RECOMMENDED APPROACH
  <step-by-step implementation plan, specific to this codebase>
  1. <first concrete action — which file, what change>
  2. <second action>
  3. ...

ALTERNATIVE APPROACHES CONSIDERED
  <approach A> — rejected because <reason>
  <approach B> — viable but more complex, worth it if X

RISKS & GOTCHAS
  - <specific risk based on what you read>
  - <edge case found in the code>

FILES TO CHANGE
  <file>  — <what will change>
  <file>  — <what will change>

ESTIMATED SCOPE
  Small (1-3 files) / Medium (4-10 files) / Large (10+ files)

══════════════════════════════════════════════════════════
  AWAITING APPROVAL — no changes made yet
  Reply "go" or describe any adjustments to the plan.
══════════════════════════════════════════════════════════
```

---

## Step 8: Wait

**STOP HERE.** Do not implement anything.

Wait for the user to either:

- Say "go" / "looks good" / "do it" → proceed with the plan as written
- Request changes to the plan → update the plan, wait again
- Say "never mind" → done, no changes made

Only after explicit approval does implementation begin.
When implementation starts, follow the plan from Step 7 exactly.
If something unexpected is found during implementation, STOP and report back
rather than improvising.
