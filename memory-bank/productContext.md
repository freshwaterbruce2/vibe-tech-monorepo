# Product Context: Vibe Code Studio

## Product Purpose

Vibe Code Studio exists to provide a Windows-first, Tauri-based AI coding workspace that combines editor workflows, agent-assisted tasks, and local desktop packaging in one tool. It is the monorepo's primary desktop coding product and release-hardening reference point for Windows installers.

## Target Users

- **Primary operator:** Bruce (owner-maintainer) running local Windows workflows.
- **Power users:** developers who want AI-assisted coding with desktop-native performance and file-system access.
- **Release maintainers:** engineers validating installer quality, packaging health, and production readiness.

## Key Jobs To Be Done

1. Build and run a local AI-enabled desktop coding environment quickly.
2. Edit multi-file projects with strong TypeScript + Monaco support.
3. Run agent-assisted coding and review flows with predictable behavior.
4. Package distributable Windows installers (`.msi` and NSIS) from the same codebase.
5. Validate release quality via repeatable script checks (typecheck/lint/test/build/package/install smoke).

## UX Goals

- **Fast start-to-edit path:** minimal friction from install to productive coding.
- **Trustworthy release experience:** clear pass/fail signals for packaging, signing readiness, and installer smoke tests.
- **Local-first confidence:** desktop behavior should not depend on cloud-only infrastructure for core workflows.
- **Operational clarity:** script output should be explicit enough for release triage without digging through stale logs.

## Current Product Reality and Constraints

- Platform focus is **Windows 11 + Tauri 2** desktop packaging.
- Canonical package outputs come from Cargo `target_directory` under `release/bundle`.
- OpenRouter-backed AI is the active local workflow baseline.
- Unsigned Windows artifacts are still supported for local/dev workflows; signing is optional unless release policy requires it.
- No signing secrets or cert material are stored in git; all sensitive inputs must come from local environment or CI secrets.
- Monorepo process standards favor Nx targets and reproducible local verification before release decisions.
