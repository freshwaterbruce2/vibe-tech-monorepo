---
name: memory-bank-check
description: Check Memory Bank files for completeness and freshness
allowed-tools:
  - Read
  - Glob
  - Bash
argument-hint: "[--scope root|app] [--project <name>]"
---

# Memory Bank Check

Audit Memory Bank completeness and freshness for the selected scope.

## Defaults

- Default scope: `root`
- Root memory bank path: `V:\monorepo\memory-bank`
- App scope base path: `V:\monorepo\apps\<project>\memory-bank`

## Required Core Files

- `projectbrief.md`
- `productContext.md`
- `systemPatterns.md`
- `techContext.md`
- `activeContext.md`
- `progress.md`

## Steps

1. Parse arguments:
   - `--scope` in `root|app` (default `root`)
   - `--project` required when `scope=app`
2. Resolve memory-bank directory path.
3. Check whether each required core file exists.
4. Read existing files and flag obvious staleness:
   - empty sections
   - `activeContext.md` says no current work while active work is ongoing
   - `progress.md` has no recent completion entries
5. Return a summary:
   - completeness score
   - missing files list
   - stale sections list
   - recommended updates

## Output Format

```text
Memory Bank Check
=================
Scope: <root|app>
Path: <resolved-path>
Completeness: <n>/<6>
Missing files:
- <file>

Potentially stale items:
- <file>: <issue>

Suggested next updates:
1. <action>
2. <action>
```
