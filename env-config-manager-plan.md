# VibeTech Control Plane: Environment Configuration & Secrets Manager

## Goal
Implement a centralized Environment Configuration & Secrets Manager inside the VibeTech Control Plane (`vibetech-command-center`) that allows users to scan, edit, and validate environment variables (`.env`, `.env.local`, `.env.example`) across all monorepo applications.

## Tasks
- [x] **Task 1: Build Backend Env Service**  
  Create `EnvConfigService` in [apps/vibetech-command-center/src/main/services/env-config.ts](file:///V:/monorepo/apps/vibetech-command-center/src/main/services/env-config.ts) to:
  * Read, parse, and write `.env`, `.env.local`, and `.env.example` files.
  * Compare variables present in `.env` / `.env.local` against required keys in `.env.example`.
  * Expose list, read, and write operations.
  → *Verify:* Write unit tests in `env-config.spec.ts` confirming correct key parsing and value writing.
  
- [x] **Task 2: Register IPC Handlers**  
  Wire up IPC channels in [apps/vibetech-command-center/src/main/ipc/index.ts](file:///V:/monorepo/apps/vibetech-command-center/src/main/ipc/index.ts) for:
  * `ENV_CONFIG_LIST`: Retrieves environment variable schemas and values for all projects.
  * `ENV_CONFIG_UPDATE`: Updates a specific key-value pair in a project's `.env` or `.env.local`.
  → *Verify:* Compile main and preload bundles successfully.
  
- [x] **Task 3: Create UI Component**  
  Build the `EnvConfigPanel.tsx` in [apps/vibetech-command-center/src/renderer/panels/EnvConfigPanel.tsx](file:///V:/monorepo/apps/vibetech-command-center/src/renderer/panels/EnvConfigPanel.tsx) with:
  * A table showing projects, their environment files, missing keys (against `.env.example`), and present keys.
  * Interactive forms/inline editors to set or modify secret values directly from the UI.
  * Filters to show only projects with missing keys or specific key patterns (e.g. `STRIPE_`).
  → *Verify:* Component renders without TypeScript errors.
  
- [x] **Task 4: Integrate into Sidebar Navigation**  
  Integrate `EnvConfigPanel` into the main application layout / navigation tab bar so that users can select and access the panel.
  → *Verify:* Launch the application or check dashboard integration in tests.

- [x] **Task 5: End-to-End Verification**  
  Run the test suite and compilation gate to confirm that the new service, IPC router, and UI components compile and pass all quality checks.
  → *Verify:* `pnpm nx test @vibetech/command-center` and `pnpm nx build @vibetech/command-center` succeed.

## Done When
- [ ] Environment variables can be fetched and updated via IPC.
- [ ] The dashboard lists all apps, detects missing variables against `.env.example`, and updates them on save.
- [ ] All `@vibetech/command-center` unit, integration, and build tasks pass cleanly.
