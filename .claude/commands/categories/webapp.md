---
name: webapp-skill
description: Web application development - Next.js, React, TypeScript, APIs, authentication, deployment
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
category: app-type
---

# Web Application Development Skill

> **For ALL web apps** in the monorepo: Next.js, React SPAs, full-stack apps

## Applies To

| Project                          | Type               |
| -------------------------------- | ------------------ |
| `apps/vibe-justice`              | Next.js + AI       |
| `apps/invoice-automation-saas`   | Next.js SaaS       |
| `apps/vibe-shop`                 | E-commerce         |
| `apps/digital-content-builder`   | Content platform   |
| `apps/business-booking-platform` | Booking system     |
| `apps/monorepo-dashboard`        | Internal dashboard |

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Query (server), Zustand (client)
- **Forms**: React Hook Form + Zod
- **Auth**: NextAuth.js or Clerk
- **Database**: Prisma + PostgreSQL/SQLite

## Standard Commands

```bash
pnpm dev           # Development server
pnpm build         # Production build
pnpm test          # Run tests
pnpm typecheck     # TypeScript validation
pnpm lint          # ESLint
pnpm db:push       # Push schema (Prisma)
pnpm db:studio     # Prisma Studio
```

## Architecture Pattern

```
apps/{webapp}/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (public)/         # Public routes
│   │   ├── (dashboard)/      # Protected routes
│   │   ├── api/              # API routes
│   │   └── layout.tsx        # Root layout
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   └── features/         # Feature components
│   ├── lib/                  # Utilities, clients
│   ├── hooks/                # Custom hooks
│   └── services/             # Business logic
├── prisma/                   # Database schema
└── next.config.js
```

## Critical Patterns

### Server Components (Default)

```typescript
// app/dashboard/page.tsx - Server Component by default
export default async function DashboardPage() {
  const data = await getData(); // Direct DB/API call
  return <Dashboard data={data} />;
}
```

### Client Components (When Needed)

```typescript
'use client';
// Only for: useState, useEffect, event handlers, browser APIs

export function InteractiveWidget() {
  const [state, setState] = useState();
  return <button onClick={() => setState(...)}>Click</button>;
}
```

### Server Actions

```typescript
'use server';
import { revalidatePath } from 'next/cache';

export async function createItem(formData: FormData) {
  const data = Object.fromEntries(formData);
  await db.item.create({ data });
  revalidatePath('/items');
}
```

### Data Fetching with React Query

```typescript
export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => fetch('/api/items').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}
```

## Quality Checklist

- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] Server/Client components correct
- [ ] Loading/error states handled
- [ ] Responsive design verified
- [ ] Accessibility checked

## Security Rules

- Validate ALL user input with Zod
- Use parameterized queries (Prisma handles this)
- Implement CSRF protection
- Sanitize outputs to prevent XSS
- Never expose secrets in client code

## Community Skills to Use

- `nextjs-best-practices` - App Router patterns
- `react-patterns` - Component design
- `typescript-expert` - Type safety
- `testing-patterns` - Test coverage
- `tailwind-patterns` - Styling
