# Health Tracker

Personal four-dimension wellness tracker — physical, mental, emotional, spiritual. Local-first PWA, daily check-in in 5–10 minutes.

## Why it lives here, not in `apps/`

This is a personal discipline tool, not a portfolio app. It sits outside the `@vibetech/workspace` monorepo (`apps/*` glob) so daily edits never trigger a 64-project pnpm rebuild. Self-contained: own `node_modules`, own lockfile, own pnpm workspace root.

## Run it

```powershell
cd C:\dev\personal-tools\health-tracker
pnpm dev
```

Vite prints two URLs:
- `Local:   http://localhost:5190/`  — desktop browser
- `Network: http://192.168.x.x:5190/` — open this in **Safari on iPhone 15 Pro** while on the same Wi-Fi. Tap Share → Add to Home Screen for app-like access.

## Commands

```powershell
pnpm dev         # dev server, host 0.0.0.0, port 5190
pnpm build       # production build to ./dist
pnpm preview     # preview production build
pnpm typecheck   # tsc --noEmit
```

## Tech

- React 19.2.4 + TypeScript 5.9.3 + Vite 7
- Tailwind v4 (vite plugin, no config file)
- Dexie 4 over IndexedDB for local persistence
- Zod for schema validation
- date-fns for date math

## Data model

Per-day entry with: 4 dimension scores (1–10), habit completion map, gratitude,
reflection, themes, and tone. Symptoms are logged in the same local IndexedDB
database with date, time, severity, notes, tags, summary counts, and pattern
insights. No separate symptom-tracker API or cloud sync in v1.

## Phase status

- [x] **Phase 1** — Daily entry: scores, habits, gratitude, reflection. Autosave to IndexedDB.
- [x] **Phase 2** — Local symptom log: severity, tags, history, summaries, and safety-worded pattern insights.
- [ ] **Phase 3** — Dashboard: yesterday snapshot + 7-day trend chart.
- [ ] **Phase 4** — Weekly review (Sunday): averages, completion rates, three reflection prompts.
- [ ] **Phase 5** — PWA manifest + service worker + iOS install + daily reminder.
- [ ] **Phase 6** — (Optional) Cloud sync via Cloudflare Workers + D1.
- [ ] **Phase 7** — (Optional) JSON export for backup.

## Discipline contract

Open it tomorrow morning. Open it the morning after. Three to seven entries before requesting Phase 2. The framework holds; the consistency is yours.
