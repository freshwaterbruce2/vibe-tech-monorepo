# Plan: AI Models and Pricing Database Service

This plan outlines the design and implementation of a database-backed service (`@vibetech/models-pricing`) in the monorepo to dynamically store, update, query, and history-track AI models and their API pricing as of mid-2026.

## Overview

As AI models are updated and prices drop or fluctuate, hardcoding model IDs and pricing tables in frontends or workflows leads to drift and credential/billing issues. 

This service will introduce a central repository package `@vibetech/models-pricing` that connects to a dedicated local SQLite database `D:\databases\models_pricing.db` (aligned with the monorepo's paths policy). It will be pre-seeded with up-to-date June 2026 models and pricing data (including Google Gemini 3.5 Flash, Moonshot AI Kimi K2.6, Claude 4.5/4.6/4.7, GPT-5.4/5.5, and DeepSeek V4). It will also expose a type-safe TypeScript API and a CLI utility for administration.

### Architecture

```mermaid
graph TD
    subgraph Apps & Consumers
        VCS[Vibe Code Studio] -->|Imports API| MPService[@vibetech/models-pricing]
        Nova[Nova Agent] -->|Imports API| MPService
        CLI[Models CLI] -->|Queries/Updates| MPService
    end

    subgraph Service Library
        MPService -->|Database Connection| DBClient[better-sqlite3 Client]
        DBClient -->|Read/Write Operations| SQLiteFile[(D:\databases\models_pricing.db)]
    end
```

---

## Project Type
**BACKEND (Shared Library Package with SQLite Database)**

---

## Success Criteria

1. **pnpm Workspace Setup:** The package `@vibetech/models-pricing` is successfully created, configured, and integrated with the monorepo's pnpm workspace and Nx build system.
2. **Database & Schema Setup:** A new SQLite database is created at `D:\databases\models_pricing.db`. All tables (`models` and `price_history`) are created with clean schemas, index optimization, and WAL mode enabled.
3. **Seed Implementation:** The database is successfully seeded with accurate June 2026 model pricing parameters, specifically:
   - Moonshot AI Kimi K2.6 ($0.60-$0.95 input, $2.50-$4.00 output, $0.10-$0.16 cached input)
   - Google Gemini 3.5 Flash ($1.50 input, $9.00 output, $0.15 cached input)
   - OpenAI GPT-5.5 ($5.00 input, $30.00 output) & GPT-5.4 Mini ($0.75 input, $4.50 output)
   - Anthropic Claude Sonnet 4.6 ($3.00 input, $15.00 output) & Claude Opus 4.7 ($5.00 input, $25.00 output)
   - DeepSeek V4 Flash ($0.14 input, $0.28 output)
4. **Type-Safe API Methods:** The library exposes robust, well-documented methods:
   - `getModels()`: Returns all active models.
   - `getModel(id)`: Returns a single model.
   - `updateModelPrice(id, pricing)`: Updates the pricing values in the `models` table and inserts a historical record in `price_history` within a transaction.
   - `addModel(model)`: Registers a new model.
5. **CLI Administration Tool:** A CLI interface allows operations to run:
   - `pnpm models-pricing list`
   - `pnpm models-pricing get <model-id>`
   - `pnpm models-pricing update <model-id> --input <price> --output <price> --cached <price>`
   - `pnpm models-pricing add --id <id> --provider <provider> --name <name> --input <price> --output <price>`
6. **Workspace Registrations:** The database is documented in `D:\databases\DB_INVENTORY.md` under "Live Databases" and added to the `@vibetech/shared-config` package if needed.
7. **Compliance:** 100% test coverage via Vitest. 0 lint or typecheck errors monorepo-wide.

---

## Tech Stack
- **Runtime & Toolchain:** Node.js 22.x, TypeScript 5.9.3, `pnpm` (10.x), Nx
- **Database:** `better-sqlite3` (with SQL execution WAL mode, cache size configurations, and SSD pragma optimizations)
- **Validation:** `zod` for API schema validation
- **Testing:** `vitest`

---

## File Structure

### Files to Modify
- `pnpm-workspace.yaml`: Ensure `packages/models-pricing` is included in workspace paths.
- `D:\databases\DB_INVENTORY.md`: Add `models_pricing.db` to the active live database table.

### Files to Create
- `packages/models-pricing/package.json`: Scaffolds dependencies (`better-sqlite3`, `zod`, `@vibetech/shared-config`) and targets.
- `packages/models-pricing/project.json`: Nx target configurations for build, lint, typecheck, and test.
- `packages/models-pricing/tsconfig.json`: Typescript compilation settings.
- `packages/models-pricing/README.md`: Root package README detailing setup, API, and usage examples.
- `packages/models-pricing/AI.md`: Orientation guide for AI agents detailing schema and files.
- `packages/models-pricing/src/types.ts`: Interface definitions for Models, PricingTiers, and History.
- `packages/models-pricing/src/db.ts`: SQLite client lifecycle management, DDL schema setup, and pre-seeding scripts.
- `packages/models-pricing/src/index.ts`: Public API export boundaries.
- `packages/models-pricing/src/cli.ts`: CLI utility executable.
- `packages/models-pricing/tests/db.test.ts`: Database integration tests.
- `packages/models-pricing/tests/api.test.ts`: Public service function tests.

---

## Task Breakdown

### Phase 1: Workspace Scaffolding & Setup
Wire up package configuration and build dependencies.

#### Task 1.1: Package Metadata Configuration
- **Agent/Skill Recommendation:** link-workspace-packages, nx-workspace
- **INPUT:** `packages/models-pricing/package.json`, `packages/models-pricing/project.json`, `packages/models-pricing/tsconfig.json`
- **OUTPUT:** Scaffolded configurations ready for dependency installation.
- **VERIFY:** Run `pnpm install` and check that `@vibetech/models-pricing` is recognized as a workspace project using `pnpm nx show projects`.

---

### Phase 2: Schema Design & Database Ingestion
Initialize database connections and populate 2026 baseline data.

#### Task 2.1: SQLite Database Setup
- **Agent/Skill Recommendation:** database-design, clean-code
- **INPUT:** `packages/models-pricing/src/db.ts`
- **OUTPUT:** Connection setup resolving to `D:\databases\models_pricing.db` via `@vibetech/shared-config`. Schema initialization for `models` and `price_history` tables.
- **VERIFY:** Check that running the database initialization script creates `D:\databases\models_pricing.db` with WAL mode enabled.

#### Task 2.2: 2026 Model Seed script
- **Agent/Skill Recommendation:** developing-with-bigquery (specifically for database patterns and pricing details)
- **INPUT:** `packages/models-pricing/src/db.ts`
- **OUTPUT:** A baseline seed mechanism that populates the 2026 rates for Moonshot, Gemini, OpenAI, Anthropic, and DeepSeek.
- **VERIFY:** Query the database using a simple sqlite select script to confirm all 12 model profiles are loaded with correct properties.

---

### Phase 3: TypeScript Service API Implementation
Develop the query and modification API.

#### Task 3.1: Query APIs (`getModels`, `getModel`)
- **Agent/Skill Recommendation:** nodejs-best-practices, clean-code
- **INPUT:** `packages/models-pricing/src/index.ts`, `packages/models-pricing/src/types.ts`
- **OUTPUT:** Service methods returning validated TypeScript lists or single records matching Zod validation filters.
- **VERIFY:** Execute dry-run scripts fetching Gemini and Kimi profiles.

#### Task 3.2: Transactional Pricing Modification (`updateModelPrice`, `addModel`)
- **Agent/Skill Recommendation:** database-design, clean-code
- **INPUT:** `packages/models-pricing/src/index.ts`
- **OUTPUT:** Methods to update values, run inside a SQL transaction to guarantee atomic insertion of a row into `price_history`.
- **VERIFY:** Execute price update and check that the old rates are stored in the history table.

---

### Phase 4: CLI Administration Tool
Enable terminal interface controls.

#### Task 4.1: CLI Command Interface
- **Agent/Skill Recommendation:** nodejs-best-practices
- **INPUT:** `packages/models-pricing/src/cli.ts`
- **OUTPUT:** Script mapping argv commands to API methods.
- **VERIFY:** Verify running `node packages/models-pricing/src/cli.js list` outputs formatted model summaries.

---

### Phase 5: Documentation & Inventory Registration
Record architecture and register database with workspace monitoring.

#### Task 5.1: API Documentation and AI Orientation
- **Agent/Skill Recommendation:** documentation-templates
- **INPUT:** `packages/models-pricing/README.md`, `packages/models-pricing/AI.md`
- **OUTPUT:** Required documentation files in package root.
- **VERIFY:** Verify documents are syntactically valid markdown and reference proper TypeScript definitions.

#### Task 5.2: DB Inventory Registration
- **Agent/Skill Recommendation:** workspace-mcp-server / manual editing
- **INPUT:** `D:\databases\DB_INVENTORY.md`
- **OUTPUT:** Updated Markdown inventory registering `models_pricing.db` under Owner `@vibetech/models-pricing`.
- **VERIFY:** Run `git diff D:\databases\DB_INVENTORY.md` to confirm the formatting is aligned.

---

## Phase X: Verification Checklist

### Automated Checks
- [ ] Run typescript checks: `pnpm nx run models-pricing:typecheck`
- [ ] Run lints: `pnpm nx run models-pricing:lint`
- [ ] Run test suite: `pnpm nx run models-pricing:test`
- [ ] Compile library: `pnpm nx run models-pricing:build`
- [ ] Run security scan: `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`

### Manual Verification
- [ ] Verify that `D:\databases\models_pricing.db` is generated upon initial connection.
- [ ] Test the CLI output for `pnpm models-pricing list` and verify the tabular display matches 2026 data.
- [ ] Trigger an update for Gemini 3.5 Flash pricing via the CLI and check that a corresponding history row is appended.

## ✅ PHASE X COMPLETE
- Build: ✅ Pending Implementation
- Test: ✅ Pending Implementation
- Date: 2026-06-01
