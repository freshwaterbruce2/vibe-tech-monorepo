# CONTINUATION — VibeTech monorepo (V:\monorepo, main branch)

_Last updated: 2026-06-18_

## Context from last session
We verified a "workspace gap fixes" walkthrough against the live tree and fixed real issues.
Two apps were in scope: `vibetech-command-center` (= "VTDE", shipped beta) and `vibe-shop`.

## State as of handoff (verify before trusting — claims age)
- **VTDE** = `apps/vibetech-command-center` (Electron 33). `apps/vtde` (Tauri) no longer exists.
  Marked complete in `TASKS.md`. Verified: build OK, 259 unit + 12 E2E pass, 90.5 MB NSIS installer on disk.
- **vibe-shop**: builds correctly now, 296 unit tests pass. **NOT finished** — only un-blocked.
- **COMMITTED 2026-06-18** (working tree clean except this HANDOFF.md):
  - `1764023d` fix(vibe-shop): Windows standalone build unblock (--webpack + outputFileTracingRoot)
  - `6197e65a` test(command-center): deterministic stream E2E + 06-process-stream coverage
  - `2f09a2ae` test(command-center): E2E for cc.claude.stream (item #3 below — DONE)
  - command-center E2E now 13 tests (was 12), all green; typecheck clean.

## Why the vibe-shop build changes exist
Next.js 16.1.6 + `output:'standalone'` + Turbopack (default) on Windows produces colon-named chunks
(`[externals]_node:buffer_...js`) that fail to copy into `.next/standalone` (EINVAL — colons illegal on NTFS).
Known upstream bug (PR #88273 incomplete in 16.1.6). Workaround = build with `--webpack`.
**TODO(tracking):** revert to Turbopack build once the upstream colon-escaping fix lands.

## Remaining work (in priority order)
1. ~~COMMIT the uncommitted files.~~ **DONE** — see commits above (no active-project lock; 3 commits).
2. **vibe-shop END-TO-END verification** — STOREFRONT DONE 2026-06-18, verified against live Neon DB
   (`neon-orange-kite`, DATABASE_URL in `apps/vibe-shop/.env.local`, gitignored).
   - DB was empty → `prisma db push` (sidesteps the SQLite migration_lock) + `tsx prisma/seed.ts`
     → 7 categories, 35 products, 20 trending keywords.
   - All storefront paths return 200 with real DB content, zero runtime errors:
     `/` (trending, ordered by trend_score), `/category/[slug]`, `/product/[id]`,
     `/search?q=`; `/product/<bad-id>` correctly 404s.
   - CORRECTION to prior handoff: storefront uses **NO AI at runtime**. The AI service
     (`src/services/ai/`) is **OpenRouter** (migrated off Gemini 2026-01-24), NOT `GOOGLE_API_KEY`,
     and is consumed only by `ProductDiscoveryEngine.ts` (backend cron `/api/cron/discovery`
     ingestion), not by any storefront page/component. Storefront needs only `DATABASE_URL`.
   - STILL OPEN (optional, separate feature): exercise the AI discovery/ingestion path
     (`/api/cron/discovery`) — needs `OPENROUTER_API_KEY` + `CRON_SECRET`. Not required for the
     storefront to be "finished."
   - Migration debt: RESOLVED 2026-06-18. Regenerated `20251216125047_init/migration.sql` as
     Postgres dialect via `prisma migrate diff --from-empty --to-schema` (TIMESTAMP(3), *_pkey
     constraints, separate indexes/FKs; also added the previously-missing unique index on
     trending_keywords.keyword). Set `migration_lock.toml` provider = "postgresql". Baselined the
     live DB with `prisma migrate resolve --applied 20251216125047_init` (metadata only — seed data
     untouched: 7/35/20 verified). `prisma migrate status` → "Database schema is up to date!" (no drift).
3. ~~command-center E2E for `cc.claude.stream`.~~ **DONE** — `2f09a2ae`. Fake cli.js via CLAUDE_JS_PATH,
   asserts system+result events over the WS hub; full renderer->IPC->bridge->hub->renderer path, no live call.

## Rules reminder
PowerShell + pnpm only. Data on `D:\`, code on `V:\monorepo`. Finisher mode. Web-search version/API claims.
For builds prefer `pnpm nx build <project>`; use `--skip-nx-cache` when you need a genuine fresh run.

**Start by:** `git status` to confirm the 5 files, then ask whether to commit or do vibe-shop E2E first.
