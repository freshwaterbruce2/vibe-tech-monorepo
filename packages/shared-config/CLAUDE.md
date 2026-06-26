# Shared Config (@vibetech/shared-config) CLI/Agent Rules

This file guides Universal AI Coding Agents when working in `packages/shared-config`.

## 1. Project Commands
- **Build**: `pnpm nx build @vibetech/shared-config`
- **Typecheck**: `pnpm nx typecheck @vibetech/shared-config`
- **Lint**: `pnpm nx lint @vibetech/shared-config`
- **Test**: `pnpm nx test @vibetech/shared-config`

## 2. Local Domain Rules & Constraints
- **Zod Environment Validation**: Exposes shared, validated configuration utilities using Zod schemas.
- **Strict Environment Checks**: All environment variables (e.g. database paths, port configurations, third-party API keys) must be fully schema-validated before loading.
- **Drive Separation Configs**: Enforce path-resolution defaults pointing to `D:\databases\` and `D:\logs\` as the physical boundaries for data storage. Validate and throw clear configuration errors if paths resolve within `V:\monorepo` during database/log initialization.
- **TypeScript strict-mode assumptions**: Strict type guarantees must remain intact. Avoid cast overrides or `as any`.

## 3. Global Architecture Reference
- Follow global rules in [AGENTS.md](../../AGENTS.md) and [GEMINI.md](../../GEMINI.md).
- File sizes must strictly adhere to the 500-line soft limit (1000-line hard limit) and 50-line function limits.
