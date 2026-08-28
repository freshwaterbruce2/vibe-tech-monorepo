# Code Size Limits

Priority: MANDATORY — enforced by ESLint + the pre-commit hook (hard block).
Last Updated: 2026-06-20

---

## The Caps (500 +/- 100 policy)

| Cap                 | Soft (warn) | Hard (block)   | Applies to                          |
| ------------------- | ----------- | -------------- | ----------------------------------- |
| **File length**     | 500 lines   | **1000 lines** | All source code                     |
| **Function length** | —           | **50 lines**   | `.ts/.js/.mjs/.cjs` (non-component) |
| **Line length**     | —           | **100 chars**  | All source code                     |

- A file over **1000 lines** is rejected — split it into modules.
- React components (`.tsx/.jsx`) are **exempt from the 50-line function cap** — the workspace allows components 200–300 lines. The 1000-line file cap still applies to them.
- `max-len` ignores URLs, strings, template literals, and regex literals (these can't always be wrapped); Prettier (`printWidth: 100`) handles the rest.

## Exclusions (never subject to the caps)

An excluded path may be any length:

- Tests: `**/*.{test,spec}.*`, `**/__tests__/**`, `**/tests/**`, `**/e2e/**`
- Markdown / docs: `**/*.md`, `**/*.mdx`
- Logs: `**/*.log` (these live on `D:\` anyway)
- Generated / not hand-authored: `**/*.d.ts`, `**/*.gen.ts`, `**/*.generated.*`, `**/*.snap`, `**/migrations/**`, `**/generated/**`, `**/.prisma/**`, `plugins/factory/src/generators/**/files/**`
- Build output / vendored: `node_modules`, `dist`, `build`, `.next`, `out`, `coverage`, `.nx`, `**/vendor/**`
- Config/data (JSON/YAML/lockfiles) are out of scope — only code extensions are counted.

These exclusion globs are kept in sync across three places:

- `eslint.config.js` (size-cap override block)
- `scripts/validate-file-size.js` (`EXCLUDE_PATTERNS`)
- `scripts/pre-commit.ps1` (staged-file filter)

## Enforcement Points

1. **ESLint** (`eslint.config.js`) — `max-lines` (1000), `max-lines-per-function` (50), `max-len` (100), all `error`. Covers JS/TS. Runs in `nx lint` and on staged files in the pre-commit hook (`eslint --max-warnings=0`).
2. **`scripts/validate-file-size.js`** — line-count backstop that also covers `.py`/`.rs` (which ESLint can't lint). Run the whole tree with `pnpm run lines:check`, or scope it to specific files (the pre-commit hook passes the staged list).
3. **Pre-commit hook** (`scripts/pre-commit.ps1`, step 3) — runs the validator on staged code files and hard-fails the commit on any violation. The hook is installed by `scripts/install-git-hooks.ps1` (auto-runs via the root `prepare` script on `pnpm install`; run manually with `pnpm run setup:hooks`).

## When You Hit a Cap

Split the file/function — do not raise the limit or add a blanket `eslint-disable`.
Pre-existing oversized files are tracked in `docs/audits/line-limit-violations-*.md` for incremental cleanup; the caps bite changed/affected code first, so they don't retroactively block untouched legacy files.

Bypass (emergency only): `git commit --no-verify`.

## Legacy Grandfathering — ESLint Bulk Suppressions

CI's `Quality Gates → Lint (affected)` runs whole-project `eslint` on every
directly-changed project, which would retroactively flag a project's legacy
size-cap debt the moment any file in it changes. To keep enforcement on
**new/changed** code while grandfathering existing violations (per the policy
above), projects with legacy debt carry an ESLint **bulk-suppressions baseline**
(`eslint-suppressions.json`, ESLint ≥ 9.24) committed in the project root.

- A suppressed file+rule is frozen at its current count: a **new** oversized
  function or over-length line in the same file still fails the build.
- Regenerate a baseline (after enabling/auditing) by running the project's lint
  with `--suppress-all` from the project's lint cwd, e.g. `eslint <args> --suppress-all`.
  `vibe-code-studio` runs eslint from the repo root, so its baseline is pinned via
  `--suppressions-location apps/vibe-code-studio/eslint-suppressions.json`.
- Do **not** pair `--suppress-all` with `--fix` blindly — `prefer-nullish-coalescing`
  (`||`→`??`) can change runtime behavior on legacy code.
- **Shrink, never grow:** as legacy code is refactored, prune with
  `eslint --prune-suppressions` so the baseline only ever decreases.
