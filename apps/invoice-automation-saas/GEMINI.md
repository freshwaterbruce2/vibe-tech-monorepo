---
type: ai-entrypoint
scope: project
audience:
  - gemini
status: active-development
lastReviewed: 2026-02-17
---

# GEMINI.md - Invoice Automation SaaS

## Project Type

Full-stack invoice management SaaS with premium dark-mode UI.

## Location

`C:\dev\apps\invoice-automation-saas\`

## Tech Stack

- **Frontend**: React 19 + Vite 7 + TypeScript
- **Backend**: Fastify (port 8787)
- **Database**: SQLite (better-sqlite3) at `D:\databases\`
- **Auth**: Cookie-based JWT (`@fastify/cookie`)
- **Styling**: Vanilla CSS (dark glassmorphism, Inter + Outfit fonts)
- **PDF**: jsPDF (client-side generation)
- **Charts**: Recharts
- **Testing**: Vitest

## Key Commands

```bash
pnpm dev              # Start frontend (Vite, port 3001)
pnpm server           # Start backend (Fastify, port 8787)
pnpm build            # tsc && vite build
pnpm test             # vitest run (15 tests)
```

## Architecture

```
src/
├── pages/             # Route pages (Dashboard, Clients, InvoiceBuilder)
├── components/        # React components (Navigation, ErrorBoundary, etc.)
├── services/          # API clients (invoiceService, clientService)
├── utils/             # Helpers (generateInvoicePdf, formatCurrency)
├── styles/            # global.css (design system + responsive)
├── types/             # TypeScript interfaces
└── test/              # Vitest unit tests

server/
├── src/
│   ├── index.ts       # Fastify entry (CORS, cookie, routes)
│   ├── db.ts          # SQLite connection
│   └── routes/        # API routes (invoices, clients, auth, payments)
```

## Critical Patterns

- **Database path**: `D:\databases\` — never `C:\dev`
- **Auth**: JWT tokens in HTTP-only cookies via `@fastify/cookie`
- **PDF**: Client-side generation with `jsPDF`, no server dependency
- **Responsive**: Two breakpoints — 900px (tablet) and 480px (phone)

## Quality Checklist

- [x] TypeScript compiles (0 errors)
- [x] 15 tests passing (clientService, invoiceService, PDF)
- [x] Production build succeeds
- [x] Auth-protected routes
- [x] Responsive mobile layout
- [ ] No secrets in code

## Canonical References

- AI notes: ../../AI.md
- Workspace rules: ../../docs/ai/WORKSPACE.md
