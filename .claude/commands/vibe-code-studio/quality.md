---
name: code-studio:quality
description: Run the full quality pipeline for Vibe Code Studio
argument-hint: [fix]
model: sonnet
---

# Vibe Code Studio Quality Pipeline

Run lint + typecheck + tests (and optionally a build) for the editor. Run from `V:\monorepo`.

## Steps

1. Lint (ESLint flat config):

   ```powershell
   # default
   $env:NX_NO_CLOUD='true'; pnpm nx run vibe-code-studio:lint
   # with auto-fix when invoked as `code-studio:quality fix`
   $env:NX_NO_CLOUD='true'; pnpm nx run vibe-code-studio:lint-fix
   ```

2. TypeScript type checking (`tsc --noEmit`):

   ```powershell
   $env:NX_NO_CLOUD='true'; pnpm nx run vibe-code-studio:typecheck
   ```

3. Tests (Vitest):

   ```powershell
   $env:NX_NO_CLOUD='true'; pnpm nx run vibe-code-studio:test
   ```

4. (Optional) Build verification (Vite production build):

   ```powershell
   $env:NX_NO_CLOUD='true'; pnpm nx run vibe-code-studio:build
   ```

Steps 1–3 are bundled in a single Nx target:

```powershell
$env:NX_NO_CLOUD='true'; pnpm nx run vibe-code-studio:quality
```

## Usage

- `code-studio:quality` — lint + typecheck + test.
- `code-studio:quality fix` — same, but auto-fix lint issues first (`lint-fix`).

## Expected Output

- Zero ESLint errors, zero TypeScript errors, all tests passing.
- Optional: successful Vite production build (`apps/vibe-code-studio/dist`).
