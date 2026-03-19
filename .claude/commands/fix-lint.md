---
description: Fix lint/TS errors in a file or project with strict read-after-edit discipline
argument-hint: <file-path-or-project-name>
allowed-tools: Bash, Read, Edit, Glob, Grep
---

# fix-lint — Targeted Lint & TypeScript Fix

Fix lint and TypeScript errors in `$ARGUMENTS` using the correct workflow.
If no argument is given, ask the user which file or project to target before proceeding.

## Core Rules (NEVER violate)

1. **Re-read the file after every single edit.** Line numbers shift. Always re-read before the next fix.
2. **Fix ONE file completely before touching the next.** Run the check, verify it passes, then move on.
3. **Verify the fix pattern on one file before applying it broadly.** Never scatter-shot.
4. **For `eslint-disable` comments:** read the file immediately before inserting — verify the exact line.
5. **Max 3 fix iterations per file.** If errors persist after 3 rounds, report what's left and stop.

## Step 1: Parse the Target

If `$ARGUMENTS` is a file path (contains `/` or `\` or ends in `.ts`/`.tsx`):

- Set TARGET_TYPE=file
- Set TARGET=$ARGUMENTS

If `$ARGUMENTS` looks like a project name (no path separators):

- Set TARGET_TYPE=project
- Set TARGET=$ARGUMENTS

If no argument provided:

```
ERROR: Target required.

Usage:
  /fix-lint apps/nova-agent/src/services/foo.ts   # single file
  /fix-lint vibe-tutor                             # whole project
```

## Step 2: Get Current Errors

**For a file:**

```bash
pnpm nx lint $(node -e "
  const p='$TARGET'; const m=p.match(/apps\/([^/]+)/)||p.match(/packages\/([^/]+)/);
  console.log(m?m[1]:'root')
") --file "$TARGET" 2>&1 | tail -60
```

**For a project:**

```bash
pnpm nx lint $TARGET 2>&1 | tail -60
pnpm nx typecheck $TARGET 2>&1 | tail -60
```

Parse the output. Build an ordered list of (file, line, rule, message). Present:

```
════════════════════════════
  ERRORS FOUND
════════════════════════════
File: src/foo.ts
  L14  @typescript-eslint/no-unused-vars  'x' is defined but never used
  L28  @typescript-eslint/no-explicit-any  Unexpected any

File: src/bar.ts
  L5   import/no-duplicates  ...
════════════════════════════
Total: N errors across M files
```

If zero errors: report clean and stop.

## Step 3: Fix Files One at a Time

For each file in the error list:

### 3a. Read the file

```
Read file: <path>
```

Note the current line numbers. Do NOT rely on the line numbers from Step 2 — they may have shifted if this isn't the first file.

### 3b. Fix one error

Apply the fix using Edit. Common fixes:

- Unused import → remove the import line
- Unused variable → remove or prefix with `_`
- `any` type → replace with a specific type, or `unknown` if genuinely unknown
- Missing return type → add explicit return type annotation
- `eslint-disable` needed → read file first to confirm exact line, then insert the comment on the line **above** the flagged line

### 3c. Re-read the file immediately

```
Read file: <path>
```

Confirm the edit landed correctly and note new line numbers.

### 3d. Fix next error in the same file

Repeat 3b–3c until all errors in this file are addressed (max 3 iterations).

### 3e. Verify the file passes

**For a single file:**

```bash
pnpm eslint "$TARGET" 2>&1
```

**For project typecheck after file edits:**

```bash
pnpm nx typecheck $PROJECT 2>&1 | tail -20
```

If errors remain after 3 iterations, log them and move to the next file.

### 3f. Move to the next file

Only after the current file passes (or hits max iterations).

## Step 4: Final Check

After all files are processed:

**For a project:**

```bash
pnpm nx lint $TARGET 2>&1 | tail -20
pnpm nx typecheck $TARGET 2>&1 | tail -20
```

Present summary:

```
════════════════════════════
  FIX-LINT COMPLETE
════════════════════════════
Fixed:   N errors across M files
Remaining: K errors (see below)

Files changed:
  ✓ src/foo.ts — clean
  ✓ src/bar.ts — clean
  ⚠ src/baz.ts — 2 errors remain (complex, needs manual review)

Next: git diff to review, then commit
════════════════════════════
```

## What NOT to do

- Do NOT run `--fix` as a first step without reading results first (it can mask issues)
- Do NOT apply the same pattern to 5 files before verifying it worked on the first
- Do NOT insert `eslint-disable-next-line` without re-reading the file to confirm the line
- Do NOT attempt complex refactors — if a fix requires restructuring logic, flag it and skip
