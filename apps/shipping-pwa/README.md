# Walmart DC 8980 Shipping Department PWA

Progressive Web Application for managing daily door schedules, pallet counts,
voice-assisted updates, exports, and PWA/mobile deployment for the Walmart DC
8980 shipping workflow.

## Tech Stack

- React 19, TypeScript 5.9, Vite 7
- Tailwind CSS and shared `@vibetech/ui` components
- IndexedDB and local storage for client-side operational data
- Vitest, Playwright, and Testing Library
- Capacitor and Cloudflare Wrangler targets

## Development

Run from the workspace root:

```powershell
cd C:\dev
pnpm install
pnpm nx run shipping-pwa:dev
```

Common targets:

```powershell
pnpm nx run shipping-pwa:build
pnpm nx run shipping-pwa:build-mobile
pnpm nx run shipping-pwa:test
pnpm nx run shipping-pwa:test:coverage
pnpm nx run shipping-pwa:test-e2e
pnpm nx run shipping-pwa:lint
pnpm nx run shipping-pwa:typecheck
pnpm nx run shipping-pwa:quality
pnpm nx run shipping-pwa:worker-deploy
```

## Project Structure

```text
apps/shipping-pwa/
├── public/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   ├── types/
│   └── utils/
├── android/
├── scripts/
├── server.ts
├── package.json
└── project.json
```

## Documentation

- [AI.md](AI.md) - project-specific agent guidance
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - implementation details
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - deployment notes
- [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) - release checklist
- [PRODUCTION_TEST_SUITE_DOCUMENTATION.md](PRODUCTION_TEST_SUITE_DOCUMENTATION.md) - test coverage notes

## Notes

Use pnpm/Nx from `C:\dev`; do not run npm, yarn, or Bun commands for this app.
Serve production builds over HTTPS for PWA installability and service worker
features.
