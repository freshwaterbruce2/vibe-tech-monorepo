# Vibe IT Specialist Bot

Telegram bot with admin-only access to diagnose, monitor, and safely repair the VibeTech monorepo.

---

## 🔒 Security Model

- **Admin-only Access**: Verified via `ADMIN_TELEGRAM_IDS` in `.env` (supports comma-separated numeric Telegram user IDs and usernames, e.g., `123456789,@bruce2347`).
- **Sandboxed Execution**: Arbitrary shell access is completely disabled. Commands like `/it cmd` and `/it shell` are blocked.
- **Read-only Diagnostics**: Run immediately without confirmation.
- **Mutating Fixes**: Require explicit inline-button confirmation (confirmation-gating).
- **Secret Redaction**: Common credentials, API keys, and Telegram tokens are automatically scrubbed from command stdout logs and replies.

---

## 📂 Storage & Reports Policy

To comply with the workspace path policy, all logs and reports are strictly isolated onto the **`D:\` drive**:

- **Execution Logs**: `D:/logs/vibe-it-specialist-bot/<timestamp>-<task>.log` (complete redacted task logs)
- **Run History**: `D:/logs/vibe-it-specialist-bot/runs.jsonl` (JSONL log of all executed commands)
- **Optimization Audits**: `D:/logs/vibe-it-specialist-bot/optimization/optimization-report-*.json` and `.md`
- **Health Trend Reports**: `D:/logs/vibe-it-specialist-bot/trends/trend-report-*.md`
- **Uptime Status Cache**: `D:/logs/vibe-it-specialist-bot/.status.json`

---

## 🚀 Setup & Execution

1. Create a bot using Telegram's `@BotFather` and retrieve the API token.
2. Copy `.env.example` to `.env`.
3. Fill in the values (numeric IDs are preferred for stability):
   ```bash
   BOT_TOKEN=<bot-token>
   ADMIN_TELEGRAM_IDS=123456789,@bruce2347
   ```
4. Build the bot:
   ```bash
   pnpm --filter @vibetech/vibe-it-specialist-bot build
   ```
5. Run the bot server:
   ```bash
   pnpm --filter @vibetech/vibe-it-specialist-bot start
   ```

---

## ⚙️ Operational Runbook & Rhythm

To keep the Vibe monorepo healthy, follow this operating rhythm:

### 1. Daily Operating Rhythm
Run the health trend monitor to check for new regressions or slow execution trends:
```
/it optimize trends
```
This compares the latest audits chronologically, calculates the monorepo **Health Score**, and lists new regressions, fixed issues, and the slowest executed tasks.

### 2. Weekly Maintenance Rhythm
Execute the full suite of optimization checks to scan the codebase:
1. Run the main audit: `/it optimize`
2. Run standard QA checks: `/it run affected-quality`
3. Audit path policy violations: `/it optimize paths`
4. Audit dependency drift: `/it optimize deps`
5. Audit missing targets: `/it optimize targets`

### 3. P0 Critical Issues Policy
Any **P0 finding** (critical correctness/safety) must be resolved immediately before building new features:
- **P0 Path Policy Mismatch**: A sqlite database or log file is stored under `C:\dev`.
  - *Fix*: Run `/it fix path-policy`
- **P0 TS Version Drift**: Subproject TypeScript versions deviate from the root version (`5.9.3`).
  - *Fix*: Run `/it fix typescript-version`

---

## 🔧 Bot Command Guide

### Read-only Diagnostic Commands
- `/it status` — View bot uptime, process PID, log status, Nx daemon state, and latest scores.
- `/it diagnose` — Full workspace diagnostics (Node/PNPM versions, git status, Nx report, project list).
- `/it health` — Run monorepo workspace-wide health scripts.
- `/it affected` — Run test/lint/typecheck only on files affected by recent commits.
- `/it optimize` — Run full optimization report across all categories.
- `/it optimize [paths|deps|targets|cache|hygiene|trends]` — Drill-down into specific audits.
- `/it typecheck <project>` — Run typechecks for a specific workspace project.
- `/it build <project>` — Compile a specific project.
- `/it test <project>` — Run unit tests for a specific project.

### Mutating Repair Commands (Requires Inline Confirmation)
- `/it fix path-policy` — Conservatively copies database and log files from `C:\dev` to `D:\` (including SQLite sidecars `-wal`/`-shm`), appends wildcard ignore patterns to `.gitignore`, and preserves original files for connection string verification.
- `/it fix typescript-version` — Aligns all subproject `typescript` versions in `package.json` files to match the workspace root version (`5.9.3`).
- `/it fix target-coverage` — Detects missing targets (lint, typecheck, test, build) and appends standard commands to `package.json` scripts or `project.json` targets for pure Nx apps.
- `/it run nx-reset` — Safely stops the daemon and purges the Nx cache directory on Windows.
- `/it run pnpm-install` — Run a clean install to update packages.

---

## 🛠️ Verification & Development

Run unit tests and verification checks:
```bash
# Typecheck source code
pnpm --filter @vibetech/vibe-it-specialist-bot typecheck

# Execute vitest unit tests
pnpm --filter @vibetech/vibe-it-specialist-bot test

# Rebuild files to dist
pnpm --filter @vibetech/vibe-it-specialist-bot build
```
