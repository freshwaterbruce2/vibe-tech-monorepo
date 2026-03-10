---
name: database-skill
description: Database operations - SQLite, PostgreSQL, Prisma, migrations, queries, performance
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
category: infrastructure
---

# Database Development Skill

> **For ALL database work** in the monorepo: SQLite, PostgreSQL, Prisma

## Database Locations

| Database | Location | Used By |
|----------|----------|---------|
| `crypto_enhanced.db` | `D:\databases\` | Crypto trading |
| `vibe_justice.db` | `D:\databases\` | Vibe Justice |
| `memory_bank.db` | `D:\databases\` | Memory system |
| `learning_system.db` | `D:\databases\` | Learning system |
| `nova_agent.db` | `D:\databases\` | Nova Agent |
| PostgreSQL | Vercel/Neon | SaaS apps |

## Tech Stack

### SQLite (Local/Desktop)
- **Driver**: better-sqlite3 (Node.js), rusqlite (Rust)
- **ORM**: Prisma, Drizzle, or raw SQL
- **Location**: `D:\databases\`

### PostgreSQL (Cloud/SaaS)
- **Hosting**: Neon, Vercel Postgres, Supabase
- **ORM**: Prisma
- **Migrations**: Prisma Migrate

## Standard Commands

```bash
# Prisma
pnpm db:push       # Push schema without migration
pnpm db:migrate    # Create and apply migration
pnpm db:studio     # Open Prisma Studio
pnpm db:seed       # Run seed script
pnpm db:reset      # Reset database

# SQLite direct
sqlite3 D:/databases/app.db ".schema"
sqlite3 D:/databases/app.db "SELECT * FROM table LIMIT 10"
```

## Prisma Patterns

### Schema Design
```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"  // or "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String

  @@index([authorId])
  @@index([published])
}
```

### Query Patterns
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### Efficient Queries
```typescript
// ✅ Good - Select only needed fields
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true }
});

// ✅ Good - Include relations in one query
const userWithPosts = await prisma.user.findUnique({
  where: { id },
  include: { posts: { take: 10, orderBy: { createdAt: 'desc' } } }
});

// ❌ Bad - N+1 query problem
const users = await prisma.user.findMany();
for (const user of users) {
  user.posts = await prisma.post.findMany({ where: { authorId: user.id } });
}
```

## SQLite Direct Access

### Python (for crypto-enhanced)
```python
import sqlite3
from contextlib import contextmanager

@contextmanager
def get_db():
    conn = sqlite3.connect('D:/databases/crypto_enhanced.db')
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

# Usage
with get_db() as db:
    cursor = db.execute("SELECT * FROM trades WHERE status = ?", ('open',))
    trades = cursor.fetchall()
```

### Node.js (better-sqlite3)
```typescript
import Database from 'better-sqlite3';

const db = new Database('D:/databases/app.db');
db.pragma('journal_mode = WAL');  // Better performance

// Prepared statement (safe from injection)
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = stmt.get(userId);

// Transaction
const insertMany = db.transaction((items) => {
  const insert = db.prepare('INSERT INTO items (name) VALUES (?)');
  for (const item of items) {
    insert.run(item.name);
  }
});
insertMany(items);
```

## Migration Best Practices

### Prisma Migration
```bash
# Development - iterate freely
pnpm db:push

# Production - create migration
pnpm db:migrate --name add_user_role

# Check migration status
npx prisma migrate status
```

### Manual Migration (SQLite)
```sql
-- migrations/001_add_role.sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
CREATE INDEX idx_users_role ON users(role);
```

## Performance Optimization

### Indexing
```prisma
model Post {
  id        String @id
  title     String
  authorId  String
  createdAt DateTime

  // Composite index for common query
  @@index([authorId, createdAt(sort: Desc)])
}
```

### Query Analysis
```sql
-- SQLite
EXPLAIN QUERY PLAN SELECT * FROM posts WHERE author_id = ? ORDER BY created_at DESC;

-- Look for: USING INDEX vs SCAN TABLE
```

### Connection Pooling
```typescript
// For serverless (Vercel, etc.)
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

## Quality Checklist

- [ ] Schema matches requirements
- [ ] Indexes on frequently queried columns
- [ ] No N+1 queries
- [ ] Migrations are reversible
- [ ] Seed data available for testing
- [ ] Connection pooling configured
- [ ] Sensitive data encrypted

## Common Issues

### SQLite Locked
```typescript
// Enable WAL mode
db.pragma('journal_mode = WAL');
```

### Prisma Connection Issues
```bash
# Regenerate client
npx prisma generate
```

## Community Skills to Use

- `prisma-expert` - ORM patterns
- `database-design` - Schema design
- `performance-profiling` - Query optimization
