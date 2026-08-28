---
name: policy-check
description: Validate a path against workspace code/data placement policy
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
argument-hint: "<path> [--intent code|data|logs|db|memory]"
---

# Policy Check

Validate a target path against this workspace policy:

- Code artifacts belong under `V:\monorepo`
- Runtime data belongs on `D:\`
- No code artifacts should be created on `D:\`

## Steps

1. Parse arguments:
   - required: `<path>`
   - optional: `--intent` (default `code`)
2. Normalize the path to Windows absolute format.
3. Classify path by root:
   - `V:\monorepo\...` => code-eligible
   - `D:\...` => data-eligible
   - anything else => out-of-policy
4. Evaluate result by intent:
   - `code`:
     - PASS only when under `V:\monorepo`
     - FAIL for any `D:\` target
   - `data|logs|db|memory`:
     - PASS for `D:\` targets
     - WARN if under `V:\monorepo`
5. Return a concise report including:
   - normalized path
   - intent
   - status: `PASS`, `WARN`, or `FAIL`
   - action recommendation

## Output Format

```text
Policy Check
============
Path: <normalized-path>
Intent: <intent>
Status: PASS|WARN|FAIL
Reason: <why>
Recommended action: <what to do next>
```

## Examples

- `/monorepo-policy-guard:policy-check V:\monorepo\apps\command-center --intent code`
- `/monorepo-policy-guard:policy-check D:\logs\agent --intent logs`
- `/monorepo-policy-guard:policy-check D:\learning-system\cache --intent memory`
