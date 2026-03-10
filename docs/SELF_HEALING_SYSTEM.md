# Self-Healing System Documentation

## Overview

The Vibe Monorepo uses a hybrid Self-Healing System designed to automatically detect, analyze, and resolve common build and runtime errors. This system reduces developer friction by handling routine maintenance tasks and fixing transient issues in CI/CD pipelines.

## Components

### 1. Ralph Autonomous Maintenance System (RAMS)
*   **Role**: Background agent for system health.
*   **Loop**: 5-Phase Cycle
    1.  **Backup**: Snapshot state before changes.
    2.  **Fix**: Apply remediation logic.
    3.  **Validate**: Run verification tests.
    4.  **Retry**: If failed, attempt alternative fix (up to limit).
    5.  **Learn**: Record success/failure patterns.

### 2. CI/CD Self-Healing Workflow

*   **Location**: `.github/workflows/` (GitHub Actions)

*   **Trigger**: On failure of quality gates (Lint, Typecheck, Test).

*   **Logic**:

    *   Triggered by `status: failure`.

    *   Checks safety constraints via `validate-auto-fix-safety.mjs`.

    *   Applies auto-fixes (Lint, Types, Lockfile).

    *   Commits changes back to the branch with `[skip ci]` to prevent loops.



### 3. Real-Time Autofixer (Dev Tool)

*   **Location**: `tools/autofixer/`

*   **Role**: Local development helper.

*   **Capabilities**:

    *   Watches build logs.

    *   Parses error messages.

    *   Suggests or applies fixes for missing imports/types.



## Safety & Security



To prevent "AI hallucination" or destructive automated changes, strict guardrails are enforced.



### Blocked Paths (Immutable)

Defined in `.github/workflows/ci.yml` (previously `.woodpecker/self-healing-config.yml`, now deprecated):

*   `apps/crypto-enhanced/**`: **CRITICAL**. Trading algorithms are off-limits to automation.

*   `**/migrations/**`: Database schema changes require human review.

*   `backend/auth/**`: Security protocols cannot be modified by bots.

*   `**/secrets.ts`: Secret management files.



### Validation Process

1.  CI identifies changed files.

2.  `scripts/validate-auto-fix-safety.mjs` compares paths against the blocklist.

3.  If **ANY** file matches a blocked pattern, the auto-fix job ABORTS immediately.

4.  Manual intervention is required.



## Configuration



Modify the self-healing configuration in `.github/workflows/ci.yml` to adjust (`.woodpecker/self-healing-config.yml` is deprecated):

*   Blocked/Allowed paths.

*   Enabled fix types (Lint, Types, Lockfile).

*   Flaky test thresholds.



## Troubleshooting



**Auto-fix committed bad code?**

*   Revert the "chore: auto-fix..." commit.

*   Check the GitHub Actions logs for "self-heal" step.

*   Adjust the self-healing config in `.github/workflows/ci.yml` if a path should be blocked.



**CI loop stuck?**

*   The workflow uses `[skip ci]` in the commit message. GitHub Actions respects this and will not trigger another build.
