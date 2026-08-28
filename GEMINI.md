# GEMINI.md — Session Guardrails (Antigravity & Gemini)

Welcome to the **VibeTech Monorepo** (`@vibetech/workspace`). This document defines session guardrails for the **Antigravity CLI** and **Antigravity IDE** using Google Gemini models.

---

## 1. Default Workspace Agent

This workspace defines a default **master agent** in `.agent/agents/master-agent.md`. Load it first when starting work in this repository for workspace orientation, path policy enforcement, and intelligent routing to specialist agents.

---

## 1.5. Development Tool Stack Restrictions

- **Permitted Development Tools**: The only tools used for editing, building, refactoring, and backing up the monorepo are **Codex CLI (by ChatGPT)**, **Antigravity 2.0 CLI**, and **Antigravity 2.0 IDE**.
- **Prohibited Tools**: Do not use VS Code, Claude Code, Cursor, or any other editor/CLI agent for these operations.

---

## 2. Paths and Data Policy (Non-Negotiable)

- **Code Location**: `V:\monorepo` (All project source code, configurations, and build setups).
- **Data Location**: `D:\` (All databases, runtime logs, cache files, and learning data).
- **Enforcement**: Any code that writes files must default to `D:\` locations (e.g. `D:\databases\`, `D:\logs\`, `D:\learning-system\`). Never write databases or logs directly into `V:\monorepo`.

---

## 3. Build & Package Manager Constraints

- **Package Manager**: `pnpm` only (v10.28.2+). **Never** run `npm` or `yarn` in scripts.
- **Commands**: Prefer Nx targets from the workspace root (e.g., `pnpm nx build <project>`, `pnpm nx test <project>`). Semicolons (`;`) must chain commands in PowerShell 7+, **never** use `&&`.
- **Vite Production Builds**: Enforce `cross-env NODE_ENV=production` for all production builds to prevent compiler emission of `jsxDEV` calls, which crash on startup when React resolves to its production bundle.

---

## 4. Lint & TypeScript Fixing

- Enforce a **500-line soft limit** and **1000-line hard limit** per file. Component files should target 200–300 lines. Split components and logic early.
- Fix one file first and verify it passes before applying the same fix pattern across multiple files.
- Enable TypeScript strict mode. Avoid the `any` type without a justification comment.

---

## 5. Development Workflows (Master Scripts)

Instead of using Claude-specific process hooks on every tool call, run the validation scripts in `.agent/scripts/` during development:

- **Checklist validation**: `python .agent/scripts/checklist.py .`
  - Runs core checks for security, type safety, linting, schema validation, and testing.
- **Full verification**: `python .agent/scripts/verify_all.py . --url <test_url>`
  - Runs Playwright E2E tests, bundle size analysis, Lighthouse metrics, and mobile audits.

---

## 6. Git & CI/CD Policies

- **Remote Host**: GitHub (`github.com/freshwaterbruce2/vibe-tech-monorepo`). Use GitHub Actions, GitHub Pages, or GitHub-specific configurations in workflows.
- **CI Pipelines**: Configured using GitHub Actions workflows at `.github/workflows/` (e.g. validation, building, and deployment).
- **Backups**: Always create a zip snapshot of `src` before performing major refactors:
  ```powershell
  Compress-Archive -Path .\src -DestinationPath .\_backups\Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip
  ```
