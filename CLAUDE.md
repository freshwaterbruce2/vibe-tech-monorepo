# CLAUDE.md — Session Guardrails

## Build & Install Failures
- When a build or install command fails with OOM, NEVER retry the same command. First reduce parallelism (`--concurrency 1`, disable LTO, reduce parallel jobs), then retry.
- When pnpm install OOMs, try `pnpm install --filter <specific-project>` instead of full workspace install.

## Lint & TypeScript Fixing
- After EACH file edit that fixes lint/TS errors, re-read the file before making the next edit. Line numbers shift after edits.
- Fix ONE file first and verify it passes before applying the same fix pattern across multiple files.
- For eslint-disable comments, always verify the exact line number by reading the file immediately before placing the comment.

## Windows Environment
- Use `npx.cmd` (not `npx`) when constructing MCP server commands on Windows.
- Do NOT use `sed` for file manipulation. Use PowerShell or Python instead.
- For git operations, use `git rm` instead of `rm` to avoid lock file race conditions.

## Approach Strategy
- When a fix attempt fails twice with the same approach, STOP and try a fundamentally different strategy.
- For unfamiliar errors, search the codebase for prior solutions before attempting fixes.
- When debugging, write a minimal reproduction first, then fix against that — don't scatter-shot across components.
- For any non-trivial task, run `/explore <problem>` first. It does a read-only diagnosis and produces a plan. Implementation only starts after the plan is approved. This prevents the wrong-approach-first failure mode.

## Canonical Rules
Detailed rules are in `.claude/rules/`. Key references:
- Paths policy: `.claude/rules/paths-policy.md`
- No duplicates: `.claude/rules/no-duplicates.md`
- No mock/placeholder code: `.claude/rules/no-mock-or-placeholder-code.md`
- TypeScript patterns: `.claude/rules/typescript-patterns.md`
- Testing strategy: `.claude/rules/testing-strategy.md`
- Craft edit-review widget: `.claude/rules/craft-edit-review.md`
