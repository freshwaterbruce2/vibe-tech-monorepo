# CI/CD Pipeline & Nx Optimization

## Nx Monorepo Integration

The monorepo uses **Nx 21.6.3** with @nx/js plugin for intelligent build caching and affected-only builds:

- **Local caching**: 80-90% faster repeated builds with Nx cache
- **Affected detection**: Only builds/tests changed projects (`pnpm run quality:affected`)
- **Parallel execution**: Tasks run concurrently when possible
- **Project graph**: Visualize dependencies with `pnpm nx graph`

**Performance Impact:**

- Typecheck: 854ms → 160ms (81% faster with cache)
- CI Pipeline: ~15-20min → ~3-5min (75% faster)
- Deployments: ~25min → ~5-8min (70% faster)

## Latest Updates (2025-10-10)

- **Tailwind CSS:** Downgraded 4 → 3.4.18 (stable, production-ready)
  - Reason: V4 `@apply` directive incompatibilities with `@layer components`
  - Workspace fix: Removed v4 from nova-agent-current causing hoisting conflicts
  - See: `TAILWIND_V3_DOWNGRADE.md`, `TAILWIND_V3_DOWNGRADE_SUCCESS.md`, `TAILWIND_V3_COMPLETION_SUMMARY.md`
- React 19, React Router 7, Zod 4 - all stable
- All Radix UI components updated to latest
- All quality checks passing
- Added 6 custom slash commands for workflow automation
- Enhanced pre-commit hook with trading system safety checks

## Smart Change Detection

GitHub Actions workflows use path filtering to:

- Detect which projects changed (web, crypto, tools)
- Skip unnecessary jobs (saves ~80% CI time)
- Only deploy affected applications

## Docker Deployment

Crypto trading system is containerized:

- Dockerfile with health checks
- docker-compose for local development
- Automated builds in CI/CD
- Resource limits for safety

## Self-Healing CI

This monorepo uses Nx Cloud's Self-Healing CI to automatically detect, analyze, and propose fixes for CI failures. The system leverages deep understanding of the workspace structure, project graph, and Nx metadata to provide intelligent fixes.

### Classification Customization

When analyzing failures, override the default classification in these cases:

- If there are errors about missing environment variables (like `API_KEY`, `DATABASE_URL`, `KRAKEN_API_KEY`, `KRAKEN_SECRET_KEY`), classify them as `environment_state`. These require manual configuration, not code changes.
- If errors mention "missing Python dependencies" or "ModuleNotFoundError" in `apps/crypto-enhanced/`, classify as `environment_state` if dependencies are listed in `requirements.txt`. The CI environment needs proper Python setup.
- If errors mention "port already in use" or "EADDRINUSE", classify as `environment_state`. This is a CI runner resource issue.
- If TypeScript errors occur in `node_modules/@types/` or third-party packages, classify as `environment_state`. These require dependency updates, not code fixes.
- If build errors mention "out of memory" or "heap limit", classify as `environment_state`. The CI runner needs more resources.
- If errors occur in `D:\databases\` or `D:\logs\` paths (Windows-specific data storage), classify as `code_change`. Update paths to use environment variables or relative paths for cross-platform compatibility.
- If crypto trading system errors mention "nonce" or "authentication failed" in `apps/crypto-enhanced/`, classify as `code_change`. These are application logic issues that can be fixed.
- If Playwright or E2E tests fail with "timeout" or "element not found", classify as `flaky_task` if they pass on retry. Otherwise, classify as `code_change`.

### Predefined Fixes

For common, deterministic failures, apply these predefined fixes:

1. **Linting Failures**: If a failed task ID contains `:lint`, fix it by running linting on the project where it failed with the `--fix` flag. Example: `pnpm nx run myapp:lint --fix` where "myapp" is the project that failed.

2. **Format Failures**: If a failed task ID contains `:format` or mentions "Prettier" errors, run: `pnpm nx format:write --projects=<affected-project>`

3. **TypeScript Build Order**: If errors mention "Project must list imported project as a dependency", update the `project.json` of the failing project to add the missing dependency in the `implicitDependencies` array.

4. **Python Import Errors in Crypto**: If `apps/crypto-enhanced/` tests fail with `ImportError` or `ModuleNotFoundError`:
   - First check if the module is in `requirements.txt`
   - If yes, classify as `environment_state`
   - If no, add it to `requirements.txt` and rerun tests

5. **Missing Type Definitions**: If errors mention "Could not find a declaration file for module", run: `pnpm add -D @types/<module-name> --filter=<affected-project>`

6. **Nx Cache Issues**: If errors mention "Nx cache corruption" or "unable to read cache", run: `pnpm nx reset` and retry the failed task.

7. **pnpm Lock File**: If errors mention "pnpm-lock.yaml is out of sync", run: `pnpm install --no-frozen-lockfile` to update the lock file.

8. **Capacitor Android Build Failures**: If `vibe-tutor` Android build fails, increment `versionCode` in `android/app/build.gradle` to force cache clear, then run: `pnpm nx android:build vibe-tutor`

9. **Trading System Safety Check Failures**: If pre-commit hook blocks commits due to trading system health issues in `apps/crypto-enhanced/`, investigate logs at `D:\logs\trading.log` before attempting fixes. DO NOT auto-fix financial safety checks.

### Self-Healing Strategy

For this monorepo, prioritize fixes in this order:

1. **Formatting and linting** - Auto-fix enabled (deterministic)
2. **Missing dependencies** - Auto-add to package.json or requirements.txt
3. **TypeScript errors** - Analyze and propose type fixes
4. **Test failures** - Identify flaky vs deterministic failures
5. **Build failures** - Check for configuration issues
6. **Environment issues** - Report to developer (no auto-fix)

### Important Safety Rules

- **NEVER** auto-fix trading system financial logic in `apps/crypto-enhanced/` without human review
- **NEVER** auto-fix security-related code (authentication, API keys, secrets)
- **NEVER** auto-fix database migration scripts in `D:\databases\` paths
- **ALWAYS** verify that fixes pass the verification phase before applying
- **ALWAYS** provide detailed explanations for proposed fixes in GitHub PR comments
