# vibe-shop — AI Context

## What this is
Next.js e-commerce storefront with AI-powered product recommendations via Google Gemini and a Neon (serverless Postgres) database via Prisma.

## Stack
- **Runtime**: Node.js 22
- **Framework**: Next.js 16 (App Router)
- **Key deps**: @prisma/client + @prisma/adapter-neon + @neondatabase/serverless, @google/generative-ai, shadcn/ui (Radix + CVA)

## Dev
```bash
pnpm --filter vibe-shop dev       # Next.js dev server (port 3000)
pnpm --filter vibe-shop build     # next build → .next/
pnpm --filter vibe-shop test      # Vitest unit tests
```

## Notes
- Database: Neon serverless Postgres (not SQLite) — connection string via `DATABASE_URL` env var
- Run `pnpm prisma migrate dev` (inside the filter) to apply schema migrations
- AI recommendations use `@google/generative-ai` (Gemini) — needs `GOOGLE_API_KEY` env var
- Uses Tailwind v4 (PostCSS plugin `@tailwindcss/postcss`)
