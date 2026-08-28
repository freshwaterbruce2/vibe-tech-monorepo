# InvoiceFlow - Modern Invoice Automation SaaS

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-blue" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-7.3-purple" alt="Vite">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

A powerful invoice automation platform that helps businesses get paid 3x faster and save 70% on invoice processing costs. Built with React, TypeScript, and modern web technologies.

## Features

- **Invoice Management**: Create, edit, and manage invoices with a beautiful interface
- **Recurring Billing**: Set up automated recurring invoices with flexible scheduling
- **Payment Processing**: Accept payments via Stripe with saved card support
- **Real-time Updates**: Live updates via local SSE (`/api/events`)
- **Dashboard Analytics**: Revenue tracking and visual analytics
- **PDF Generation**: Export invoices as professional PDFs
- **Authentication**: Local cookie auth backed by SQLite
- **Performance Monitoring**: Built-in performance tracking with Sentry

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.9+
- **Styling**: styled-components + Framer Motion
- **Build Tool**: Vite
- **State Management**: React Context API
- **Forms**: react-hook-form
- **Charts**: Recharts
- **PDF**: jsPDF + html2canvas
- **Payments**: Stripe
- **Backend**: Local Fastify API + SQLite (WAL) on `D:\`
- **Monitoring**: Sentry
- **Deployment**: Self-hosted server + domain

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10.33+
- SQLite database file on `D:\` (configured via `DATABASE_PATH`)
- Stripe account (optional)
- Sentry account (optional)

### Installation

1. Clone the repository:

```powershell
git clone https://github.com/freshwaterbruce2/vibe-tech-monorepo.git vibetech
cd vibetech
```

1. Install dependencies:

```powershell
pnpm install
```

1. Copy environment variables:

```powershell
cp .env.example .env.local
```

1. Configure environment variables in `.env.local`:

```
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
DATABASE_PATH=D:\databases\invoiceflow.db
AUTH_SECRET=your-long-random-secret-at-least-32-chars
VITE_SENTRY_DSN=your_sentry_dsn
```

Note: this project is local-only. The API server enforces that `DATABASE_PATH` is on `D:\` to avoid
writing app data to `C:\`.

1. Start the development server:

```powershell
pnpm nx run invoice-automation-saas:dev
```

1. Start the API server (separate terminal):

```powershell
pnpm nx run invoice-automation-saas:api:dev
```

## Development

### Available Scripts

- `pnpm nx run invoice-automation-saas:dev` - Start development server
- `pnpm nx run invoice-automation-saas:api:dev` - Start local API server
- `pnpm nx run invoice-automation-saas:build` - Build for production
- `pnpm nx run invoice-automation-saas:preview` - Preview production build
- `pnpm nx run invoice-automation-saas:lint` - Run ESLint
- `pnpm nx run invoice-automation-saas:test` - Run tests
- `pnpm nx run invoice-automation-saas:test:coverage` - Run tests with coverage

### Git Hooks

This project uses Husky for Git hooks:

- **pre-commit**: Runs TypeScript checks, linting, and tests
- **commit-msg**: Validates commit message format
- **post-commit**: Takes a session memory snapshot

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Card, etc.)
│   ├── invoice/        # Invoice-specific components
│   ├── dashboard/      # Dashboard components
│   └── landing/        # Landing page components
├── pages/              # Page components
├── services/           # Business logic and API services
├── hooks/              # Custom React hooks
├── contexts/           # React context providers
├── types/              # TypeScript type definitions
├── config/             # Configuration files
└── utils/              # Utility functions
```

## Deployment

This project is designed to be **self-hosted** (your own server + domain) while enforcing that all
persistent data is stored on `D:\` via `DATABASE_PATH`.

For running on your own server + domain, see `apps/invoice-automation-saas/SELF_HOSTING.md`.

## API Integration (Local)

The backend lives in `apps/invoice-automation-saas/server` and stores all data in a SQLite database
on `D:\` (WAL mode).

- Schema file: `apps/invoice-automation-saas/server/src/schema.sql`
- Env:
  - `DATABASE_PATH=D:\databases\invoiceflow.db`
  - `AUTH_SECRET=...` (>= 32 chars)

The dev UI proxies `/api/*` to the backend (see `apps/invoice-automation-saas/vite.config.ts`).

### Stripe Integration

1. Create a Stripe account
2. Get your publishable key from the Stripe dashboard
3. Set up webhooks for payment events (when implementing backend)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email <support@invoiceflow.com> or join our Slack channel.
