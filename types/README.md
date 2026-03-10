# Database Schema Types

**Location:** `C:\dev\types\database-schemas.ts`
**Purpose:** TypeScript definitions for all SQLite databases in D:\databases\
**For:** Augment Code, Copilot, Claude, and all AI coding assistants

## Why This File Exists

This file provides **complete type definitions** for all databases in the VibeTech monorepo. It enables:

1. **Augment Code** - Understands your database structure for better suggestions
2. **GitHub Copilot** - Provides accurate code completion for database operations
3. **Claude & other AI agents** - Can reference actual schema when helping with code
4. **Type Safety** - TypeScript validation for database operations

## Usage Examples

### Example 1: Trading System (crypto-enhanced)

```typescript
import { Order, Trade, DATABASE_PATHS } from '@/types/database-schemas';
import Database from 'better-sqlite3';

const db = new Database(DATABASE_PATHS.TRADING);

// Augment now knows the exact schema!
const orders = db.prepare('SELECT * FROM orders WHERE pair = ?').all('XLM/USD') as Order[];

orders.forEach((order: Order) => {
  console.log(`${order.side} ${order.volume} @ ${order.price}`);
  // Augment provides autocomplete for: order_id, pair, side, status, etc.
});
```

### Example 2: Agent Learning System

```typescript
import { Interaction, Pattern, KnowledgeEntry } from '@/types/database-schemas';

// Query recent successful interactions
const recentSuccess = db.prepare(`
  SELECT * FROM interactions
  WHERE success = 1
  AND timestamp > datetime('now', '-7 days')
  ORDER BY timestamp DESC
`).all() as Interaction[];

// Find patterns related to TypeScript
const tsPatterns = db.prepare(`
  SELECT * FROM patterns
  WHERE context_keywords LIKE '%typescript%'
  AND confidence_score > 0.7
`).all() as Pattern[];
```

### Example 3: Vibe Tutor (Student Management)

```typescript
import { Student, Assignment, TutorSession } from '@/types/database-schemas';

interface StudentWithAssignments extends Student {
  assignments: Assignment[];
}

const getStudentDashboard = (studentId: number): StudentWithAssignments => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId) as Student;
  const assignments = db.prepare(`
    SELECT * FROM assignments
    WHERE student_id = ?
    AND status IN ('pending', 'in_progress')
    ORDER BY due_date ASC
  `).all(studentId) as Assignment[];

  return { ...student, assignments };
};
```

## AI Agent Benefits

### For Augment Code

- **Context window**: Augment indexes this file and understands your database schema
- **Code suggestions**: Provides accurate column names, types, and relationships
- **SQL completion**: Suggests correct table and column names in queries

### For GitHub Copilot

- **Type hints**: Copilot uses these types for better code generation
- **Query assistance**: Suggests correct SQL queries based on schema

### For Claude Code

- **Codebase understanding**: Claude sees this file and understands database structure
- **Error prevention**: Can warn about invalid queries or type mismatches
- **Documentation**: Uses schema info when explaining database code

## Database Locations

All databases are stored on **D:\ drive** (NOT in C:\dev):

```typescript
const DATABASE_PATHS = {
  TRADING: 'D:\\databases\\trading.db',           // Crypto trading system
  AGENT_LEARNING: 'D:\\databases\\agent_learning.db',  // AI learning system
  AGENT_TASKS: 'D:\\databases\\agent_tasks.db',        // Task management
  NOVA_ACTIVITY: 'D:\\databases\\nova_activity.db',    // Nova agent tracking
  VIBE_TUTOR: 'D:\\databases\\vibe-tutor.db',          // Student platform
  VIBE_JUSTICE: 'D:\\databases\\vibe_justice.db',      // Legal assistant
  INVOICEFLOW: 'D:\\databases\\invoiceflow.db',        // Invoice automation
  VIBE_STUDIO: 'D:\\databases\\vibe_studio.db',        // IDE settings
  UNIFIED: 'D:\\databases\\database.db',               // Unified/shared
};
```

## Keeping Schemas Up-to-Date

When you add new tables or columns:

1. **Update Python/TypeScript schema files** in your project
2. **Update this file** (`C:\dev\types\database-schemas.ts`)
3. **Augment auto-reindexes** - changes are picked up automatically

Example:

```typescript
// Added new 'strategy' column to orders table
export interface Order {
  id: number;
  order_id: string;
  pair: string;
  side: 'buy' | 'sell';
  // ... existing fields ...
  strategy?: string;  // NEW: trading strategy used
}
```

## Related Files

- **Database Documentation**: `D:\databases\DATABASE_COMPLETE_SCHEMAS.md`
- **Database Storage Rules**: `C:\dev\.claude\rules\database-storage.md`
- **Path Policy**: `C:\dev\.claude\rules\paths-policy.md`
- **Crypto Trading Schema**: `C:\dev\apps\crypto-enhanced\src\database.py`

## Best Practices

✅ **DO:**

- Use these types for all database operations
- Keep types in sync with actual database schemas
- Import from `@/types/database-schemas` in your code

❌ **DON'T:**

- Store databases in C:\dev (use D:\databases)
- Query databases without type annotations
- Modify database schemas without updating this file

## Schema Updates

This file was last updated: **January 11, 2026**

If you add/modify database tables, update this file so all AI agents stay synchronized with your schema.
