# vibe-booking-backend — AI Context

## What this is
Backend API service for the Vibe Booking platform — TypeScript/Node.js server providing booking, scheduling, and payment endpoints.

## Stack
- **Runtime**: Node.js 22
- **Framework**: TypeScript compiled server (no package.json present — likely extracted/compiled)
- **Key deps**: vitest (in node_modules); full dep list not available without package.json

## Dev
```bash
# No package.json present — only dist/ and node_modules/ exist
# Likely consumed via the business-booking-platform frontend
node apps/vibe-booking-backend/dist/index.js  # run compiled server (if applicable)
```

## Notes
- No `package.json` or source files present — only compiled `dist/` output exists
- The `business-booking-platform` app in this monorepo is the corresponding frontend
- SQLite DB path should use `DATABASE_PATH` env var pointing to `D:\databases\`
- If rebuilding: check `apps/business-booking-platform` for API contract expectations
