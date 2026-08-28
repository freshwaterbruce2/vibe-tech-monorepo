# VibeTech Monorepo — Canonical Facts (live-tree verified 2026-06-18)

> SUPERSEDES and invalidates the following stale documents (delete them from any
> NotebookLM / knowledge-base context): "CANONICAL FACTS (disk-verified) 2026-06-16",
> "VibeTech Ecosystem Review and System Health Audit 2026", "source1_vtde_status.md",
> "source_vtde.md", "claudecode06142026". Those contain FALSE state — a live `apps/vtde`
> Tauri app, a `WORKSPACE.json`, a `guard-protect-source.ps1` "error". The live
> `V:\monorepo` filesystem is the only source of truth.

## Workspace

- Root: `V:\monorepo`. Branch: `main`. pnpm 10.33.0 + Nx 22.7.1. TypeScript 5.9 strict.
- Hard rule: ALL source on `V:\monorepo`; ALL data (DBs, logs, learning) on `D:\`. Never mixed.
- Counts (verified by enumerating `package.json` under each glob in `pnpm-workspace.yaml`):
  - `apps/`: **46 workspace members** = 40 real apps + 6 app-factory smoke/test fixtures
    (`_-factory-runtime-smoke`, `factory-landing-smoke`, `factory-saas-smoke`,
    `factory-tauri-smoke`, `factory-verify`, `test-factory-app`).
  - `packages/`: **34 shared packages**.
  - Note: `apps/` has **48 directories** but only 46 are pnpm workspace members. The two
    non-members are `crypto-enhanced` (Python, no `package.json`) and `gravity-claw`
    (WIP, not yet a member). Count members by `package.json`, not by directory.

## VTDE — ONE application, not two

- "VTDE" is the LEGACY NAME of `apps/vibetech-command-center` (package
  `@vibetech/command-center`), an Electron 33 + electron-vite + React 19 ops control plane
  (shipped beta).
- `apps/vtde` DOES NOT EXIST. There is no Tauri v2 desktop-OS-shell, no xterm.js terminal app,
  no portable-pty Rust PTY backend, no `apps/VTDE` inode anywhere. Verified: zero dirs match
  `*vtde*`, zero git-tracked files match `vtde`.
- Any claim that vtde is "live/production" or "passes 14 frontend + 8 Rust tests" is FALSE and
  originates from the deleted stale sources above.

## apps/ members (46)

`_-factory-runtime-smoke`, `agent-engine` (@vibetech/agent-engine), `cme-track`,
`desktop-commander-v3`, `factory-landing-smoke`, `factory-saas-smoke`, `factory-tauri-smoke`,
`factory-verify`, `learning-pipeline-mcp`, `mcp-gateway` (@vibetech/mcp-gateway),
`mcp-rag-server` (@vibetech/mcp-rag-server), `mcp-skills-server`, `memory-mcp`,
`monorepo-health-mcp`, `nova-agent`, `nova-mobile-app`, `prior-auth-pro`,
`proactive-recommendations-mcp`, `prompt-engineer` (@vibetech/prompt-engineer),
`proposal-review-saas`, `serenity-flow`, `skill-feedback-mcp`, `symptom-tracker-api`,
`test-factory-app`, `vibe-blox` (@vibetech/vibe-blox), `vibe-booking` (@vibetech/vibe-booking),
`vibe-booking-backend`, `vibe-booking-v2`, `vibe-chess`, `vibe-code-studio`, `vibe-dental`,
`vibe-discharge`, `vibe-invoice`, `vibe-justice` (@vibetech/vibe-justice), `vibe-portal`,
`vibe-reflection`, `vibe-reminder`, `vibe-reminder-v2`, `vibe-shipping`, `vibe-shop`,
`vibe-tech-lovable`, `vibe-tech-marketing`, `vibe-tutor`, `vibe-tutor-mobile`,
`vibetech-command-center` (@vibetech/command-center), `workspace-mcp-server`.

## packages/ members (34)

`agent-lats`, `ai`, `analytics`, `auth`, `avatars`, `backend`, `billing`, `core`, `db-app`,
`email`, `emails`, `entitlements`, `feature-flags`, `games`, `hooks`, `inngest-client`,
`landing`, `logger`, `mcp-core`, `mcp-testing`, `memory`, `monetization`,
`nova-database` (@nova/database), `nova-types` (@nova/types), `openclaw-bridge`,
`openrouter-client`, `payments`, `service-common`, `shared-config`, `shared-ipc`,
`testing-utils`, `types`, `ui`, `vcs-theme`. (All `@vibetech/*` except the two `@nova/*` noted.)

## vibe-shop — current state (verified 2026-06-18)

- Next.js 16.1.6 storefront. 100% DB-backed reads via Neon serverless Postgres
  (`@neondatabase/serverless` + `@prisma/adapter-neon`). No AI key needed to browse.
- DB: Neon project `neon-orange-kite`. Schema pushed + seeded (7 categories, 35 products,
  20 trending keywords). Storefront paths `/`, `/category/[slug]`, `/product/[id]`, `/search`
  all return 200 with real data; bad product id 404s correctly.
- Prisma migration history fixed (commit `3bf5ba27`): init migration regenerated as Postgres
  dialect, lock set to `postgresql`, live DB baselined. `prisma migrate status` = no drift.
- Production build uses `next build --webpack` (Turbopack standalone emits colon-named chunks
  that fail to copy on NTFS — upstream bug; revert when fixed).
- AI service (`src/services/ai/`) is OpenRouter/DeepSeek (migrated off Gemini 2026-01-24),
  reads `OPENROUTER_API_KEY` (NOT `GOOGLE_API_KEY`). Used ONLY by `ProductDiscoveryEngine.ts`
  (backend cron `/api/cron/discovery`), never by storefront pages.

## How to read claims from any AI grounded only in uploaded docs

It CANNOT see the live filesystem, run PowerShell, or observe hooks. Any statement like
"disk-verified", "system health sweep confirmed", or "the hook error you encountered" is an
inference from uploaded text, not an observation. Trust the live tree over any such claim.
