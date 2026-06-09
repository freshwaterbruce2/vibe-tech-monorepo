# AI Models and Pricing Database Integration Plan

## Goal
Implement the `@vibetech/models-pricing` package to manage SQLite-based AI model pricing (`D:\databases\models_pricing.db`), register it in `DB_INVENTORY.md`, integrate it with `nova-agent`'s Tauri Rust backend and React frontend, and validate the setup with typechecks, builds, tests, and lints.

## Tasks
- [ ] Task 1: Scaffold `@vibetech/models-pricing` package under `packages/models-pricing/` → Verify: files exist and package.json is valid
- [ ] Task 2: Implement TS types (`src/types.ts`) and SQLite database setup/seeding (`src/db.ts`) → Verify: database gets created and seeded under `D:\databases\models_pricing.db`
- [ ] Task 3: Implement export functions (`src/index.ts`) and CLI management tool (`src/cli.ts`) → Verify: CLI commands successfully query/update the SQLite pricing data
- [ ] Task 4: Run workspace pnpm build & link package to workspace → Verify: `@vibetech/models-pricing` links and builds successfully
- [ ] Task 5: Update `D:\databases\DB_INVENTORY.md` → Verify: `models_pricing.db` added to live databases table
- [ ] Task 6: Integrate with `nova-agent` Tauri Rust backend (database connection, Tauri command) → Verify: Rust code compiles and database health check passes
- [ ] Task 7: Integrate with `nova-agent` React frontend (AgentService, ModelSelector fallback, cost estimation helpers) → Verify: ModelSelector loads pricing from SQLite with fallback
- [ ] Task 8: Validation → Verify: run lint, typecheck, build, and tests for both the package and the application

## Done When
- `@vibetech/models-pricing` is successfully scaffolded, built, and tested.
- `models_pricing.db` is initialized on `D:\databases\` and registered in `DB_INVENTORY.md`.
- `nova-agent` Tauri backend opens a connection, executes health checks, and registers the `get_models_from_db` Tauri command.
- `nova-agent` React frontend fetches models from the database dynamically, falling back to local defaults, and uses them for cost estimation.
- All workspace checks (typecheck, lint, build, test) pass with zero warnings/errors.
