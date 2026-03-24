---
name: invoice-automation-saas-skill
description: SaaS invoice automation - Next.js, Stripe billing, multi-tenancy, PDF generation
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Invoice Automation SaaS Skill

> **Multi-tenant SaaS Application** - Next.js 14+, Stripe, PostgreSQL

## Project Context

| Aspect         | Details                               |
| -------------- | ------------------------------------- |
| **Location**   | `C:\dev\apps\invoice-automation-saas` |
| **Framework**  | Next.js 14 (App Router)               |
| **Database**   | PostgreSQL via Prisma                 |
| **Auth**       | NextAuth.js / Clerk                   |
| **Payments**   | Stripe Subscriptions                  |
| **Deployment** | Vercel                                |

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js with multiple providers
- **Payments**: Stripe (subscriptions, invoices, webhooks)
- **PDF**: @react-pdf/renderer
- **Email**: Resend or SendGrid

## Required Community Skills

| Skill                            | Use Case            |
| -------------------------------- | ------------------- |
| `nextjs-best-practices`          | App Router patterns |
| `typescript-expert`              | Type safety         |
| `prisma-expert`                  | Database operations |
| `stripe-integration`             | Payment flows       |
| `testing-patterns`               | Test coverage       |
| `verification-before-completion` | Quality gates       |

## Architecture

```
invoice-automation-saas/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth routes
│   │   ├── (dashboard)/        # Protected routes
│   │   ├── api/                # API routes
│   │   └── webhooks/           # Stripe webhooks
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── features/           # Feature components
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client
│   │   ├── stripe.ts           # Stripe client
│   │   └── auth.ts             # Auth config
│   └── services/               # Business logic
├── prisma/
│   └── schema.prisma           # Database schema
└── next.config.js
```

## Development Workflow

### Start Development

```bash
cd apps/invoice-automation-saas
pnpm dev
```

### Database Operations

```bash
pnpm db:push      # Push schema changes
pnpm db:migrate   # Create migration
pnpm db:studio    # Open Prisma Studio
pnpm db:seed      # Seed database
```

### Run Tests

```bash
pnpm test         # Unit tests
pnpm test:e2e     # E2E with Playwright
```

## Critical Patterns

### Multi-Tenant Data Access

```typescript
// lib/tenant.ts
export async function getTenantId(session: Session): Promise<string> {
  if (!session?.user?.organizationId) {
    throw new UnauthorizedError('No organization context');
  }
  return session.user.organizationId;
}

// Always filter by tenant
export async function getInvoices(session: Session) {
  const tenantId = await getTenantId(session);
  return prisma.invoice.findMany({
    where: { organizationId: tenantId },
  });
}
```

### Stripe Webhook Handler

```typescript
// app/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### Server Action Pattern

```typescript
// actions/invoices.ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CreateInvoiceSchema = z.object({
  customerId: z.string(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
    }),
  ),
});

export async function createInvoice(data: z.infer<typeof CreateInvoiceSchema>) {
  const session = await getServerSession();
  const tenantId = await getTenantId(session);

  const validated = CreateInvoiceSchema.parse(data);

  const invoice = await prisma.invoice.create({
    data: {
      ...validated,
      organizationId: tenantId,
      status: 'DRAFT',
    },
  });

  revalidatePath('/invoices');
  return invoice;
}
```

## Quality Checklist

Before completing ANY task:

- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] Database migrations reviewed
- [ ] Stripe webhooks tested locally
- [ ] Multi-tenant isolation verified
- [ ] No N+1 queries

## Security Rules

### 🔴 CRITICAL - Multi-Tenancy

- ALWAYS filter queries by organizationId/tenantId
- NEVER trust client-provided IDs without verification
- Use middleware to inject tenant context

### Payment Security

- Validate webhook signatures
- Never store full card numbers
- Use Stripe's idempotency keys
- Log all payment events

## Related Commands

- `/invoice-automation-saas:dev` - Start development
- `/invoice-automation-saas:build` - Production build
- `/invoice-automation-saas:quality` - Full quality pipeline
